// Classe pour gérer le cache des médias
class MediaCacheManager {
  constructor() {
    this.cache = new Map();
    this.preloadQueue = new Set();
    this.isPreloading = false;
  }

  async preloadMedia(src) {
    if (this.cache.has(src)) return this.cache.get(src);
    
    return new Promise((resolve, reject) => {
      const isVideo = /\.(mp4|webm|mov)$/i.test(src);
      
      if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = src;
        
        video.onloadedmetadata = () => {
          // Précharger aussi les premières secondes de la vidéo
          video.preload = 'auto';
          video.onloadeddata = () => {
            this.cache.set(src, video);
            resolve(video);
          };
        };
        
        video.onerror = reject;
      } else {
        const img = new Image();
        img.onload = () => {
          this.cache.set(src, img);
          resolve(img);
        };
        img.onerror = reject;
        img.src = src;
      }
    });
  }

  startPreloading(files) {
    if (this.isPreloading) return;
    this.isPreloading = true;
    
    const preload = async () => {
      for (const file of files) {
        if (!this.cache.has(file)) {
          await this.preloadMedia(file).catch(console.error);
        }
      }
      this.isPreloading = false;
    };
    
    preload();
  }
}

// Disable animations/transitions when page is hidden (e.g., switching Spaces)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    document.documentElement.classList.add('no-transitions');
  } else {
    document.documentElement.classList.remove('no-transitions');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Initialisation du cache média
  const mediaCache = new MediaCacheManager();

  // Helper to append album list items
  function appendItem(container, route, key, count) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `/albums/${route}/${encodeURIComponent(key)}`;
    a.textContent = key;
    const span = document.createElement('span');
    span.className = 'count';
    span.textContent = count;
    li.append(a, span);
    container.append(li);
  }

  // Build primary and secondary album lists
  function buildList(manifestSection, orderList, container, route) {
    const added = new Set();

    // Albums définis dans order.json
    orderList.forEach(slug => {
      const key = Object.keys(manifestSection).find(k =>
        k.toLowerCase() === slug.toLowerCase()
      );
      if (!key) {
        console.warn(`Album "${slug}" not found in manifest section "${route}"`);
        return;
      }
      added.add(key);
      appendItem(container, route, key, manifestSection[key].length);
    });

    // Albums restants, triés alpha
    Object.keys(manifestSection)
      .filter(k => !added.has(k))
      .sort((a, b) => a.localeCompare(b))
      .forEach(k => {
        appendItem(container, route, k, manifestSection[k].length);
      });
  }
  // Utility: debounce calls to limit rapid-fire events
  function debounce(fn, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  // Cross-browser viewport height (accounts for UI Chrome/Safari)
  const getVH = () => window.visualViewport?.height || document.documentElement.clientHeight;
  
  // Restore native right-click before any other handlers
  window.addEventListener('contextmenu', function(e) {
    e.stopImmediatePropagation();
  }, true);
  
  // Add chrome class to body if Chrome (not Edge/Opera)
  if (navigator.userAgent.includes("Chrome") && !navigator.userAgent.includes("Edg") && !navigator.userAgent.includes("OPR")) {
    document.body.classList.add("chrome");
  }
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const introText = document.getElementById('intro-text');
  const mainContent = document.getElementById('main-content');
  const mainImage = document.getElementById('main-image');
  const mainVideo = document.getElementById('main-video');
  const nav = document.querySelector('nav');
  // Hide main navigation until intro background disappears
  if (nav) {
    nav.style.display = 'none';
  }
  const imageWrapper = document.getElementById('image-wrapper');
  // Ensure wrapper is positioned for absolute children
  imageWrapper.style.position = 'relative';
  const MARGIN_TOP_BOTTOM = 110;
  
  // Base height excluding top+bottom margins (MARGIN_TOP_BOTTOM * 2)
  const initialBase = getVH() - (MARGIN_TOP_BOTTOM * 2);
  
  // Function to reposition the nav element based on wrapper blank space
  function updateNavPosition() {
    // === Safe-area insets ===
    const computedStyle = getComputedStyle(document.documentElement);
    const safeTop    = parseFloat(computedStyle.getPropertyValue('--safe-top'))    || 0;
    const safeBottom = parseFloat(computedStyle.getPropertyValue('--safe-bottom')) || 0;
    // If a video is displayed, keep nav fixed at bottom
    if (mainVideo && mainVideo.style.display === 'block') {
      nav.style.position = 'fixed';
      nav.style.bottom = '0';
      return;
    }
    const wrapperRect = imageWrapper.getBoundingClientRect();
    // blank space below wrapper
    const blankBelow = (getVH() - safeBottom) - wrapperRect.bottom;
    // center nav in the blank region
    nav.style.position = 'absolute';
    nav.style.top = (wrapperRect.bottom + blankBelow / 2 - nav.offsetHeight / 2) + 'px';
    // Mobile-only: iOS/Android nav position
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // Center nav above/below image for mobile
      const blankAbove = wrapperRect.top - safeTop;
      const cursorTop  = blankAbove / 2 - (customCursor.offsetHeight / 2);
      // (existing code may follow here)
    }
  }

  // Set initial background color before animation
  document.body.style.backgroundColor = 'white';

  // Create intro background if it doesn't exist
  const introBackground = document.getElementById('intro-background') || document.createElement('div');
  if (!introBackground.id) {
    introBackground.id = 'intro-background';
    introBackground.style.backgroundColor = 'black';
    document.body.appendChild(introBackground);
  }
  // Show main navigation after intro background transition ends
  introBackground.addEventListener('transitionend', function(e) {
    if (e.propertyName === 'transform') {
      if (nav) {
        nav.style.display = 'flex';
        // Lancement du préchargement des images du carousel et de la galerie
        preloadAllMedia();
      }
    }
  }, { once: true });

  let currentIndex = 0;
  let images = [];
  let totalImages = 0;
  let galleryImages = [];

  function finishLoad(files) {
    images = files;
    totalImages = images.length;
    currentIndex = 0;
    updateImage();
    galleryImages = images;
    console.debug('Media files loaded:', files);
  }

  // Preload all carousel & gallery images after intro animation
  function preloadAllMedia() {
    manifestPromise.then(manifest => {
      const allFiles = [
        ...Object.values(manifest.work).flat(),
        ...Object.values(manifest.projects).flat(),
        ...Object.values(manifest.books).flat()
      ];
      
      // Prioriser le chargement du premier média
      if (images.length > 0) {
        mediaCache.preloadMedia(images[0]);
      }
      
      // Précharger le reste de manière asynchrone
      mediaCache.startPreloading(allFiles);
    });
  }
  
  // Load albums manifest and initialize
  const manifestPromise = fetch('/albums.json').then(res => res.json());
  const orderPromise = fetch('/order.json').then(res => res.json());
  
  const albumMatch = location.pathname.match(/\/albums\/([^/]+)\/([^/]+)/);

  manifestPromise.then(manifest => {
    let files;
    if (albumMatch) {
      const [, category, album] = albumMatch;
      files = manifest[category]?.[album] || [];
    } else {
      const defaultKey = Object.keys(manifest.work).find(k => k.toLowerCase() === 'recent');
      files = manifest.work[defaultKey] || [];
    }
    finishLoad(files);
  });

  // Check if intro elements exist
  if (!introText || !mainContent || !mainImage) {
    console.warn('Certains éléments d\'intro sont absents — intro désactivée.');
    // Show main content immediately if intro can't run
    if (mainContent) mainContent.style.display = 'flex';
  } else {
    // Run intro animation after a delay
    setTimeout(() => {
      showMainContent();
    }, 2500);

    // Prepare intro text appearance
    introText.style.opacity = '1';

    // Fade-in "Paul Thery" (regular) at 600ms
    setTimeout(() => {
      const paulText = introText.querySelector('.regular');
      if (paulText) {
        paulText.style.transition = 'opacity 1.2s ease';
        paulText.style.opacity = '1';
      }
    }, 600);

    // Fade-in "Photographer" (light) at 800ms
    setTimeout(() => {
      const photoText = introText.querySelector('.light');
      if (photoText) {
        photoText.style.transition = 'opacity 1.2s ease';
        photoText.style.opacity = '1';
      }
    }, 800);

    // Wipe up and fade-out "Paul Thery" via CSS
    setTimeout(() => {
      const paulText = introText.querySelector('.regular');
      if (paulText) {
        paulText.style.animation = 'glideUp 1.2s ease forwards';
      }
    }, 2000);

    // Wipe up and fade-out "Photographer" via CSS
    setTimeout(() => {
      const photoText = introText.querySelector('.light');
      if (photoText) {
        photoText.style.animation = 'glideUp 1.2s ease forwards';
      }
    }, 2400);
  }

  // Create and configure custom cursor
  const customCursor = document.createElement('div');
  customCursor.id = 'custom-cursor';
  customCursor.style.position = 'fixed';
  customCursor.style.pointerEvents = 'none';
  customCursor.style.fontFamily = '"Untitled Sans", Helvetica, Arial, sans-serif';
  customCursor.style.fontWeight = '300';
  customCursor.style.fontSize = '12px';
  customCursor.style.zIndex = '10000';
  customCursor.style.transition = 'color 0.2s ease';
  customCursor.style.mixBlendMode = 'difference';
  customCursor.style.color = 'white';
  customCursor.style.display = 'none'; // Masquer initialement
  customCursor.style.opacity = '0'; // Double sécurité avec l'opacité
  document.body.appendChild(customCursor);

  // Update cursor position on mouse move
  document.addEventListener('mousemove', (e) => {
    customCursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    const vh = getVH();
    const isInBottomZone = e.clientY >= vh - MARGIN_TOP_BOTTOM;
    if (isInBottomZone) {
      customCursor.style.display = 'none';
      document.body.style.cursor = 'default';
    } else {
      if (document.body.classList.contains('intro-complete')) {
        customCursor.style.display = 'block';
        document.body.style.cursor = 'none';
      }
    }
  });

  // Update the cursor counter display
  function updateCursor() {
    // Récupérer le nom de l'album actuel
    let albumName = "Recent"; // Valeur par défaut
    
    // Extraire le nom d'album depuis l'URL ou utiliser le défaut
    const albumMatch = location.pathname.match(/\/albums\/([^/]+)\/([^/]+)/);
    if (albumMatch) {
      const [, , album] = albumMatch;
      albumName = decodeURIComponent(album);
    } else {
      // Si on est sur la page d'accueil, utiliser l'album par défaut
      const defaultAlbum = document.querySelector('#gallery-nav span:first-child');
      if (defaultAlbum && defaultAlbum.textContent) {
        albumName = defaultAlbum.textContent;
      }
    }
    
    // Formater le texte du curseur avec le nom de l'album
    customCursor.textContent = `${albumName} — ${currentIndex + 1}/${totalImages}`;
  }

  // Update the main image or video based on current index
  function updateImage() {
    if (!images.length) return;
    const src = images[currentIndex];
    const ext = src.split('.').pop().toLowerCase();

    const imgEl = mainImage;
    const vidEl = mainVideo;

    // Vérifier si le média est déjà en cache
    const cachedMedia = mediaCache.cache.get(src);

    if (/(mp4|webm|mov)$/i.test(ext)) {
      imgEl.style.display = 'none';
      
      if (cachedMedia) {
        // Utiliser la vidéo préchargée
        vidEl.src = cachedMedia.src;
        vidEl.style.display = 'block';
        vidEl.currentTime = 0;
        vidEl.play().catch(console.error);
      } else {
        // Charger la vidéo en urgence
        vidEl.style.display = 'block';
        vidEl.src = src;
        vidEl.onerror = e => console.error(e);
        vidEl.onloadeddata = () => vidEl.play().catch(console.error);
      }
    } else {
      vidEl.pause();
      vidEl.removeAttribute('src');
      vidEl.load();
      vidEl.style.display = 'none';
      
      if (cachedMedia) {
        // Utiliser l'image préchargée
        imgEl.src = cachedMedia.src;
        imgEl.style.display = 'block';
      } else {
        // Charger l'image en urgence
        imgEl.style.display = 'block';
        imgEl.src = src;
      }
    }

    updateCursor();
    updateNavPosition();
  }

  // Animation to transition from intro to main content
  function showMainContent() {
    if (!introText || !mainContent) return;
    
    // Fade out intro text with transform
    introText.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    introText.style.opacity = '0';
    introText.style.transform = 'translateY(-100px)';
    
    // Slide up intro background with delay
    if (introBackground) {
      introBackground.style.transition = 'transform 0.8s ease';
      setTimeout(() => {
        introBackground.style.transform = 'translateY(-100%)';
      }, 400);
    }
    
    // Reveal mask animation
    const revealMask = document.getElementById('reveal-mask');
    if (revealMask) {
      setTimeout(() => {
        revealMask.style.transition = 'transform 0.8s ease';
        revealMask.style.transform = 'translateY(-100%)';
      }, 600);
    }
    
    // Show main content and fade in image
    setTimeout(() => {
      if (introText) introText.style.display = 'none';
      if (mainContent) {
        mainContent.style.display = 'flex';
        if (mainImage) mainImage.style.opacity = '1';
        mainContent.classList.add('loaded');
        document.body.classList.add('intro-complete'); // Marquer l'intro comme terminée
      }
      
      // Image mask animation
      const imageMask = document.getElementById('image-mask');
      if (imageMask) {
        imageMask.style.transition = 'transform 0.8s ease';
        imageMask.style.transform = 'translateY(-100%)';
      }
      
      // Afficher le curseur en même temps que la navigation
      if (customCursor) {
        customCursor.style.display = 'block';
        customCursor.style.opacity = '1';
        
        // S'assurer que l'état initial est correct
        updateCursor();
      }
      
      // Update image and nav position
      updateImage();
      updateNavPosition();
    }, 800);
  }

  // Set intro text color based on color scheme preference
  if (introText) {
    if (prefersDark) {
      introText.style.color = 'black';
    } else {
      introText.style.color = 'white';
    }
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      currentIndex = (currentIndex + 1) % totalImages;
      updateImage();
    } else if (e.key === 'ArrowLeft') {
      currentIndex = (currentIndex - 1 + totalImages) % totalImages;
      updateImage();
    }
  });

  // Image click navigation
  if (imageWrapper) {
    imageWrapper.addEventListener('click', (e) => {
      const rect = imageWrapper.getBoundingClientRect();
      const half = rect.left + rect.width / 2;
      if (e.clientX > half) {
        currentIndex = (currentIndex + 1) % totalImages;
      } else {
        currentIndex = (currentIndex - 1 + totalImages) % totalImages;
      }
      updateImage();
    });
  }

  /* --- Swipe navigation on the main image (mobile devices) --- */
  if (imageWrapper && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeStartT = 0;

    imageWrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return; // only single‑finger
      const t = e.touches[0];
      swipeStartX = t.clientX;
      swipeStartY = t.clientY;
      swipeStartT = Date.now();
    }, { passive: true });

    imageWrapper.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - swipeStartX;
      const dy = t.clientY - swipeStartY;
      const dt = Date.now() - swipeStartT;

      const DIST = 50;   // px threshold
      const TIME = 500;  // ms threshold

      if (
        dt < TIME &&
        Math.abs(dx) > DIST &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        if (dx < 0) {
          // swipe left → next
          currentIndex = (currentIndex + 1) % totalImages;
        } else {
          // swipe right → previous
          currentIndex = (currentIndex - 1 + totalImages) % totalImages;
        }
        updateImage();
      }
    }, { passive: true });
  }

  // Index overlay functionality
  const indexTrigger = document.getElementById('index-trigger');
  const indexOverlay = document.getElementById('index-overlay');
  const indexContent = document.getElementById('index-content');
  // Track if cursor has entered right side to enable left-side shift
  let hasEnteredRight = false;
  // Ensure smooth easing on index-content transforms
  if (indexContent) {
    indexContent.style.transition = 'transform 0.8s ease-out';
  }

  if (indexTrigger && indexOverlay && indexContent && imageWrapper) {
    indexTrigger.addEventListener('click', e => {
      e.preventDefault();
      Promise.all([manifestPromise, orderPromise]).then(([manifest, order]) => {
        // Inject dynamic index HTML
        indexContent.innerHTML = `
  <div class="index-header"><span class="medium">Paul Thery</span></div>
  <ul class="albums-list primary"></ul>
  <ul class="albums-list secondary"></ul>
  <div class="index-footer">
    <div class="footer-left">
      <img src="/assets/photo.jpg" alt="Paul Thery" id="index-footer-photo">
    </div>
    <div class="footer-right">
      <a href="mailto:studio@paulthery.com">Contact</a><span class="separator"> — </span>
      <a href="https://instagram.com/paulthery" target="_blank">Instagram</a><span class="separator"> — </span>
      <a href="https://vimeo.com/paulthery" target="_blank">Vimeo</a><span class="separator"> — </span>
      <a href="https://linkedin.com/in/paulthery" target="_blank">LinkedIn</a><span class="separator"> — </span>
      <a href="/newsletter" target="_blank">Newsletter</a>
    </div>
  </div>
        `;
                // Populate "work" albums strictly in the order defined by order.work,
        // extras (non listés) triés alphabétiquement et placés après
        const listPrimary = indexContent.querySelector('.albums-list.primary');
        const listSecondary = indexContent.querySelector('.albums-list.secondary');

        // Populate album lists
        buildList(manifest.work,    order.work,    listPrimary,   'work');
        buildList(manifest.projects, order.projects, listSecondary, 'projects');
        buildList(manifest.books,    order.books,    listSecondary, 'books');

        // Show overlay with the same animation
        indexOverlay.classList.add('active');
        imageWrapper.classList.add('index-mode');
        imageWrapper.style.transform = 'translateX(-25vw)';
        // Delegate clicks on album links for reliability
        indexContent.addEventListener('click', ev => {
          const link = ev.target.closest('.albums-list a');
          if (!link) return;
          ev.preventDefault();
          ev.stopPropagation();
          const [, , category, albEncoded] = link.getAttribute('href').split('/');
          const albumKey = decodeURIComponent(albEncoded);
          const files = manifest[category]?.[albumKey] || [];
          finishLoad(files);
          history.pushState(null, '', link.href);
          closeIndexOverlay();
        });
      });
    });

    // Close index overlay function
    function closeIndexOverlay() {
      indexOverlay.classList.remove('active');
      imageWrapper.classList.remove('index-mode');
      imageWrapper.style.transform = '';
      indexContent.innerHTML = '';
      // Reset index content off-screen after closing
      if (indexContent) {
        indexContent.style.transform = '';
      }
    }

    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && indexOverlay.classList.contains('active')) {
        closeIndexOverlay();
      }
    });

    // Close on click in the left half
    indexOverlay.addEventListener('click', e => {
      if (e.clientX < window.innerWidth / 2) {
        closeIndexOverlay();
      }
    });
  }

  // Interactive shift of index content based on cursor position
  if (indexOverlay && indexContent) {
    indexOverlay.addEventListener('mousemove', e => {
      if (!indexOverlay.classList.contains('active')) return;
      const halfWidth = window.innerWidth / 2;
      // Detect initial entry on right half
      if (!hasEnteredRight) {
        if (e.clientX > halfWidth) {
          hasEnteredRight = true;
        }
        return;
      }
      // Only shift after cursor has been on right
      if (e.clientX < halfWidth) {
        indexContent.style.transform = 'translateX(100px)';
      } else {
        indexContent.style.transform = 'translateX(0)';
      }
    });
    // Reset on mouse leave
    indexOverlay.addEventListener('mouseleave', () => {
      if (indexOverlay.classList.contains('active')) {
        indexContent.style.transform = 'translateX(0)';
      }
    });
  }

  // Gallery functionality
  const galleryTrigger = document.querySelector('[data-gallery]');
  const galleryOverlay = document.getElementById('gallery-overlay');
  const curtainOverlay = document.getElementById('curtain-overlay');
  const topMask = document.getElementById('gallery-top-mask');
  const bottomMask = document.getElementById('gallery-bottom-mask');
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryNav = document.getElementById('gallery-nav');
  const galleryScroll = document.getElementById('gallery-scroll');
  
  // Initialize gallery elements if they exist
  if (galleryOverlay && galleryNav && galleryScroll) {
    galleryOverlay.style.display = 'none';
    galleryNav.style.display = 'none';
    galleryScroll.style.display = 'none';
  }

  // Adjust gallery mask heights to match current image position
  function updateGalleryMasks() {
    if (!topMask || !bottomMask || !mainImage) return;
    
    const rect = mainImage.getBoundingClientRect();
    topMask.style.height = rect.top + 'px';
    
    const vhMask = getVH();
    bottomMask.style.height = (vhMask - rect.bottom) + 'px';
  }

  function openGallery() {
    if (!galleryOverlay || !galleryGrid || !galleryNav || !galleryScroll) return;
    
    // Initialize mask heights
    updateGalleryMasks();
    
    // Slide semi-opaque curtain up behind gallery
    if (curtainOverlay) {
      curtainOverlay.style.transform = 'translateY(0)';
    }
    
    // Hide main navigation
    if (nav) nav.style.display = 'none';
    
    // Show gallery overlay with animation
    galleryOverlay.style.display = 'block';
    galleryOverlay.style.transform = 'translateY(0)';
    
    // Animate masks after a short delay
    setTimeout(() => {
      if (topMask) topMask.style.transform = 'translateY(-100%)';
      if (bottomMask) bottomMask.style.transform = 'translateY(100%)';
    }, 100);
    
    // Show gallery navigation and scroll
    galleryNav.style.display = 'block';
    galleryNav.style.opacity = '1';
    galleryScroll.style.display = 'block';
    galleryScroll.style.opacity = '1';
    
    // Clear and populate gallery grid
    galleryGrid.innerHTML = '';
    
    // Insert thumbnails in numeric order
    galleryImages.forEach(src => {
      // Create media element based on file extension
      const ext = src.split('.').pop().toLowerCase();
      let container = document.createElement('div');
      container.className = 'gallery-thumb';
      
      let el;
      if (ext === 'mp4' || ext === 'webm' || ext === 'mov') {
        el = document.createElement('video');
        el.src = src;
        el.muted = true;
        el.loop = true;
        el.autoplay = true;
        el.controls = false;
        el.setAttribute('playsinline', '');
        el.setAttribute('webkit-playsinline', '');
        el.playsinline = true;
        container.appendChild(el);
      } else {
        el = document.createElement('img');
        el.src = src;
        el.alt = src.split('/').pop();
        el.loading = 'lazy';
        el.decoding = 'async';
        container.appendChild(el);
      }
      
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.6s ease-in-out';
      galleryGrid.appendChild(container);
    });

    const thumbs = galleryGrid.querySelectorAll('.gallery-thumb');
    
    // Fade in first thumbnail when curtain arrives
    setTimeout(() => {
      if (thumbs[0]) thumbs[0].style.opacity = '1';
    }, 800);
    
    // Fade in remaining thumbnails with random delays
    setTimeout(() => {
      thumbs.forEach((thumb, i) => {
        if (i === 0) return;
        setTimeout(() => {
          thumb.style.opacity = '1';
        }, Math.random() * 800);
      });
    }, 800);

    // Add click handlers to thumbnails
    thumbs.forEach((thumb, i) => {
      thumb.style.cursor = 'pointer';
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        // Set the main slideshow to the clicked image
        currentIndex = i;
        updateImage();
        closeGallery();
      });
    });
  }

  function closeGallery() {
    if (!galleryOverlay || !galleryNav || !galleryScroll || !galleryGrid) return;
    
    // Fade out gallery navigation and scroll
    galleryNav.style.transition = 'opacity 0.8s ease-in-out';
    galleryNav.style.opacity = '0';
    galleryScroll.style.transition = 'opacity 0.8s ease-in-out';
    galleryScroll.style.opacity = '0';

    // Reset mask positions
    if (topMask) topMask.style.transform = 'translateY(0)';
    if (bottomMask) bottomMask.style.transform = 'translateY(0)';
    
    // Show main navigation
    if (nav) nav.style.display = 'flex';
    
    // Animate out in sequence
    setTimeout(() => {
      // Animate curtain down
      if (curtainOverlay) {
        curtainOverlay.style.transform = 'translateY(100%)';
      }
      
      // Hide gallery overlay after animation
      setTimeout(() => {
        galleryOverlay.style.display = 'none';
        
        // Reset styles
        galleryGrid.style.transition = '';
        galleryGrid.style.opacity = '';
        galleryNav.style.opacity = '';
        galleryScroll.style.opacity = '';
      }, 800);
    }, 400);
  }

  // Gallery trigger event handlers
  if (galleryTrigger) {
    galleryTrigger.addEventListener('click', e => {
      e.preventDefault();
      openGallery();
    });
  }
  
  // Close gallery button
  const closeGalleryBtn = document.getElementById('close-gallery');
  if (closeGalleryBtn) {
    closeGalleryBtn.addEventListener('click', closeGallery);
  }
  
  // Close gallery on overlay click
  if (galleryOverlay) {
    galleryOverlay.addEventListener('click', e => {
      if (e.target === galleryOverlay) closeGallery();
    });
  }
  
  // Close gallery on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && galleryOverlay && galleryOverlay.style.display === 'block') {
      closeGallery();
    }
  });

  // Stepped resizing based on 8 increments (12.5% steps) of recalculated base height
  function updateImageStep() {
    if (!imageWrapper || !mainImage) return;
    
    // Calculate ratio of available height
    const ratio = getVH() / initialBase;
    
    // Step size for 8 increments (12.5%)
    const increment = 100 / 8;
    
    // Calculate step
    let step = Math.ceil(ratio * 100 / increment) * increment;
    
    // Clamp between one increment and 100%
    step = Math.max(increment, Math.min(100, step));
    
    // Apply height in pixels to wrapper
    const newHeight = Math.round(initialBase * step / 100);
    imageWrapper.style.height = newHeight + 'px';
    
    // Enforce wrapper width from height (4:5 ratio)
    const newWidth = Math.round(newHeight * 4 / 5);
    imageWrapper.style.width = newWidth + 'px';
    
    // Ensure image fills wrapper
    mainImage.style.width = '100%';
    mainImage.style.height = 'auto';
    
    // Reposition nav after resizing wrapper
    updateNavPosition();
  }
  // Prevent duplicate caption injection
  function updateCaptionClasses() {
    // Prevent duplicate caption injection
    if (document.querySelector('.album-title')) return;
    // ... rest of function ...
  }
  
  // Run on initial load and on resize
  updateImageStep();
  
  // Window resize event handlers
  window.addEventListener('resize', debounce(() => {
    updateImageStep();
    updateNavPosition();
    
    // Update gallery masks if gallery is visible
    if (galleryOverlay && galleryOverlay.style.display === 'block') {
      updateGalleryMasks();
    }
  }, 100));
});