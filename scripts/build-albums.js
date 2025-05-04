

// scripts/build-albums.js
const fs = require('fs');
const path = require('path');

const order = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'order.json'), 'utf8'));

const baseDir = path.join(__dirname, '..', 'albums');
const manifest = {};

fs.readdirSync(baseDir).forEach(category => {
  const catPath = path.join(baseDir, category);
  if (!fs.statSync(catPath).isDirectory()) return;
  manifest[category] = {};

  // Appliquer l’ordre personnalisé
  const orderedAlbums = (order[category] || []);
  const allAlbums = fs.readdirSync(catPath).filter(album =>
    fs.statSync(path.join(catPath, album)).isDirectory()
  );

  // Albums définis dans order.json
  orderedAlbums.forEach(albumName => {
    const albPath = path.join(catPath, albumName);
    if (!fs.existsSync(albPath)) return;
    manifest[category][albumName] = fs.readdirSync(albPath)
      .filter(f => /\.(jpe?g|png|gif|mp4|mov)$/i.test(f))
      .map(f => `/albums/${category}/${albumName}/${f}`);
  });

  // Albums restants (non listés dans order.json), triés alpha
  allAlbums
    .filter(a => !orderedAlbums.includes(a))
    .sort()
    .forEach(albumName => {
      const albPath = path.join(catPath, albumName);
      manifest[category][albumName] = fs.readdirSync(albPath)
        .filter(f => /\.(jpe?g|png|gif|mp4|mov)$/i.test(f))
        .map(f => `/albums/${category}/${albumName}/${f}`);
    });
});

fs.writeFileSync('albums.json', JSON.stringify(manifest, null, 2));
console.log('✓ albums.json généré.');