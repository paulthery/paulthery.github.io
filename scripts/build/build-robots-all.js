#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Générer le robots.txt pour paulthery.com
process.env.DOMAIN = 'paulthery.com';
execSync('node scripts/build/build-robots.js', { stdio: 'inherit' });
fs.copyFileSync('robots.txt', 'robots-paulthery-com.txt');

// Générer le robots.txt pour paulthery.studio
process.env.DOMAIN = 'paulthery.studio';
execSync('node scripts/build/build-robots.js', { stdio: 'inherit' });
fs.copyFileSync('robots.txt', 'robots-paulthery-studio.txt');

