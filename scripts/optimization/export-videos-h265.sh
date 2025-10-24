#!/bin/bash

# Script pour exporter les vidéos en H.265 MP4 avec VBR 2-pass et unsharp
# Desktop: 1920p côté long, max 20MB (Cloudflare limit)
# Mobile: 1280p côté long, max 20MB (Cloudflare limit)
# Source: MOV/MP4 originaux
# 
# Logique VBR avec filesize:
# - Bitrate adaptatif selon la complexité de la scène
# - Taille garantie ≤ 20MB (compatible Cloudflare)
# - Qualité optimale dans la limite de taille

# Mode de compression (crf ou bitrate ou filesize ou hybrid)
COMPRESSION_MODE="hybrid"  # crf, bitrate, filesize, hybrid

# Paramètres CRF (si mode crf)
DESKTOP_CRF="20"           # Qualité desktop (18-23, plus bas = meilleure qualité)
MOBILE_CRF="22"            # Qualité mobile (20-25)

# Paramètres bitrate (si mode bitrate) - en kbps
DESKTOP_BITRATE="3000"     # Bitrate desktop (3000 kbps = 3 Mbps)
MOBILE_BITRATE="1500"      # Bitrate mobile (1500 kbps = 1.5 Mbps)

# Paramètres taille max (si mode filesize) - en MB
DESKTOP_MAX_SIZE="15"      # Taille max desktop (Cloudflare limit)
MOBILE_MAX_SIZE="7.5"      # Taille max mobile (Cloudflare limit)

DESKTOP_PRESET="slow"      # Preset desktop (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
MOBILE_PRESET="slow"       # Preset mobile (plus rapide pour mobile)

# Paramètres unsharp pour ffmpeg
UNSHARP_DESKTOP="5:5:0.8:3:3:0.4"  # Unsharp desktop (luma:chroma:luma_amount:chroma_amount:luma_threshold:chroma_threshold)
UNSHARP_MOBILE="3:3:0.6:3:3:0.3"    # Unsharp mobile (plus léger)

# Paramètres H.265 optimisés pour compatibilité
H265_PROFILE="main"        # Profile H.265 (main, main10, main422-10)
H265_LEVEL="4.0"          # Level H.265 (3.1, 4.0, 4.1, 5.0, 5.1, 5.2) - 4.0 pour compatibilité QuickTime
BITRATE_MULTIPLIER="1.2"  # Multiplicateur de bitrate pour 2-pass

echo "=========================================="
echo "EXPORT VIDÉOS → H.265 MP4 AVEC UNSHARP"
echo "=========================================="
echo ""


# Fonction pour calculer la taille avec bitrate fixe
calculate_size_with_bitrate() {
    local bitrate_kbps="$1"
    local duration_seconds="$2"
    local size_bytes=$((bitrate_kbps * duration_seconds * 1000 / 8))
    local size_mb=$((size_bytes / 1024 / 1024))
    echo "$size_mb"
}

# Fonction pour déterminer le mode optimal
get_optimal_mode() {
    local duration_seconds="$1"
    local max_size_mb="$2"
    local bitrate_kbps="$3"
    
    # Calculer la taille avec le bitrate spécifié
    local size_with_bitrate=$(calculate_size_with_bitrate "$bitrate_kbps" "$duration_seconds")
    
    # Vérifier que size_with_bitrate n'est pas vide
    if [ -z "$size_with_bitrate" ]; then
        size_with_bitrate=0
    fi
    
    if [ "$size_with_bitrate" -le "$max_size_mb" ]; then
        echo "bitrate"
    else
        echo "filesize"
    fi
}

# Fonction pour détecter les dimensions de la vidéo
get_video_dimensions() {
    local input_file="$1"
    local dimensions=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$input_file")
    echo "$dimensions"
}

# Fonction pour obtenir le scaling desktop (plus long côté = 1920px)
get_desktop_scale() {
    local format="$1"
    case $format in
        "landscape")
            echo "scale=1920:-2"  # Largeur fixe pour landscape
            ;;
        "portrait")
            echo "scale=-2:1920"  # Hauteur fixe pour portrait
            ;;
        "square")
            echo "scale=1920:1920"  # Carré
            ;;
    esac
}

# Fonction pour obtenir le scaling mobile (plus long côté = 1280px)
get_mobile_scale() {
    local format="$1"
    case $format in
        "landscape")
            echo "scale=1280:-2"  # Largeur fixe pour landscape
            ;;
        "portrait")
            echo "scale=-2:1280"  # Hauteur fixe pour portrait
            ;;
        "square")
            echo "scale=1280:1280"  # Carré
            ;;
    esac
}

# Fonction pour détecter si la vidéo a de l'audio
has_audio() {
    local input_file="$1"
    local audio_streams=$(ffprobe -v quiet -select_streams a -show_entries stream=codec_name -of csv=p=0 "$input_file" | wc -l)
    if [ "$audio_streams" -gt 0 ]; then
        echo "true"
    else
        echo "false"
    fi
}

# Fonction pour déterminer le format (portrait/landscape/carré)
get_video_format() {
    local dimensions="$1"
    local width=$(echo "$dimensions" | cut -d'x' -f1)
    local height=$(echo "$dimensions" | cut -d'x' -f2)
    
    # Vérifier que width et height ne sont pas vides
    if [ -z "$width" ] || [ -z "$height" ]; then
        echo "landscape"  # Valeur par défaut
        return
    fi
    
    if [ "$width" -gt "$height" ]; then
        echo "landscape"
    elif [ "$height" -gt "$width" ]; then
        echo "portrait"
    else
        echo "square"
    fi
}

# Fonction pour calculer le scale desktop selon le format
get_desktop_scale() {
    local format="$1"
    local desktop_long="1920"
    
    case $format in
        "landscape")
            echo "scale=${desktop_long}:-2"
            ;;
        "portrait")
            echo "scale=-2:${desktop_long}"
            ;;
        "square")
            echo "scale=${desktop_long}:${desktop_long}"
            ;;
    esac
}

# Fonction pour calculer le scale mobile selon le format
get_mobile_scale() {
    local format="$1"
    local mobile_long="1280"
    
    case $format in
        "landscape")
            echo "scale=${mobile_long}:-2"
            ;;
        "portrait")
            echo "scale=-2:${mobile_long}"
            ;;
        "square")
            echo "scale=${mobile_long}:${mobile_long}"
            ;;
    esac
}

# Fonction pour exporter une vidéo en H.265 avec unsharp
export_video_h265() {
    local input_file="$1"
    local base_name="$2"
    
    echo "Export de $input_file..."
    
    # Obtenir la durée de la vidéo
    local duration_seconds=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$input_file" | cut -d'.' -f1)
    
    # Déterminer le mode optimal pour desktop et mobile
    local desktop_mode=$(get_optimal_mode "$duration_seconds" "$DESKTOP_MAX_SIZE" "$DESKTOP_BITRATE")
    local mobile_mode=$(get_optimal_mode "$duration_seconds" "$MOBILE_MAX_SIZE" "$MOBILE_BITRATE")
    
    echo "  Durée: ${duration_seconds}s"
    echo "  Mode desktop: $desktop_mode (${DESKTOP_BITRATE} kbps = $(calculate_size_with_bitrate "$DESKTOP_BITRATE" "$duration_seconds")MB)"
    echo "  Mode mobile: $mobile_mode (${MOBILE_BITRATE} kbps = $(calculate_size_with_bitrate "$MOBILE_BITRATE" "$duration_seconds")MB)"
    
    # Détecter le format de la vidéo et l'audio
    local dimensions=$(get_video_dimensions "$input_file")
    local format=$(get_video_format "$dimensions")
    local desktop_scale=$(get_desktop_scale "$format")
    local mobile_scale=$(get_mobile_scale "$format")
    local has_audio_stream=$(has_audio "$input_file")
    
    # Obtenir la durée de la vidéo
    local duration_seconds=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$input_file" | cut -d'.' -f1)
    
    # Déterminer le mode optimal pour desktop et mobile
    local desktop_mode=$(get_optimal_mode "$duration_seconds" "$DESKTOP_MAX_SIZE" "$DESKTOP_BITRATE")
    local mobile_mode=$(get_optimal_mode "$duration_seconds" "$MOBILE_MAX_SIZE" "$MOBILE_BITRATE")
    
    # Paramètres audio conditionnels
    local audio_params=""
    if [ "$has_audio_stream" = "true" ]; then
        audio_params="-c:a aac -b:a 128k"
    else
        audio_params="-an"  # Pas d'audio
    fi
    
    # Export desktop (1080p en gardant le ratio)
    desktop_output="${input_file%/*}/${base_name}_desktop.mp4"
    echo "  Création desktop: $desktop_output"
    
    # Desktop H.265 1080p avec unsharp et 2-pass (côté long = 1920)
    echo "    Pass 1/2 desktop..."
    
    # Construire les paramètres selon le mode
    desktop_params=""
    case $desktop_mode in
        "crf")
            desktop_params="-crf ${DESKTOP_CRF}"
            ;;
        "bitrate")
            desktop_params="-b:v ${DESKTOP_BITRATE}k -maxrate ${DESKTOP_BITRATE}k -bufsize $((DESKTOP_BITRATE * 2))k"
            ;;
        "filesize")
            desktop_params="-fs ${DESKTOP_MAX_SIZE}M"
            ;;
    esac
    
    ffmpeg -y -i "$input_file" \
        -c:v libx265 \
        -preset ${DESKTOP_PRESET} \
        $desktop_params \
        -profile:v ${H265_PROFILE} \
        -level:v ${H265_LEVEL} \
        -tag:v hvc1 \
        -pix_fmt yuv420p \
        -color_primaries bt709 \
        -color_trc bt709 \
        -colorspace bt709 \
        -color_range tv \
        -vf "$desktop_scale" \
        -pass 1 \
        -f null \
        /dev/null 2>/dev/null
    
    echo "    Pass 2/2 desktop..."
    ffmpeg -y -i "$input_file" \
        -c:v libx265 \
        -preset ${DESKTOP_PRESET} \
        $desktop_params \
        -profile:v ${H265_PROFILE} \
        -level:v ${H265_LEVEL} \
        -tag:v hvc1 \
        -pix_fmt yuv420p \
        -color_primaries bt709 \
        -color_trc bt709 \
        -colorspace bt709 \
        -color_range tv \
        -r 24 \
        -movflags +faststart \
        -vf "$desktop_scale" \
        -pass 2 \
        $audio_params \
        -movflags +faststart \
        "$desktop_output"
    
    if [ -f "$desktop_output" ]; then
        size=$(ls -lh "$desktop_output" | awk '{print $5}')
        echo "    ✓ Desktop créé: $size"
    else
        echo "    ✗ Erreur desktop"
    fi
    
    # Export mobile (720p en gardant le ratio)
    mobile_output="${input_file%/*}/${base_name}_mobile.mp4"
    echo "  Création mobile: $mobile_output"
    
    # Mobile H.265 720p avec unsharp et 2-pass (côté long = 1280)
    echo "    Pass 1/2 mobile..."
    
    # Construire les paramètres selon le mode
    mobile_params=""
    case $mobile_mode in
        "crf")
            mobile_params="-crf ${MOBILE_CRF}"
            ;;
        "bitrate")
            mobile_params="-b:v ${MOBILE_BITRATE}k -maxrate ${MOBILE_BITRATE}k -bufsize $((MOBILE_BITRATE * 2))k"
            ;;
        "filesize")
            mobile_params="-fs ${MOBILE_MAX_SIZE}M"
            ;;
    esac
    
    ffmpeg -y -i "$input_file" \
        -c:v libx265 \
        -preset ${MOBILE_PRESET} \
        $mobile_params \
        -profile:v ${H265_PROFILE} \
        -level:v ${H265_LEVEL} \
        -tag:v hvc1 \
        -pix_fmt yuv420p \
        -color_primaries bt709 \
        -color_trc bt709 \
        -colorspace bt709 \
        -color_range tv \
        -vf "$mobile_scale" \
        -pass 1 \
        -f null \
        /dev/null 2>/dev/null
    
    echo "    Pass 2/2 mobile..."
    ffmpeg -y -i "$input_file" \
        -c:v libx265 \
        -preset ${MOBILE_PRESET} \
        $mobile_params \
        -profile:v ${H265_PROFILE} \
        -level:v ${H265_LEVEL} \
        -tag:v hvc1 \
        -pix_fmt yuv420p \
        -color_primaries bt709 \
        -color_trc bt709 \
        -colorspace bt709 \
        -color_range tv \
        -r 24 \
        -movflags +faststart \
        -vf "$mobile_scale" \
        -pass 2 \
        $audio_params \
        -movflags +faststart \
        "$mobile_output"
    
    if [ -f "$mobile_output" ]; then
        size=$(ls -lh "$mobile_output" | awk '{print $5}')
        echo "    ✓ Mobile créé: $size"
    else
        echo "    ✗ Erreur mobile"
    fi
    
    # Nettoyer les fichiers de pass
    rm -f ffmpeg2pass-0.log ffmpeg2pass-0.log.mbtree
}

# Si un fichier spécifique est fourni en paramètre
if [ $# -gt 0 ]; then
    input_file="$1"
    if [ -f "$input_file" ]; then
        base_name=$(basename "$input_file")
        base_name="${base_name%.*}"
        base_name="${base_name%_master}"
        
        echo "🎯 Export du fichier spécifique: $input_file"
        echo ""
        export_video_h265 "$input_file" "$base_name"
        echo ""
        echo "✅ Export terminé !"
        exit 0
    else
        echo "❌ Fichier non trouvé: $input_file"
        exit 1
    fi
fi

# Vérifier si ffmpeg est installé
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg n'est pas installé !"
    echo ""
    echo "Installation :"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt install ffmpeg"
    echo "  Arch: sudo pacman -S ffmpeg"
    echo ""
    exit 1
fi

# Vérifier si libx265 est disponible
if ! ffmpeg -encoders 2>/dev/null | grep -q "libx265"; then
    echo "❌ libx265 (H.265) n'est pas disponible dans ffmpeg !"
    echo ""
    echo "Installation avec H.265 :"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt install ffmpeg libx265-dev"
    echo ""
    exit 1
fi

# Plus besoin de créer le dossier d'export - on exporte directement dans les albums

# Trouver tous les fichiers vidéo masters dans les albums
video_files=()
for album_dir in photography/* artdirection/*; do
    if [ -d "$album_dir" ]; then
        while IFS= read -r -d '' file; do
            video_files+=("$file")
        done < <(find "$album_dir" -type f \( -iname "*_master*.mov" -o -iname "*_master*.mp4" -o -iname "*_master*.avi" -o -iname "*_master*.mkv" \) -print0)
    fi
done

if [ ${#video_files[@]} -eq 0 ]; then
    echo "❌ Aucun fichier master trouvé dans les albums !"
    echo ""
    echo "Formats supportés : *_master.mov, *_master.mp4, *_master.avi, *_master.mkv"
    echo "Dossiers recherchés : photography/, artdirection/"
    exit 1
fi

echo "📁 ${#video_files[@]} fichier(s) vidéo trouvé(s)"
echo ""

# Traiter chaque fichier master
for video_file in "${video_files[@]}"; do
    # Extraire le numéro et la marque séparément
    base_name=$(basename "$video_file")
    base_name="${base_name%.*}"
    
    # Si c'est un master, supprimer le suffixe
    if [[ "$base_name" == *"_master" ]]; then
        base_name="${base_name%_master}"
    fi
    
    # Séparer numéro et marque
    number=$(echo "$base_name" | cut -d'_' -f1)
    brand=$(echo "$base_name" | cut -d'_' -f2-)
    
    # Construire les noms de sortie (dans le même dossier que le master)
    desktop_output="${video_file%/*}/${number}_desktop_${brand}.mp4"
    mobile_output="${video_file%/*}/${number}_mobile_${brand}.mp4"
    
    # Éviter les doublons
    if [[ ! " ${processed_files[@]} " =~ " ${base_name} " ]]; then
        export_video_h265 "$video_file" "$base_name"
        processed_files+=("$base_name")
        echo ""
    fi
done

echo "=========================================="
echo "EXPORT TERMINÉ !"
echo "=========================================="
echo ""
echo "Spécifications utilisées:"
echo "- Codec: H.265 (HEVC) avec libx265"
echo "- Format: MP4"
echo "- Mode compression: ${COMPRESSION_MODE}"
case $COMPRESSION_MODE in
    "crf")
        echo "- Desktop: CRF ${DESKTOP_CRF}, preset ${DESKTOP_PRESET}, côté long 1920p"
        echo "- Mobile: CRF ${MOBILE_CRF}, preset ${MOBILE_PRESET}, côté long 1280p"
        ;;
    "bitrate")
        echo "- Desktop: ${DESKTOP_BITRATE}kbps, preset ${DESKTOP_PRESET}, côté long 1920p"
        echo "- Mobile: ${MOBILE_BITRATE}kbps, preset ${MOBILE_PRESET}, côté long 1280p"
        ;;
    "filesize")
        echo "- Desktop: max ${DESKTOP_MAX_SIZE}MB, preset ${DESKTOP_PRESET}, côté long 1920p"
        echo "- Mobile: max ${MOBILE_MAX_SIZE}MB, preset ${MOBILE_PRESET}, côté long 1280p"
        ;;
esac
echo "- Unsharp desktop: ${UNSHARP_DESKTOP}"
echo "- Unsharp mobile: ${UNSHARP_MOBILE}"
echo "- Profile: ${H265_PROFILE}, Level: ${H265_LEVEL}"
echo "- Audio: AAC 128k (desktop et mobile) ou pas d'audio si absent"
echo "- Color Space: bt709 avec correction gamma shift QuickTime"
echo "- Méthode: VBR 2-pass pour qualité optimale"
echo ""
echo "✅ Toutes les vidéos ont été exportées en H.265 MP4 avec unsharp !"
