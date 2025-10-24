const fs = require('fs');
const path = require('path');

const order = JSON.parse(fs.readFileSync(path.join(__dirname, '../..', 'order.json'), 'utf8'));

const albumsDir = path.join(__dirname, '../..');
const outputFile = path.join(__dirname, '../..', 'albums.json');
const manifest = {};

// Fonction pour obtenir toutes les variantes d'une image
function getAllImageVariants(files, baseName) {
  const variants = [];
  
  // Chercher seulement les variantes AVIF
  const possibleVariants = [
    `${baseName}.avif`,
    `${baseName}_mobile.avif`
  ];
  
  // Ajouter toutes les variantes trouvées
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
  
  // Chercher les variantes vidéo (desktop et mobile)
  const possibleVariants = [
    `${baseName}.mp4`,
    `${baseName}.webm`,
    `${baseName}_mobile.mp4`,
    `${baseName}_mobile.webm`
  ];
  
  // Ajouter toutes les variantes trouvées
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

  orderedAlbums.forEach(albumName => {
    const albPath = path.join(catPath, albumName);
    if (!fs.existsSync(albPath)) return;
    
    const allFiles = fs.readdirSync(albPath)
      .filter(f => /\.(png|gif|mp4|webm|mov|avif)$/i.test(f));
    
    const uniqueImages = new Map();
    
    allFiles.forEach(file => {
      // Extraire le nom de base sans extension et sans _mobile
      const baseName = file.replace(/\.(avif|png|gif|mp4|webm)$/i, '').replace(/_mobile$/, '');
      
      // Si c'est une vidéo, ajouter toutes les variantes
      if (/\.(mp4|webm)$/i.test(file)) {
        if (!uniqueImages.has(baseName)) {
          const variants = getAllVideoVariants(allFiles, baseName);
          if (variants.length > 0) {
            uniqueImages.set(baseName, variants);
          }
        }
        return;
      }
      
      // Pour les images, ajouter toutes les variantes
      if (!uniqueImages.has(baseName)) {
        const variants = getAllImageVariants(allFiles, baseName);
        if (variants.length > 0) {
          uniqueImages.set(baseName, variants);
        }
      }
    });
    
    // Aplatir toutes les variantes
    const allVariants = [];
    uniqueImages.forEach(variants => {
      if (Array.isArray(variants)) {
        allVariants.push(...variants);
      } else {
        allVariants.push(variants);
      }
    });
    
    manifest[category][albumName] = allVariants
      .map(f => `${category}/${albumName}/${f}`);
  });

  allAlbums
    .filter(a => !orderedAlbums.includes(a))
    .sort()
    .forEach(albumName => {
      const albPath = path.join(catPath, albumName);
      
      const allFiles = fs.readdirSync(albPath)
        .filter(f => /\.(png|gif|mp4|webm|mov|avif)$/i.test(f));
      
      const uniqueImages = new Map();
      
      allFiles.forEach(file => {
        // Extraire le nom de base sans extension et sans _mobile
        const baseName = file.replace(/\.(avif|png|gif|mp4|webm)$/i, '').replace(/_mobile$/, '');
        
        // Si c'est une vidéo, ajouter toutes les variantes
        if (/\.(mp4|webm)$/i.test(file)) {
          if (!uniqueImages.has(baseName)) {
            const variants = getAllVideoVariants(allFiles, baseName);
            if (variants.length > 0) {
              uniqueImages.set(baseName, variants);
            }
          }
          return;
        }
        
        // Pour les images, ajouter toutes les variantes
        if (!uniqueImages.has(baseName)) {
          const variants = getAllImageVariants(allFiles, baseName);
          if (variants.length > 0) {
            uniqueImages.set(baseName, variants);
          }
        }
      });
      
      manifest[category][albumName] = Array.from(uniqueImages.values())
        .map(f => `${category}/${albumName}/${f}`);
    });
});

fs.writeFileSync(outputFile, JSON.stringify(manifest));