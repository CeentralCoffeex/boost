import path from 'path';
import fs from 'fs';

let cachedIds: Set<string> | null = null;
let cachedConfigMtime = 0;

/** Invalide le cache (appelé après modification de config.json) */
export function invalidateBotAdminCache(): void {
  cachedIds = null;
  cachedConfigMtime = 0;
}

export function getBotConfigPath(): string {
  // BOT_CONFIG_PATH : chemin absolu si défini (ex: /var/www/site/bots/config.json)
  const envPath = process.env.BOT_CONFIG_PATH;
  if (envPath && typeof envPath === 'string' && envPath.trim()) {
    return path.resolve(envPath.trim());
  }
  // Par défaut : projet/bots/config.json (même fichier que le bot Python)
  return path.resolve(process.cwd(), 'bots', 'config.json');
}

/**
 * Retourne les IDs Telegram des admins (config.json du bot - source unique).
 * Les admins ajoutés via le panel sont dans la table TelegramAdmin (vérifiée séparément).
 */
export function getBotAdminIds(): Set<string> {
  const configPath = getBotConfigPath();
  const mtime = fs.existsSync(configPath) ? fs.statSync(configPath).mtimeMs : 0;
  if (cachedIds && mtime === cachedConfigMtime) return cachedIds;

  cachedConfigMtime = mtime;
  const ids = new Set<string>();

  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const cfg = JSON.parse(raw);
      const cfgIds = (cfg.admin_ids || []) as (number | string)[];
      cfgIds.forEach((id) => ids.add(String(id)));
    }
  } catch {
    /* ignore */
  }

  // Fallback : ADMIN_TELEGRAM_IDS en env si config.json absent ou vide (ex: prod)
  if (ids.size === 0) {
    const envIds = process.env.ADMIN_TELEGRAM_IDS || process.env.BOT_ADMIN_IDS;
    if (envIds && typeof envIds === 'string') {
      envIds.split(',').forEach((id) => {
        const t = id.trim();
        if (t) ids.add(t);
      });
    }
  }

  cachedIds = ids;
  return ids;
}

/** Vérifie si un telegramId est admin du bot (et donc admin par défaut sur le site). */
export function isBotAdmin(telegramId: string | null | undefined): boolean {
  if (!telegramId) return false;
  return getBotAdminIds().has(String(telegramId));
}
