#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

trap 'echo "❌ Erreur à la ligne $LINENO"; exit 1' ERR

# Script pour nettoyer les anciens fichiers exportés (AVIF et MP4)
# avant de régénérer les albums

echo "=========================================="
echo "NETTOYAGE DES ANCIENS EXPORTS"
echo "=========================================="
echo ""

# Fonction pour nettoyer les fichiers AVIF et MP4 dans les albums
clean_exports() {
    local cleaned_count=0
    
    echo "🧹 Nettoyage des fichiers exportés..."
    echo "⚠️  ATTENTION: Les fichiers masters ne seront PAS supprimés"
    
    # Trouver et supprimer tous les fichiers AVIF et MP4 dans les albums
    # MAIS PAS les masters
    for album_dir in photography/* artdirection/*; do
        if [ -d "$album_dir" ]; then
            # Supprimer les fichiers AVIF (sauf masters)
            while IFS= read -r -d '' file; do
                filename=$(basename "$file")
                # Ne pas supprimer les masters
                if [[ ! "$filename" =~ _master\.(png|mov|mp4|avi|mkv)$ ]]; then
                    echo "  🗑️  Suppression: $filename"
                    rm -f "$file"
                    ((cleaned_count++))
                else
                    echo "  ⚠️  Préservé (master): $filename"
                fi
            done < <(find "$album_dir" -type f \( -name "*.avif" -o -name "*.mp4" \) -print0 || true)
        fi
    done
    
    echo ""
    echo "✅ $cleaned_count fichier(s) exporté(s) supprimé(s)"
    echo "🔒 Les fichiers masters ont été préservés"
}

# Fonction pour nettoyer les dossiers d'export temporaires
clean_temp_dirs() {
    echo "🧹 Nettoyage des dossiers temporaires..."
    
    if [ -d "exports_avif" ]; then
        echo "  🗑️  Suppression du dossier exports_avif/"
        rm -rf exports_avif
    fi
    
    if [ -d "exports_videos" ]; then
        echo "  🗑️  Suppression du dossier exports_videos/"
        rm -rf exports_videos
    fi
    
    # Nettoyer les fichiers de pass ffmpeg
    rm -f ffmpeg2pass-*.log ffmpeg2pass-*.log.mbtree
    
    echo "✅ Dossiers temporaires nettoyés"
}

# Fonction pour afficher l'état des albums
show_album_status() {
    echo ""
    echo "📊 État des albums après nettoyage:"
    echo "----------------------------------------"
    
    for album_dir in photography/* artdirection/*; do
        if [ -d "$album_dir" ]; then
            album_name=$(basename "$album_dir")
            master_count=$(find "$album_dir" -name "*_master.*" -type f | wc -l)
            export_count=$(find "$album_dir" -type f \( -name "*.avif" -o -name "*.mp4" \) | wc -l)
            
            echo "  📁 $album_name: $master_count master(s), $export_count export(s)"
        fi
    done
}

# Fonction principale
main() {
    # Nettoyer les fichiers exportés
    clean_exports
    
    # Nettoyer les dossiers temporaires
    clean_temp_dirs
    
    # Afficher l'état des albums
    show_album_status
    
    echo ""
    echo "=========================================="
    echo "NETTOYAGE TERMINÉ !"
    echo "=========================================="
    echo ""
    echo "💡 Prochaines étapes:"
    echo "  1. Ajoutez vos fichiers masters dans les albums (vous seul les gérez)"
    echo "  2. Exécutez 'npm run export-masters' pour exporter"
    echo "  3. Exécutez 'npm run build' pour régénérer albums.json"
    echo ""
    echo "🔒 Les fichiers masters sont préservés et gérés manuellement"
    echo ""
}

# Exécuter le script principal
main
