#!/bin/bash

# Script de backup automatique de la base de données SQLite
# Crée des backups horodatés et garde les 30 derniers

BACKUP_DIR="/var/www/global/prisma/backups"
DB_PATH="/var/www/global/prisma/dev.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.db"

# Créer le dossier de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Vérifier que la DB existe
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Base de données introuvable: $DB_PATH"
    exit 1
fi

# Créer le backup
echo "📦 Création du backup: $BACKUP_FILE"
cp "$DB_PATH" "$BACKUP_FILE"

# Vérifier que le backup a réussi
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup créé avec succès ($SIZE)"
    
    # Garder seulement les 30 derniers backups
    echo "🧹 Nettoyage des anciens backups..."
    cd "$BACKUP_DIR"
    ls -t backup_*.db | tail -n +31 | xargs -r rm
    
    REMAINING=$(ls -1 backup_*.db 2>/dev/null | wc -l)
    echo "📊 Backups conservés: $REMAINING"
else
    echo "❌ Échec de la création du backup"
    exit 1
fi

exit 0
