#!/bin/bash

# Script d'installation du backup automatique via cron

SCRIPT_DIR="/var/www/global/scripts"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-db.sh"

# Rendre le script exécutable
chmod +x "$BACKUP_SCRIPT"

# Vérifier si cron est déjà configuré
if crontab -l 2>/dev/null | grep -q "backup-db.sh"; then
    echo "⚠️  Le backup automatique est déjà configuré"
    echo "📋 Tâches cron actuelles:"
    crontab -l | grep backup
else
    # Ajouter la tâche cron (backup toutes les 6 heures)
    (crontab -l 2>/dev/null; echo "0 */6 * * * $BACKUP_SCRIPT >> /var/log/db-backup.log 2>&1") | crontab -
    
    echo "✅ Backup automatique installé"
    echo "📅 Fréquence: Toutes les 6 heures (00:00, 06:00, 12:00, 18:00)"
    echo "📝 Logs: /var/log/db-backup.log"
fi

# Créer un backup immédiat pour tester
echo ""
echo "🧪 Test du backup..."
$BACKUP_SCRIPT

# Afficher les tâches cron
echo ""
echo "📋 Tâches cron configurées:"
crontab -l

echo ""
echo "✅ Installation terminée!"
echo ""
echo "Commandes utiles:"
echo "  - Voir les backups: ls -lh /var/www/global/prisma/backups/"
echo "  - Restaurer un backup: ./scripts/restore-db.sh /path/to/backup.db"
echo "  - Voir les logs: tail -f /var/log/db-backup.log"
