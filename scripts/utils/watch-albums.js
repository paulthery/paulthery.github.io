#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

// Chemins à surveiller
const watchPaths = [
  path.join(__dirname, '..', 'photography'),
  path.join(__dirname, '..', 'artdirection')
];

// Script de build des albums
const buildScript = path.join(__dirname, 'build-albums.js');

console.log('🔍 Surveillance des dossiers d\'albums...');
console.log('📁 Dossiers surveillés:', watchPaths);

// Fonction pour régénérer albums.json
function rebuildAlbums() {
  console.log('🔄 Changement détecté - régénération d\'albums.json...');
  
  try {
    // Exécuter le script de build
    require(buildScript);
    console.log('✅ albums.json régénéré avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la régénération:', error.message);
  }
}

// Surveiller les changements
const watcher = chokidar.watch(watchPaths, {
  ignored: /(^|[\/\\])\../, // Ignorer les fichiers cachés
  persistent: true,
  ignoreInitial: true // Ne pas déclencher au démarrage
});

// Événements de surveillance
watcher
  .on('add', (filePath) => {
    console.log(`➕ Fichier ajouté: ${path.relative(process.cwd(), filePath)}`);
    rebuildAlbums();
  })
  .on('unlink', (filePath) => {
    console.log(`➖ Fichier supprimé: ${path.relative(process.cwd(), filePath)}`);
    rebuildAlbums();
  })
  .on('addDir', (dirPath) => {
    console.log(`📁 Dossier ajouté: ${path.relative(process.cwd(), dirPath)}`);
    rebuildAlbums();
  })
  .on('unlinkDir', (dirPath) => {
    console.log(`📁 Dossier supprimé: ${path.relative(process.cwd(), dirPath)}`);
    rebuildAlbums();
  })
  .on('ready', () => {
    console.log('🚀 Surveillance active - ajoutez/supprimez des images dans les dossiers');
    console.log('💡 Appuyez sur Ctrl+C pour arrêter');
  })
  .on('error', (error) => {
    console.error('❌ Erreur de surveillance:', error);
  });

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt de la surveillance...');
  watcher.close();
  process.exit(0);
});
