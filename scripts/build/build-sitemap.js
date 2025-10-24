#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const domain = process.env.DOMAIN || 'paulthery.studio';
const albumsFile = path.join(__dirname, '../..', 'albums.json');
const albums = JSON.parse(fs.readFileSync(albumsFile, 'utf8'));

// Date de dernière modification (aujourd'hui)
const lastmod = new Date().toISOString().split('T')[0];

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// Page d'accueil
xml += `  <url>\n`;
xml += `    <loc>https://${domain}/</loc>\n`;
xml += `    <lastmod>${lastmod}</lastmod>\n`;
xml += `    <changefreq>weekly</changefreq>\n`;
xml += `    <priority>1.0</priority>\n`;
xml += `  </url>\n`;

// Page artdirection
xml += `  <url>\n`;
xml += `    <loc>https://${domain}/artdirection</loc>\n`;
xml += `    <lastmod>${lastmod}</lastmod>\n`;
xml += `    <changefreq>monthly</changefreq>\n`;
xml += `    <priority>0.9</priority>\n`;
xml += `  </url>\n`;

// Albums artdirection
if (albums.artdirection) {
  Object.keys(albums.artdirection).forEach(album => {
    const encodedAlbum = encodeURIComponent(album);
    xml += `  <url>\n`;
    xml += `    <loc>https://${domain}/artdirection/${encodedAlbum}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });
}

// Albums photography
if (albums.photography) {
  Object.keys(albums.photography).forEach(album => {
    const encodedAlbum = encodeURIComponent(album);
    xml += `  <url>\n`;
    xml += `    <loc>https://${domain}/photography/${encodedAlbum}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });
}

xml += '</urlset>\n';

fs.writeFileSync(path.join(__dirname, '../..', 'sitemap.xml'), xml);
console.log(`✓ Sitemap généré pour ${domain}`);

