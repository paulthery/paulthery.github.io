#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

trap 'echo "❌ Erreur à la ligne $LINENO"; exit 1' ERR

# Script pour exporter les images PNG en AVIF avec libavif
# Desktop: max 2000x2500 (respecte le ratio d'aspect) qualité 65
# Mobile: max 1600x2000 (respecte le ratio d'aspect) qualité 55
# Source: PNG qualité 100 (4000x5000)

DESKTOP_MAX_WIDTH="2000"
DESKTOP_MAX_HEIGHT="2500"
MOBILE_MAX_WIDTH="1600"
MOBILE_MAX_HEIGHT="2000"
DESKTOP_QUALITY="65"
MOBILE_QUALITY="55"

# Paramètres optimisés
SHARPNESS="0x0.75+0.75+0.008"  # Paramètres unsharp pour ImageMagick
SPEED="0"                      # Vitesse libavif (0-10, 0=qualité maximale)
THREADS="all"                  # Threads CPU (all ou nombre)
YUV_FORMAT="420"               # Format YUV (420=meilleure compression)

echo "=========================================="
echo "EXPORT PNG → AVIF AVEC LIBAVIF"
echo "=========================================="
echo ""

usage() {
    echo "Usage: $0 [--album photography|artdirection] [--desktop-max-w WIDTH] [--desktop-max-h HEIGHT] [--mobile-max-w WIDTH] [--mobile-max-h HEIGHT]"
    echo "Ex: $0 --album photography"
}

# Fonction pour exporter avec contrôle de taille
export_with_size_limit() {
    local temp_file="$1"
    local output_file="$2"
    local initial_quality="$3"
    local max_size_kb="$4"
    
    local quality="$initial_quality"
    local file_size_kb=0
    
    # Essayer d'abord avec la qualité initiale
    avifenc -q "$quality" -s ${SPEED} -y ${YUV_FORMAT} -r full --autotiling -j ${THREADS} "$temp_file" "$output_file"
    
    # Vérifier la taille
    if [ -f "$output_file" ]; then
        file_size_kb=$(($(stat -f%z "$output_file") / 1024))
        
        # Si la taille dépasse la limite, réduire la qualité progressivement
        while [ "$file_size_kb" -gt "$max_size_kb" ] && [ "$quality" -gt 20 ]; do
            quality=$((quality - 5))
            echo "    📉 Taille ${file_size_kb}KB > ${max_size_kb}KB - Réduction qualité à $quality"
            avifenc -q "$quality" -s ${SPEED} -y ${YUV_FORMAT} -r full --autotiling -j ${THREADS} "$temp_file" "$output_file"
            file_size_kb=$(($(stat -f%z "$output_file") / 1024))
        done
        
        if [ "$quality" -lt "$initial_quality" ]; then
            echo "    ⚠️  Qualité réduite de $initial_quality à $quality (${file_size_kb}KB)"
        else
            echo "    ✅ Qualité optimale maintenue ($quality - ${file_size_kb}KB)"
        fi
    fi
}

# Fonction pour exporter une image PNG en AVIF avec libavif
export_png_to_avif() {
    local input_file="$1"
    local base_name="$2"
    
    echo "Export de $input_file..."
    
    # Analyser le nom pour extraire numéro et marque
    # Format attendu: 005_master_chanel ou 005_master
    if [[ "$base_name" =~ ^([0-9]+)_master_(.+)$ ]]; then
        # Format avec marque: 005_master_chanel
        number="${BASH_REMATCH[1]}"
        brand="${BASH_REMATCH[2]}"
        base_name="${number}_${brand}"
    elif [[ "$base_name" =~ ^([0-9]+)_master$ ]]; then
        # Format sans marque: 005_master
        number="${BASH_REMATCH[1]}"
        base_name="$number"
    fi
    
    # Déterminer la qualité selon l'album
    if [[ "$input_file" =~ ^photography/ ]]; then
        # Albums photography : qualité élevée
        DESKTOP_QUALITY="75"
        MOBILE_QUALITY="75"
        echo "  📸 Album photography détecté - Qualité élevée (75/75)"
    else
        # Albums artdirection : qualité standard
        DESKTOP_QUALITY="65"
        MOBILE_QUALITY="55"
        echo "  🎨 Album artdirection détecté - Qualité standard (65/55)"
    fi
    
    # Export desktop avec contrôle de taille
    # Construire le nom: numéro_desktop_marque ou numéro_desktop
    if [[ "$base_name" =~ ^([0-9]+)_(.+)$ ]]; then
        # Avec marque: 005_chanel -> 005_desktop_chanel
        desktop_output="${input_file%/*}/${BASH_REMATCH[1]}_desktop_${BASH_REMATCH[2]}.avif"
    else
        # Sans marque: 005 -> 005_desktop
        desktop_output="${input_file%/*}/${base_name}_desktop.avif"
    fi
    echo "  Création desktop: $desktop_output"
    
    # Utiliser ImageMagick pour redimensionner et convertir en sRGB puis avifenc pour convertir
    temp_desktop="${desktop_output%.avif}_temp.png"
    magick "$input_file" -resize "${DESKTOP_MAX_WIDTH}x${DESKTOP_MAX_HEIGHT}>" -unsharp "$SHARPNESS" -colorspace "sRGB IEC61966-2.1" "$temp_desktop"
    
    # Export avec contrôle de taille selon l'album
    if [[ "$input_file" =~ ^photography/ ]]; then
        # Albums photography : contrôle de taille (plafond 800KB)
        export_with_size_limit "$temp_desktop" "$desktop_output" "$DESKTOP_QUALITY" "800"
    else
        # Albums artdirection : contrôle de taille (plafond 500KB)
        export_with_size_limit "$temp_desktop" "$desktop_output" "$DESKTOP_QUALITY" "500"
    fi
    rm -f "$temp_desktop"
    
    if [ -f "$desktop_output" ]; then
        size=$(ls -lh "$desktop_output" | awk '{print $5}')
        echo "    ✓ Desktop créé: $size"
    else
        echo "    ✗ Erreur desktop"
    fi
    
    # Export mobile avec contrôle de taille
    # Construire le nom: numéro_mobile_marque ou numéro_mobile
    if [[ "$base_name" =~ ^([0-9]+)_(.+)$ ]]; then
        # Avec marque: 005_chanel -> 005_mobile_chanel
        mobile_output="${input_file%/*}/${BASH_REMATCH[1]}_mobile_${BASH_REMATCH[2]}.avif"
    else
        # Sans marque: 005 -> 005_mobile
        mobile_output="${input_file%/*}/${base_name}_mobile.avif"
    fi
    echo "  Création mobile: $mobile_output"
    
    # Utiliser ImageMagick pour redimensionner et convertir en sRGB puis avifenc pour convertir
    temp_mobile="${mobile_output%.avif}_temp.png"
    magick "$input_file" -resize "${MOBILE_MAX_WIDTH}x${MOBILE_MAX_HEIGHT}>" -unsharp "$SHARPNESS" -colorspace "sRGB IEC61966-2.1" "$temp_mobile"
    
    # Export avec contrôle de taille selon l'album
    if [[ "$input_file" =~ ^photography/ ]]; then
        # Albums photography : contrôle de taille (plafond 800KB)
        export_with_size_limit "$temp_mobile" "$mobile_output" "$MOBILE_QUALITY" "800"
    else
        # Albums artdirection : contrôle de taille (plafond 250KB)
        export_with_size_limit "$temp_mobile" "$mobile_output" "$MOBILE_QUALITY" "250"
    fi
    rm -f "$temp_mobile"
    
    if [ -f "$mobile_output" ]; then
        size=$(ls -lh "$mobile_output" | awk '{print $5}')
        echo "    ✓ Mobile créé: $size"
    else
        echo "    ✗ Erreur mobile"
    fi
}

# Vérifier si libavif est installé
if ! command -v avifenc >/dev/null 2>&1; then
    echo "❌ libavif n'est pas installé !"
    echo ""
    echo "Installation :"
    echo "  macOS: brew install libavif"
    echo "  Ubuntu: sudo apt install libavif-bin"
    echo "  Arch: sudo pacman -S libavif"
    echo ""
    exit 1
fi

# Vérifier si ImageMagick est installé
if ! command -v magick >/dev/null 2>&1; then
    echo "❌ ImageMagick (magick) n'est pas installé !"
    echo ""
    echo "Installation :"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt install imagemagick"
    echo "  Arch: sudo pacman -S imagemagick"
    echo ""
    exit 1
fi

# Pas besoin de créer un dossier d'export - on exporte directement dans les albums

# Trouver tous les fichiers PNG masters dans les albums
echo "Recherche des fichiers PNG masters dans les albums..."
png_files=$(find photography artdirection -name "*_master*.png" -type f 2>/dev/null || true)

if [ -z "$png_files" ]; then
    echo "Aucun fichier PNG master trouvé dans les albums."
    echo "Veuillez d'abord ajouter vos fichiers PNG masters dans les dossiers photography/ et artdirection/."
    echo "Format attendu: *_master.png"
    exit 1
fi

echo "Fichiers PNG trouvés:"
count=$(printf "%s\n" "$png_files" | grep -c "." || true)
echo "Total: $count"
echo ""

# Exporter chaque fichier PNG
echo "$png_files" | while IFS= read -r png_file; do
    # Extraire le nom de base sans extension
    base_name=$(basename "$png_file" .png)
    
    # Exporter en AVIF
    export_png_to_avif "$png_file" "$base_name"
    echo ""
done

echo "=========================================="
echo "EXPORT TERMINÉ !"
echo "=========================================="
echo ""
echo "Spécifications utilisées:"
echo "- Desktop: max ${DESKTOP_MAX_WIDTH}x${DESKTOP_MAX_HEIGHT} qualité ${DESKTOP_QUALITY}"
echo "- Mobile: max ${MOBILE_MAX_WIDTH}x${MOBILE_MAX_HEIGHT} qualité ${MOBILE_QUALITY}"
echo "- Redimensionnement: ImageMagick avec unsharp"
echo "- Conversion: libavif (avifenc)"
echo "- Paramètres: -q [qualité] -s ${SPEED} -y ${YUV_FORMAT} --autotiling -j ${THREADS}"
echo "- Netteté: ${SHARPNESS}"
echo "- Source: PNG 4000x5000 qualité 100"
echo ""
echo "✅ Toutes les images ont été exportées en AVIF avec libavif !"
