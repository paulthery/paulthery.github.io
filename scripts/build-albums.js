

// scripts/build-albums.js
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'albums');
const manifest = {};

fs.readdirSync(baseDir).forEach(category => {
  const catPath = path.join(baseDir, category);
  if (!fs.statSync(catPath).isDirectory()) return;
  manifest[category] = {};
  fs.readdirSync(catPath).forEach(album => {
    const albPath = path.join(catPath, album);
    if (!fs.statSync(albPath).isDirectory()) return;
    manifest[category][album] = fs.readdirSync(albPath)
      .filter(f => /\.(jpe?g|png|gif|mp4|mov)$/i.test(f))
      .map(f => `/albums/${category}/${album}/${f}`);
  });
});

fs.writeFileSync('albums.json', JSON.stringify(manifest, null, 2));
console.log('✓ albums.json généré.');