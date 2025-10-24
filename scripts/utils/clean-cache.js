#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage des caches...\n');

// Nettoyer le cache du navigateur en régénérant une nouvelle version
const version = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

// Liste des fichiers temporaires à supprimer
const tempFiles = [
  '.DS_Store',
  'npm-debug.log',
  'yarn-debug.log',
  'yarn-error.log'
];

const rootDir = path.join(__dirname, '../..');
let filesDeleted = 0;

// Fonction récursive pour nettoyer les fichiers temporaires
function cleanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorer node_modules et .git
      if (file !== 'node_modules' && file !== '.git') {
        cleanDirectory(filePath);
      }
    } else if (tempFiles.includes(file)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`  ✓ Supprimé: ${path.relative(rootDir, filePath)}`);
        filesDeleted++;
      } catch (err) {
        console.log(`  ✗ Erreur: ${path.relative(rootDir, filePath)} - ${err.message}`);
      }
    }
  });
}

// Nettoyer les fichiers temporaires
cleanDirectory(rootDir);

console.log(`\n✅ Nettoyage terminé!`);
console.log(`   • ${filesDeleted} fichier(s) supprimé(s)`);
console.log(`   • Nouvelle version cache: ${version}\n`);

