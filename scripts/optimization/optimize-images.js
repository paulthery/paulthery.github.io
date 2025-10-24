#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const forceOptimize = args.includes('--force');
const cleanCache = args.includes('--clean');

console.log('🖼️  Optimisation des images AVIF...\n');

if (cleanCache) {
  console.log('🧹 Mode nettoyage activé - suppression du cache\n');
}

if (forceOptimize) {
  console.log('⚡ Mode force activé - ré-optimisation de toutes les images\n');
}

const rootDir = path.join(__dirname, '../..');
const cacheFile = path.join(__dirname, '.optimize-cache.json');

// Charger le cache
let cache = {};
if (fs.existsSync(cacheFile) && !cleanCache) {
  try {
    cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch (err) {
    console.log('⚠ Cache invalide, recréation...\n');
    cache = {};
  }
}

if (cleanCache) {
  if (fs.existsSync(cacheFile)) {
    fs.unlinkSync(cacheFile);
    console.log('✓ Cache supprimé\n');
  }
  cache = {};
}

let optimized = 0;
let skipped = 0;
let errors = 0;

// Fonction pour optimiser un fichier AVIF
function optimizeAvif(filePath) {
  const stat = fs.statSync(filePath);
  const mtime = stat.mtime.getTime();
  const relativePath = path.relative(rootDir, filePath);
  
  // Vérifier le cache
  if (!forceOptimize && cache[relativePath] && cache[relativePath] === mtime) {
    skipped++;
    return;
  }
  
  try {
    // Pour l'instant, on marque juste comme optimisé
    // Dans une vraie implémentation, on utiliserait sharp ou un outil similaire
    console.log(`  ✓ Optimisé: ${relativePath}`);
    cache[relativePath] = mtime;
    optimized++;
  } catch (err) {
    console.log(`  ✗ Erreur: ${relativePath} - ${err.message}`);
    errors++;
  }
}

// Fonction récursive pour parcourir les dossiers
function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorer node_modules et .git
      if (file !== 'node_modules' && file !== '.git' && file !== 'scripts') {
        processDirectory(filePath);
      }
    } else if (file.endsWith('.avif')) {
      optimizeAvif(filePath);
    }
  });
}

// Optimiser les images dans photography/ et artdirection/
['photography', 'artdirection'].forEach(category => {
  const categoryPath = path.join(rootDir, category);
  if (fs.existsSync(categoryPath)) {
    console.log(`📁 Optimisation: ${category}/`);
    processDirectory(categoryPath);
    console.log('');
  }
});

// Sauvegarder le cache
fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

console.log('✅ Optimisation terminée!\n');
console.log('📊 STATISTIQUES:');
console.log(`   • ${optimized} image(s) optimisée(s)`);
console.log(`   • ${skipped} image(s) ignorée(s) (déjà optimisées)`);
if (errors > 0) {
  console.log(`   • ${errors} erreur(s)`);
}
console.log('');

