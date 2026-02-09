#!/bin/bash

# Script pour restaurer la base de données depuis un backup

BACKUP_DIR="/var/www/global/prisma/backups"
DB_PATH="/var/www/global/prisma/dev.db"

# Lister les backups disponibles
echo "📋 Backups disponibles:"
ls -lht "$BACKUP_DIR"/backup_*.db 2>/dev/null | head -10

# Si un argument est fourni, restaurer ce backup
if [ -n "$1" ]; then
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "❌ Backup introuvable: $BACKUP_FILE"
        exit 1
    fi
    
    # Créer un backup de la DB actuelle avant de restaurer
    SAFETY_BACKUP="$DB_PATH.before_restore_$(date +%Y%m%d_%H%M%S)"
    echo "💾 Sauvegarde de sécurité: $SAFETY_BACKUP"
    cp "$DB_PATH" "$SAFETY_BACKUP"
    
    # Restaurer le backup
    echo "🔄 Restauration de: $BACKUP_FILE"
    cp "$BACKUP_FILE" "$DB_PATH"
    
    if [ $? -eq 0 ]; then
        echo "✅ Base de données restaurée avec succès"
        echo "⚠️  N'oublie pas de redémarrer: pm2 restart all"
    else
        echo "❌ Échec de la restauration"
        # Restaurer la sauvegarde de sécurité
        cp "$SAFETY_BACKUP" "$DB_PATH"
        exit 1
    fi
else
    echo ""
    echo "Usage: ./restore-db.sh /path/to/backup_YYYYMMDD_HHMMSS.db"
    echo "Exemple: ./restore-db.sh $BACKUP_DIR/backup_20260208_120000.db"
fi
