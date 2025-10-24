#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const domain = process.env.DOMAIN || 'paulthery.studio';

const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://${domain}/sitemap.xml
`;

fs.writeFileSync(path.join(__dirname, '../..', 'robots.txt'), robotsTxt);
console.log(`✓ robots.txt généré pour ${domain}`);

