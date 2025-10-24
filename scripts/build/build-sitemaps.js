#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Générer le sitemap pour paulthery.com
process.env.DOMAIN = 'paulthery.com';
execSync('node scripts/build/build-sitemap.js', { stdio: 'inherit' });
fs.copyFileSync('sitemap.xml', 'sitemap-paulthery-com.xml');

// Générer le sitemap pour paulthery.studio
process.env.DOMAIN = 'paulthery.studio';
execSync('node scripts/build/build-sitemap.js', { stdio: 'inherit' });
fs.copyFileSync('sitemap.xml', 'sitemap-paulthery-studio.xml');

