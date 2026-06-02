// ========================================
// 🎨 PAUL THERY PORTFOLIO - MAIN JAVASCRIPT
// ========================================
// TABLE DES MATIÈRES:
// 1. CONFIGURATION & CONSTANTS
// 2. UTILITY FUNCTIONS
//    - cleanBaseName()
//    - filterUniqueImages()
//    - capitalizeWordsOver3Letters()
//    - appendItem()
//    - buildList()
// 3. CORE CLASSES
//    - MediaCacheManager
//    - NavigationManager
//    - FluidSlideshow
//    - IndexOverlayManager
//    - GalleryManager
//    - IntroManager
//    - PageManager
// 4. APPLICATION INITIALIZATION
// ========================================

'use strict';

// ========================================
// 1. CONFIGURATION & CONSTANTS
// ========================================

/**
 * Global configuration object
 * Centralize all magic numbers and configuration values
 */
const CONFIG = {
  // Device breakpoints
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1200,

  // Cache timeouts (ms)
  TIMEOUT_DEFAULT: 30000,
  TIMEOUT_CHANEL: 60000,
  TIMEOUT_VIDEO: 45000,
  TIMEOUT_IMAGE: 15000,
  TIMEOUT_LOAD_IMAGE: 10000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,

  // Preload configuration
  WINDOW_SIZE: 5, // Virtual window = 11 slides (5*2+1)
  VIRTUAL_WINDOW_SIZE: 5,
  SLIDESHOW_THROTTLE: 33, // 30fps

  // Navigation
  NAV_HEIGHT: 80,
  MARGIN_DESKTOP: 220,
  MARGIN_MOBILE: 160,
  MARGIN_TABLET: 250,
  THROTTLE_DELAY: 100,

  // Quick tap detection
  QUICK_TAP_THRESHOLD: 5, // pixels
  QUICK_TAP_MAX_TIME: 300, // ms

  // File patterns
  IMAGE_EXTENSIONS: /\.(avif|webp|jpg|jpeg|png)$/i,
  VIDEO_EXTENSIONS: /\.(mp4|webm)$/i,
  FILENAME_CLEAN_PATTERN: /\.(avif|mp4|webm)$/i,

  // Gallery
  GALLERY_THUMB_SIZE: 135,
  GALLERY_GAP: 30,
  GALLERY_ROW_GAP: 38,

  // Performance
  CLEANUP_WINDOW_SIZE: 25, // Keep 50 slides in memory (25 before + 25 after)
  RAF_THROTTLE: 16, // ~60fps

  // Intro
  INTRO_FADE_IN_DELAY: 350,
  INTRO_NAME_DELAY: 500,
  INTRO_DESCRIPTION_DELAY: 800,
  INTRO_TOTAL_DELAY: 1200,
  REVEAL_MASK_DELAY: 1700,
  IMAGE_MASK_DELAY: 2300,
};

// ========================================
// 2. UTILITY FUNCTIONS
// ========================================

/**
 * 🧹 CLEAN FILENAME UTILITY
 * @param {string} file - File name
 * @returns {string} - Cleaned base name
 */
function cleanBaseName(file) {
  let baseName = file;

  // 🔍 Pattern: 000_desktop_xxx or 000_mobile_xxx or 000_desktop or 000_mobile
  if (baseName.includes('_desktop_')) {
    baseName = baseName.replace(/_desktop_/, '_');
  } else if (baseName.includes('_mobile_')) {
    baseName = baseName.replace(/_mobile_/, '_');
  } else if (baseName.match(/\d+_desktop\./)) {
    baseName = baseName.replace(/_desktop\./, '.');
  } else if (baseName.match(/\d+_mobile\./)) {
    baseName = baseName.replace(/_mobile\./, '.');
  }

  // ✂️ Remove extension (AVIF only in this project)
  baseName = baseName.replace(/\.(avif|mp4|webm)$/i, '');

  return baseName;
}

// 🔍 FILTER UNIQUE FILES FUNCTION (desktop/mobile)
function filterUniqueImages(files) {
  const uniqueImages = new Map();
  const isMobile = window.matchMedia
    ? window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches
    : false;
  const targetSuffix = isMobile ? '_mobile' : '_desktop';

  files.forEach(file => {
    const baseName = cleanBaseName(file);

    if (!uniqueImages.has(baseName)) {
      // 🔍 Find appropriate version (mobile or desktop)
      const bestVersion = files.find(f => {
        const fBase = cleanBaseName(f);
        return fBase === baseName && f.includes(targetSuffix);
      });

      if (bestVersion) {
        uniqueImages.set(baseName, bestVersion);
      }
    }
  });

  return Array.from(uniqueImages.values());
}

function capitalizeWordsOver3Letters(text) {
  return text
    .split(' ')
    .map(word => {
      if (/^[ivxlcdm]+$/i.test(word)) {
        return word.toLowerCase();
      }

      if (/[;:.\/]/.test(word)) {
        return word.toLowerCase();
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/s:s/g, 's/s')
    .replace(/lv s\/s/g, 'LV s/s');
}

function appendItem(container, route, key, count) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = `/${route}/${encodeURIComponent(key)}`;
  a.textContent = capitalizeWordsOver3Letters(key);
  const span = document.createElement('span');
  span.className = 'count';
  span.textContent = String(count).padStart(2, '0');
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
    const key = Object.keys(manifestSection).find(k => k.toLowerCase() === slug.toLowerCase());
    if (!key) {
      return;
    }
    added.add(key);
    const uniqueFiles = filterUniqueImages(manifestSection[key]);
    appendItem(container, route, key, uniqueFiles.length);
  });
  if (!manifestSection) return;
  Object.keys(manifestSection)
    .filter(k => !added.has(k))
    .sort((a, b) => a.localeCompare(b))
    .forEach(k => {
      const uniqueFiles = filterUniqueImages(manifestSection[k]);
      appendItem(container, route, k, uniqueFiles.length);
    });
}

// ========================================
// 📦 MODULE: MEDIA CACHE MANAGER
// ========================================

class MediaCacheManager {
  constructor() {
    this.cache = new Map(); // 🖼️ Images
    this.loadingPromises = new Map(); // 🚫 Avoid multiple loads
    this.preloadQueue = new Set();
    this.isPreloading = false;
    this.failedLoads = new Set();
    this.retryAttempts = new Map();
    this.maxRetries = CONFIG.MAX_RETRIES;
    this.retryDelay = CONFIG.RETRY_DELAY;

    this.timeouts = {
      default: CONFIG.TIMEOUT_DEFAULT,
      chanel: CONFIG.TIMEOUT_CHANEL,
      video: CONFIG.TIMEOUT_VIDEO,
      image: CONFIG.TIMEOUT_IMAGE,
    };
  }

  getTimeoutDuration(src) {
    if (src.includes('chanel')) {
      return this.timeouts.chanel;
    }
    const isVideo = /\.(mp4|webm)$/i.test(src);
    if (isVideo) {
      return this.timeouts.video;
    }
    return this.timeouts.image;
  }

  async preloadMedia(src) {
    const optimalUrl = src; // AVIF only, no conversion needed
    const isVideo = /\.(mp4|webm)$/i.test(src);

    // 🎬 For videos, do nothing on preload - they will load on demand
    // ✅ Just return resolved promise to avoid blocking
    if (isVideo) {
      return Promise.resolve({ type: 'video', src });
    }

    // 🖼️ For images, normal behavior
    if (this.cache.has(optimalUrl)) {
      return this.cache.get(optimalUrl);
    }

    if (this.cache.has(src)) {
      return this.cache.get(src);
    }

    if (this.failedLoads.has(optimalUrl)) {
      throw new Error(`Media failed to load after ${this.maxRetries} attempts: ${optimalUrl}`);
    }

    return new Promise((resolve, reject) => {
      const handleSuccess = (media, actualUrl) => {
        this.cache.set(actualUrl, media);
        this.cache.set(src, media);
        this.retryAttempts.delete(actualUrl);
        this.failedLoads.delete(actualUrl);
        resolve(media);
      };

      const handleError = async (error, failedUrl) => {
        this.failedLoads.add(optimalUrl);
        this.retryAttempts.delete(optimalUrl);
        reject(error);
      };

      this.loadImage(optimalUrl)
        .then(img => handleSuccess(img, optimalUrl))
        .catch(error => handleError(error, optimalUrl));
    });
  }

  /**
   * 🚀 Start sequential preloading of virtual windows
   * Load complete window (11 slides) in parallel, then move to next
   * @param {Array} files - List of URLs to preload
   * @param {number} startIndex - Start index (current slide)
   * @param {number} windowSize - Virtual window size (default: 5, total 11 slides)
   */
  startSequentialPreload(files, startIndex = 0, windowSize = CONFIG.WINDOW_SIZE) {
    if (this.isPreloading) {
      this.stopPreloading();
    }

    if (!files || files.length === 0) {
      return;
    }

    this.isPreloading = true;
    const totalSlides = files.length;
    const slidesPerWindow = windowSize * 2 + 1; // windowSize = CONFIG.WINDOW_SIZE → 11 slides per window
    const totalWindows = Math.ceil(totalSlides / slidesPerWindow);

    // 🎯 Determine which window contains startIndex
    const startWindow = Math.floor(startIndex / slidesPerWindow);

    const preload = async () => {
      // 🔄 Loop through all windows starting from startIndex window
      for (let i = 0; i < totalWindows; i++) {
        if (!this.isPreloading) break;

        // 🧮 Calculate window index (circular rotation)
        const windowIndex = (startWindow + i) % totalWindows;
        const windowStart = windowIndex * slidesPerWindow;
        const windowEnd = Math.min(windowStart + slidesPerWindow, totalSlides);

        // 📥 Get files from this window
        const windowFiles = files.slice(windowStart, windowEnd);

        // 🔍 Filter those already cached or failed
        const filesToLoad = windowFiles.filter(
          file => !this.cache.has(file) && !this.failedLoads.has(file)
        );

        // ⚡ Load all files from this window in parallel
        if (filesToLoad.length > 0) {
          await Promise.allSettled(filesToLoad.map(file => this.preloadMedia(file)));
        }
      }

      this.isPreloading = false;
    };

    preload().catch(() => {
      this.isPreloading = false;
    });
  }

  /**
   * ⏹️ Stop current preloading
   */
  stopPreloading() {
    this.isPreloading = false;
  }

  clearCache() {
    this.cache.clear();
    this.failedLoads.clear();
    this.retryAttempts.clear();
    this.loadingPromises.clear();
  }

  getStats() {
    return {
      cached: this.cache.size,
      failed: this.failedLoads.size,
      isPreloading: this.isPreloading,
    };
  }

  retryFailedMedia(src) {
    this.failedLoads.delete(src);
    this.retryAttempts.delete(src);
    return this.preloadMedia(src);
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeoutDuration = CONFIG.TIMEOUT_LOAD_IMAGE;

      const timeout = setTimeout(() => {
        reject(new Error(`Image loading timeout: ${url}`));
      }, timeoutDuration);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Image failed to load: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * ✅ ✅ IMPROVED METHOD: Return Blob URL for videos
   */
  /**
   * 📊 Get all cached media info
   */
  getCachedMedia(src) {
    const optimalUrl = src; // AVIF only, no conversion needed
    const isVideo = /\.(mp4|webm)$/i.test(src);

    if (isVideo) {
      return this.getCachedVideo(src);
    }

    // 🖼️ 🖼️ Classic images
    let cached = this.cache.get(optimalUrl);
    if (!cached) {
      cached = this.cache.get(src);
    }

    return cached;
  }

  /**
   * 🎬 Get all cached video info
   */
  getCachedVideo(url) {
    // 🚫 No more blob cache, just return basic info
    return {
      type: 'video',
      isFullyLoaded: false, // Always false now
      blobUrl: null,
      posterUrl: null,
      metadata: null,
      originalSrc: url,
    };
  }

  getFormatInfo() {
    // All images are AVIF, no format detection needed
    return {
      avif: true,
      isMobile: utils.isMobile(),
    };
  }
}

// ========================================
// 📦 MODULE: NAVIGATION MANAGER
// ========================================

// 🧭 NAVIGATION MANAGER - Unified navigation positioning system
// Replaces the old complex system with a simple and consistent approach

class NavigationManager {
  constructor() {
    this.nav = document.getElementById('nav');
    this.imageWrapper = document.getElementById('image-wrapper');
    this.mainContent = document.getElementById('main-content');

    // Configuration
    this.config = {
      marginDesktop: CONFIG.MARGIN_DESKTOP, // Marge totale desktop (haut + bas)
      marginMobile: CONFIG.MARGIN_MOBILE, // Marge totale mobile
      marginTablet: CONFIG.MARGIN_TABLET, // Total tablet margin (compensated for nav 110px)
      navHeight: CONFIG.NAV_HEIGHT, // Hauteur de la navigation
      throttleDelay: CONFIG.THROTTLE_DELAY, // Throttle delay in ms
      mobileBreakpoint: CONFIG.MOBILE_BREAKPOINT,
      tabletBreakpoint: CONFIG.TABLET_BREAKPOINT,
    };

    // State
    this.lastUpdate = 0;
    this.isInitialized = false;
    this.rafId = null;

    // Method binding
    this.updatePosition = this.updatePosition.bind(this);
    this.throttledUpdate = this.throttledUpdate.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  init() {
    if (!this.nav || !this.imageWrapper) {
      return;
    }

    // Configuration initiale du nav
    this.setupNavStyles();

    // Position initially after intro is complete
    if (document.body.classList.contains('intro-complete')) {
      this.updatePosition();
    }

    // Listen for changes
    this.setupEventListeners();

    // Observe wrapper changes
    this.setupResizeObserver();

    this.isInitialized = true;
  }

  setupNavStyles() {
    // Ensure nav has necessary base styles
    Object.assign(this.nav.style, {
      position: 'fixed',
      left: '0',
      right: '0',
      width: '100%',
      transition: 'top 0.3s ease',
    });
  }

  setupEventListeners() {
    // Resize avec throttling
    window.addEventListener('resize', this.handleResize, { passive: true });

    // Update on complete loading
    window.addEventListener('load', () => this.updatePosition());

    // Listen for intro complete event
    document.addEventListener('introComplete', () => this.updatePosition());

    // Listen for image changes
    document.addEventListener('imageUpdated', () => this.throttledUpdate());

    // For mobile orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updatePosition(), 100);
    });
  }

  setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.target === this.imageWrapper) {
            this.throttledUpdate();
          }
        }
      });
      observer.observe(this.imageWrapper);
    }
  }

  handleResize() {
    // Cancel previous animation frame
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    // Schedule a new update
    this.rafId = requestAnimationFrame(() => {
      this.throttledUpdate();
    });
  }

  throttledUpdate() {
    const now = Date.now();
    if (now - this.lastUpdate < this.config.throttleDelay) return;

    this.lastUpdate = now;
    this.updatePosition();
  }

  getDeviceMargin() {
    const width = window.innerWidth;

    if (width <= this.config.mobileBreakpoint) {
      return this.config.marginMobile;
    } else if (width <= this.config.tabletBreakpoint) {
      return this.config.marginTablet;
    }

    return this.config.marginDesktop;
  }

  updatePosition() {
    // Don't position if intro is not finished
    if (!document.body.classList.contains('intro-complete')) {
      return;
    }

    // Mobile landscape special-case removed: always compute position

    // Get dimensions
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const wrapperRect = this.imageWrapper.getBoundingClientRect();
    const navHeight = this.nav.offsetHeight || this.config.navHeight;

    // Always use wrapper bottom for consistency
    let wrapperBottom;

    if (wrapperRect.height === 0 || wrapperRect.bottom === 0) {
      // Calculate theoretical wrapper position
      const margin = this.getDeviceMargin();
      const maxHeight = viewportHeight - margin;
      const wrapperTop = (viewportHeight - maxHeight) / 2;
      wrapperBottom = wrapperTop + maxHeight;
    } else {
      // Always use wrapper rect bottom
      wrapperBottom = wrapperRect.bottom;
    }

    // Calculate available space below wrapper (without safeBottom for visual centering)
    const spaceBelow = viewportHeight - wrapperBottom;

    // Ensure there is enough space
    if (spaceBelow < navHeight) {
      // Not enough space, position at bottom with safe area
      const safeBottom = this.getSafeAreaBottom();
      this.nav.style.top = 'auto';
      this.nav.style.bottom = `${safeBottom}px`;
      this.nav.style.transform = 'none';
      return;
    }

    // Center by center: position WITHOUT subtracting height (use translateY to center)
    const navTop = wrapperBottom + spaceBelow / 2;

    // Apply position with requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      this.nav.style.top = `${navTop}px`;
      this.nav.style.bottom = 'auto';
      this.nav.style.transform = 'translateY(-50%)';

      // Apply exactly the same position to gallery-nav if visible
      const galleryNav = document.getElementById('gallery-nav');
      if (galleryNav && galleryNav.style.display !== 'none') {
        const galleryNavTop = wrapperBottom + spaceBelow / 2;
        galleryNav.style.setProperty('top', `${galleryNavTop}px`, 'important');
        galleryNav.style.setProperty('bottom', 'auto', 'important');
        galleryNav.style.setProperty('transform', 'translateY(-50%)', 'important');
        galleryNav.style.setProperty('position', 'absolute', 'important');
      }
    });
  }

  getSafeAreaBottom() {
    // Get safe area bottom for devices with notch
    const styles = getComputedStyle(document.documentElement);
    const safeBottom = styles.getPropertyValue('--safe-bottom');
    return parseFloat(safeBottom) || 0;
  }

  // Public methods
  refresh() {
    this.updatePosition();
  }
}

// ========================================
// 📦 MODULE: FLUID SLIDESHOW
// ========================================

/**
 * 🎬 FLUID SLIDESHOW - "Scrub" Mode with Persistent Video Cache
 * ✅ ✅ FIX: Persistent video cache to avoid reloads and duplicates
 */

class FluidSlideshow {
  constructor(wrapper, options = {}) {
    this.wrapper = wrapper;
    this.images = options.images || [];
    this.currentIndex = options.currentIndex || 0;

    // ⚡ Performance options
    this.throttleMs = options.throttleMs || CONFIG.SLIDESHOW_THROTTLE; // 30fps throttling

    // 🎯 Virtualization: only create N slides around current index
    this.virtualWindowSize = CONFIG.VIRTUAL_WINDOW_SIZE; // Create 5 slides before and after (11 total max)

    this.isDragging = false;
    this.startX = 0;
    this.startMouseX = 0;
    this.startSlideIndex = 0;
    this.startTime = 0;
    this.lastTime = 0;
    this.lastMoveTime = 0;
    this.velocity = 0;

    // 🖱️ Quick tap detection for left/right zone navigation
    this.quickTapStartX = 0;
    this.quickTapStartY = 0;
    this.quickTapStartTime = 0;
    this.hasMoved = false;
    this.quickTapThreshold = CONFIG.QUICK_TAP_THRESHOLD; // max movement pixels
    this.quickTapMaxTime = CONFIG.QUICK_TAP_MAX_TIME; // max ms between start and end

    this.slides = [];
    this.slidePool = new Map(); // 🏊 Pool of created slides
    this.videoElements = new Map(); // 🎬 Keep video elements in memory
    this.videoObservers = new Map(); // 👀 Observers for videos
    this.mediaCache = null;
    this.wrapperWidth = 0;
    this.inertiaTimer = null;

    this.init();
  }

  setMediaCache(mediaCache) {
    this.mediaCache = mediaCache;
  }

  init() {
    this.setupDOM();
    this.loadImages();
    this.bindEvents();
    this.updateDimensions();
  }

  setupDOM() {
    const revealMask = this.wrapper.querySelector('#reveal-mask');
    const imageMask = this.wrapper.querySelector('#image-mask');
    const logoOverlay = this.wrapper.querySelector('#logo-overlay');

    this.slidesContainer = document.createElement('div');
    this.slidesContainer.className = 'slideshow-track';

    this.wrapper.innerHTML = '';
    this.wrapper.appendChild(this.slidesContainer);

    if (revealMask) this.wrapper.appendChild(revealMask);
    if (imageMask) this.wrapper.appendChild(imageMask);
    if (logoOverlay) this.wrapper.appendChild(logoOverlay);

    this.wrapper.style.cursor = 'none';
    this.wrapper.style.overflow = 'hidden';
    this.wrapper.style.touchAction = 'pan-y pinch-zoom';
  }

  loadImages() {
    // 🎯 Virtualization: create only slides around current index
    this.slides = new Array(this.images.length).fill(null);

    // 📥 Load slides in virtual window
    this.loadVirtualWindow();
  }

  loadVirtualWindow() {
    const start = Math.max(0, this.currentIndex - this.virtualWindowSize);
    const end = Math.min(this.images.length - 1, this.currentIndex + this.virtualWindowSize);

    // 🏗️ Create slides in window
    for (let i = start; i <= end; i++) {
      if (!this.slides[i]) {
        this.createSlideAtIndex(i);
      }
    }

    // 🧹 Clean slides outside window
    this.cleanupOutOfWindowSlides(start, end);

    this.updateSlideVisibility();
  }

  createSlideAtIndex(index) {
    const src = this.images[index];
    const slide = document.createElement('div');
    slide.className = 'slideshow-slide';
    slide.dataset.index = index;

    const ext = src.split('.').pop().toLowerCase();

    if (ext === 'mp4' || ext === 'webm') {
      this.createVideoSlide(slide, src, index);
    } else {
      this.createImageSlide(slide, src, index);
    }

    this.slidesContainer.appendChild(slide);
    this.slides[index] = { element: slide, src };
    this.slidePool.set(index, slide);
  }

  cleanupOutOfWindowSlides(start, end) {
    // 🗑️ Remove distant slides but keep videos in memory
    // ✅ ✅ OPTIMIZATION: Keep 50 slides in memory instead of 15
    this.slidePool.forEach((slide, index) => {
      if (index < start - 25 || index > end + 25) {
        // ⏸️ Stop videos but keep in memory
        const video = slide.querySelector('video');
        if (video) {
          video.pause();
          video.currentTime = 0; // Reset to beginning
          // 🚫 DO NOT remove from DOM - keep in memory
        }

        // 🧹 Clean video observers
        if (this.videoObservers && this.videoObservers.has(this.images[index])) {
          const observer = this.videoObservers.get(this.images[index]);
          observer.disconnect();
          this.videoObservers.delete(this.images[index]);
        }

        // 🗑️ Remove only slide from DOM, not video
        if (slide.parentNode) {
          slide.parentNode.removeChild(slide);
        }

        this.slidePool.delete(index);
        this.slides[index] = null;
      }
    });
  }

  async createVideoSlide(slide, src, index) {
    let video;

    // 🔍 Check if video already exists in memory
    if (this.videoElements.has(src)) {
      video = this.videoElements.get(src);
      // 🔗 Reattach to new slide
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    } else {
      // 🎬 Create new video
      video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('x-webkit-airplay', 'deny');
      // 🚫 DO NOT set autoplay - only active video should play
      video.setAttribute('disablePictureInPicture', '');
      video.controlsList = 'nodownload nofullscreen noremoteplayback';

      video.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        pointer-events: none;
        -webkit-tap-highlight-color: transparent;
      `;

      // 🔗 Use URL directly
      video.src = src;

      // 💾 Keep in memory
      this.videoElements.set(src, video);
    }

    video.preload = index === this.currentIndex ? 'auto' : 'metadata';

    // ⚡ Optimization: if active slide, preload immediately
    if (index === this.currentIndex) {
      video.preload = 'auto';
    }

    video.id = index === this.currentIndex ? 'main-video' : '';
    slide.appendChild(video);

    // ▶️ Try to play if current slide
    if (index === this.currentIndex) {
      video.play().catch(() => {});
    }

    video.addEventListener('webkitendfullscreen', e => {
      e.preventDefault();
    });
    video.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  createImageSlide(slide, src, index) {
    const img = document.createElement('img');

    const cachedImg = this.mediaCache ? this.mediaCache.getCachedMedia(src) : null;
    img.src = cachedImg ? cachedImg.src : src; // AVIF only, no conversion needed

    img.id = index === this.currentIndex ? 'main-image' : '';
    // Enhanced alt text for SEO and AI search engines
    const albumName = typeof currentAlbumKey !== 'undefined' ? currentAlbumKey : '';
    const category = typeof currentCategory !== 'undefined' ? currentCategory : '';
    const categoryLabel = category === 'artdirection' ? 'Art Direction' : 'Photography';
    img.alt = albumName
      ? `${categoryLabel} by Paul Thery - ${albumName} - Image ${index + 1}`
      : `${categoryLabel} by Paul Thery - Image ${index + 1}`;
    img.draggable = false;
    img.loading = index === this.currentIndex ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      pointer-events: none;
      -webkit-user-drag: none;
      -webkit-tap-highlight-color: transparent;
    `;
    slide.appendChild(img);
  }

  preloadVirtualWindow() {
    // 🧠 Intelligently preload media in virtual window via cache
    if (!this.mediaCache) return;

    const start = Math.max(0, this.currentIndex - this.virtualWindowSize);
    const end = Math.min(this.images.length - 1, this.currentIndex + this.virtualWindowSize);

    for (let i = start; i <= end; i++) {
      const src = this.images[i];
      if (src && !this.mediaCache.getCachedMedia(src)) {
        this.mediaCache.preloadMedia(src);
      }
    }
  }

  updateSlideVisibility() {
    // ✅ ✅ GPU OPTIMIZATION: Use transform instead of creating/removing slides
    const totalSlides = this.images.length;
    const currentIndex = this.currentIndex;

    this.slides.forEach((slideData, index) => {
      if (!slideData) return; // Skip non-created slides

      const slide = slideData.element;
      const slideElement = slide.querySelector('img, video');

      if (slideElement) {
        // ✅ 🧮 GPU CALCULATION: Relative position to current index
        const relativePosition = index - currentIndex;

        // ✅ 🎯 GPU TRANSFORM: Move slides with translateX on the slide itself
        // This ensures overflow:hidden works correctly
        slide.style.transform = `translateX(${relativePosition * 100}%)`;
        slide.style.willChange = 'transform';
        // Reset image transform to avoid double transforms
        slideElement.style.transform = 'none';

        // ✅ VISIBILITY: Only current slide is visible (no opacity)
        if (index === currentIndex) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      }
    });
  }

  bindEvents() {
    this.wrapper.addEventListener('mousedown', this.onStart.bind(this));
    window.addEventListener('mousemove', this.onMove.bind(this));
    window.addEventListener('mouseup', this.onEnd.bind(this));

    this.wrapper.addEventListener('touchstart', this.onStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onEnd.bind(this));

    window.addEventListener('resize', this.updateDimensions.bind(this));

    this.wrapper.addEventListener('dragstart', e => e.preventDefault());
  }

  onStart(e) {
    this.isDragging = true;
    this.wrapper.style.cursor = 'none';
    this.wrapper.classList.add('grabbing');

    const now = Date.now();
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

    this.startMouseX = clientX;
    this.lastMouseX = this.startMouseX;
    this.startSlideIndex = this.currentIndex;
    this.startTime = now;
    this.lastTime = now;
    this.lastMoveTime = now;
    this.velocity = 0;

    // 🖱️ Capture initial position for quick tap detection
    this.quickTapStartX = clientX;
    this.quickTapStartY = clientY;
    this.quickTapStartTime = now;
    this.hasMoved = false;

    this.wrapperWidth = this.wrapper.offsetWidth;

    clearTimeout(this.inertiaTimer);

    e.preventDefault();
  }

  onMove(e) {
    if (!this.isDragging) return;

    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

    // 🖱️ Detect if moved (not a tap)
    const deltaX = Math.abs(clientX - this.quickTapStartX);
    const deltaY = Math.abs(clientY - this.quickTapStartY);

    if (deltaX > this.quickTapThreshold || deltaY > this.quickTapThreshold) {
      this.hasMoved = true; // It's a drag, not a tap
    }

    const mouseDeltaX = this.startMouseX - clientX;

    const now = Date.now();
    const deltaTime = now - this.lastTime;

    // ⚡ Throttling: limit processing frequency for performance
    // Note: Simple skip, not real throttle - but sufficient for scrub
    if (deltaTime < this.throttleMs) return;

    if (deltaTime > 0) {
      this.velocity = (clientX - this.lastMouseX) / deltaTime;
    }
    this.lastMouseX = clientX;
    this.lastTime = now;
    this.lastMoveTime = now;

    // Slowdown factor: 0.3 to compensate 3.5x more images than Example Site
    // Site Exemple: 42 images, Nous: 145 images (ratio 3.45)
    const slowdownFactor = 0.3;
    const percentage = (mouseDeltaX / this.wrapperWidth) * slowdownFactor;

    const numberOfSlides = this.slides.length;
    const slideMoveDelta = Math.floor(numberOfSlides * percentage);
    const targetSlide = (this.startSlideIndex + slideMoveDelta + numberOfSlides) % numberOfSlides;

    if (targetSlide !== this.currentIndex) {
      this.goToSlide(targetSlide, true);
    }

    e.preventDefault();
  }

  onEnd(e) {
    if (!this.isDragging) return;

    this.isDragging = false;

    // 🖱️ Detect quick tap
    const now = Date.now();
    const tapDuration = now - this.quickTapStartTime;
    const isQuickTap = !this.hasMoved && tapDuration < this.quickTapMaxTime;

    if (isQuickTap) {
      // Get final position relative to wrapper
      const clientX = e.type.includes('mouse')
        ? e.clientX
        : e.changedTouches && e.changedTouches[0]
          ? e.changedTouches[0].clientX
          : this.quickTapStartX;
      const wrapperRect = this.wrapper.getBoundingClientRect();
      const relativeX = clientX - wrapperRect.left;
      const wrapperWidth = this.wrapper.offsetWidth;

      // Detect 25% left or right zone
      const leftZone = relativeX < wrapperWidth * 0.25;
      const rightZone = relativeX > wrapperWidth * 0.75;

      if (leftZone) {
        // Previous image
        const prevIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.goToSlide(prevIndex, false); // false = with normal transition
        e.preventDefault();
        e.stopPropagation();
        this.wrapper.style.cursor = 'none';
        this.wrapper.classList.remove('grabbing');
        return; // Exit to avoid triggering inertia
      } else if (rightZone) {
        // Next image
        const nextIndex = (this.currentIndex + 1) % this.images.length;
        this.goToSlide(nextIndex, false); // false = with normal transition
        e.preventDefault();
        e.stopPropagation();
        this.wrapper.style.cursor = 'none';
        this.wrapper.classList.remove('grabbing');
        return; // Exit to avoid triggering inertia
      }
    }

    // Normal behavior (drag/inertia) if no quick tap in zones
    this.wrapper.style.cursor = 'none';
    this.wrapper.classList.remove('grabbing');

    const timeSinceLastMove = now - this.lastMoveTime;

    // 🚀 Trigger inertia if fast movement (< 50ms since last movement)
    if (timeSinceLastMove < 50) {
      this.inertiaTimer = setTimeout(() => {
        this.startInertia(timeSinceLastMove, timeSinceLastMove * 0.5);
      }, timeSinceLastMove);
    }
  }

  startInertia(delta, iteration) {
    const direction = this.velocity > 0 ? -1 : 1;

    const inertiaStep = () => {
      // Slowed formula: 1.03 and 0.3 (vs 1.05 and 0.5 from example site)
      delta = delta * 1.1 + iteration * 0.1;
      iteration = iteration + 1;

      if (delta < 200) {
        const nextIndex = (this.currentIndex + direction + this.slides.length) % this.slides.length;
        this.goToSlide(nextIndex, true);

        // ⚡ Inertia throttling: use configurable value
        const throttledDelta = Math.max(delta, this.throttleMs);

        this.inertiaTimer = setTimeout(() => {
          inertiaStep();
        }, throttledDelta);
      }
    };

    this.inertiaTimer = setTimeout(() => {
      inertiaStep();
    }, delta);
  }

  goToSlide(index, immediate = false) {
    if (index === this.currentIndex) return;

    const previousIndex = this.currentIndex;
    this.currentIndex = Math.max(0, Math.min(index, this.slides.length - 1));

    // 📥 Load virtual window around new index
    this.loadVirtualWindow();

    // 🧠 Intelligently preload media in new window
    this.preloadVirtualWindow();

    this.updateSlideVisibility();
    this.updateActiveMedia();

    this.wrapper.dispatchEvent(
      new CustomEvent('slidechange', {
        detail: {
          index: this.currentIndex,
          src: this.images[this.currentIndex],
        },
      })
    );
  }

  updateActiveMedia() {
    this.slides.forEach((slideData, index) => {
      if (!slideData) return; // Skip non-created slides

      const slide = slideData.element;
      const media = slide.querySelector('img, video');
      if (media) {
        if (index === this.currentIndex) {
          media.id = media.tagName === 'VIDEO' ? 'main-video' : 'main-image';
          if (media.tagName === 'VIDEO') {
            // ▶️ Only active video should play
            media.play().catch(() => {});

            // 🎬 Trigger logo for videos after delay
            setTimeout(() => {
              this.wrapper.dispatchEvent(
                new CustomEvent('videoactive', {
                  detail: {
                    src: this.images[this.currentIndex],
                    video: media,
                  },
                })
              );
            }, 100);
          }
        } else {
          media.id = '';
          if (media.tagName === 'VIDEO') {
            // ⏹️ Force stop all inactive videos
            media.pause();
            media.currentTime = 0; // Reset to beginning
          }
        }
      }
    });
  }

  updateDimensions() {
    this.wrapperWidth = this.wrapper.offsetWidth;
  }

  next() {
    const nextIndex = (this.currentIndex + 1) % this.slides.length;
    this.goToSlide(nextIndex);
  }

  prev() {
    const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.goToSlide(prevIndex);
  }

  updateImages(images) {
    const wasAtIndex = this.currentIndex;
    this.images = images;

    // 🧹 Clean all slides
    this.slidesContainer.innerHTML = '';
    this.slidePool.clear();

    // 🧹 Clean video observers
    if (this.videoObservers) {
      this.videoObservers.forEach(observer => observer.disconnect());
      this.videoObservers.clear();
    }

    // 🧹 Clean videos in memory to avoid leaks
    this.videoElements.forEach(video => {
      video.pause();
      video.src = '';
    });
    this.videoElements.clear();

    // ⚠️ IMPORTANT: Update currentIndex BEFORE loadImages()
    // otherwise loadVirtualWindow() will create slides with wrong index
    if (wasAtIndex < images.length) {
      this.currentIndex = wasAtIndex;
    } else {
      this.currentIndex = 0;
    }

    // Reload with virtualization (uses this.currentIndex)
    this.loadImages();

    this.updateSlideVisibility();
    this.updateActiveMedia();
  }
}

// ========================================
// 🌐 CONFIGURATION & GLOBAL VARIABLES
// ========================================

// 🌐 Global domain variable (normalize by removing www. prefix)
const currentDomain = window.location.hostname.replace(/^www\./, '');

// 🌐 Domain-specific metadata configuration
(function () {
  const isStudio = currentDomain === 'paulthery.studio';

  if (isStudio) {
    const canonical = document.getElementById('canonical');
    const ogUrl = document.getElementById('og-url');
    const ogImage = document.getElementById('og-image');
    const twitterImage = document.getElementById('twitter-image');

    if (canonical) canonical.href = 'https://paulthery.studio/';
    if (ogUrl) ogUrl.content = 'https://paulthery.studio/';
    if (ogImage) ogImage.content = 'https://paulthery.studio/assets/logo.png';
    if (twitterImage) twitterImage.content = 'https://paulthery.studio/assets/logo.png';
  }
})();

// 🎨 Specific configuration for artdirection page
if (window.location.pathname.includes('artdirection')) {
  window.autoOpenCategory = 'artdirection';
  window.defaultAlbum = 'work';
}

// 📊 Global state variables
let currentIndex = 0;
let totalImages = 0;
let manifestData = null;
let orderData = null;
let fromGallery = false;
let lastActiveCategory = 'photography';
let mediaCache = null;
let errorManager = null;
let autoplayEnabled = false;
let fluidSlideshow = null;
let autoplayObserver = null;
let autoplayTimeoutId = null;
let navigationManager = null;

// ========================================
// 🚀 UTILITY SYSTEMS
// ========================================

// 🚀 Utility functions to avoid repetitive code
const utils = {
  isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  },

  isTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
};

// 🚀 DOM cache to avoid repetitive selectors
const domCache = {
  elements: new Map(),

  get(id) {
    if (!this.elements.has(id)) {
      const element = document.getElementById(id);
      this.elements.set(id, element); // Cache even null values
    }
    return this.elements.get(id);
  },

  query(selector) {
    if (!this.elements.has(selector)) {
      const element = document.querySelector(selector);
      this.elements.set(selector, element); // Cache even null values
    }
    return this.elements.get(selector);
  },

  // 🎯 Pre-cache frequently used elements
  preCache() {
    const frequentSelectors = [
      'custom-cursor',
      'image-wrapper',
      'index-overlay',
      'main-content',
      'main-image',
      'main-video',
      'nav',
      'gallery-overlay',
      'gallery-grid',
      'gallery-nav',
      'gallery-scroll',
      'intro-text',
      'logo-overlay',
    ];

    frequentSelectors.forEach(id => this.get(id));
  },

  // 🚀 Frequently used elements (convenience getters)
  get wrapper() {
    return this.get('image-wrapper');
  },
  get imageWrapper() {
    return this.get('image-wrapper');
  },
  get cursor() {
    return this.get('custom-cursor');
  },
  get customCursor() {
    return this.get('custom-cursor');
  },
  get nav() {
    return this.get('nav');
  },
  get mainContent() {
    return this.get('main-content');
  },
  get mainImage() {
    return this.get('main-image');
  },
  get mainVideo() {
    return this.get('main-video');
  },
  get galleryOverlay() {
    return this.get('gallery-overlay');
  },
  get galleryGrid() {
    return this.get('gallery-grid');
  },
  get galleryNav() {
    return this.get('gallery-nav');
  },
  get galleryScroll() {
    return this.get('gallery-scroll');
  },
  get introText() {
    return this.get('intro-text');
  },
  get galleryTrigger() {
    return this.query('[data-gallery]');
  },
  get curtainOverlay() {
    return this.get('curtain-overlay');
  },
  get topMask() {
    return this.get('gallery-top-mask');
  },
  get bottomMask() {
    return this.get('gallery-bottom-mask');
  },
  get indexOverlay() {
    return this.get('index-overlay');
  },
};

function enableAutoplay() {
  if (!autoplayEnabled) {
    autoplayEnabled = true;

    const vidEl = domCache.mainVideo;
    if (!vidEl) return;

    // 🎬 Function to attempt video playback
    const attemptPlay = () => {
      if (
        vidEl &&
        vidEl.style &&
        vidEl.style !== null &&
        vidEl.style.display !== 'none' &&
        vidEl.paused
      ) {
        // Force autoplay properties on JS side
        vidEl.muted = true;
        vidEl.autoplay = true;
        vidEl.playsInline = true;
        vidEl.setAttribute('playsinline', '');
        vidEl.setAttribute('webkit-playsinline', '');

        vidEl.play().catch(error => {
          if (error.name === 'NotAllowedError') {
            window.autoplayBlocked = true;
            const tryPlayOnInteraction = () => {
              vidEl.play().catch(() => {});
              document.removeEventListener('click', tryPlayOnInteraction);
              document.removeEventListener('touchstart', tryPlayOnInteraction);
            };
            document.addEventListener('click', tryPlayOnInteraction, { once: true });
            document.addEventListener('touchstart', tryPlayOnInteraction, { once: true });
          }
        });
      }
    };

    // ⚡ Try immediately if video is already visible
    attemptPlay();

    // Otherwise, wait for it to become visible
    if (vidEl && vidEl.style && vidEl.style !== null && vidEl.style.display === 'none') {
      // Clean old observer if present
      if (autoplayObserver) {
        try {
          autoplayObserver.disconnect();
        } catch (e) {}
        autoplayObserver = null;
      }
      // 👀 Use MutationObserver to detect style changes
      autoplayObserver = new MutationObserver(() => {
        if (vidEl && vidEl.style && vidEl.style !== null && vidEl.style.display !== 'none') {
          attemptPlay();
          if (autoplayObserver) {
            autoplayObserver.disconnect();
            autoplayObserver = null;
          }
          if (autoplayTimeoutId) {
            clearTimeout(autoplayTimeoutId);
            autoplayTimeoutId = null;
          }
        }
      });

      autoplayObserver.observe(vidEl, {
        attributes: true,
        attributeFilter: ['style'],
      });

      // ⏰ Safety timeout after 500ms
      autoplayTimeoutId = setTimeout(() => {
        if (autoplayObserver) {
          try {
            autoplayObserver.disconnect();
          } catch (e) {}
          autoplayObserver = null;
        }
        attemptPlay();
        autoplayTimeoutId = null;
      }, 500);
    }
  }
}

const urlParams = new URLSearchParams(window.location.search);
const urlSection = urlParams.get('section');
window.autoOpenCategory = null;

if (window.location.pathname === '/photography' || urlSection === 'photography') {
  window.autoOpenCategory = 'photography';
}

if (window.location.pathname === '/artdirection' || urlSection === 'artdirection') {
  window.autoOpenCategory = 'artdirection';
}

if (
  currentDomain === 'paulthery.studio' &&
  !window.autoOpenCategory &&
  (window.location.pathname === '/' || window.location.pathname === '/artdirection')
) {
  window.autoOpenCategory = 'artdirection';
  window.defaultAlbum = 'work';
}

if (
  currentDomain === 'paulthery.com' &&
  !window.autoOpenCategory &&
  window.location.pathname === '/artdirection'
) {
  window.autoOpenCategory = 'artdirection';
}

class ErrorManager {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    window.addEventListener('error', event => {
      this.handleError({
        type: 'runtime',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString(),
      });
    });

    window.addEventListener('unhandledrejection', event => {
      this.handleError({
        type: 'unhandled_promise',
        message: event.reason?.message || 'Promise rejection',
        reason: event.reason,
        timestamp: new Date().toISOString(),
      });
      event.preventDefault();
    });

    window.addEventListener(
      'error',
      event => {
        if (event.target !== window) {
          this.handleError({
            type: 'resource',
            message: `Failed to load: ${event.target.tagName}`,
            source: event.target.src || event.target.href,
            element: event.target.tagName,
            timestamp: new Date().toISOString(),
          });
        }
      },
      true
    );
  }

  handleError(errorInfo) {
    this.errors.push(errorInfo);

    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    this.reportError(errorInfo);
  }

  isDevelopment() {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:' ||
      window.location.search.includes('debug=true')
    );
  }

  reportError(errorInfo) {
    if (!this.isDevelopment()) {
      try {
        const existingErrors = JSON.parse(localStorage.getItem('portfolio_errors') || '[]');
        existingErrors.push(errorInfo);
        const recentErrors = existingErrors.slice(-20);
        secureLocalStorageSetItem('portfolio_errors', recentErrors);
        // 🚫 Error beacon disabled - endpoint unavailable
        // try {
        //   if (navigator && navigator.sendBeacon) {
        //     const payload = JSON.stringify({ type: 'client_error', errors: [errorInfo] });
        //     navigator.sendBeacon('/__error_beacon', new Blob([payload], { type: 'application/json' }));
        //   }
        // } catch (e) {
        // }
      } catch (e) {}
    }
  }

  getErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
    try {
      localStorage.removeItem('portfolio_errors');
      localStorage.removeItem('portfolio_session_errors');
    } catch (e) {
      // localStorage may be blocked or full
    }
  }
}

// 🛡️ Secure sanitization function to prevent XSS injections
function sanitizeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';

  // Create temporary element to use textContent (auto-escapes)
  const temp = document.createElement('div');
  temp.textContent = unsafe;
  return temp.innerHTML;
}

// 🛡️ Function to create DOM elements securely
function createSecureElement(tag, attributes = {}, textContent = '') {
  const element = document.createElement(tag);

  // Add attributes securely
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'innerHTML') {
      // Never use innerHTML directly
      return;
    }
    element.setAttribute(key, sanitizeHtml(String(value)));
  });

  // Add text content securely
  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}

// 🛡️ Function to replace innerHTML securely
function setSecureInnerHTML(element, content) {
  if (!element || typeof content !== 'string') return;

  // For safe static content, we can use innerHTML
  // But we ensure there are no user variables
  element.innerHTML = content;
}

// 🛡️ Function to secure data before localStorage storage
function sanitizeForStorage(data) {
  if (!data) return null;

  try {
    // Create secure copy of data
    const sanitized = JSON.parse(JSON.stringify(data));

    // 🧹 Clean sensitive file paths
    if (sanitized.stack) {
      sanitized.stack = sanitized.stack.replace(/\/[^\s]*\/[^\s]*/g, '[PATH_REDACTED]');
    }

    if (sanitized.filename) {
      sanitized.filename = sanitized.filename.replace(/\/[^\s]*\//g, '[PATH_REDACTED]/');
    }

    if (sanitized.source) {
      sanitized.source = sanitized.source.replace(/\/[^\s]*\//g, '[PATH_REDACTED]/');
    }

    // Limiter la taille des messages
    if (sanitized.message && sanitized.message.length > 500) {
      sanitized.message = sanitized.message.substring(0, 500) + '...';
    }

    return sanitized;
  } catch (error) {
    return null;
  }
}

// 🛡️ Function to store securely in localStorage
function secureLocalStorageSetItem(key, data) {
  try {
    const sanitizedData = sanitizeForStorage(data);
    if (sanitizedData) {
      localStorage.setItem(key, JSON.stringify(sanitizedData));
    }
  } catch (error) {}
}

// 🔒 Client-side CSP verification
function checkCSPCompliance() {
  try {
    // Check for CSP meta tag presence in DOM
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return true;
  }
}

// 🔒 Function to check CSP violations
function reportCSPViolation() {
  // Listen to CSP violations if API is available
  if ('SecurityPolicyViolationEvent' in window) {
    document.addEventListener('securitypolicyviolation', event => {
      // Report violation securely
      errorManager.handleError({
        type: 'csp_violation',
        message: `CSP violation: ${event.violatedDirective}`,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        timestamp: new Date().toISOString(),
      });
    });
  }
}

errorManager = new ErrorManager();

function safeExecute(fn, context = 'unknown', fallback = null) {
  try {
    return fn();
  } catch (error) {
    errorManager.handleError({
      type: 'caught_exception',
      message: error.message,
      context: context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    return fallback;
  }
}

async function safeAsync(asyncFn, context = 'unknown', fallback = null) {
  try {
    return await asyncFn();
  } catch (error) {
    errorManager.handleError({
      type: 'async_error',
      message: error.message,
      context: context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    return fallback;
  }
}

document.addEventListener('visibilitychange', () => {
  safeExecute(() => {
    if (document.hidden) {
      document.documentElement.classList.add('no-transitions');
    } else {
      document.documentElement.classList.remove('no-transitions');
    }
  }, 'visibility_change');
});
function lockOrientation() {
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(err => {});
    } else if (screen.lockOrientation) {
      screen.lockOrientation('portrait');
    }
  }
}
function initializeBasicSetup() {
  document.body.style.cursor = 'none';
  lockOrientation();
  setTimeout(lockOrientation, 1000);
}

const getVH = () => {
  // Prefer visualViewport for mobile and in-app browsers
  if (window.visualViewport) {
    return window.visualViewport.height;
  }
  // Fallback for browsers that don't support visualViewport
  return document.documentElement.clientHeight || window.innerHeight;
};

// Fallback for browsers that don't support dvh (in-app browsers)
function applyViewportFallback() {
  // Check if dvh is not supported
  if (!CSS.supports('height', '100dvh')) {
    // Force height with JavaScript for in-app browsers
    const updateHeight = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      document.documentElement.style.height = `${vh}px`;
      document.body.style.height = `${vh}px`;
    };

    updateHeight();

    // Listen for changes (for mobile URL bar)
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateHeight, 100);
    });
  }
}

// Apply on load if necessary
if (typeof window !== 'undefined') {
  applyViewportFallback();
}
function initializeMobileOptimizations() {
  const isMobileDevice =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  if (isMobileDevice) {
    function updateWrapperHeight() {
      const wrapper = domCache.wrapper;
      if (wrapper) {
        const vh = getVH();
        const maxHeight = vh - 160;
        wrapper.style.maxHeight = `${maxHeight}px`;
      }
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateWrapperHeight);
      window.visualViewport.addEventListener('scroll', updateWrapperHeight);
    }
    window.addEventListener('resize', updateWrapperHeight);
    document.addEventListener('DOMContentLoaded', updateWrapperHeight);
    window.addEventListener('load', updateWrapperHeight);
    let lastTap = 0;
    document.addEventListener('touchend', e => {
      if (
        e.target.closest('#nav') ||
        e.target.closest('#index-trigger') ||
        e.target.closest('#index-overlay') ||
        e.target.closest('#image-wrapper')
      ) {
        return;
      }
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 500 && tapLength > 0) {
        e.preventDefault();
        return false;
      }
      lastTap = currentTime;
    });
    const galleryScrollLocal = domCache.galleryScroll;
    if (galleryScrollLocal) {
      galleryScrollLocal.addEventListener(
        'touchmove',
        e => {
          e.stopPropagation();
        },
        { passive: true }
      );
    }
  }
}
document.addEventListener('DOMContentLoaded', () => {
  initializeBasicSetup();
  initializeMobileOptimizations();

  // 🎯 Pre-cache frequently used DOM elements
  domCache.preCache();

  // 🛡️ Initialize security checks
  checkCSPCompliance();
  reportCSPViolation();

  mediaCache = new MediaCacheManager();

  const galleryTrigger = domCache.galleryTrigger;
  const galleryOverlay = domCache.galleryOverlay;
  const curtainOverlay = domCache.curtainOverlay;
  const topMask = domCache.topMask;
  const bottomMask = domCache.bottomMask;
  const galleryGrid = domCache.galleryGrid;
  const galleryNav = domCache.galleryNav;
  const galleryScroll = domCache.galleryScroll;

  function setMainContentHeight() {
    const isTouch = utils.isTouch();
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const mainContent = domCache.mainContent;
    if (mainContent) {
      if (isTouch && !isMobile) {
        mainContent.style.height = `${getVH()}px`;
      } else {
        mainContent.style.height = '';
      }
    }
  }
  window.addEventListener(
    'contextmenu',
    function (e) {
      e.stopImmediatePropagation();
    },
    true
  );
  window.addEventListener('orientationchange', () => {
    const isTouch = utils.isTouch();
    if (isTouch) {
      location.reload();
    }
  });
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const introText = domCache.introText;
  const mainContent = domCache.mainContent;
  const mainImage = domCache.mainImage;
  const mainVideo = domCache.mainVideo;
  const nav = domCache.nav;
  if (nav) {
    nav.style.display = 'none';
  }
  const imageWrapper = domCache.wrapper;
  if (imageWrapper) {
    imageWrapper.style.position = 'relative';
  }
  const initialBase = getVH() - 110 * 2;
  // Cache for updateTouchUIPositions
  let lastTouchUIPosition = null;
  let lastTouchUICalculation = 0;
  const touchUIThrottle = 150; // 150ms between calculations

  function updateTouchUIPositions() {
    // Execute on mobile/tablet
    const isMobileOrTablet = window.matchMedia('(max-width: 1200px)').matches;
    if (!isMobileOrTablet) return;

    const now = Date.now();
    if (now - lastTouchUICalculation < touchUIThrottle) {
      return; // Throttle les calculs
    }
    lastTouchUICalculation = now;

    const isMobile = window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches;
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    const wrapper = domCache.wrapper;
    const cursor = document.getElementById('custom-cursor'); // Get directly as it's created dynamically
    const mainNav = domCache.nav;
    if (!wrapper) return;

    // Use real wrapper dimensions (fully dynamic on mobile/tablet, fixed on desktop)
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const wrapperRect = wrapper.getBoundingClientRect();

    // Always use real wrapper rect
    const rect = {
      top: wrapperRect.top,
      bottom: wrapperRect.bottom,
      height: wrapperRect.height,
      width: wrapperRect.width,
    };

    const computed = getComputedStyle(document.documentElement);
    const vh = getVH();

    // 🔑 Create cache key based on dimensions
    const cacheKey = `${rect.top}-${rect.bottom}-${vh}-${isMobile}-${isLandscape}`;
    if (lastTouchUIPosition === cacheKey) {
      return; // No change needed
    }
    lastTouchUIPosition = cacheKey;

    if (cursor) {
      // Center by center: position WITHOUT subtracting height (will use translateY to center)
      // Nav: wrapperBottom + (spaceBelow / 2) - (navHeight / 2)
      // Cursor: rect.top - (spaceAbove / 2)
      const spaceAbove = rect.top;
      const topPos = rect.top - spaceAbove / 2;

      cursor.style.top = `${topPos}px`;
      cursor.style.left = '50%';
      cursor.style.transform = 'translate(-50%, -50%)';
    }
    // Navigation is now managed by NavigationManager
    // No need to position mainNav and galleryNav here anymore
  }
  window.updateDynamicUIPositions = updateTouchUIPositions;

  // Initialize the new NavigationManager
  navigationManager = new NavigationManager();
  navigationManager.init();

  document.body.style.backgroundColor = 'white';
  const introBackground = domCache.get('intro-background') || document.createElement('div');
  if (!introBackground.id) {
    introBackground.id = 'intro-background';
    introBackground.style.backgroundColor = 'black';
    document.body.appendChild(introBackground);
  }
  introBackground.addEventListener(
    'transitionend',
    function (e) {
      if (e.propertyName === 'transform') {
        if (nav) {
          nav.style.display = 'flex';
          if (mediaCache) {
            preloadAllMedia();
          }
          // Delay to ensure images are loaded before positioning cursor
          setTimeout(() => {
            updateTouchUIPositions();
            // Utiliser le nouveau NavigationManager
            if (navigationManager) {
              navigationManager.refresh();
            }
          }, 500);
          // Activate custom cursor
          document.body.classList.add('intro-complete');
          // Emit event for NavigationManager
          document.dispatchEvent(new Event('introComplete'));
        }
      }
    },
    { once: true }
  );
  let images = [];
  let galleryImages = [];
  let previousAlbumKey = null;
  let previousCategory = null;
  // manifestData, orderData already declared globally
  let currentCategory = '';
  let currentAlbumKey = '';
  // lastActiveCategory already declared globally
  // fromGallery already declared globally
  let logoShownForCurrentAlbum = false;
  let isLoadingAlbum = false;
  let isIntroSequenceActive = true;
  let logoQueue = null;
  let isFirstArtDirectionLoad = true;

  let currentGalleryAlbum = null;

  function showLogoWhenReady(logoPath) {
    if (isIntroSequenceActive) {
      logoQueue = logoPath;
    } else {
      showLogo(logoPath);
    }
  }

  document.addEventListener('introFinished', () => {
    isIntroSequenceActive = false;
    if (logoQueue) {
      showLogo(logoQueue);
      logoQueue = null;
    }
  });

  function finishLoad(files) {
    if (isLoadingAlbum) {
      return;
    }

    if (!files || files.length === 0) {
      return;
    }

    // 🔍 Filter images to avoid duplicates
    const filteredFiles = filterUniqueImages(files);

    isLoadingAlbum = true;
    logoShownForCurrentAlbum = false;
    images = filteredFiles;
    totalImages = images.length;

    // Manage index according to category and history
    const hasChangedCategory = previousCategory && previousCategory !== currentCategory;

    if (currentCategory === 'artdirection' && isFirstArtDirectionLoad) {
      currentIndex = Math.floor(Math.random() * images.length);
      isFirstArtDirectionLoad = false;
    } else if (hasChangedCategory) {
      // If changing category, reset to 0
      currentIndex = 0;
    } else if (isFirstArtDirectionLoad) {
      currentIndex = 0;
    }

    // Initialiser le slideshow fluide
    const wrapper = domCache.wrapper;

    if (wrapper && files.length > 0) {
      // Reuse existing slideshow instead of destroying it
      if (fluidSlideshow) {
        fluidSlideshow.updateImages(filteredFiles);
        fluidSlideshow.goToSlide(currentIndex);
      } else {
        fluidSlideshow = new FluidSlideshow(wrapper, {
          images: filteredFiles,
          currentIndex: currentIndex,
          threshold: 0.15, // Normal sensitivity (15%)
          transitionDuration: 300, // Normal duration (300ms)
          inertiaThreshold: 100, // Seuil normal (100ms)
          throttleMs: 33, // 30fps (33ms)
        });

        // Pass cache reference to slideshow
        if (mediaCache) {
          fluidSlideshow.setMediaCache(mediaCache);
        }

        // Listen for slide changes
        wrapper.addEventListener('slidechange', e => {
          currentIndex = e.detail.index;
          // Update media logic (logos, videos, etc.)
          const src = e.detail.src || images[currentIndex];
          if (src) {
            updateMediaLogic(src, currentIndex);
          }
          // Update cursor with new index
          updateCursor();
        });

        // 👂 Listen to slideshow videoactive event
        wrapper.addEventListener('videoactive', e => {
          const now = Date.now();

          // Debounce to avoid multiple rapid calls
          if (now - lastVideoActiveTime < 500) {
            return;
          }
          lastVideoActiveTime = now;

          const src = e.detail.src;
          const logoPath = getLogoForImage(src);

          if (logoPath && (!logoShownForCurrentAlbum || fromGallery)) {
            showLogo(logoPath);
            logoShownForCurrentAlbum = true;
          }
          if (fromGallery) {
            fromGallery = false;
          }
        });
      }
    }

    // Call initial logic for first image
    updateMediaLogic(images[currentIndex], currentIndex);

    // Update cursor with correct values
    updateCursor();

    // Enable autoplay after initial load (if first media is video)
    enableAutoplay();

    // Sequential preloading of ALL media (one at a time, in order)
    // Start from current slide and continue to end
    if (mediaCache && filteredFiles.length > 0) {
      mediaCache.startSequentialPreload(filteredFiles, currentIndex);
    }

    galleryImages = filteredFiles;

    const hasAlbumChanged =
      previousCategory !== currentCategory || previousAlbumKey !== currentAlbumKey;
    if (hasAlbumChanged && galleryGrid) {
      // Clean videos properly before emptying DOM
      cleanupGalleryVideos();
      galleryGrid.innerHTML = '';
      currentGalleryAlbum = null;

      const stats = mediaCache.getStats();
      if (stats.cached > 100) {
        // Increased to 100 to keep more media in cache
        mediaCache.clearCache();
      }
    }

    previousCategory = currentCategory;
    previousAlbumKey = currentAlbumKey;

    if (window.location.pathname.includes('/artdirection/')) {
      lastActiveCategory = 'artdirection';
    } else if (
      currentCategory === 'artdirection' ||
      (currentCategory && currentCategory.includes('artdirection'))
    ) {
      lastActiveCategory = 'artdirection';
    } else if (
      currentCategory === 'photography' ||
      (currentCategory && currentCategory.includes('photography'))
    ) {
      lastActiveCategory = 'photography';
    }

    // 🎬 Fluid slideshow now handles touch/swipe on all devices
  }

  function preloadAllMedia() {
    manifestPromise.then(manifest => {
      if (!manifest) {
        return;
      }

      // Load only current album (photography or artdirection)
      const currentSection = currentCategory === 'artdirection' ? 'artdirection' : 'photography';
      const currentAlbum = manifest[currentSection]?.[currentAlbumKey];

      if (!currentAlbum || currentAlbum.length === 0) {
        return;
      }

      // 🔍 Filter images to avoid duplicates
      const filteredAlbum = filterUniqueImages(currentAlbum);

      // Sequential preloading of ALL media (one at a time, in order)
      if (mediaCache && filteredAlbum.length > 0) {
        mediaCache.startSequentialPreload(filteredAlbum, currentIndex);
      }
    });
  }
  async function safeFetch(url, options = {}) {
    return safeAsync(
      async () => {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Cache-Control': 'no-cache',
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }

        return await response.text();
      },
      `fetch_${url}`,
      null
    );
  }

  const manifestPromise = safeFetch(`/albums.json?v=${Date.now()}`)
    .then(data => {
      if (!data) {
        return {
          photography: {},
          artdirection: {},
        };
      }
      return data;
    })
    .catch(error => {
      return {
        photography: {},
        artdirection: {},
      };
    });

  const orderPromise = Promise.resolve(window.orderData || { photography: [], artdirection: [] });
  const albumMatch = location.pathname.match(/\/(photography|artdirection)\/(.+)/);

  Promise.all([manifestPromise, orderPromise]).then(([manifest, order]) => {
    manifestData = manifest;
    orderData = order;
    let files;
    if (albumMatch) {
      const category = albumMatch[1];
      const albumKey = decodeURIComponent(albumMatch[2]);
      currentCategory = category;
      currentAlbumKey = albumKey;
      files =
        manifest?.[category]?.[albumKey] || manifest?.[category]?.[albumKey.toLowerCase()] || [];
    } else {
      if (currentDomain === 'paulthery.studio' && window.autoOpenCategory === 'artdirection') {
        const defaultKey = manifest?.artdirection
          ? Object.keys(manifest.artdirection).find(k => k.toLowerCase() === 'work')
          : undefined;
        currentCategory = 'artdirection';
        currentAlbumKey = defaultKey;
        files = defaultKey ? manifest.artdirection[defaultKey] : [];
      } else if (window.autoOpenCategory === 'artdirection') {
        const defaultKey = manifest?.artdirection
          ? Object.keys(manifest.artdirection).find(k => k.toLowerCase() === 'work')
          : undefined;
        currentCategory = 'artdirection';
        currentAlbumKey = defaultKey;
        files = defaultKey ? manifest.artdirection[defaultKey] : [];
      } else {
        const defaultKey = manifest?.photography
          ? Object.keys(manifest.photography).find(k => k.toLowerCase() === 'recent')
          : undefined;
        currentCategory = 'photography';
        currentAlbumKey = defaultKey;
        files = defaultKey ? manifest.photography[defaultKey] : [];
      }
    }

    if (window.location.pathname.includes('/artdirection/')) {
      lastActiveCategory = 'artdirection';
    } else if (
      currentCategory === 'artdirection' ||
      (currentCategory && currentCategory.includes('artdirection'))
    ) {
      lastActiveCategory = 'artdirection';
    } else if (
      currentCategory === 'photography' ||
      (currentCategory && currentCategory.includes('photography'))
    ) {
      lastActiveCategory = 'photography';
    }

    finishLoad(files);

    // Preload first image after data loading
    setTimeout(() => {
      preloadFirstImage();
    }, 100);
  });
  if (introText && mainContent && mainImage) {
    setTimeout(() => {
      showMainContent();
    }, 2500);

    introText.style.opacity = '1';

    // Sequential animation - original timings
    const paulText = introText.querySelector('.medium');
    const photoText = introText.querySelector('.light');

    if (paulText && photoText) {
      // 1. "Paul Thery" appears
      setTimeout(() => {
        paulText.style.transition = 'opacity 1.2s ease';
        paulText.style.opacity = '1';
      }, 600);

      // 2. "Studio" appears (slight delay)
      setTimeout(() => {
        photoText.style.transition = 'opacity 1.2s ease';
        photoText.style.opacity = '1';
      }, 800);

      // 3. "Paul Thery" goes up (with requestAnimationFrame for more fluidity)
      const startPaulAnimation = () => {
        paulText.style.animation = 'glideUp 1.2s ease forwards';
      };
      setTimeout(() => requestAnimationFrame(startPaulAnimation), 2000);

      // 4. "Studio" goes up (slight delay)
      const startPhotoAnimation = () => {
        photoText.style.animation = 'glideUp 1.2s ease forwards';
      };
      setTimeout(() => requestAnimationFrame(startPhotoAnimation), 2400);
    } else {
      // Fallback
      showMainContent();
    }
  }
  const customCursor = document.createElement('div');
  customCursor.id = 'custom-cursor';
  document.body.appendChild(customCursor);

  function calculateInitialCursorPosition() {
    // Use the same logic as updateTouchUIPositions for consistency
    updateTouchUIPositions();
  }

  calculateInitialCursorPosition();
  window.addEventListener('resize', calculateInitialCursorPosition);

  // Listen for image changes to reposition cursor only on mobile (landscape stability rule)
  document.addEventListener('imageUpdated', () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      calculateInitialCursorPosition();
    }
  });

  const isMobile = window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches;
  if (isMobile) {
    const showMobileCursor = () => {
      if (document.body.classList.contains('intro-complete')) {
        updateTouchUIPositions();
      } else {
        setTimeout(showMobileCursor, 500);
      }
    };
    setTimeout(showMobileCursor, 1000);
  }
  let touchDetected = false;
  window.addEventListener(
    'touchstart',
    function onFirstTouch() {
      touchDetected = true;
      window.removeEventListener('touchstart', onFirstTouch, { capture: true });
    },
    { once: true, capture: true, passive: true }
  );
  // ⚡ Optimize mousemove with throttling and conditional events
  let mouseThrottle = false;
  let lastCursorState = null;
  let mouseEventsActive = false;
  let lastMouseEvent = { clientX: 0, clientY: 0 };

  function handleMouseMove(e) {
    if (mouseThrottle || !mouseEventsActive) return;

    // Store position to avoid recalculations
    lastMouseEvent = { clientX: e.clientX, clientY: e.clientY };

    mouseThrottle = true;
    requestAnimationFrame(() => {
      const isTouch = utils.isTouch();
      if (isTouch) {
        mouseThrottle = false;
        return;
      }

      const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
      const overNavLink = elementUnder && elementUnder.closest('#nav a');
      const overIndexArea = elementUnder && elementUnder.closest('#index-content');

      // Pointer cursor on index, none elsewhere
      const indexOpen = domCache.indexOverlay && domCache.indexOverlay.classList.contains('active');
      const newCursor = indexOpen ? 'pointer' : 'none';
      if (newCursor !== lastCursorState) {
        document.body.style.setProperty('cursor', newCursor, 'important');
        lastCursorState = newCursor;
      }

      if (overNavLink || overIndexArea) {
        const rectSource = overNavLink ? overNavLink : overIndexArea;
        const linkRect = rectSource.getBoundingClientRect();
        setTimeout(() => {
          customCursor.classList.add('smooth-move');
          if (overNavLink) {
            customCursor.style.top = linkRect.top - 10 + 'px';
          } else {
            customCursor.style.left = e.clientX - 20 + 'px';
            customCursor.style.top = e.clientY + 10 + 'px';
          }
          document.body.classList.add('cursor-off');
          const removeClass = () => {
            customCursor.classList.remove('smooth-move');
            customCursor.removeEventListener('transitionend', removeClass);
          };
          customCursor.addEventListener('transitionend', removeClass, { once: true });
        }, 100);
      } else {
        document.body.classList.remove('cursor-off');
        customCursor.style.transition = 'none';
        customCursor.style.left = e.clientX + 'px';
        customCursor.style.top = e.clientY + 10 + 'px';
        customCursor.style.opacity = '';
      }

      if (navigationManager) navigationManager.refresh();
      document.dispatchEvent(new Event('imageUpdated'));
      document.title = 'Paul Thery Studio';

      mouseThrottle = false;
    });
  }

  function enableMouseEvents() {
    if (mouseEventsActive) return;
    mouseEventsActive = true;
    document.addEventListener('mousemove', handleMouseMove);
  }

  function disableMouseEvents() {
    if (!mouseEventsActive) return;
    mouseEventsActive = false;
    document.removeEventListener('mousemove', handleMouseMove);
  }

  // ⚡ Conditional optimization: enable events after intro
  function optimizeEventListeners() {
    if (document.body.classList.contains('intro-complete')) {
      enableMouseEvents();
    }
  }

  // Observe class changes to automatically optimize
  const classObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        optimizeEventListeners();
      }
    });
  });

  classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Enable mouse events after intro
  document.addEventListener('introFinished', enableMouseEvents);

  // Fallback if event is not dispatched
  document.addEventListener('DOMContentLoaded', () => {
    const checkIntroComplete = () => {
      if (document.body.classList.contains('intro-complete')) {
        enableMouseEvents();
      } else {
        setTimeout(checkIntroComplete, 100);
      }
    };
    setTimeout(checkIntroComplete, 1000); // Wait 1s before checking
  });
  document.addEventListener('mouseleave', () => {
    if (touchDetected) return;
    customCursor.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    if (touchDetected) return;
    if (document.body.classList.contains('intro-complete')) {
      customCursor.style.opacity = '1';
    }
  });
  function updateCursor() {
    let albumName = 'recent';
    const albumMatch = location.pathname.match(/\/(photography|artdirection)\/(.+)/);
    if (albumMatch) {
      albumName = decodeURIComponent(albumMatch[2]);
    } else {
      const defaultAlbum = document.querySelector('#gallery-nav span:first-child');
      if (defaultAlbum && defaultAlbum.textContent) {
        albumName = defaultAlbum.textContent;
      }
    }
    // Use consistent formatting with index
    const formattedAlbumName = capitalizeWordsOver3Letters(albumName);
    customCursor.textContent = `${formattedAlbumName} — ${currentIndex + 1}/${totalImages}`;

    // Update gallery nav with formatted album name
    const galleryNavSpan = document.querySelector('#gallery-nav span:first-child');
    if (galleryNavSpan) {
      galleryNavSpan.textContent = formattedAlbumName;
    }
  }
  // Debounce to avoid double-clicks
  let lastImageUpdate = 0;
  const IMAGE_UPDATE_DEBOUNCE = 50; // 50ms minimum between 2 changes

  // Function to update media logic (logos, videos)
  // used by fluid slideshow
  function updateMediaLogic(src, index) {
    if (!src) return;

    // For images only - videos are handled in slidechange
    const isVideo = src.includes('.mp4');
    if (!isVideo) {
      setTimeout(() => {
        const logoPath = getLogoForImage(src);
        // Show logo if not shown for this album OR coming from gallery
        if (logoPath && (!logoShownForCurrentAlbum || fromGallery)) {
          showLogoWhenReady(logoPath);
          logoShownForCurrentAlbum = true;
        }
        if (fromGallery) {
          fromGallery = false;
        }
      }, 100);
    }

    setTimeout(() => {
      isLoadingAlbum = false;
    }, 1000);

    // Enable autoplay for videos
    enableAutoplay();
  }

  function updateImage() {
    return safeExecute(() => {
      if (!images.length) return;

      // Debounce: avoid changes too fast
      const now = Date.now();
      if (now - lastImageUpdate < IMAGE_UPDATE_DEBOUNCE) {
        return;
      }
      lastImageUpdate = now;

      const imgEl = mainImage;
      const vidEl = mainVideo;

      if (currentCategory === 'artdirection' && isFirstArtDirectionLoad) {
        currentIndex = Math.floor(Math.random() * images.length);
        isFirstArtDirectionLoad = false;
      }

      if (currentIndex < 0) {
        currentIndex = totalImages - 1;
      } else if (currentIndex >= totalImages) {
        currentIndex = 0;
      }

      const src = images[currentIndex];
      if (!src) {
        errorManager.handleError({
          type: 'media_error',
          message: 'Source media manquante',
          context: 'updateImage',
          currentIndex,
          totalImages,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const ext = src.split('.').pop().toLowerCase();

      const nextIndex = (currentIndex + 1) % totalImages;
      const nextSrc = images[nextIndex];
      const nextExt = nextSrc.split('.').pop().toLowerCase();

      // Don't preload next videos to avoid multiple loads
      // Videos will be loaded on demand by slideshow

      const cachedMedia = mediaCache.getCachedMedia(src);

      if (/(mp4|webm)$/i.test(ext)) {
        imgEl.style.display = 'none';

        // Load video directly (no caching system)
        if (vidEl.src !== src) {
          vidEl.src = src;
        }

        // Force autoplay properties on JS side
        vidEl.muted = true;
        vidEl.autoplay = true;
        vidEl.playsInline = true;
        vidEl.setAttribute('playsinline', '');
        vidEl.setAttribute('webkit-playsinline', '');

        vidEl.play().catch(error => {
          if (error.name === 'NotAllowedError') {
            window.autoplayBlocked = true;
            // Try to play video after user interaction
            const tryPlayOnInteraction = () => {
              vidEl.play().catch(() => {});
              document.removeEventListener('click', tryPlayOnInteraction);
              document.removeEventListener('touchstart', tryPlayOnInteraction);
            };
            document.addEventListener('click', tryPlayOnInteraction, { once: true });
            document.addEventListener('touchstart', tryPlayOnInteraction, { once: true });
          } else if (error.name !== 'AbortError') {
            errorManager.handleError({
              type: 'video_play_error',
              message: error.message,
              source: src,
              context: 'video_play',
              timestamp: new Date().toISOString(),
            });
          }
        });

        if (vidEl && vidEl.style && vidEl.style !== null) {
          vidEl.style.display = 'block';
        }

        // Fix CLS: Mark as loaded for videos too
        const wrapper = domCache.wrapper;
        if (wrapper && !wrapper.classList.contains('loaded')) {
          wrapper.classList.add('loaded');
        }

        // Enable autoplay for this video
        enableAutoplay();

        vidEl.onerror = e => {
          errorManager.handleError({
            type: 'video_load_error',
            message: 'Failed to load video',
            source: src,
            context: 'video_load',
            timestamp: new Date().toISOString(),
          });
          if (vidEl && vidEl.style && vidEl.style !== null) {
            vidEl.style.display = 'none';
          }
        };

        imgEl.removeAttribute('alt');
      } else {
        safeExecute(() => {
          vidEl.pause();
          vidEl.removeAttribute('src');
          vidEl.load();
        }, 'video_cleanup');

        if (vidEl && vidEl.style && vidEl.style !== null) {
          vidEl.style.display = 'none';
        }

        if (cachedMedia) {
          // Batch DOM updates: do everything at once to avoid reflows
          imgEl.style.cssText = 'display: block; opacity: 1;';
          imgEl.src = cachedMedia.src;

          // Lazy UI updates: wait a bit before updating
          setTimeout(() => {
            if (navigationManager) navigationManager.refresh();
            // Fix CLS: Mark wrapper as loaded after first image (even from cache)
            const wrapper = domCache.wrapper;
            if (wrapper && !wrapper.classList.contains('loaded')) {
              wrapper.classList.add('loaded');
            }
          }, 50);
        } else {
          // Batch DOM updates : tout faire d'un coup
          imgEl.style.cssText = 'display: block; opacity: 1;';
          imgEl.src = src; // AVIF only, no conversion needed

          imgEl.onerror = () => {
            errorManager.handleError({
              type: 'image_load_error',
              message: 'Failed to load image',
              source: src,
              context: 'image_load',
              timestamp: new Date().toISOString(),
            });
            imgEl.style.opacity = '0.5';
            imgEl.alt = 'Image non disponible';
          };

          imgEl.onload = () => {
            // Lazy UI updates: wait a bit before updating
            setTimeout(() => {
              if (navigationManager) navigationManager.refresh();
              // Fix CLS: Mark wrapper as loaded after first image
              const wrapper = domCache.wrapper;
              if (wrapper && !wrapper.classList.contains('loaded')) {
                wrapper.classList.add('loaded');
              }
            }, 50);
          };
        }
        // Enhanced alt text for SEO and AI search engines
        const categoryLabel = currentCategory === 'artdirection' ? 'Art Direction' : 'Photography';
        const albumName = currentAlbumKey || '';
        const formattedAlbumName = albumName
          ? albumName
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')
          : '';
        imgEl.alt = formattedAlbumName
          ? `${categoryLabel} by Paul Thery - ${formattedAlbumName} - Image ${currentIndex + 1} of ${totalImages}`
          : `${categoryLabel} by Paul Thery - Image ${currentIndex + 1} of ${totalImages}`;
      }

      // Lazy UI updates: wait before updating cursor
      setTimeout(() => {
        safeExecute(updateCursor, 'cursor_update');
      }, 100);

      const isMobile = window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches;
      if (isMobile && document.body.classList.contains('intro-complete')) {
        safeExecute(updateTouchUIPositions, 'touch_ui_update');
      }

      // Wait for image to load before repositioning nav (important for landscape images)
      const checkImageLoad = () => {
        const imgEl = mainImage;
        if (imgEl && imgEl.complete && imgEl.naturalWidth) {
          safeExecute(() => {
            if (navigationManager) {
              navigationManager.updatePosition();
            }
          }, 'nav_position_final_update');
        } else {
          // Image not fully loaded yet, wait and retry
          setTimeout(checkImageLoad, 100);
        }
      };
      checkImageLoad();

      safeExecute(() => {
        document.dispatchEvent(new Event('imageUpdated'));
        document.title = 'Paul Thery Studio';
      }, 'document_updates');

      setTimeout(() => {
        const logoPath = getLogoForImage(src);
        if (logoPath && (!logoShownForCurrentAlbum || fromGallery)) {
          showLogo(logoPath);
          logoShownForCurrentAlbum = true;
        }
        if (fromGallery) {
          fromGallery = false;
        }
      }, 100);

      setTimeout(() => {
        isLoadingAlbum = false;
      }, 1000);
    }, 'updateImage_main');
  }

  function getLogoForImage(imagePath) {
    if (!imagePath) return null;

    const fileName = imagePath.split('/').pop().toLowerCase();

    // Handle _mobile and _desktop files by removing these suffixes first
    let cleanFileName = fileName;
    if (fileName.includes('_mobile.')) {
      cleanFileName = fileName.replace('_mobile.', '.');
    } else if (fileName.includes('_desktop.')) {
      cleanFileName = fileName.replace('_desktop.', '.');
    }

    const lastUnderscoreIndex = cleanFileName.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) return null;

    const extensionIndex = cleanFileName.lastIndexOf('.');
    if (extensionIndex === -1 || extensionIndex <= lastUnderscoreIndex) return null;

    const brandName = cleanFileName.substring(lastUnderscoreIndex + 1, extensionIndex);

    if (brandName === 'chanel') {
      return '/assets/chanel.svg';
    } else if (brandName === 'vuitton') {
      return '/assets/vuitton.svg';
    } else if (brandName === 'loewe') {
      return '/assets/loewe.svg';
    } else if (brandName === 'lancome') {
      return '/assets/lancome.svg';
    }

    return null;
  }

  // Variables to manage logo timers
  let logoHideTimer = null;
  let logoFadeTimer = null;
  let lastVideoActiveTime = 0;

  function showLogo(logoPath) {
    // Clean existing timers to avoid conflicts
    if (logoHideTimer) {
      clearTimeout(logoHideTimer);
      logoHideTimer = null;
    }
    if (logoFadeTimer) {
      clearTimeout(logoFadeTimer);
      logoFadeTimer = null;
    }

    setTimeout(() => {
      let logoOverlay = document.getElementById('logo-overlay');
      let logoImage = document.getElementById('logo-image');

      if (!logoOverlay) {
        const imageWrapper = domCache.wrapper;
        if (!imageWrapper) {
          errorManager.handleError(new Error('image-wrapper not found for logo creation'));
          return;
        }

        logoOverlay = document.createElement('div');
        logoOverlay.id = 'logo-overlay';
        imageWrapper.appendChild(logoOverlay);

        logoImage = document.createElement('img');
        logoImage.id = 'logo-image';
        logoOverlay.appendChild(logoImage);
      } else if (!logoImage) {
        logoImage = document.createElement('img');
        logoImage.id = 'logo-image';
        logoOverlay.appendChild(logoImage);
      }

      logoOverlay.style.display = 'flex';
      logoImage.fetchPriority = 'low'; // Don't be LCP
      logoImage.loading = 'lazy';
      logoImage.src = logoPath;
      logoImage.style.display = 'block';

      logoImage.style.height = '7.5%';
      logoImage.style.width = 'auto';
      logoImage.style.maxWidth = '50%';
      logoImage.style.position = 'absolute';
      logoImage.style.left = '50%';
      logoImage.style.transform = 'translateX(-50%)';
      logoImage.style.zIndex = '10';
      logoImage.style.opacity = '1';
      logoImage.style.transition = 'opacity 0.5s ease-out';
      logoImage.style.filter = 'drop-shadow(0 0 25px rgba(0, 0, 0, 0.25))';

      logoImage.style.setProperty('height', '7.5%', 'important');

      // Add class to force video positioning BEFORE adjustLogoForImageOrientation
      const mainVideo = document.getElementById('main-video');
      if (mainVideo) {
        logoImage.classList.add('video-logo');
      } else {
        logoImage.classList.remove('video-logo');
      }

      adjustLogoForImageOrientation();

      // Force logo repositioning after delay for videos
      setTimeout(() => {
        adjustLogoForImageOrientation();
      }, 200);

      // Timer to hide logo after 2.5s
      logoFadeTimer = setTimeout(() => {
        if (logoImage && logoOverlay) {
          logoImage.style.opacity = '0';

          logoHideTimer = setTimeout(() => {
            if (logoOverlay && logoImage) {
              logoOverlay.style.display = 'none';
              logoImage.style.display = 'none';
            }
            logoHideTimer = null;
            logoFadeTimer = null;
          }, 500);
        }
      }, 2500);
    }, 100);
  }

  function hideLogo() {
    // 🧹 Clean existing timers
    if (logoHideTimer) {
      clearTimeout(logoHideTimer);
      logoHideTimer = null;
    }
    if (logoFadeTimer) {
      clearTimeout(logoFadeTimer);
      logoFadeTimer = null;
    }

    const logoOverlay = document.getElementById('logo-overlay');
    const logoImage = document.getElementById('logo-image');

    if (!logoOverlay || !logoImage) return;

    logoOverlay.style.display = 'none';
    logoImage.style.display = 'none';
  }

  function isArtDirectionAlbum() {
    const isArtDirectionCategory =
      currentCategory === 'artdirection' ||
      (currentCategory && currentCategory.includes('artdirection'));

    const isArtDirectionUrl = window.location.pathname.includes('/artdirection/');

    const isArtDirectionImage =
      images[currentIndex] && images[currentIndex].includes('/artdirection/');

    const isStudioDomain = currentDomain === 'paulthery.studio';

    const result =
      isArtDirectionCategory || isArtDirectionUrl || isArtDirectionImage || isStudioDomain;

    return result;
  }

  function adjustLogoForImageOrientation() {
    const logoImage = document.getElementById('logo-image');
    const mainImage = document.getElementById('main-image');
    const mainVideo = document.getElementById('main-video');

    if (!logoImage) return;

    const checkImageDimensions = () => {
      const currentMedia =
        mainImage && mainImage.style && mainImage.style.display !== 'none' ? mainImage : mainVideo;
      const isVideo = currentMedia === mainVideo;

      // For images: check complete, for videos: check readyState
      const isMediaReady = currentMedia
        ? isVideo
          ? currentMedia.readyState >= 2 // HAVE_CURRENT_DATA for videos
          : currentMedia.complete
        : false;

      if (!currentMedia || !isMediaReady) {
        requestAnimationFrame(checkImageDimensions);
        return;
      }

      const imageWidth =
        currentMedia.naturalWidth || currentMedia.videoWidth || currentMedia.clientWidth;
      const imageHeight =
        currentMedia.naturalHeight || currentMedia.videoHeight || currentMedia.clientHeight;

      if (imageWidth && imageHeight) {
        const aspectRatio = imageWidth / imageHeight;

        const isPortrait = aspectRatio < 1;
        const isLandscape = aspectRatio > 1.2;

        if (isVideo || logoImage.classList.contains('video-logo')) {
          logoImage.style.removeProperty('bottom');
          logoImage.style.top = '50%';
          logoImage.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
        } else {
          if (isLandscape) {
            logoImage.style.removeProperty('bottom');
            logoImage.style.top = '50%';
            logoImage.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
          } else {
            logoImage.style.removeProperty('top');
            logoImage.style.setProperty('transform', 'translateX(-50%)', 'important');

            const isMobile = utils.isMobile();
            const bottomValue = isMobile ? '15%' : '12.5%';
            logoImage.style.setProperty('bottom', bottomValue, 'important');
          }
        }

        const imageWrapper = domCache.wrapper;
        const wrapperHeight = imageWrapper.clientHeight;

        if (isPortrait) {
          logoImage.style.height = '7.5%';
          logoImage.style.width = 'auto';
          logoImage.style.maxWidth = '50%';
        }
      }
    };

    checkImageDimensions();
  }

  function showMainContent() {
    if (!introText || !mainContent) return;

    // Show wrapper as soon as intro starts
    document.body.classList.add('intro-started');

    // Le transform du parent s'ajoute aux animations glideUp des enfants
    introText.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    introText.style.opacity = '0';
    introText.style.transform = 'translateY(-100px)';

    if (introBackground) {
      introBackground.style.transition = 'transform 0.8s ease';
      setTimeout(() => {
        introBackground.style.transform = 'translateY(-100%)';
      }, 400);
    }
    const revealMask = domCache.get('reveal-mask');
    if (revealMask) {
      setTimeout(() => {
        revealMask.style.transition = 'transform 0.8s ease';
        revealMask.style.transform = 'translateY(-100%)';
      }, 600);
    }
    setTimeout(() => {
      if (introText) introText.style.display = 'none';
      if (mainContent) {
        if (mainImage) mainImage.style.opacity = '1';
        mainContent.classList.add('loaded');
      }
      const imageMask = domCache.get('image-mask');
      if (imageMask) {
        imageMask.style.transition = 'transform 0.8s ease';
        imageMask.style.transform = 'translateY(-100%)';
        imageMask.addEventListener(
          'transitionend',
          () => {
            document.body.classList.add('intro-complete');
            document.dispatchEvent(new Event('introFinished'));
            if (navigationManager) navigationManager.refresh();
          },
          { once: true }
        );
      } else {
        document.body.classList.add('intro-complete');
        document.dispatchEvent(new Event('introFinished'));
        if (navigationManager) navigationManager.refresh();
      }
      updateImage();
      if (navigationManager) navigationManager.refresh();
      // Enable autoplay after initialization
      enableAutoplay();
    }, 800);
  }
  if (introText) {
    introText.style.color = 'white';
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') {
      fromGallery = false;
      if (fluidSlideshow) {
        fluidSlideshow.next();
      } else {
        currentIndex = (currentIndex + 1) % totalImages;
        updateImage();
      }
    } else if (e.key === 'ArrowLeft') {
      fromGallery = false;
      if (fluidSlideshow) {
        fluidSlideshow.prev();
      } else {
        currentIndex = (currentIndex - 1 + totalImages) % totalImages;
        updateImage();
      }
    }
  });

  const indexTrigger = document.getElementById('index-trigger');
  const indexOverlay = document.getElementById('index-overlay');
  const indexContent = document.getElementById('index-content');
  let hasEnteredRight = false;
  let isClosing = false;
  function updateBioPosition() {
    const bioSection = document.querySelector('.bio-section');
    const indexContent = document.getElementById('index-content');
    const isMobile = window.innerWidth <= 768;
    const isDesktop = window.innerWidth > 1000;
    const isIPad =
      /iPad/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    if (!indexContent || !bioSection) return;
    const albumList = indexContent.querySelector('.albums-list.unified');
    const indexFooter = indexContent.querySelector('.index-footer');
    if (albumList && indexFooter) {
      requestAnimationFrame(() => {
        const albumListBottom = albumList.offsetTop + albumList.offsetHeight;
        const footerTop = indexFooter.offsetTop;
        const bioHeight = bioSection.offsetHeight;
        const availableSpace = footerTop - albumListBottom;
        const centeredTop = albumListBottom + availableSpace / 2 - bioHeight / 2;
        bioSection.style.position = 'absolute';
        bioSection.style.top = `${centeredTop}px`;
        bioSection.style.bottom = 'auto';
        if (isIPad && isPortrait) {
          bioSection.style.left = 'auto';
          bioSection.style.right = '50px';
          bioSection.style.width = '60vw';
        } else if (isDesktop) {
          bioSection.style.left = 'auto';
          bioSection.style.right = '50px';
          bioSection.style.width = '33.3vw';
        } else {
          const indexContentStyle = getComputedStyle(indexContent);
          const leftPadding = parseFloat(indexContentStyle.paddingLeft) || 0;
          const rightPadding = parseFloat(indexContentStyle.paddingRight) || 0;
          bioSection.style.left = `${leftPadding}px`;
          bioSection.style.right = `${rightPadding}px`;
          bioSection.style.width = 'auto';
        }
      });
    }
  }
  function updateIndexLayout() {
    if (!indexOverlay || !indexOverlay.classList.contains('active') || !indexContent) return;

    const isMobile = window.innerWidth <= 768;
    const isTabletOrMobile = window.innerWidth <= 1200;

    if (isMobile && isTabletOrMobile) {
      // Mobile: always use wrapper for consistency
      const imageWrapper = domCache.wrapper;

      // Always use wrapper for consistency
      const wrapperRect = imageWrapper.getBoundingClientRect();
      const elementTop = wrapperRect.top;

      // Center in the available space above (same as cursor)
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const spaceAbove = elementTop;
      const indexTabs = indexContent.querySelector('.index-tabs');
      const tabsHeight = indexTabs ? indexTabs.offsetHeight : 0;
      const indexHeader = indexContent.querySelector('.index-header');
      const headerHeight = indexHeader ? indexHeader.offsetHeight : 0;
      const totalTopHeight = tabsHeight + headerHeight;

      // Position the tabs header at the top (cursor-like calculation)
      const tabsTop = spaceAbove / 2 - totalTopHeight / 2 + 10;
      if (indexTabs) {
        indexTabs.style.setProperty('margin-top', `${Math.max(0, tabsTop)}px`, 'important');
      }

      // Footer position: bottom centered in space between wrapper and screen bottom (mobile)
      const indexFooter = indexContent.querySelector('.index-footer');
      if (indexFooter) {
        // Simple centering: bottom = half of space under wrapper
        const elementBottom = wrapperRect.bottom;
        const spaceBelow = viewportHeight - elementBottom;
        const footerBottom = Math.max(0, spaceBelow / 2 - 5);
        indexFooter.style.setProperty('bottom', `${footerBottom}px`, 'important');
        indexFooter.style.setProperty('position', 'fixed', 'important');
      }
    } else {
      // Desktop: keep original logic
      const wrapperRect = imageWrapper.getBoundingClientRect();
      indexContent.style.paddingTop = `${wrapperRect.top}px`;
      const indexFooter = indexContent.querySelector('.index-footer');
      if (indexFooter) {
        const windowHeight = getVH();
        // Remove all offsets for clean alignment with wrapper bottom
        const footerBottom = windowHeight - wrapperRect.bottom;
        indexFooter.style.setProperty('bottom', `${footerBottom}px`, 'important');
        indexFooter.style.setProperty('position', 'absolute', 'important');
      }
    }
    updateBioPosition();
  }
  if (indexTrigger && indexOverlay && indexContent && imageWrapper) {
    const openIndex = (category = lastActiveCategory, userInitiated = false) => {
      // Only recreate content if it doesn't already exist
      if (!indexContent.querySelector('.index-tabs')) {
        const creativeServicesHtml = `<p><span class="medium">Creative Services</span> : image + art direction, photography, graphic design, content creation, post production, ai.</p>`;

        let tabsHtml;
        const isStudio = currentDomain === 'paulthery.studio';

        if (isStudio) {
          tabsHtml = `<div class="index-tabs">
            <a href="/artdirection" data-tab="artdirection">Image + Art Direction</a>
            <a href="/photography" data-tab="photography">Photography</a>
          </div>`;
        } else {
          tabsHtml = `<div class="index-tabs">
            <a href="/photography" data-tab="photography">Photography</a>
            <a href="/artdirection" data-tab="artdirection">Image + Art Direction</a>
          </div>`;
        }

        // Secure use of innerHTML with verified static content
        const secureContent = `${tabsHtml}
          <ul class="albums-list unified"></ul>
          <div class="bio-section">
            <p><span class="medium">Paul Thery Studio</span> is a visual creation studio based in Paris specializing in creative services for fashion and lifestyle brands. With over a decade of collaborations with brands such as Louis Vuitton, Chanel, and Loewe, we crafts powerful, refined, and timeless visual campaigns.</p>
            <p>Storytelling lies at the core of our philosophy. Guided by comprehensive research, refined expertise, and synergy between tradition and cutting edge technologies, we deliver bold and resonant creative solutions.</p>
            ${creativeServicesHtml}
          </div>
          <div class="index-footer">
            <div class="footer-left">
              <video id="index-footer-photo" muted playsinline preload="none" src="/assets/logo.webm">
              </video>
            </div>
            <div class="footer-right">
              <a href="mailto:studio@paulthery.com">Contact</a><span class="separator"> — </span>
              <a href="http://www.instagram.com/paulthery" target="_blank" rel="noopener noreferrer">Instagram</a><span class="separator"> — </span>
              <a href="https://vimeo.com/paulthery" target="_blank" rel="noopener noreferrer">Vimeo</a><span class="separator"> — </span>
              <a href="https://www.linkedin.com/in/paulthery/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>
        `;
        setSecureInnerHTML(indexContent, secureContent);
      }
      const logoVideo = indexContent.querySelector('#index-footer-photo');
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const isSimulator =
        /iPhone|iPad|iPod/.test(navigator.userAgent) &&
        (!window.navigator.standalone ||
          /Simulator|SimulatorApp/.test(navigator.userAgent) ||
          window.navigator.platform === 'MacIntel' ||
          /Xcode/.test(navigator.userAgent) ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1');
      function fallbackToPNG() {
        if (logoVideo) {
          const fallbackImg = logoVideo.querySelector('img');
          if (fallbackImg) {
            logoVideo.style.display = 'none';
            fallbackImg.style.display = 'block';
          }
        }
      }
      if (logoVideo) {
        logoVideo.addEventListener('error', e => {
          fallbackToPNG();
        });
        if (logoVideo.canPlayType && !logoVideo.canPlayType('video/webm')) {
          fallbackToPNG();
        }
      }
      if (logoVideo && isMobile) {
        if (isSimulator) {
          logoVideo.muted = true;
          logoVideo.loop = false;
          logoVideo.autoplay = true;
          setTimeout(() => {
            logoVideo.play().catch(e => {
              const tryPlay = () => {
                logoVideo.play().catch(err => {
                  fallbackToPNG();
                });
              };
              document.addEventListener('click', tryPlay, { once: true });
              document.addEventListener('touchstart', tryPlay, { once: true });
            });
          }, 100);
        } else {
          const playPromise = logoVideo.play();
          if (playPromise) {
            playPromise.catch(e => {
              document.addEventListener(
                'touchstart',
                () => {
                  logoVideo.play().catch(err => {
                    fallbackToPNG();
                  });
                },
                { once: true }
              );
            });
          }
        }
      }
      indexOverlay.classList.add('active');
      updateIndexLayout();
      imageWrapper.classList.add('index-mode');

      const isIPad =
        /iPad/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;

      if (isIPad && isPortrait) {
        imageWrapper.style.transform = 'translateX(-50vw)';
        indexContent.style.width = '100%';
        indexContent.style.left = '0';
        indexContent.style.right = '0';
      } else {
        imageWrapper.style.transform = 'translateX(-25vw)';
      }
      Promise.all([manifestPromise, orderPromise])
        .then(([manifest, order]) => {
          manifestData = manifest;
          orderData = order;
          const unifiedList = indexContent.querySelector('.albums-list.unified');
          const tabsBar = indexContent.querySelector('.index-tabs');
          const bioSection = indexContent.querySelector('.bio-section');
          function centerTabsDynamically() {
            if (!tabsBar) return;
            const targetEl = unifiedList;
            if (!targetEl) return;
            const albumGap = 0;
            const categoryGap = 20;
            const tabsToListGap = 40;
            document.documentElement.style.setProperty('--category-gap', categoryGap + 'px');
            const tabsToList = tabsToListGap;
            tabsBar.style.marginTop = '0px';
            tabsBar.style.marginBottom = tabsToList + 'px';
          }
          function renderPhotography() {
            if (!unifiedList) return;
            unifiedList.style.display = '';
            unifiedList.innerHTML = '';

            const orderedAlbums = orderData.photography || [];

            const workAlbums = [];
            const projectAlbums = [];

            const workAlbumNames = ['recent', 'work l', 'work ll', 'lv s:s 24'];

            orderedAlbums.forEach(album => {
              if (workAlbumNames.includes(album)) {
                workAlbums.push(album);
              } else {
                projectAlbums.push(album);
              }
            });

            const workData = {};
            workAlbums.forEach(album => {
              if (manifestData.photography[album]) {
                workData[album] = manifestData.photography[album];
              }
            });

            buildList(workData, workAlbums, unifiedList, 'photography');

            const sep1 = document.createElement('li');
            sep1.className = 'albums-separator';
            sep1.setAttribute('aria-hidden', 'true');
            unifiedList.appendChild(sep1);

            const projectData = {};
            projectAlbums.forEach(album => {
              if (manifestData.photography[album]) {
                projectData[album] = manifestData.photography[album];
              }
            });

            buildList(projectData, projectAlbums, unifiedList, 'photography');

            requestAnimationFrame(() => {
              centerTabsDynamically();
              updateBioPosition();
            });
          }
          function renderArtDirection() {
            if (!unifiedList) return;
            unifiedList.style.display = '';
            unifiedList.innerHTML = '';

            const orderedAlbums = orderData.artdirection || [];

            const workAlbums = [];
            const projectAlbums = [];

            const workAlbumNames = ['work', 'louis vuitton', 'chanel', 'loewe', 'lancôme'];

            orderedAlbums.forEach(album => {
              if (workAlbumNames.includes(album)) {
                workAlbums.push(album);
              } else {
                projectAlbums.push(album);
              }
            });

            const workData = {};
            workAlbums.forEach(album => {
              if (manifestData.artdirection[album]) {
                workData[album] = manifestData.artdirection[album];
              }
            });

            buildList(workData, workAlbums, unifiedList, 'artdirection');

            const sep1 = document.createElement('li');
            sep1.className = 'albums-separator';
            sep1.setAttribute('aria-hidden', 'true');
            unifiedList.appendChild(sep1);

            const projectData = {};
            projectAlbums.forEach(album => {
              if (manifestData.artdirection[album]) {
                projectData[album] = manifestData.artdirection[album];
              }
            });

            buildList(projectData, projectAlbums, unifiedList, 'artdirection');

            requestAnimationFrame(() => {
              centerTabsDynamically();
              updateBioPosition();
            });
          }
          const tabs = indexContent.querySelectorAll('.index-tabs a');
          tabs.forEach(tab => {
            tab.addEventListener('click', ev => {
              ev.preventDefault();
              const key = tab.getAttribute('data-tab');
              const url = tab.getAttribute('href');
              history.pushState({ category: key }, '', url);
              tabs.forEach(t => t.classList.remove('active'));
              tab.classList.add('active');
              if (key === 'photography') {
                renderPhotography();
              } else if (key === 'artdirection') {
                renderArtDirection();
              }
            });
          });
          tabs.forEach(t => t.classList.remove('active'));
          const activeTab = indexContent.querySelector(`.index-tabs a[data-tab="${category}"]`);
          if (activeTab) activeTab.classList.add('active');
          if (category === 'artdirection') {
            renderArtDirection();
          } else {
            renderPhotography();
          }
          window.addEventListener('resize', centerTabsDynamically, { passive: true });
          window.addEventListener('popstate', event => {
            const currentPath = window.location.pathname;
            let targetCategory = 'photography';
            if (currentPath === '/photography') targetCategory = 'photography';
            else if (currentPath === '/artdirection') targetCategory = 'artdirection';
            tabs.forEach(tab => {
              const key = tab.getAttribute('data-tab');
              tab.classList.toggle('active', key === targetCategory);
            });
            if (targetCategory === 'photography') renderPhotography();
            else if (targetCategory === 'artdirection') renderArtDirection();
          });
          if (logoVideo && !isMobile) {
            const isTabletPortrait =
              window.matchMedia('(max-width: 1200px)').matches &&
              window.matchMedia('(orientation: portrait)').matches;
            const delay = isTabletPortrait ? 200 : 400;
            setTimeout(() => {
              logoVideo.play().catch(err => {
                fallbackToPNG();
              });
            }, delay);
          }
          indexContent.addEventListener('click', ev => {
            const link = ev.target.closest('.albums-list a');
            if (!link) return;
            ev.preventDefault();
            ev.stopPropagation();
            const href = link.getAttribute('href');
            const pathParts = href.split('/').filter(part => part !== '');
            const albumKey = decodeURIComponent(pathParts[pathParts.length - 1]);
            const category = pathParts[0];

            const isNewAlbum = currentCategory !== category || currentAlbumKey !== albumKey;

            currentCategory = category;
            currentAlbumKey = albumKey;
            logoShownForCurrentAlbum = false;

            if (isNewAlbum) {
              isFirstArtDirectionLoad = true;
              currentIndex = 0;
            }

            let files = [];
            if (pathParts.length === 2) {
              files = manifestData[category]?.[albumKey] || [];
            }
            finishLoad(files);
            history.pushState(null, '', href);
            closeIndexOverlay();

            // Preload first image after album change
            setTimeout(() => {
              preloadFirstImage();
            }, 100);
          });
        })
        .catch(error => {
          // Secure use for error messages
          const errorElement = createSecureElement(
            'p',
            {},
            'Error loading album data. Please refresh the page.'
          );
          indexContent.innerHTML = '';
          indexContent.appendChild(errorElement);
        });
    };
    indexTrigger.addEventListener('click', e => {
      e.preventDefault();
      const category = window.autoOpenCategory || lastActiveCategory;
      openIndex(category, true);
    });

    setTimeout(() => {
      if (window.autoOpenCategory) {
        openIndex(window.autoOpenCategory, true);
        window.autoOpenCategory = null;
      }
    }, 4500);
    function closeIndexOverlay() {
      isClosing = true;
      const logoVideo = document.getElementById('index-footer-photo');
      if (logoVideo) {
        logoVideo.pause();
        const playbackRate = 1.5;
        let lastTime = performance.now();
        const reversePlayback = currentTime => {
          const deltaTime = (currentTime - lastTime) / 1000;
          lastTime = currentTime;
          if (logoVideo.currentTime > 0) {
            logoVideo.currentTime -= deltaTime * playbackRate;
            requestAnimationFrame(reversePlayback);
          } else {
            logoVideo.currentTime = 0;
          }
        };
        requestAnimationFrame(reversePlayback);
      }
      if (indexContent) {
        indexContent.style.transform = 'translateX(100%)';
        indexContent.style.transitionDelay = '0s';
      }
      imageWrapper.classList.remove('index-mode');
      imageWrapper.style.transform = '';

      setTimeout(() => {
        indexOverlay.classList.remove('active');
      }, 500);

      setTimeout(() => {
        // Don't empty content to avoid re-downloading logo
        // indexContent.innerHTML = '';
        indexContent.style.transform = '';
        isClosing = false;
      }, 1000);
      hasEnteredRight = false;
    }
    window.closeIndexOverlay = closeIndexOverlay;
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && indexOverlay.classList.contains('active')) {
        closeIndexOverlay();
      }
    });
    indexOverlay.addEventListener('click', e => {
      if (!e.target.closest('#index-content')) {
        closeIndexOverlay();
      } else {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const isTabletPortrait = window.matchMedia(
          '(orientation: portrait) and (min-width: 768px) and (max-width: 1200px)'
        ).matches;

        if (isMobile) {
          const clickedElement = e.target;
          const isCategoryTab = clickedElement.closest('.index-tabs');
          const isCategoryLink = clickedElement.closest('.index-tabs a');
          const isAlbumLink = clickedElement.closest('.albums-list a');
          const isFooter = clickedElement.closest('.index-footer');
          if (!isCategoryTab && !isCategoryLink && !isAlbumLink && !isFooter) {
            closeIndexOverlay();
          }
        } else if (isTabletPortrait) {
          const clickX = e.clientX;
          const screenWidth = window.innerWidth;
          const clickedElement = e.target;

          const isCategoryTab = clickedElement.closest('.index-tabs');
          const isCategoryLink = clickedElement.closest('.index-tabs a');

          if (clickX < screenWidth * 0.3 && !isCategoryTab && !isCategoryLink) {
            closeIndexOverlay();
          }
        }
      }
    });

    let touchStartX = 0;
    let touchStartY = 0;

    indexOverlay.addEventListener(
      'touchstart',
      e => {
        const isTabletPortrait = window.matchMedia(
          '(orientation: portrait) and (min-width: 768px) and (max-width: 1200px)'
        ).matches;
        const isMobilePortrait = window.matchMedia(
          '(max-width: 768px) and (orientation: portrait)'
        ).matches;
        const isTabletLandscape = window.matchMedia(
          '(orientation: landscape) and (min-width: 768px) and (max-width: 1200px)'
        ).matches;
        if (
          (isTabletPortrait || isMobilePortrait || isTabletLandscape) &&
          indexOverlay.classList.contains('active')
        ) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    indexOverlay.addEventListener(
      'touchend',
      e => {
        const isTabletPortrait = window.matchMedia(
          '(orientation: portrait) and (min-width: 768px) and (max-width: 1200px)'
        ).matches;
        const isMobilePortrait = window.matchMedia(
          '(max-width: 768px) and (orientation: portrait)'
        ).matches;
        const isTabletLandscape = window.matchMedia(
          '(orientation: landscape) and (min-width: 768px) and (max-width: 1200px)'
        ).matches;
        if (
          (isTabletPortrait || isMobilePortrait || isTabletLandscape) &&
          indexOverlay.classList.contains('active')
        ) {
          const touchEndX = e.changedTouches[0].clientX;
          const touchEndY = e.changedTouches[0].clientY;
          const deltaX = touchEndX - touchStartX;
          const deltaY = touchEndY - touchStartY;

          if (deltaX > 50 && Math.abs(deltaY) < 100) {
            closeIndexOverlay();
          }
        }
      },
      { passive: true }
    );

    const handleRouting = () => {
      const currentPath = window.location.pathname;
      const albumMatch = currentPath.match(/\/(photography|artdirection)\/(.+)/);

      if (albumMatch) {
        return;
      }

      let category = null;
      if (currentPath.startsWith('/photography')) {
        category = 'photography';
      } else if (currentPath.startsWith('/artdirection')) {
        category = 'artdirection';
      }
      if (category) {
        openIndex(category, false);
      }
    };
    if (document.body.classList.contains('intro-complete')) {
      handleRouting();
    } else {
      const observer = new MutationObserver(mutations => {
        if (document.body.classList.contains('intro-complete')) {
          handleRouting();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }
  if (indexOverlay && indexContent) {
    indexOverlay.addEventListener('mousemove', e => {
      if (!indexOverlay.classList.contains('active') || isClosing) return;
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
      if (indexOverlay.classList.contains('active') && !isClosing) {
        indexContent.style.transform = 'translateX(0)';
      }
    });
  }
  if (galleryOverlay && galleryNav && galleryScroll) {
    galleryOverlay.style.display = 'none';
    galleryNav.style.display = 'none';
    galleryScroll.style.display = 'none';
  }
  function updateGalleryMasks() {
    if (!topMask || !bottomMask || !imageWrapper) return;
    const rect = imageWrapper.getBoundingClientRect();
    topMask.style.height = rect.top + 'px';
    const vhMask = getVH();
    bottomMask.style.height = vhMask - rect.bottom + 'px';
  }
  function openGallery() {
    if (!galleryOverlay || !galleryGrid || !galleryNav || !galleryScroll) {
      return;
    }

    // Always clean existing videos before any (re)opening
    cleanupGalleryVideos();

    if (curtainOverlay) {
      curtainOverlay.style.transform = 'translateY(0)';
    }
    if (nav) nav.style.display = 'none';
    galleryOverlay.style.display = 'block';
    galleryNav.style.display = 'block';
    galleryScroll.style.display = 'block';
    galleryNav.style.opacity = '0';
    galleryScroll.style.opacity = '0';

    updateTouchUIPositions();
    // Position gallery-nav with the same calculation as main nav
    if (navigationManager) {
      navigationManager.updatePosition();
    }
    updateGalleryMasks();

    hideLogo();
    const customCursor = document.getElementById('custom-cursor');
    const isMobileGallery = window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches;
    if (customCursor && !isMobileGallery) {
      customCursor.style.setProperty('display', 'none');
    }
    // Set cursor: pointer on entire gallery area
    galleryOverlay.style.setProperty('cursor', 'pointer', 'important');
    galleryScroll.style.setProperty('cursor', 'pointer', 'important');
    galleryGrid.style.setProperty('cursor', 'pointer', 'important');
    galleryOverlay.style.transform = 'translateY(0)';
    galleryOverlay.classList.add('active');
    setTimeout(() => {
      updateGalleryMasks();
      if (topMask) topMask.style.transform = 'translateY(-100%)';
      if (bottomMask) bottomMask.style.transform = 'translateY(100%)';
    }, 100);
    galleryNav.style.opacity = '1';
    galleryScroll.style.opacity = '1';

    // Create thumbnails only if album changed or gallery is empty
    const galleryAlbumId = `${currentCategory}_${currentAlbumKey}`;
    if (currentGalleryAlbum !== galleryAlbumId || galleryGrid.children.length === 0) {
      galleryGrid.innerHTML = '';
      currentGalleryAlbum = galleryAlbumId;

      // Check that galleryImages is not empty
      if (galleryImages && galleryImages.length > 0) {
        galleryImages.forEach((src, index) => {
          createThumbnail(src, index);
        });
      } else {
        // If galleryImages is empty, try to get images from manifest
        if (manifestData && currentCategory && currentAlbumKey) {
          const files = manifestData[currentCategory]?.[currentAlbumKey] || [];
          if (files.length > 0) {
            // Filter mobile images like in loadMedia
            const filteredFiles = files.filter(file => !file.includes('_mobile'));
            galleryImages = filteredFiles;
            filteredFiles.forEach((src, index) => {
              createThumbnail(src, index);
            });
          }
        }
      }
    }

    function createThumbnail(src, index) {
      const ext = src.split('.').pop().toLowerCase();
      const container = document.createElement('div');
      container.className = 'gallery-thumb';

      if (ext === 'mp4' || ext === 'webm') {
        createVideoThumbnail(container, src);
      } else {
        createImageThumbnail(container, src);
      }

      container.style.opacity = '0';
      container.style.transition = 'opacity 0.6s ease-in-out';
      galleryGrid.appendChild(container);
    }

    async function createVideoThumbnail(container, src) {
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.controls = false;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsinline = true;
      video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;

      // Use URL directly - no blob due to CSP
      video.src = src;
      video.preload = 'metadata'; // First frame visible
      container.appendChild(video);

      // Play on hover
      container.addEventListener(
        'mouseenter',
        () => {
          video.preload = 'auto'; // Load completely
          video.play().catch(() => {});
        },
        { once: true }
      );
    }

    function createImageThumbnail(container, src) {
      const img = document.createElement('img');

      const cachedImg = mediaCache.getCachedMedia(src);
      img.src = cachedImg ? cachedImg.src : src; // AVIF only, no conversion needed

      // Enhanced alt text for SEO and AI search engines
      const pathParts = src.split('/');
      const fileName = pathParts.pop();
      const albumName = pathParts[pathParts.length - 1] || '';
      const category = pathParts[pathParts.length - 2] || '';
      const categoryLabel = category === 'artdirection' ? 'Art Direction' : 'Photography';
      const formattedAlbumName = albumName
        ? albumName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
        : '';
      img.alt = formattedAlbumName
        ? `${categoryLabel} by Paul Thery - ${formattedAlbumName} - ${fileName}`
        : `${categoryLabel} by Paul Thery - ${fileName}`;
      img.loading = 'eager';
      img.decoding = 'async';
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      container.appendChild(img);
    }

    const thumbs = galleryGrid.querySelectorAll('.gallery-thumb');
    thumbs.forEach(thumb => {
      thumb.style.opacity = '0';
    });

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

    // Event delegation to avoid listener accumulation
    if (!galleryGrid._clickDelegationBound) {
      galleryGrid.addEventListener('click', e => {
        const thumb = e.target.closest('.gallery-thumb');
        if (!thumb) return;
        e.preventDefault();
        e.stopPropagation();
        const children = Array.from(galleryGrid.children);
        const index = children.indexOf(thumb);
        if (index < 0) return;
        currentIndex = index;
        fromGallery = true;
        if (fluidSlideshow) {
          fluidSlideshow.goToSlide(index);
        } else {
          updateImage();
        }
        closeGallery();
      });
      galleryGrid._clickDelegationBound = true;
    }
  }
  function cleanupGalleryVideos() {
    if (!galleryGrid) return;

    const videos = galleryGrid.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.load(); // Force le nettoyage
    });
  }

  function closeGallery() {
    if (!galleryOverlay || !galleryNav || !galleryScroll || !galleryGrid) return;

    // Reset album ID to force thumb recreation on reopening
    currentGalleryAlbum = null;

    // DON'T clean or empty DOM - keep thumbnails in cache
    // Just hide the gallery

    galleryNav.style.transition = 'opacity 0.8s ease-in-out';
    galleryNav.style.opacity = '0';
    galleryScroll.style.transition = 'opacity 0.8s ease-in-out';
    galleryScroll.style.opacity = '0';
    if (topMask) topMask.style.transform = 'translateY(0)';
    if (bottomMask) bottomMask.style.transform = 'translateY(0)';
    if (nav) nav.style.display = 'flex';

    // Don't reposition nav after gallery closure - keep it in place
    // The nav position is already correct for the current media

    setTimeout(() => {
      if (curtainOverlay) {
        curtainOverlay.style.transform = 'translateY(100%)';
      }
      setTimeout(() => {
        galleryOverlay.style.display = 'none';
        galleryOverlay.classList.remove('active');
        galleryGrid.style.transition = '';
        galleryGrid.style.opacity = '';
        galleryNav.style.opacity = '';
        galleryScroll.style.opacity = '';
      }, 800);
    }, 400);
    const customCursor = document.getElementById('custom-cursor');
    if (customCursor) {
      customCursor.style.removeProperty('display');
    }
    // Don't set cursor: none on body to allow pointer on elements
    // document.body.style.cursor = 'none';
    // Reactivate autoplay after gallery closure
    enableAutoplay();
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
    let step = Math.ceil((ratio * 100) / increment) * increment;
    step = Math.max(increment, Math.min(100, step));
    const newHeight = Math.round((initialBase * step) / 100);
    const newWidth = Math.round((newHeight * 4) / 5);

    // Mobile: only fix max width, CSS aspect-ratio calculates height
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const viewportWidth = window.innerWidth;
      const maxAvailableWidth = viewportWidth - 40; // 20px margin on each side
      imageWrapper.style.width = Math.min(newWidth, maxAvailableWidth) + 'px';
      imageWrapper.style.height = ''; // Let aspect-ratio calculate
    } else {
      // Desktop: fix both dimensions
      imageWrapper.style.height = newHeight + 'px';
      imageWrapper.style.width = newWidth + 'px';
    }

    mainImage.style.maxWidth = '100%';
    mainImage.style.width = 'auto';
    mainImage.style.height = 'auto';
    if (navigationManager) navigationManager.refresh();
    updateTouchUIPositions();
  }
  updateImageStep();
  setMainContentHeight();
  window.updateDynamicUIPositions();
  updateTouchUIPositions();
  updateIndexLayout();
  setTimeout(() => {
    if (navigationManager) navigationManager.refresh();
  }, 10);
  setTimeout(() => {
    if (navigationManager) navigationManager.refresh();
  }, 100);
  setTimeout(() => {
    if (navigationManager) navigationManager.refresh();
  }, 500);
  // Coalesce via rAF to avoid multiple recalculations in same frame
  let pendingUIFrame = false;
  const scheduleUIUpdate = () => {
    if (pendingUIFrame) return;
    pendingUIFrame = true;
    requestAnimationFrame(() => {
      pendingUIFrame = false;
      updateImageStep();
      if (navigationManager) navigationManager.refresh();
      setMainContentHeight();
      window.updateDynamicUIPositions();
      updateTouchUIPositions();
      updateIndexLayout();
      if (galleryOverlay && galleryOverlay.style.display === 'block') {
        updateGalleryMasks();
      }
    });
  };
  // Throttle resize events to avoid too many calls
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(scheduleUIUpdate, 100);
  });
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
  document.addEventListener('imageUpdated', () => {
    safeExecute(window.updateDynamicUIPositions, 'dynamic_ui_positions_update');
  });

  // Dynamic preload of first image of current album
  function preloadFirstImage() {
    if (
      manifestData &&
      manifestData[currentCategory] &&
      manifestData[currentCategory][currentAlbumKey]
    ) {
      const firstImage = manifestData[currentCategory][currentAlbumKey][0];
      if (firstImage && /\.(avif)$/i.test(firstImage)) {
        const optimalUrl = firstImage; // AVIF only, no conversion needed

        // Check if image is not already preloaded
        const existingPreload = document.querySelector(`link[rel="preload"][href="${optimalUrl}"]`);
        if (!existingPreload) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = optimalUrl;
          if (optimalUrl.endsWith('.avif')) {
            link.type = 'image/avif';
          }
          document.head.appendChild(link);
        }
      }
    }
  }

  if (errorManager.isDevelopment()) {
    window.debugPortfolio = {
      errors: () => errorManager.getErrors(),
      clearErrors: () => errorManager.clearErrors(),
      mediaCache: () => ({
        ...mediaCache.getStats(),
        formatInfo: mediaCache.getFormatInfo(),
      }),
      clearCache: () => mediaCache.clearCache(),
      retryMedia: src => mediaCache.retryFailedMedia(src),
      safeExecute,
      safeAsync,
      errorManager,
    };
  }

  window.addEventListener('beforeunload', () => {
    safeExecute(() => {
      // Cleanup autoplay observer & timeout
      if (autoplayObserver) {
        try {
          autoplayObserver.disconnect();
        } catch (e) {}
        autoplayObserver = null;
      }
      if (autoplayTimeoutId) {
        clearTimeout(autoplayTimeoutId);
        autoplayTimeoutId = null;
      }
      if (mediaCache) {
        mediaCache.clearCache();
      }

      const errors = errorManager.getErrors();
      if (errors.length > 0 && !errorManager.isDevelopment()) {
        secureLocalStorageSetItem('portfolio_session_errors', errors);
      }
    }, 'beforeunload_cleanup');
  });

  // ========================================
  // SERVICE WORKER REGISTRATION
  // ========================================
  // Register Service Worker for offline support and caching
  // Works alongside MediaCacheManager without conflicts
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {}); // Silent fail if SW not available
    });
  }
});
