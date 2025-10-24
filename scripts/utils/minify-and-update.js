#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Minification et mise à jour des versions JavaScript...\n');

// Vérifier que terser est installé
try {
  execSync('terser --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Terser n\'est pas installé. Installez-le avec: npm install -g terser');
  process.exit(1);
}

const rootDir = path.join(__dirname, '../..');
const mainJsPath = path.join(rootDir, 'assets/js/main.js');
const mainMinJsPath = path.join(rootDir, 'assets/js/main.min.js');

// Vérifier que main.js existe
if (!fs.existsSync(mainJsPath)) {
  console.error('❌ Fichier main.js introuvable');
  process.exit(1);
}

console.log('📦 Minification de main.js...');
try {
  execSync(`terser "${mainJsPath}" -o "${mainMinJsPath}" -c -m`, { stdio: 'pipe' });
  console.log('✅ Minification terminée');
} catch (error) {
  console.error('❌ Erreur lors de la minification:', error.message);
  process.exit(1);
}

// Vérifier les tailles
const originalSize = fs.statSync(mainJsPath).size;
const minifiedSize = fs.statSync(mainMinJsPath).size;
const reduction = Math.round((1 - minifiedSize / originalSize) * 100);

console.log(`📊 Taille originale: ${(originalSize / 1024).toFixed(1)} KB`);
console.log(`📊 Taille minifiée: ${(minifiedSize / 1024).toFixed(1)} KB`);
console.log(`📊 Réduction: ${reduction}%\n`);

// Mettre à jour les versions dans les fichiers HTML
console.log('🔄 Mise à jour des versions dans les fichiers HTML...');
try {
  execSync('node scripts/utils/update-js-versions-all.js', { stdio: 'inherit' });
  console.log('✅ Versions mises à jour');
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour des versions:', error.message);
  process.exit(1);
}

console.log('\n🎉 Processus terminé avec succès !');
console.log('💡 N\'oubliez pas de recharger la page pour voir les changements.');
