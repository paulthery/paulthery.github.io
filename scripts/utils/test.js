#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Running project tests...\n');

let passed = 0;
let failed = 0;

// ✅ Function to display a successful test
function pass(name) {
  console.log(`  ✅ ${name}`);
  passed++;
}

// ❌ Function to display a failed test
function fail(name, error) {
  console.log(`  ❌ ${name}`);
  console.log(`     Error: ${error}\n`);
  failed++;
}

// 📦 Test 1: Check that albums.json exists and is valid
console.log('📦 Structure tests...');
try {
  const albumsPath = path.join(__dirname, '../..', 'albums.json');
  if (fs.existsSync(albumsPath)) {
    const albums = JSON.parse(fs.readFileSync(albumsPath, 'utf8'));
    if (albums.photography && albums.artdirection) {
      pass('albums.json exists and is valid');
    } else {
      fail('albums.json is invalid', 'Missing photography or artdirection');
    }
  } else {
    fail('albums.json exists', 'File not found');
  }
} catch (err) {
  fail('albums.json is valid JSON', err.message);
}

// 📦 Test 2: Check that order.json exists and is valid
try {
  const orderPath = path.join(__dirname, '../..', 'order.json');
  if (fs.existsSync(orderPath)) {
    const order = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
    if (order.photography && order.artdirection) {
      pass('order.json exists and is valid');
    } else {
      fail('order.json is invalid', 'Missing photography or artdirection');
    }
  } else {
    fail('order.json exists', 'File not found');
  }
} catch (err) {
  fail('order.json is valid JSON', err.message);
}

// 📄 Test 3: Check that HTML files exist
console.log('\n📄 HTML files tests...');
['index.html', 'artdirection.html', '404.html'].forEach(file => {
  const filePath = path.join(__dirname, '../..', file);
  if (fs.existsSync(filePath)) {
    pass(`${file} exists`);
  } else {
    fail(`${file} exists`, 'File not found');
  }
});

// 🗺️ Test 4: Check that sitemaps exist and are valid
console.log('\n🗺️ Sitemaps tests...');
['sitemap.xml', 'sitemap-paulthery-com.xml', 'sitemap-paulthery-studio.xml'].forEach(file => {
  const filePath = path.join(__dirname, '../..', file);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('<?xml') && content.includes('<urlset')) {
        pass(`${file} exists and is valid`);
      } else {
        fail(`${file} is valid XML`, 'Invalid XML format');
      }
    } catch (err) {
      fail(`${file} is readable`, err.message);
    }
  } else {
    fail(`${file} exists`, 'File not found');
  }
});

// 🤖 Test 5: Check that robots.txt files exist and are valid
console.log('\n🤖 Robots.txt tests...');
['robots.txt', 'robots-paulthery-com.txt', 'robots-paulthery-studio.txt'].forEach(file => {
  const filePath = path.join(__dirname, '../..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('User-agent:') && content.includes('Sitemap:')) {
      pass(`${file} exists and is valid`);
    } else {
      fail(`${file} is valid`, 'Invalid robots.txt format');
    }
  } else {
    fail(`${file} exists`, 'File not found');
  }
});

// 🖼️ Test 6: Check that all albums contain media
console.log('\n🖼️ Albums tests...');
try {
  const albumsPath = path.join(__dirname, '../..', 'albums.json');
  const albums = JSON.parse(fs.readFileSync(albumsPath, 'utf8'));
  
  let emptyAlbums = [];
  
  Object.keys(albums).forEach(category => {
    Object.keys(albums[category]).forEach(album => {
      if (!albums[category][album] || albums[category][album].length === 0) {
        emptyAlbums.push(`${category}/${album}`);
      }
    });
  });
  
  if (emptyAlbums.length === 0) {
    pass('All albums contain media');
  } else {
    fail('Empty albums detected', `Empty albums: ${emptyAlbums.join(', ')}`);
  }
} catch (err) {
  fail('Albums verification', err.message);
}

// 🔧 Test 7: Check that build scripts exist
console.log('\n🔧 Build scripts tests...');
const requiredScripts = [
  { name: 'build-albums.js', path: 'build/build-albums.js' },
  { name: 'build-sitemaps.js', path: 'build/build-sitemaps.js' },
  { name: 'build-robots-all.js', path: 'build/build-robots-all.js' },
  { name: 'build-sitemap.js', path: 'build/build-sitemap.js' },
  { name: 'build-robots.js', path: 'build/build-robots.js' },
  { name: 'update-js-version.js', path: 'utils/update-js-version.js' },
  { name: 'rebuild-albums.js', path: 'build/rebuild-albums.js' },
  { name: 'clean-cache.js', path: 'utils/clean-cache.js' },
  { name: 'optimize-images.js', path: 'optimization/optimize-images.js' }
];

requiredScripts.forEach(script => {
  const scriptPath = path.join(__dirname, '..', script.path);
  if (fs.existsSync(scriptPath)) {
    pass(`${script.name} exists`);
  } else {
    fail(`${script.name} exists`, 'File not found');
  }
});

// 📦 Test 8: Check that minified assets exist
console.log('\n📦 Minified assets tests...');
const minifiedFiles = [
  'assets/js/main.min.js',
  'assets/css/main.min.css',
  'assets/js/modules/format-detector.min.js',
  'assets/js/modules/media-cache.min.js',
  'assets/js/modules/ui-helpers.min.js',
  'assets/js/modules/slideshow.min.js'
];

minifiedFiles.forEach(file => {
  const filePath = path.join(__dirname, '../..', file);
  if (fs.existsSync(filePath)) {
    pass(`${file} exists`);
  } else {
    fail(`${file} exists`, 'File not found');
  }
});

// 🎨 Test 9: Check that package.json is up to date
console.log('\n🎨 Package.json tests...');
try {
  const packagePath = path.join(__dirname, '../..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check that dependencies are up to date
  const expectedDeps = {
    '@types/node': '^24.9.1',
    'sharp': '^0.34.4',
    'terser': '^5.44.0',
    'clean-css-cli': '^5.6.3',
    'chokidar': '^4.0.3'
  };
  
  let depsOk = true;
  Object.keys(expectedDeps).forEach(dep => {
    if (packageJson.devDependencies[dep] !== expectedDeps[dep]) {
      depsOk = false;
    }
  });
  
  if (depsOk) {
    pass('Package.json dependencies are up to date');
  } else {
    fail('Package.json dependencies are up to date', 'Some dependencies need updating');
  }
} catch (err) {
  fail('Package.json is valid', err.message);
}

// 📁 Test 10: Check scripts organization
console.log('\n📁 Scripts organization tests...');
const scriptFolders = ['build', 'optimization', 'utils', 'archive'];
scriptFolders.forEach(folder => {
  const folderPath = path.join(__dirname, '..', folder);
  if (fs.existsSync(folderPath)) {
    pass(`Scripts folder ${folder}/ exists`);
  } else {
    fail(`Scripts folder ${folder}/ exists`, 'Folder not found');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All tests passed!\n');
  process.exit(0);
} else {
  console.log(`❌ ${failed} test(s) failed\n`);
  process.exit(1);
}

