import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import { validateTelegramWebAppData } from './telegram-webapp'

// Types pour les rôles et permissions
// Un seul rôle admin avec tous les pouvoirs
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export enum Permission {
  READ_USERS = 'READ_USERS',
  WRITE_USERS = 'WRITE_USERS',
  DELETE_USERS = 'DELETE_USERS',
  READ_ADMIN = 'READ_ADMIN',
  WRITE_ADMIN = 'WRITE_ADMIN',
  READ_ANALYTICS = 'READ_ANALYTICS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS'
}

// ADMIN = tous les pouvoirs (accès complet)
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.READ_USERS,
    Permission.WRITE_USERS,
    Permission.DELETE_USERS,
    Permission.READ_ADMIN,
    Permission.WRITE_ADMIN,
    Permission.READ_ANALYTICS,
    Permission.MANAGE_SETTINGS
  ],
  [UserRole.USER]: [
    Permission.READ_USERS
  ],
  [UserRole.GUEST]: []
}

// Fonction pour vérifier les permissions
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return rolePermissions[userRole]?.includes(permission) ?? false
}

// Configuration NextAuth
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // Provider Telegram Mini App
    CredentialsProvider({
      id: 'telegram-login',
      name: 'Telegram Login',
      credentials: {
        initData: { label: "Init Data", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.initData) return null;
          
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (!botToken) {
            console.error("TELEGRAM_BOT_TOKEN is not set");
            return null;
          }

          const telegramUser = validateTelegramWebAppData(credentials.initData, botToken);
          if (!telegramUser) {
            console.error("Invalid Telegram WebApp data");
            return null;
          }

          // Vérification si l'utilisateur est un admin du bot (= admin par défaut sur le site)
          const { isBotAdmin } = await import('@/lib/bot-admins');
          const isBotAdminUser = isBotAdmin(telegramUser.id.toString());
          const userRole = isBotAdminUser ? 'ADMIN' : 'USER';

          // Recherche de l'utilisateur par Telegram ID
          const user = await prisma.user.findFirst({
            where: { telegramId: telegramUser.id.toString() }
          });

          // Si l'utilisateur existe, on le met à jour
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                lastLoginAt: new Date(),
                telegramFirstName: telegramUser.first_name,
                telegramUsername: telegramUser.username || null,
                telegramPhoto: telegramUser.photo_url || null,
                // Si l'utilisateur est admin du bot, on met à jour son rôle
                ...(isBotAdminUser ? { role: 'ADMIN' } : {})
              }
            });

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: isBotAdminUser ? 'ADMIN' : (user.role as UserRole)
            };
          }

          // Si l'utilisateur n'existe pas, on le CRÉE automatiquement (Auto-Registration)
          const newUserEmail = `telegram_${telegramUser.id}@miniapp.local`;

          // Vérifier si l'email généré existe déjà (cas rare de conflit)
          const existingEmailUser = await prisma.user.findUnique({
             where: { email: newUserEmail }
          });

          if (existingEmailUser) {
             // Si conflit, on lie ce compte (fallback de sécurité)
             await prisma.user.update({
               where: { id: existingEmailUser.id },
               data: {
                 telegramId: telegramUser.id.toString(),
                 telegramFirstName: telegramUser.first_name,
                 telegramUsername: telegramUser.username || null,
                 telegramPhoto: telegramUser.photo_url || null,
                 lastLoginAt: new Date(),
                 ...(isBotAdminUser ? { role: 'ADMIN' } : {})
               }
             });
             return {
                id: existingEmailUser.id,
                email: existingEmailUser.email,
                name: existingEmailUser.name,
                image: existingEmailUser.image,
                role: isBotAdminUser ? 'ADMIN' : (existingEmailUser.role as UserRole)
             };
          }

          // Création du nouvel utilisateur
          const newUser = await prisma.user.create({
            data: {
              email: newUserEmail,
              name: `${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`,
              image: telegramUser.photo_url || null,
              telegramId: telegramUser.id.toString(),
              telegramFirstName: telegramUser.first_name,
              telegramUsername: telegramUser.username || null,
              telegramPhoto: telegramUser.photo_url || null,
              telegramLinkedAt: new Date(),
              emailVerified: new Date(), // On considère que Telegram est vérifié
              role: userRole,
              status: 'ACTIVE'
            }
          });

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            image: newUser.image,
            role: newUser.role as UserRole
          };

        } catch (e) {
          console.error("Telegram login error", e);
          return null;
        }
      }
    })
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    updateAge: 24 * 60 * 60 // 24 heures
  },
  
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    secret:
      process.env.NEXTAUTH_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => {
            throw new Error('NEXTAUTH_SECRET requis en production. Définir dans .env');
          })()
        : 'dev-only-secret'),
  },
  
  callbacks: {
    async jwt({ token, user, account }) {
      // Première connexion
      if (user) {
        token.role = user.role || UserRole.USER
        token.userId = user.id
        
        // Log de connexion pour audit
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            details: JSON.stringify({
              provider: account?.provider || 'telegram-login',
              ip: 'unknown', // Sera ajouté par le middleware
              userAgent: 'unknown' // Sera ajouté par le middleware
            })
          }
        }).catch(console.error)
      }
      
      // Récupérer le rôle depuis la base de données à chaque requête
      // pour s'assurer que les changements de rôle sont pris en compte immédiatement
      if (token.userId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.userId as string },
            select: { role: true, status: true }
          })
          
          if (dbUser) {
            token.role = dbUser.role
            token.status = dbUser.status
          }
        } catch (error) {
          console.error('Error fetching user role from database:', error)
        }
      }
      
      return token
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as UserRole
        
        // Ajouter les permissions à la session
        const permissions = rolePermissions[token.role as UserRole] || []
        session.user.permissions = permissions
      }
      
      return session
    },
    
    async signIn({ user, account }) {
      // Uniquement autoriser telegram-login (CredentialsProvider)
      if (account?.provider === 'telegram-login') return true;
      // CredentialsProvider peut avoir account undefined -> autoriser si user vient de notre authorize
      if (!account && user?.id) return true;
      return false;
    }
  },
  
  events: {
    async signOut({ token }) {
      // Log de déconnexion pour audit
      if (token?.userId) {
        await prisma.auditLog.create({
          data: {
            userId: token.userId as string,
            action: 'LOGOUT',
            details: JSON.stringify({})
          }
        }).catch(console.error)
      }
    }
  },
  
  debug: process.env.NODE_ENV === 'development'
}

// Fonction utilitaire pour vérifier l'authentification
export async function requireAuth() {
  // Cette fonction sera utilisée dans les API routes
  // pour vérifier l'authentification et les permissions
}
