#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Générer un timestamp pour le cache busting
const version = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

// Fonction pour mettre à jour les références JS dans les fichiers HTML
function updateJsVersion(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ Fichier non trouvé : ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remplacer les versions JS
  const updated = content.replace(
    /main\.min\.js\?v=\d+/g,
    `main.min.js?v=${version}`
  );

  if (content !== updated) {
    fs.writeFileSync(filePath, updated);
    console.log(`✓ Version JS mise à jour dans ${path.basename(filePath)} -> v=${version}`);
  } else {
    console.log(`✓ Aucun changement nécessaire dans ${path.basename(filePath)}`);
  }
}

// Mettre à jour tous les fichiers HTML
const htmlFiles = ['index.html', 'artdirection.html', '404.html'];
const rootDir = path.join(__dirname, '../..');

htmlFiles.forEach(file => {
  updateJsVersion(path.join(rootDir, file));
});

console.log(`\n✓ Cache busting version: ${version}`);

