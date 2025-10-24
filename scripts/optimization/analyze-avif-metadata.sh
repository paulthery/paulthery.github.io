#!/bin/bash

# Script pour analyser les métadonnées de tous les fichiers AVIF
# et identifier ceux en YUV 4:4:4

echo "=== ANALYSE DES MÉTADONNÉES AVIF ==="
echo "Recherche des fichiers AVIF en YUV 4:4:4..."
echo ""

# Compteurs
total_files=0
yuv444_files=0
yuv420_files=0
other_files=0

# Fichiers en YUV 4:4:4
declare -a yuv444_list=()

# Analyser tous les fichiers AVIF
while IFS= read -r -d '' avif_file; do
    ((total_files++))
    
    # Extraire les infos avec avifdec --info
    info_output=$(avifdec --info "$avif_file" 2>/dev/null)
    
    # Chercher le format YUV
    if echo "$info_output" | grep -q "Format.*YUV444"; then
        ((yuv444_files++))
        yuv444_list+=("$avif_file")
        echo "✅ YUV 4:4:4: $avif_file"
    elif echo "$info_output" | grep -q "Format.*YUV420"; then
        ((yuv420_files++))
        echo "📊 YUV 4:2:0: $avif_file"
    else
        ((other_files++))
        echo "❓ Autre: $avif_file"
    fi
    
    # Afficher le progrès tous les 50 fichiers
    if [ $((total_files % 50)) -eq 0 ]; then
        echo "  📈 Progrès: $total_files fichiers analysés..."
    fi
    
done < <(find photography artdirection -name "*.avif" -type f -print0)

echo ""
echo "=== RÉSULTATS ==="
echo "Total fichiers AVIF: $total_files"
echo "YUV 4:4:4: $yuv444_files"
echo "YUV 4:2:0: $yuv420_files"
echo "Autres formats: $other_files"
echo ""

if [ ${#yuv444_list[@]} -gt 0 ]; then
    echo "=== FICHIERS EN YUV 4:4:4 ==="
    for file in "${yuv444_list[@]}"; do
        echo "  $file"
    done
else
    echo "Aucun fichier en YUV 4:4:4 trouvé."
fi

echo ""
echo "=== ANALYSE TERMINÉE ==="
