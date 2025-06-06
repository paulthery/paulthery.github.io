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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    document.documentElement.classList.add('no-transitions');
  } else {
    document.documentElement.classList.remove('no-transitions');
  }
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
});

document.addEventListener('DOMContentLoaded', () => {
  document.body.style.cursor = 'pointer';
  const mediaCache = new MediaCacheManager();

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

  function buildList(manifestSection, orderList, container, route) {
    if (!manifestSection || !orderList || !container) {
      return;
    }
    const added = new Set();

    orderList.forEach(slug => {
      if (!manifestSection) return;
      const key = Object.keys(manifestSection).find(k =>
        k.toLowerCase() === slug.toLowerCase()
      );
      if (!key) {
        return;
      }
      added.add(key);
      appendItem(container, route, key, manifestSection[key].length);
    });

    if (!manifestSection) return;
    Object.keys(manifestSection)
      .filter(k => !added.has(k))
      .sort((a, b) => a.localeCompare(b))
      .forEach(k => {
        appendItem(container, route, k, manifestSection[k].length);
      });
  }

  function debounce(fn, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  const getVH = () => window.visualViewport?.height || document.documentElement.clientHeight;
  
  window.addEventListener('contextmenu', function(e) {
    e.stopImmediatePropagation();
  }, true);
  
  if (navigator.userAgent.includes("Chrome") && !navigator.userAgent.includes("Edg") && !navigator.userAgent.includes("OPR")) {
    document.body.classList.add("chrome");
  }
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const introText = document.getElementById('intro-text');
  const mainContent = document.getElementById('main-content');
  const mainImage = document.getElementById('main-image');
  const mainVideo = document.getElementById('main-video');
  const nav = document.querySelector('nav');
  if (nav) {
    nav.style.display = 'none';
  }
  const imageWrapper = document.getElementById('image-wrapper');
  imageWrapper.style.position = 'relative';
  const MARGIN_TOP_BOTTOM = 110;
  
  const initialBase = getVH() - (MARGIN_TOP_BOTTOM * 2);
  
  function updateNavPosition() {
    const computedStyle = getComputedStyle(document.documentElement);
    const safeTop    = parseFloat(computedStyle.getPropertyValue('--safe-top'))    || 0;
    const safeBottom = parseFloat(computedStyle.getPropertyValue('--safe-bottom')) || 0;
    if (mainVideo && mainVideo.style.display === 'block') {
      nav.style.position = 'fixed';
      nav.style.bottom = '0';
      return;
    }
    const wrapperRect = imageWrapper.getBoundingClientRect();
    const blankBelow = (getVH() - safeBottom) - wrapperRect.bottom;
    nav.style.position = 'absolute';
    nav.style.top = (wrapperRect.bottom + blankBelow / 2 - nav.offsetHeight / 2) + 'px';
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      const blankAbove = wrapperRect.top - safeTop;
      const cursorTop  = blankAbove / 2 - (customCursor.offsetHeight / 2);
    }
  }

  document.body.style.backgroundColor = 'white';

  const introBackground = document.getElementById('intro-background') || document.createElement('div');
  if (!introBackground.id) {
    introBackground.id = 'intro-background';
    introBackground.style.backgroundColor = 'black';
    document.body.appendChild(introBackground);
  }
  introBackground.addEventListener('transitionend', function(e) {
    if (e.propertyName === 'transform') {
      if (nav) {
        nav.style.display = 'flex';
        preloadAllMedia();
      }
    }
  }, { once: true });

  let currentIndex = 0;
  let images = [];
  let totalImages = 0;
  let galleryImages = [];

  let manifestData, orderData;
  let currentCategory = 'work';
  let currentAlbumKey = '';

  function finishLoad(files) {
    images = files;
    totalImages = images.length;
    currentIndex = 0;
    updateImage();
    galleryImages = images;
  }

  function nextAlbum() {
    if (!orderData || !manifestData) return;
    const albumOrder = orderData[currentCategory];
    const currentIdx = albumOrder.findIndex(name => name.toLowerCase() === currentAlbumKey.toLowerCase());
    let nextAlbumKey = null;
    if (currentIdx === -1) {
      nextAlbumKey = albumOrder[0];
    } else if (currentIdx < albumOrder.length - 1) {
      nextAlbumKey = albumOrder[currentIdx + 1];
    } else {
      nextAlbumKey = albumOrder[0];
    }
    const files = (manifestData[currentCategory] && manifestData[currentCategory][nextAlbumKey]) || [];
    if (files.length === 0) return;
    currentAlbumKey = nextAlbumKey;
    history.pushState(null, '', `/albums/${currentCategory}/${encodeURIComponent(nextAlbumKey)}`);
    const revealMask = document.getElementById('reveal-mask');
    const imageMask = document.getElementById('image-mask');
    if (revealMask) {
      revealMask.style.transition = 'transform 0.8s ease';
      revealMask.style.transform = 'translateY(0)';
    }
    if (imageMask) {
      imageMask.style.transition = 'transform 0.8s ease';
      imageMask.style.transform = 'translateY(0)';
    }
    setTimeout(() => {
      finishLoad(files);
      if (revealMask) {
        revealMask.style.transform = 'translateY(-100%)';
      }
      if (imageMask) {
        imageMask.style.transform = 'translateY(-100%)';
      }
    }, 800);
  }

  function preloadAllMedia() {
    manifestPromise.then(manifest => {
      if (!manifest || !manifest.work || !manifest.projects || !manifest.books) {
        return;
      }
      const allFiles = [
        ...Object.values(manifest.work || {}).flat(),
        ...Object.values(manifest.projects || {}).flat(),
        ...Object.values(manifest.books || {}).flat()
      ];
      
      if (images.length > 0) {
        mediaCache.preloadMedia(images[0]);
      }
      
      mediaCache.startPreloading(allFiles);
    });
  }
  
  const manifestPromise = fetch('/albums.json').then(res => res.json());
  const orderPromise = fetch('/order.json').then(res => res.json());
  
  const albumMatch = location.pathname.match(/\/albums\/([^/]+)\/([^/]+)/);

  manifestPromise.then(manifest => {
    manifestData = manifest;
    let files;
    if (albumMatch) {
      const [, category, album] = albumMatch;
      currentCategory = category;
      currentAlbumKey = album;
      files = manifest && manifest[currentCategory] && manifest[currentCategory][currentAlbumKey] ? manifest[currentCategory][currentAlbumKey] : [];
    } else {
      const defaultKey = manifest && manifest.work ? Object.keys(manifest.work).find(k => k.toLowerCase() === 'recent') : undefined;
      currentAlbumKey = defaultKey;
      files = (manifest && manifest.work && defaultKey) ? manifest.work[defaultKey] : [];
    }
    finishLoad(files);
  });

  orderPromise.then(order => {
    orderData = order;
  });

  if (!introText || !mainContent || !mainImage) {
    if (mainContent) mainContent.style.display = 'flex';
  } else {
    setTimeout(() => {
      showMainContent();
    }, 2500);

    introText.style.opacity = '1';

    setTimeout(() => {
      const paulText = introText.querySelector('.regular');
      if (paulText) {
        paulText.style.transition = 'opacity 1.2s ease';
        paulText.style.opacity = '1';
      }
    }, 600);

    setTimeout(() => {
      const photoText = introText.querySelector('.light');
      if (photoText) {
        photoText.style.transition = 'opacity 1.2s ease';
        photoText.style.opacity = '1';
      }
    }, 800);

    setTimeout(() => {
      const paulText = introText.querySelector('.regular');
      if (paulText) {
        paulText.style.animation = 'glideUp 1.2s ease forwards';
      }
    }, 2000);

    setTimeout(() => {
      const photoText = introText.querySelector('.light');
      if (photoText) {
        photoText.style.animation = 'glideUp 1.2s ease forwards';
      }
    }, 2400);
  }

  const customCursor = document.createElement('div');
  customCursor.id = 'custom-cursor';
  document.body.appendChild(customCursor);
  customCursor.style.opacity = '0';

  document.addEventListener('mousemove', (e) => {
    const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
    const overNavLink = elementUnder && elementUnder.closest('#nav a');
    const overIndexArea = elementUnder && elementUnder.closest('#index-content');
    const overIndexLink = elementUnder && elementUnder.closest('#index-content a');
    if (overIndexArea) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'none';
    }

    if (overNavLink || overIndexArea) {
      const rectSource = overNavLink ? overNavLink : overIndexArea;
      const linkRect = rectSource.getBoundingClientRect();
      setTimeout(() => {
        if (overNavLink) {
          customCursor.style.transition = 'top 0.5s ease, opacity 0.5s ease';
          customCursor.style.top = (linkRect.top - 50) + 'px';
        } else {
          customCursor.style.transition = 'left 0.5s ease, opacity 0.5s ease';
          customCursor.style.left = (e.clientX - 50) + 'px';
        }
        customCursor.style.opacity = '0';
        document.body.classList.add('cursor-off');
        setTimeout(() => {
          customCursor.style.transition = 'none';
        }, 500);
      }, 100);
    } else {
      document.body.classList.remove('cursor-off');
      customCursor.style.transition = 'none';
      customCursor.style.left = e.clientX + 'px';
      customCursor.style.top = e.clientY + 'px';
      if (document.body.classList.contains('intro-complete')) {
        customCursor.style.opacity = '1';
      }
    }
  });

  document.addEventListener('mouseleave', () => {
    customCursor.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    if (document.body.classList.contains('intro-complete')) {
      customCursor.style.opacity = '1';
    }
  });

  function updateCursor() {
    let albumName = "Recent";
    
    const albumMatch = location.pathname.match(/\/albums\/([^/]+)\/([^/]+)/);
    if (albumMatch) {
      const [, , album] = albumMatch;
      albumName = decodeURIComponent(album);
    } else {
      const defaultAlbum = document.querySelector('#gallery-nav span:first-child');
      if (defaultAlbum && defaultAlbum.textContent) {
        albumName = defaultAlbum.textContent;
      }
    }
    
    customCursor.textContent = `${albumName} — ${currentIndex + 1}/${totalImages}`;
  }

  function updateImage() {
    if (!images.length) return;
    const src = images[currentIndex];
    const ext = src.split('.').pop().toLowerCase();

    const imgEl = mainImage;
    const vidEl = mainVideo;

    const cachedMedia = mediaCache.cache.get(src);

    if (/(mp4|webm|mov)$/i.test(ext)) {
      imgEl.style.display = 'none';
      
      if (cachedMedia) {
        vidEl.src = cachedMedia.src;
        vidEl.style.display = 'block';
        vidEl.currentTime = 0;
        vidEl.play().catch(console.error);
      } else {
        vidEl.style.display = 'block';
        vidEl.src = src;
        vidEl.onerror = e => console.error(e);
        vidEl.onloadeddata = () => vidEl.play().catch(console.error);
      }
      imgEl.removeAttribute('alt');
    } else {
      vidEl.pause();
      vidEl.removeAttribute('src');
      vidEl.load();
      vidEl.style.display = 'none';
      
      if (cachedMedia) {
        imgEl.src = cachedMedia.src;
        imgEl.style.display = 'block';
      } else {
        imgEl.style.display = 'block';
        imgEl.src = src;
      }
      imgEl.alt = `Image ${currentIndex + 1} sur ${totalImages} de l'album`;
    }

    updateCursor();
    updateNavPosition();
    document.title = `Paul Thery — ${customCursor.textContent}`;
  }

  function showMainContent() {
    if (!introText || !mainContent) return;
    
    introText.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    introText.style.opacity = '0';
    introText.style.transform = 'translateY(-100px)';
    
    if (introBackground) {
      introBackground.style.transition = 'transform 0.8s ease';
      setTimeout(() => {
        introBackground.style.transform = 'translateY(-100%)';
      }, 400);
    }
    
    const revealMask = document.getElementById('reveal-mask');
    if (revealMask) {
      setTimeout(() => {
        revealMask.style.transition = 'transform 0.8s ease';
        revealMask.style.transform = 'translateY(-100%)';
      }, 600);
    }
    
    setTimeout(() => {
      if (introText) introText.style.display = 'none';
      if (mainContent) {
        mainContent.style.display = 'flex';
        if (mainImage) mainImage.style.opacity = '1';
        mainContent.classList.add('loaded');
      }

      const imageMask = document.getElementById('image-mask');
      if (imageMask) {
        imageMask.style.transition = 'transform 0.8s ease';
        imageMask.style.transform = 'translateY(-100%)';

        imageMask.addEventListener('transitionend', () => {
          document.body.classList.add('intro-complete');
        }, { once: true });
      } else {
        document.body.classList.add('intro-complete');
      }

      updateImage();
      updateNavPosition();
    }, 800);
  }

  if (introText) {
    introText.style.color = 'white';
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      if (currentIndex === totalImages - 1) {
        nextAlbum();
      } else {
        currentIndex = (currentIndex + 1);
        updateImage();
      }
    } else if (e.key === 'ArrowLeft') {
      currentIndex = (currentIndex - 1 + totalImages) % totalImages;
      updateImage();
    }
  });

  if (imageWrapper) {
    imageWrapper.addEventListener('click', (e) => {
      const rect = imageWrapper.getBoundingClientRect();
      const half = rect.left + rect.width / 2;
      if (e.clientX > half) {
        if (currentIndex === totalImages - 1) {
          nextAlbum();
        } else {
          currentIndex = (currentIndex + 1);
        }
      } else {
        currentIndex = (currentIndex - 1 + totalImages) % totalImages;
      }
      updateImage();
    });
  }

  if (imageWrapper && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeStartT = 0;

    imageWrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
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

      const DIST = 50;
      const TIME = 500;

      if (
        dt < TIME &&
        Math.abs(dx) > DIST &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        if (dx < 0) {
          currentIndex = (currentIndex + 1) % totalImages;
        } else {
          currentIndex = (currentIndex - 1 + totalImages) % totalImages;
        }
        updateImage();
      }
    }, { passive: true });
  }

  const indexTrigger = document.getElementById('index-trigger');
  const indexOverlay = document.getElementById('index-overlay');
  const indexContent = document.getElementById('index-content');
  let hasEnteredRight = false;

  if (indexTrigger && indexOverlay && indexContent && imageWrapper) {
    indexTrigger.addEventListener('click', e => {
      e.preventDefault();
      Promise.all([manifestPromise, orderPromise]).then(([manifest, order]) => {
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
      <a href="https://linkedin.com/in/paulthery" target="_blank">LinkedIn</a> </span>
    </div>
  </div>
        `;
        const listPrimary = indexContent.querySelector('.albums-list.primary');
        const listSecondary = indexContent.querySelector('.albums-list.secondary');

        buildList(manifest.work,    order.work,    listPrimary,   'work');
        buildList(manifest.projects, order.projects, listSecondary, 'projects');
        buildList(manifest.books,    order.books,    listSecondary, 'books');

        indexOverlay.classList.add('active');
        if (window.innerWidth <= 768) {
          const cursor = document.getElementById('custom-cursor');
          if (cursor) {
            const top = cursor.getBoundingClientRect().top;
            indexContent.style.paddingTop = `${top}px`;
          }
        }
        imageWrapper.classList.add('index-mode');
        imageWrapper.style.transform = 'translateX(-25vw)';
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

    function closeIndexOverlay() {
      if (indexContent) {
        indexContent.style.transform = 'translateX(100%)';
        indexContent.style.transitionDelay = '0s';
      }
      imageWrapper.classList.remove('index-mode');
      imageWrapper.style.transform = '';
      setTimeout(() => {
        indexOverlay.classList.remove('active');
        indexContent.innerHTML = '';
        indexContent.style.transform = '';
      }, 800);
      hasEnteredRight = false;
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && indexOverlay.classList.contains('active')) {
        closeIndexOverlay();
      }
    });

    indexOverlay.addEventListener('click', e => {
      if (e.clientX < window.innerWidth / 2) {
        closeIndexOverlay();
      }
    });
  }

  if (indexOverlay && indexContent) {
    indexOverlay.addEventListener('mousemove', e => {
      if (!indexOverlay.classList.contains('active')) return;
      const halfWidth = window.innerWidth / 2;
      if (!hasEnteredRight) {
        if (e.clientX > halfWidth) {
          hasEnteredRight = true;
        }
        return;
      }
      if (e.clientX < halfWidth) {
        indexContent.style.transform = 'translateX(100px)';
      } else {
        indexContent.style.transform = 'translateX(0)';
      }
    });
    indexOverlay.addEventListener('mouseleave', () => {
      if (indexOverlay.classList.contains('active')) {
        indexContent.style.transform = 'translateX(0)';
      }
    });
  }

  const galleryTrigger = document.querySelector('[data-gallery]');
  const galleryOverlay = document.getElementById('gallery-overlay');
  const curtainOverlay = document.getElementById('curtain-overlay');
  const topMask = document.getElementById('gallery-top-mask');
  const bottomMask = document.getElementById('gallery-bottom-mask');
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryNav = document.getElementById('gallery-nav');
  const galleryScroll = document.getElementById('gallery-scroll');
  
  if (galleryOverlay && galleryNav && galleryScroll) {
    galleryOverlay.style.display = 'none';
    galleryNav.style.display = 'none';
    galleryScroll.style.display = 'none';
  }

  function updateGalleryMasks() {
    if (!topMask || !bottomMask || !mainImage) return;
    
    const rect = mainImage.getBoundingClientRect();
    topMask.style.height = rect.top + 'px';
    
    const vhMask = getVH();
    bottomMask.style.height = (vhMask - rect.bottom) + 'px';
  }

  function openGallery() {
    if (!galleryOverlay || !galleryGrid || !galleryNav || !galleryScroll) return;
    
    updateGalleryMasks();
    
    if (curtainOverlay) {
      curtainOverlay.style.transform = 'translateY(0)';
    }
    
    if (nav) nav.style.display = 'none';
    
    galleryOverlay.style.display = 'block';
    // Hide custom cursor when gallery is open
    const customCursor = document.getElementById('custom-cursor');
    if (customCursor) customCursor.style.setProperty('display', 'none', 'important');
    document.body.style.cursor = 'pointer';
    galleryOverlay.style.transform = 'translateY(0)';
    
    setTimeout(() => {
      if (topMask) topMask.style.transform = 'translateY(-100%)';
      if (bottomMask) bottomMask.style.transform = 'translateY(100%)';
    }, 100);
    
    galleryNav.style.display = 'block';
    galleryNav.style.opacity = '1';
    galleryScroll.style.display = 'block';
    galleryScroll.style.opacity = '1';
    
    galleryGrid.innerHTML = '';
    
    galleryImages.forEach(src => {
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
    
    setTimeout(() => {
      if (thumbs[0]) thumbs[0].style.opacity = '1';
    }, 800);
    
    setTimeout(() => {
      thumbs.forEach((thumb, i) => {
        if (i === 0) return;
        setTimeout(() => {
          thumb.style.opacity = '1';
        }, Math.random() * 800);
      });
    }, 800);

    thumbs.forEach((thumb, i) => {
      thumb.style.cursor = 'pointer';
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = i;
        updateImage();
        closeGallery();
      });
    });
  }

  function closeGallery() {
    if (!galleryOverlay || !galleryNav || !galleryScroll || !galleryGrid) return;
    
    galleryNav.style.transition = 'opacity 0.8s ease-in-out';
    galleryNav.style.opacity = '0';
    galleryScroll.style.transition = 'opacity 0.8s ease-in-out';
    galleryScroll.style.opacity = '0';

    if (topMask) topMask.style.transform = 'translateY(0)';
    if (bottomMask) bottomMask.style.transform = 'translateY(0)';
    
    if (nav) nav.style.display = 'flex';
    
    setTimeout(() => {
      if (curtainOverlay) {
        curtainOverlay.style.transform = 'translateY(100%)';
      }
      
      setTimeout(() => {
        galleryOverlay.style.display = 'none';
        
        galleryGrid.style.transition = '';
        galleryGrid.style.opacity = '';
        galleryNav.style.opacity = '';
        galleryScroll.style.opacity = '';
      }, 800);
    }, 400);
    // Show custom cursor again after closing gallery
    const customCursor = document.getElementById('custom-cursor');
    if (customCursor) customCursor.style.removeProperty('display');
    document.body.style.cursor = 'pointer';
  }

  if (galleryTrigger) {
    galleryTrigger.addEventListener('click', e => {
      e.preventDefault();
      openGallery();
    });
  }
  
  const closeGalleryBtn = document.getElementById('close-gallery');
  if (closeGalleryBtn) {
    closeGalleryBtn.addEventListener('click', closeGallery);
  }
  
  if (galleryOverlay) {
    galleryOverlay.addEventListener('click', e => {
      if (!e.target.closest('.gallery-thumb')) {
        closeGallery();
      }
    });
  }
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && galleryOverlay && galleryOverlay.style.display === 'block') {
      closeGallery();
    }
  });

  function updateImageStep() {
    if (!imageWrapper || !mainImage) return;
    
    const ratio = getVH() / initialBase;
    
    const increment = 100 / 8;
    
    let step = Math.ceil(ratio * 100 / increment) * increment;
    
    step = Math.max(increment, Math.min(100, step));
    
    const newHeight = Math.round(initialBase * step / 100);
    imageWrapper.style.height = newHeight + 'px';
    
    const newWidth = Math.round(newHeight * 4 / 5);
    imageWrapper.style.width = newWidth + 'px';
    
    mainImage.style.width = '100%';
    mainImage.style.height = 'auto';
    
    updateNavPosition();
  }
  
  updateImageStep();
  
  window.addEventListener('resize', debounce(() => {
    updateImageStep();
    updateNavPosition();
    
    if (galleryOverlay && galleryOverlay.style.display === 'block') {
      updateGalleryMasks();
    }
  }, 100));

  if (mainImage) {
    mainImage.setAttribute('draggable', 'false');
    mainImage.addEventListener('dragstart', e => e.preventDefault());
    mainImage.addEventListener('selectstart', e => e.preventDefault());
  }
  if (mainVideo) {
    mainVideo.setAttribute('draggable', 'false');
    mainVideo.addEventListener('dragstart', e => e.preventDefault());
    mainVideo.addEventListener('selectstart', e => e.preventDefault());
  }
  if (imageWrapper) {
    imageWrapper.addEventListener('selectstart', e => e.preventDefault());
  }
});