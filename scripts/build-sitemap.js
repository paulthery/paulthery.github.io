const fs = require('fs');
const manifest = require('../albums.json');
const order     = require('../order.json');

const site = 'https://paulthery.com';

function slugify(str) {
  return encodeURIComponent(str);
}

const urls = new Set([`${site}/`]);

function pushAlbum(category, album) {
  urls.add(`${site}/albums/${category}/${slugify(album)}`);
}

['work','projects','books'].forEach(cat => {
  const listed = order[cat] || [];
  listed.forEach(k => pushAlbum(cat, k));
  Object.keys(manifest[cat]).forEach(k => pushAlbum(cat, k));
});

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  Array.from(urls).map(u => `  <url><loc>${u}</loc></url>`).join('\n') +
  `\n</urlset>\n`;

fs.writeFileSync('sitemap.xml', xml);
console.log(`Wrote ${urls.size} URLs`);