import { Session } from 'next-auth';

/**
 * Vérifie si l'utilisateur a les droits admin.
 * Un seul rôle admin (ADMIN) avec tous les pouvoirs.
 */
export function isAdmin(session: Session | null): boolean {
  if (!session?.user) return false;
  const role = String(session.user.role || '').trim().toUpperCase();
  return role === 'ADMIN';
}
