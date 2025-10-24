#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 1) "Minifier" en copiant les fichiers vers leurs versions .min.js
const jsPairs = [
  ['assets/js/main.js', 'assets/js/main.min.js'],
  ['assets/js/modules/media-cache.js', 'assets/js/modules/media-cache.min.js'],
  ['assets/js/modules/slideshow.js', 'assets/js/modules/slideshow.min.js'],
  ['assets/js/modules/format-detector.js', 'assets/js/modules/format-detector.min.js'],
  ['assets/js/modules/ui-helpers.js', 'assets/js/modules/ui-helpers.min.js'],
];

jsPairs.forEach(([src, dest]) => {
  const srcPath = path.join(__dirname, '..', src);
  const destPath = path.join(__dirname, '..', dest);
  try {
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  } catch (e) {
    // ignore copy errors to avoid breaking the flow
  }
});

// 2) Mettre à jour les timestamps (cache-busting) dans tous les .html à la racine
const rootDir = path.join(__dirname, '..');
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
const version = `v=${timestamp}`;

const patterns = [
  {
    regex: /src="\/assets\/js\/main\.min\.js\?v=[^"]*"/g,
    build: () => `src="/assets/js/main.min.js?${version}"`,
  },
  {
    regex: /src="\/assets\/js\/main\.js\?v=[^"]*"/g,
    build: () => `src="/assets/js/main.js?${version}"`,
  },
];

const htmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));
let updated = 0;
htmlFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    patterns.forEach(({ regex, build }) => {
      if (regex.test(content)) {
        content = content.replace(regex, build());
        changed = true;
      }
    });
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      updated += 1;
    }
  } catch (error) {
    console.error(`Erreur lors du traitement de ${file}:`, error.message);
    // Continuer avec les autres fichiers
  }
});

process.stdout.write(`Copied JS to .min variants and updated versions to ${version} in ${updated} HTML file(s)\n`);


