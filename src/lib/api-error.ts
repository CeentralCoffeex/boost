/**
 * Gestion des erreurs API : en production, ne jamais exposer stack traces,
 * messages Prisma ou chemins au client (risque de fuite d’informations).
 */

const isProd = process.env.NODE_ENV === 'production';

/** Message générique renvoyé au client en cas d’erreur 500 en production */
const GENERIC_MESSAGE = 'Une erreur interne est survenue. Veuillez réessayer plus tard.';

/**
 * Retourne un message d’erreur sûr pour la réponse HTTP.
 * - En production : message générique (pas de détail technique).
 * - En développement : message de l’erreur pour faciliter le debug.
 * L’erreur complète doit être loguée côté serveur (console.error) avant d’appeler cette fonction.
 */
export function getSafeErrorMessage(error: unknown): string {
  if (!isProd) {
    if (error instanceof Error) return error.message;
    return String(error);
  }
  return GENERIC_MESSAGE;
}

/**
 * Log l’erreur côté serveur (à utiliser avant de renvoyer une réponse 500).
 * En prod on évite de logger la stack si tu préfères (ici on log tout pour le debugging opérationnel).
 */
export function logApiError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);
}
