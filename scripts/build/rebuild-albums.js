#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Reconstruction des albums avec statistiques...\n');

const order = JSON.parse(fs.readFileSync(path.join(__dirname, '../..', 'order.json'), 'utf8'));
const albumsDir = path.join(__dirname, '../..');
const outputFile = path.join(__dirname, '../..', 'albums.json');
const manifest = {};

let totalImages = 0;
let totalVideos = 0;
let totalAlbums = 0;

// Fonction pour obtenir toutes les variantes d'une image
function getAllImageVariants(files, baseName) {
  const variants = [];
  const possibleVariants = [
    `${baseName}.avif`,
    `${baseName}_mobile.avif`
  ];
  
  for (const variant of possibleVariants) {
    if (files.includes(variant)) {
      variants.push(variant);
    }
  }
  
  return variants;
}

// Fonction pour obtenir toutes les variantes d'une vidéo
function getAllVideoVariants(files, baseName) {
  const variants = [];
  const possibleVariants = [
    `${baseName}.mp4`,
    `${baseName}.webm`,
    `${baseName}_mobile.mp4`,
    `${baseName}_mobile.webm`
  ];
  
  for (const variant of possibleVariants) {
    if (files.includes(variant)) {
      variants.push(variant);
    }
  }
  
  return variants;
}

fs.readdirSync(albumsDir).forEach(category => {
  const catPath = path.join(albumsDir, category);
  if (!fs.statSync(catPath).isDirectory()) return;
  if (category !== 'photography' && category !== 'artdirection') return;
  
  manifest[category] = {};
  
  const orderedAlbums = (order[category] || []);
  const allAlbums = fs.readdirSync(catPath).filter(album =>
    fs.statSync(path.join(catPath, album)).isDirectory()
  );

  console.log(`📁 Catégorie: ${category}`);

  orderedAlbums.forEach(albumName => {
    const albPath = path.join(catPath, albumName);
    if (!fs.existsSync(albPath)) return;
    
    const allFiles = fs.readdirSync(albPath)
      .filter(f => /\.(png|gif|mp4|webm|mov|avif)$/i.test(f));
    
    const uniqueImages = new Map();
    let albumImages = 0;
    let albumVideos = 0;
    
    allFiles.forEach(file => {
      const baseName = file.replace(/\.(avif|png|gif|mp4|webm)$/i, '').replace(/_mobile$/, '');
      
      if (/\.(mp4|webm)$/i.test(file)) {
        if (!uniqueImages.has(baseName)) {
          const variants = getAllVideoVariants(allFiles, baseName);
          if (variants.length > 0) {
            uniqueImages.set(baseName, variants);
            albumVideos++;
          }
        }
        return;
      }
      
      if (!uniqueImages.has(baseName)) {
        const variants = getAllImageVariants(allFiles, baseName);
        if (variants.length > 0) {
          uniqueImages.set(baseName, variants);
          albumImages++;
        }
      }
    });
    
    const allVariants = [];
    uniqueImages.forEach(variants => {
      if (Array.isArray(variants)) {
        allVariants.push(...variants);
      } else {
        allVariants.push(variants);
      }
    });
    
    manifest[category][albumName] = allVariants
      .map(f => `/${category}/${albumName}/${f}`);
    
    console.log(`  ✓ ${albumName}: ${albumImages} images, ${albumVideos} vidéos`);
    totalImages += albumImages;
    totalVideos += albumVideos;
    totalAlbums++;
  });

  allAlbums
    .filter(a => !orderedAlbums.includes(a))
    .sort()
    .forEach(albumName => {
      const albPath = path.join(catPath, albumName);
      
      const allFiles = fs.readdirSync(albPath)
        .filter(f => /\.(png|gif|mp4|webm|mov|avif)$/i.test(f));
      
      const uniqueImages = new Map();
      let albumImages = 0;
      let albumVideos = 0;
      
      allFiles.forEach(file => {
        const baseName = file.replace(/\.(avif|png|gif|mp4|webm)$/i, '').replace(/_mobile$/, '');
        
        if (/\.(mp4|webm)$/i.test(file)) {
          if (!uniqueImages.has(baseName)) {
            const variants = getAllVideoVariants(allFiles, baseName);
            if (variants.length > 0) {
              uniqueImages.set(baseName, variants);
              albumVideos++;
            }
          }
          return;
        }
        
        if (!uniqueImages.has(baseName)) {
          const variants = getAllImageVariants(allFiles, baseName);
          if (variants.length > 0) {
            uniqueImages.set(baseName, variants);
            albumImages++;
          }
        }
      });
      
      manifest[category][albumName] = Array.from(uniqueImages.values())
        .map(f => `/${category}/${albumName}/${f}`);
      
      console.log(`  ✓ ${albumName}: ${albumImages} images, ${albumVideos} vidéos`);
      totalImages += albumImages;
      totalVideos += albumVideos;
      totalAlbums++;
    });
  
  console.log('');
});

fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));

console.log('✅ Albums reconstruits avec succès!\n');
console.log('📊 STATISTIQUES:');
console.log(`   • ${totalAlbums} albums au total`);
console.log(`   • ${totalImages} images`);
console.log(`   • ${totalVideos} vidéos`);
console.log(`   • ${totalImages + totalVideos} médias au total\n`);

