#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Génère un timestamp de version au format YYYYMMDDHHMMSS
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const version = `v=${timestamp}`;

// Dossier racine du projet
const rootDir = path.join(__dirname, '..');

// Regex qui cible l'attribut src du main.min.js avec une version existante
const versionRegex = /src="\/assets\/js\/main\.min\.js\?v=[^"]*"/g;
const buildNewTag = () => `src="/assets/js/main.min.js?${version}"`;

// Parcourt tous les fichiers .html à la racine et met à jour la version
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));
let updatedCount = 0;

files.forEach(file => {
  const filePath = path.join(rootDir, file);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (versionRegex.test(content)) {
      const newContent = content.replace(versionRegex, buildNewTag());
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        updatedCount += 1;
      }
    }
  } catch (error) {
    console.error(`Erreur lors du traitement de ${file}:`, error.message);
    // Continuer avec les autres fichiers
  }
});

process.stdout.write(`Updated main.min.js version in ${updatedCount} HTML file(s) to ${version}\n`);


