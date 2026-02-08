import { NextRequest, NextResponse } from 'next/server'
import { getClientIP, matchesIPRule, isPrivateIP } from '@/lib/utils/ip'
// import { prisma } from '@/lib/prisma'

interface SecurityConfig {
  enableIPFiltering: boolean
  enableRateLimiting: boolean
  enableBruteForceProtection: boolean
  maxLoginAttempts: number
  lockoutDuration: number // en minutes
  rateLimitWindow: number // en minutes
  rateLimitMax: number // requêtes par fenêtre
}

interface IPRule {
  id: string
  ip: string
  type: 'allow' | 'block'
  isActive: boolean
  expiresAt?: Date
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface LoginAttempt {
  ip: string
  attempts: number
  lastAttempt: number
  lockedUntil?: number
}

// Cache en mémoire pour les règles IP (en production, utiliser Redis)
let ipRulesCache: IPRule[] = []
let rateLimitCache = new Map<string, RateLimitEntry>()
let loginAttemptsCache = new Map<string, LoginAttempt>()

// Configuration par défaut
const defaultConfig: SecurityConfig = {
  enableIPFiltering: true,
  enableRateLimiting: true,
  enableBruteForceProtection: true,
  maxLoginAttempts: 12,
  lockoutDuration: 15, // 15 minutes
  rateLimitWindow: 15, // 15 minutes
  rateLimitMax: 500 // 500 requêtes par 15 minutes
}

/**
 * Charge les règles IP depuis la base de données
 */
async function loadIPRules(): Promise<IPRule[]> {
  try {
    // En production, charger depuis la base de données
    /*
    const rules = await prisma.ipRule.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      select: {
        id: true,
        ip: true,
        type: true,
        isActive: true,
        expiresAt: true
      }
    })
    
    return rules
    */

    // Données simulées pour le développement
    return [
      {
        id: '1',
        ip: '192.168.1.0/24',
        type: 'allow',
        isActive: true
      },
      {
        id: '2',
        ip: '10.0.0.0/8',
        type: 'allow',
        isActive: true
      },
      {
        id: '3',
        ip: '203.0.113.45',
        type: 'block',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      }
    ]
  } catch (error) {
    console.error('Erreur lors du chargement des règles IP:', error)
    return []
  }
}

/**
 * Vérifie si une IP est autorisée selon les règles
 */
function checkIPAccess(clientIP: string, rules: IPRule[]): { allowed: boolean, rule?: IPRule } {
  // Toujours autoriser les IPs privées/locales
  if (isPrivateIP(clientIP)) {
    return { allowed: true }
  }

  // Vérifier les règles de blocage en premier
  for (const rule of rules) {
    if (rule.type === 'block' && matchesIPRule(clientIP, rule.ip)) {
      return { allowed: false, rule }
    }
  }

  // Vérifier les règles d'autorisation
  for (const rule of rules) {
    if (rule.type === 'allow' && matchesIPRule(clientIP, rule.ip)) {
      return { allowed: true, rule }
    }
  }

  // Par défaut, autoriser si aucune règle ne s'applique
  return { allowed: true }
}

/**
 * Vérifie la limite de taux pour une IP
 */
function checkRateLimit(clientIP: string, config: SecurityConfig): { allowed: boolean, remaining: number } {
  if (!config.enableRateLimiting) {
    return { allowed: true, remaining: config.rateLimitMax }
  }

  const now = Date.now()
  const windowMs = config.rateLimitWindow * 60 * 1000
  const key = `rate_${clientIP}`
  
  const entry = rateLimitCache.get(key)
  
  if (!entry || now > entry.resetTime) {
    // Nouvelle fenêtre
    rateLimitCache.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return { allowed: true, remaining: config.rateLimitMax - 1 }
  }
  
  if (entry.count >= config.rateLimitMax) {
    return { allowed: false, remaining: 0 }
  }
  
  entry.count++
  return { allowed: true, remaining: config.rateLimitMax - entry.count }
}

/**
 * Enregistre une tentative de connexion échouée
 */
export function recordFailedLogin(clientIP: string, config: SecurityConfig = defaultConfig): void {
  if (!config.enableBruteForceProtection) return

  const now = Date.now()
  const key = `login_${clientIP}`
  const lockoutMs = config.lockoutDuration * 60 * 1000
  
  const attempt = loginAttemptsCache.get(key) || {
    ip: clientIP,
    attempts: 0,
    lastAttempt: now
  }
  
  attempt.attempts++
  attempt.lastAttempt = now
  
  if (attempt.attempts >= config.maxLoginAttempts) {
    attempt.lockedUntil = now + lockoutMs
  }
  
  loginAttemptsCache.set(key, attempt)
}

/**
 * Vérifie si une IP est verrouillée pour cause de brute force
 */
function checkBruteForceProtection(clientIP: string, config: SecurityConfig): { allowed: boolean, lockedUntil?: number } {
  if (!config.enableBruteForceProtection) {
    return { allowed: true }
  }

  const key = `login_${clientIP}`
  const attempt = loginAttemptsCache.get(key)
  
  if (!attempt || !attempt.lockedUntil) {
    return { allowed: true }
  }
  
  const now = Date.now()
  if (now > attempt.lockedUntil) {
    // Verrouillage expiré, nettoyer
    loginAttemptsCache.delete(key)
    return { allowed: true }
  }
  
  return { allowed: false, lockedUntil: attempt.lockedUntil }
}

/**
 * Réinitialise les tentatives de connexion pour une IP (après connexion réussie)
 */
export function resetFailedLogins(clientIP: string): void {
  const key = `login_${clientIP}`
  loginAttemptsCache.delete(key)
}

/**
 * Middleware principal de sécurité
 */
export async function securityMiddleware(
  request: NextRequest,
  config: SecurityConfig = defaultConfig
): Promise<NextResponse | null> {
  const clientIP = getClientIP(request)
  const pathname = request.nextUrl.pathname
  
  // Charger les règles IP (avec cache)
  if (ipRulesCache.length === 0) {
    ipRulesCache = await loadIPRules()
  }
  
  // 1. Vérification des règles IP
  if (config.enableIPFiltering) {
    const ipCheck = checkIPAccess(clientIP, ipRulesCache)
    if (!ipCheck.allowed) {
      console.log(`IP bloquée: ${clientIP} (règle: ${ipCheck.rule?.id})`)
      
      // Log de sécurité
      /*
      await prisma.securityEvent.create({
        data: {
          type: 'IP_BLOCKED',
          severity: 'high',
          ipAddress: clientIP,
          userAgent: request.headers.get('user-agent'),
          path: pathname,
          details: {
            ruleId: ipCheck.rule?.id,
            ruleIP: ipCheck.rule?.ip
          }
        }
      })
      */
      
      return new NextResponse('Accès refusé', { status: 403 })
    }
  }
  
  // 2. Vérification de la protection contre le brute force (pour les routes de connexion)
  if (pathname.includes('/api/auth/') || pathname.includes('/login')) {
    const bruteForceCheck = checkBruteForceProtection(clientIP, config)
    if (!bruteForceCheck.allowed) {
      const remainingTime = Math.ceil((bruteForceCheck.lockedUntil! - Date.now()) / 1000 / 60)
      
      console.log(`IP verrouillée pour brute force: ${clientIP} (${remainingTime} min restantes)`)
      
      return NextResponse.json(
        { 
          error: 'Trop de tentatives de connexion. Réessayez plus tard.',
          lockedUntil: bruteForceCheck.lockedUntil,
          remainingMinutes: remainingTime
        },
        { status: 429 }
      )
    }
  }
  
  // 3. Vérification de la limite de taux
  const rateLimitCheck = checkRateLimit(clientIP, config)
  if (!rateLimitCheck.allowed) {
    console.log(`Limite de taux dépassée pour: ${clientIP}`)
    
    const response = NextResponse.json(
      { error: 'Trop de requêtes. Ralentissez.' },
      { status: 429 }
    )
    
    response.headers.set('X-RateLimit-Limit', config.rateLimitMax.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', (Date.now() + config.rateLimitWindow * 60 * 1000).toString())
    
    return response
  }
  
  // Ajouter les en-têtes de limite de taux à la réponse
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', config.rateLimitMax.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimitCheck.remaining.toString())
  
  return null // Continuer le traitement
}

/**
 * Nettoie les caches expirés (à appeler périodiquement)
 */
export function cleanupSecurityCaches(): void {
  const now = Date.now()
  
  // Nettoyer le cache de limite de taux
  rateLimitCache.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitCache.delete(key)
    }
  })
  
  // Nettoyer le cache des tentatives de connexion
  loginAttemptsCache.forEach((attempt, key) => {
    if (attempt.lockedUntil && now > attempt.lockedUntil) {
      loginAttemptsCache.delete(key)
    }
  })
}

// Nettoyer les caches toutes les 5 minutes
setInterval(cleanupSecurityCaches, 5 * 60 * 1000)