import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { invalidateBotAdminCache, getBotConfigPath } from '@/lib/bot-admins';

/**
 * Synchronise les admins actifs (avec telegramId) de la table TelegramAdmin
 * vers bots/config.json pour que le bot Python les voie.
 */
export async function syncAdminIdsToConfig(): Promise<void> {
  try {
    const admins = await prisma.telegramAdmin.findMany({
      where: { isActive: true, telegramId: { not: null } },
      select: { telegramId: true },
    });
    const ids = admins
      .map((a) => a.telegramId)
      .filter((id): id is string => !!id)
      .map((id) => parseInt(id, 10))
      .filter((n) => !Number.isNaN(n));

    const configPath = getBotConfigPath();
    let cfg: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      cfg = JSON.parse(raw) as Record<string, unknown>;
    }
    cfg.admin_ids = ids;
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
    invalidateBotAdminCache();
  } catch (e) {
    console.error('[syncAdminIdsToConfig]', e);
  }
}

/**
 * Ajoute un telegramId à config.json (pour le bot).
 */
export function addAdminIdToConfig(telegramId: string): void {
  const id = parseInt(telegramId, 10);
  if (Number.isNaN(id)) return;
  try {
    const configPath = getBotConfigPath();
    let cfg: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      cfg = JSON.parse(raw) as Record<string, unknown>;
    }
    const ids = (cfg.admin_ids || []) as number[];
    if (!ids.includes(id)) {
      cfg.admin_ids = [...ids, id].sort((a, b) => a - b);
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
      invalidateBotAdminCache();
    }
  } catch (e) {
    console.error('[addAdminIdToConfig]', e);
  }
}

/**
 * Retire un telegramId de config.json.
 */
export function removeAdminIdFromConfig(telegramId: string): void {
  const id = parseInt(telegramId, 10);
  if (Number.isNaN(id)) return;
  try {
    const configPath = getBotConfigPath();
    if (!fs.existsSync(configPath)) return;
    const raw = fs.readFileSync(configPath, 'utf-8');
    const cfg = JSON.parse(raw) as Record<string, unknown>;
    const ids = ((cfg.admin_ids || []) as number[]).filter((x) => x !== id);
    cfg.admin_ids = ids;
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
    invalidateBotAdminCache();
  } catch (e) {
    console.error('[removeAdminIdFromConfig]', e);
  }
}
