// Configuration du rate limiting
interface RateLimitConfig {
  interval: number; // Intervalle en millisecondes
  uniqueTokenPerInterval: number; // Nombre maximum de tokens uniques par intervalle
}

interface RateLimitResult {
  limit: number;
  remaining: number;
  reset: Date;
  success: boolean;
}

// Store en mémoire pour le développement (utiliser Redis en production)
const tokenCache = new Map<string, { count: number; reset: number }>();

// Fonction de nettoyage du cache
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, value] of Array.from(tokenCache.entries())) {
    if (value.reset < now) {
      tokenCache.delete(key);
    }
  }
}

/**
 * Crée une instance de rate limiter
 * @param config Configuration du rate limiting
 * @returns Fonction de vérification du rate limiting
 */
export function rateLimit(config: RateLimitConfig) {
  const { interval, uniqueTokenPerInterval } = config;

  return {
    /**
     * Vérifie si une requête est autorisée pour un token donné
     * @param limit Limite de requêtes pour ce token spécifique
     * @param token Token unique (généralement l'IP)
     * @returns Promise qui se résout si autorisé, rejette si limite atteinte
     */
    async check(limit: number, token: string): Promise<RateLimitResult> {
      return new Promise((resolve, reject) => {
        const now = Date.now();
        
        // Nettoyer les entrées expirées
        cleanupCache();
        
        const tokenData = tokenCache.get(token);
        
        if (!tokenData || tokenData.reset < now) {
          // Première requête ou fenêtre expirée
          const reset = now + interval;
          tokenCache.set(token, { count: 1, reset });
          
          resolve({
            limit,
            remaining: limit - 1,
            reset: new Date(reset),
            success: true,
          });
          return;
        }
        
        if (tokenData.count >= limit) {
          // Limite atteinte
          reject({
            limit,
            remaining: 0,
            reset: new Date(tokenData.reset),
            success: false,
          });
          return;
        }
        
        // Incrémenter le compteur
        tokenData.count++;
        
        resolve({
          limit,
          remaining: limit - tokenData.count,
          reset: new Date(tokenData.reset),
          success: true,
        });
      });
    },

    /**
     * Obtient les informations actuelles pour un token
     * @param token Token unique
     * @returns Informations sur le rate limiting
     */
    getInfo(token: string): RateLimitResult | null {
      const tokenData = tokenCache.get(token);
      
      if (!tokenData) {
        return null;
      }
      
      const now = Date.now();
      if (tokenData.reset < now) {
        tokenCache.delete(token);
        return null;
      }
      
      return {
        limit: uniqueTokenPerInterval,
        remaining: Math.max(0, uniqueTokenPerInterval - tokenData.count),
        reset: new Date(tokenData.reset),
        success: tokenData.count < uniqueTokenPerInterval,
      };
    },

    /**
     * Réinitialise le compteur pour un token
     * @param token Token unique
     */
    reset(token: string): void {
      tokenCache.delete(token);
    },

    /**
     * Obtient les statistiques globales du cache
     * @returns Statistiques du cache
     */
    getStats(): { totalTokens: number; cacheSize: number } {
      cleanupCache();
      return {
        totalTokens: tokenCache.size,
        cacheSize: tokenCache.size,
      };
    },
  };
}

/**
 * Rate limiter spécialisé pour les API
 */
export const apiRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 300, // 300 requêtes par minute
});

/**
 * Rate limiter spécialisé pour les formulaires
 */
export const formRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10, // 10 soumissions par minute
});

/**
 * Rate limiter spécialisé pour l'authentification
 */
export const authRateLimit = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 8, // 8 tentatives par 15 minutes
});

/**
 * Middleware helper pour appliquer le rate limiting
 * @param limiter Instance du rate limiter
 * @param limit Limite pour cette requête
 * @param getToken Fonction pour extraire le token de la requête
 */
export function withRateLimit<T>(
  limiter: ReturnType<typeof rateLimit>,
  limit: number,
  getToken: (req: T) => string
) {
  return async (req: T): Promise<RateLimitResult> => {
    const token = getToken(req);
    return limiter.check(limit, token);
  };
}

/**
 * Utilitaire pour créer des en-têtes de rate limiting
 * @param result Résultat du rate limiting
 * @returns En-têtes HTTP
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toISOString(),
    'Retry-After': result.success ? '0' : Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString(),
  };
}

/**
 * Configuration pour différents types de rate limiting
 */
export const RATE_LIMIT_CONFIGS = {
  // Rate limiting général
  general: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 300, // 300 requêtes par minute
  },
  
  // Rate limiting pour les API
  api: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 300, // 300 requêtes par minute
  },
  
  // Rate limiting pour les formulaires
  forms: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 150, // 150 soumissions par minute
  },
  
  // Rate limiting pour l'authentification
  auth: {
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 12, // 12 tentatives par 15 minutes
  },
  
  // Rate limiting pour les uploads
  upload: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100, // 100 uploads par minute
  },
  
  // Rate limiting pour les recherches
  search: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 120, // 120 recherches par minute
  },
} as const;

/**
 * Factory pour créer des rate limiters préconfigurés
 */
export const createRateLimiters = () => ({
  general: rateLimit(RATE_LIMIT_CONFIGS.general),
  api: rateLimit(RATE_LIMIT_CONFIGS.api),
  forms: rateLimit(RATE_LIMIT_CONFIGS.forms),
  auth: rateLimit(RATE_LIMIT_CONFIGS.auth),
  upload: rateLimit(RATE_LIMIT_CONFIGS.upload),
  search: rateLimit(RATE_LIMIT_CONFIGS.search),
});

// Export des instances par défaut
export const rateLimiters = createRateLimiters();