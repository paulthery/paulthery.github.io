// 🎨 PAUL THÉRY PORTFOLIO - MAIN JAVASCRIPT
// 📅 Optimized and reorganized by category
// 🚀 Performance optimized with utilities and caching

import MediaCacheManager from './modules/media-cache.min.js';
import formatDetector from './modules/format-detector.min.js';
import { buildList, capitalizeWordsOver3Letters } from './modules/ui-helpers.min.js';
import { FluidSlideshow } from './modules/slideshow.min.js';

// ========================================
// 🌐 CONFIGURATION & GLOBAL VARIABLES
// ========================================

// 🌐 Domain detection
const currentDomain = window.location.hostname;

// 🌐 Domain-specific metadata configuration
(function() {
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

// Force mobile slideshow for paulthery.studio
if (window.location.hostname === 'paulthery.studio') {
  window.forceMobileSlideshow = true;
}

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
let unifiedList = null;
let mediaCache = null;
let errorManager = null;
let autoplayEnabled = false;
let fluidSlideshow = null;
let autoplayObserver = null;
let autoplayTimeoutId = null;

// ========================================
// 🚀 UTILITY SYSTEMS
// ========================================

/**
 * Utility Functions - Common helpers for device detection and timing
 *
 * @namespace utils
 * @property {Function} isMobile - Check if device is mobile (max-width: 768px)
 * @property {Function} isTouch - Check if device supports touch
 * @property {Function} isMobileLandscape - Check for mobile landscape orientation
 * @property {Object} timeout - Centralized timeout management system
 */
const utils = {
  isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  },
  
  isTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  isMobileLandscape() {
    return window.matchMedia("(orientation: landscape) and (max-width: 1000px) and (max-height: 600px)").matches && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  },
  
  isMobileLandscapeHover() {
    return window.matchMedia("(orientation: landscape) and (max-width: 1000px) and (max-height: 600px) and (hover: none) and (pointer: coarse)").matches;
  },
  
  isTabletPortrait() {
    return window.matchMedia('(min-width: 768px) and (max-width: 1200px) and (orientation: portrait)').matches;
  },

  isTabletLandscape() {
    return window.matchMedia('(min-width: 900px) and (max-width: 1400px) and (orientation: landscape)').matches;
  },

  isMobilePortrait() {
    return window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches;
  },
  
  // ⏰ Timeout utilities to avoid repetitive setTimeout calls
  timeout: {
    timers: new Map(),
    
    set(id, callback, delay) {
      this.clear(id);
      const timer = setTimeout(() => {
        callback();
        this.timers.delete(id);
      }, delay);
      this.timers.set(id, timer);
      return timer;
    },
    
    clear(id) {
      if (this.timers.has(id)) {
        clearTimeout(this.timers.get(id));
        this.timers.delete(id);
      }
    },
    
    clearAll() {
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers.clear();
    }
  },
  
  // 🎯 Event utilities to centralize event management
  events: {
    listeners: new Map(),
    
    add(element, event, handler, options = {}) {
      const key = `${element.id || 'anonymous'}_${event}`;
      if (!this.listeners.has(key)) {
        this.listeners.set(key, []);
      }
      this.listeners.get(key).push({ element, event, handler, options });
      element.addEventListener(event, handler, options);
    },
    
    remove(element, event, handler) {
      const key = `${element.id || 'anonymous'}_${event}`;
      if (this.listeners.has(key)) {
        const listeners = this.listeners.get(key);
        const index = listeners.findIndex(l => l.handler === handler);
        if (index !== -1) {
          element.removeEventListener(event, handler);
          listeners.splice(index, 1);
        }
      }
    },
    
    clearAll() {
      this.listeners.forEach(listeners => {
        listeners.forEach(({ element, event, handler }) => {
          element.removeEventListener(event, handler);
        });
      });
      this.listeners.clear();
    }
  }
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
      'custom-cursor', 'imageWrapper', 'indexOverlay', 'mainContent',
      'mainImage', 'mainVideo', 'nav', 'galleryTrigger', 'galleryOverlay',
      'galleryGrid', 'galleryNav', 'galleryScroll', 'introText', 'logoOverlay'
    ];
    
    frequentSelectors.forEach(id => this.get(id));
  },
  
  clear() {
    this.elements.clear();
  },

  // 🚀 Frequently used elements
  get wrapper() { return this.get('image-wrapper'); },
  get cursor() { return this.get('custom-cursor'); },
  get mainVideo() { return this.get('main-video'); },
  get mainImage() { return this.get('main-image'); },
  get imageWrapper() { return this.get('image-wrapper'); },
  get nav() { return this.get('nav'); },
  get galleryOverlay() { return this.get('gallery-overlay'); },
  get galleryGrid() { return this.get('gallery-grid'); },
  get galleryNav() { return this.get('gallery-nav'); },
  get galleryScroll() { return this.get('gallery-scroll'); },
  get customCursor() { return this.get('custom-cursor'); },
  get mainContent() { return this.get('main-content'); },
  get introText() { return this.get('intro-text'); },
  get galleryTrigger() { return this.query('[data-gallery]'); },
  get curtainOverlay() { return this.get('curtain-overlay'); },
  get topMask() { return this.get('gallery-top-mask'); },
  get bottomMask() { return this.get('gallery-bottom-mask'); },
  get indexOverlay() { return this.get('index-overlay'); }
};

function enableAutoplay() {
  if (!autoplayEnabled) {
    autoplayEnabled = true;
    
    const vidEl = domCache.mainVideo;
    if (!vidEl) return;
    
    // 🎬 Function to attempt video playback
    const attemptPlay = () => {
      if (vidEl && vidEl.style && vidEl.style !== null && vidEl.style.display !== 'none' && vidEl.paused) {
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
        try { autoplayObserver.disconnect(); } catch (e) {}
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
        attributeFilter: ['style']
      });
      
      // ⏰ Safety timeout after 500ms
      autoplayTimeoutId = setTimeout(() => {
        if (autoplayObserver) {
          try { autoplayObserver.disconnect(); } catch (e) {}
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

// currentDomain already declared globally

if (window.location.pathname === '/photography' || urlSection === 'photography') {
  window.autoOpenCategory = 'photography';
}

if (window.location.pathname === '/artdirection' || urlSection === 'artdirection') {
  window.autoOpenCategory = 'artdirection';
}

if (currentDomain === 'paulthery.studio' && !window.autoOpenCategory && 
    (window.location.pathname === '/' || window.location.pathname === '/artdirection')) {
  window.autoOpenCategory = 'artdirection';
  window.defaultAlbum = 'work';
}

if (currentDomain === 'paulthery.com' && !window.autoOpenCategory && 
    window.location.pathname === '/artdirection') {
  window.autoOpenCategory = 'artdirection';
}

class ErrorManager {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'runtime',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unhandled_promise',
        message: event.reason?.message || 'Promise rejection',
        reason: event.reason,
        timestamp: new Date().toISOString()
      });
      event.preventDefault();
    });

    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError({
          type: 'resource',
          message: `Failed to load: ${event.target.tagName}`,
          source: event.target.src || event.target.href,
          element: event.target.tagName,
          timestamp: new Date().toISOString()
        });
      }
    }, true);
  }

  handleError(errorInfo) {
    this.errors.push(errorInfo);
    
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    if (this.isDevelopment()) {
    }

    this.reportError(errorInfo);
  }

  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:' ||
           window.location.search.includes('debug=true');
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
      } catch (e) {
      }
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
  } catch (error) {
  }
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
    document.addEventListener('securitypolicyviolation', (event) => {
      
      // Report violation securely
      errorManager.handleError({
        type: 'csp_violation',
        message: `CSP violation: ${event.violatedDirective}`,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        timestamp: new Date().toISOString()
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
      timestamp: new Date().toISOString()
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
      timestamp: new Date().toISOString()
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
      screen.orientation.lock('portrait').catch(err => {
      });
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

function detectMobileLandscape() {
  const isLandscapeMobile = window.matchMedia("(orientation: landscape) and (max-width: 1000px) and (max-height: 600px)").matches && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  document.body.classList.toggle('mobile-landscape', isLandscapeMobile);
}
const getVH = () => {
  const result = window.visualViewport?.height || document.documentElement.clientHeight;
  console.log('🔍 getVH() called:', {
    visualViewportHeight: window.visualViewport?.height,
    clientHeight: document.documentElement.clientHeight,
    result: result
  });
  return result;
};
function initializeMobileOptimizations() {
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                         (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

  // 🔍 DEBUG: Detect browser
  const isInstagram = /instagram/i.test(navigator.userAgent);
  const isFacebook = /fb|facebook/i.test(navigator.userAgent);
  console.log('🌐 Browser Detection:', {
    userAgent: navigator.userAgent,
    isInstagram: isInstagram,
    isFacebook: isFacebook,
    isMobileDevice: isMobileDevice
  });

  if (isMobileDevice) {
    function updateViewportHeight() {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;

      // 🔍 DEBUG: Log all viewport values
      console.log('📐 updateViewportHeight() called:', {
        'window.innerHeight': window.innerHeight,
        'window.outerHeight': window.outerHeight,
        'screen.height': window.screen.height,
        'screen.availHeight': window.screen.availHeight,
        'visualViewport.height': window.visualViewport?.height,
        'document.documentElement.clientHeight': document.documentElement.clientHeight,
        'document.body.clientHeight': document.body.clientHeight,
        'vh (calculated)': vh,
        '--vh CSS var': getComputedStyle(document.documentElement).getPropertyValue('--vh')
      });

      document.documentElement.style.setProperty('--vh', `${vh}px`);
      const wrapper = domCache.wrapper;
      if (wrapper) {
        const maxHeight = vh - 160;
        wrapper.style.maxHeight = `${maxHeight}px`;
        console.log('📦 Wrapper maxHeight set to:', maxHeight + 'px');
      }
      const nav = domCache.nav;
      if (nav) {
        const isMobile = utils.isMobile();
        if (isMobile) {
          const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0;
          const navBottom = Math.max(25, safeBottom);
          nav.style.bottom = `${navBottom}px`;
          console.log('🧭 Nav bottom set to:', navBottom + 'px');
        }
      }
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
      window.visualViewport.addEventListener('scroll', updateViewportHeight);
    }
    window.addEventListener('resize', updateViewportHeight);
    document.addEventListener('DOMContentLoaded', updateViewportHeight);
    window.addEventListener('load', updateViewportHeight);
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
      if (e.target.closest('#nav') || e.target.closest('#index-trigger') || e.target.closest('#index-overlay') || e.target.closest('#image-wrapper')) {
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
      galleryScrollLocal.addEventListener('touchmove', (e) => {
        e.stopPropagation();
      }, { passive: true });
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
  
  if (window.forceMobileSlideshow) {
    setTimeout(() => {
      // 🎬 Fluid slideshow now handles touch/swipe on all devices
    }, 1000);
  }
  
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
  window.addEventListener('contextmenu', function(e) {
    e.stopImmediatePropagation();
  }, true);
  window.addEventListener('orientationchange', () => {
    detectMobileLandscape();
    const isTouch = utils.isTouch();
    if (isTouch) {
      location.reload();
    }
  });
  if (navigator.userAgent.includes("Chrome") && !navigator.userAgent.includes("Edg") && !navigator.userAgent.includes("OPR")) {
    document.body.classList.add("chrome");
  }
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
  if (!imageWrapper) {
    return;
  }
  imageWrapper.style.position = 'relative';
  const initialBase = getVH() - (110 * 2);
  function updateCursorPositionMobileLandscape() {
    if (!document.body.classList.contains('mobile-landscape')) return;
    const cursor = domCache.cursor;
    const wrapper = domCache.wrapper;
    if (!cursor || !wrapper) {
      return;
    }
    const wrapperRect = wrapper.getBoundingClientRect();
    const cursorHeight = cursor.offsetHeight;
    const spaceAbove = wrapperRect.top;
    const topPosition = (spaceAbove / 2) - (cursorHeight / 2);
    cursor.style.top = `${topPosition}px`;
  }
  // Cache for updateNavPosition
  let lastNavPosition = null;
  let lastNavCalculation = 0;
  const navPositionThrottle = 100; // 100ms between calculations
  
  function updateNavPosition() {
    const isTouch = utils.isTouch();
    if (isTouch) return; 
    if (!nav || !imageWrapper) return;
    if (!document.body.classList.contains('intro-complete')) {
      return;
    }
    
    const now = Date.now();
    if (now - lastNavCalculation < navPositionThrottle) {
      return; // Throttle les calculs
    }
    lastNavCalculation = now;
    
    const wrapperRect = imageWrapper.getBoundingClientRect();
    let effectiveBottom;
    let effectiveHeight;
    if (wrapperRect.height === 0) {
      const maxHeight = getVH() - 220;
      effectiveHeight = maxHeight;
      effectiveBottom = (getVH() - maxHeight) / 2 + maxHeight;
    } else {
      effectiveHeight = wrapperRect.height;
      effectiveBottom = wrapperRect.bottom;
    }
    const safeBottom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0;
    const blankBelow = (getVH() - safeBottom) - effectiveBottom;
    if (blankBelow <= 0) return;
    const calculatedTop = effectiveBottom + blankBelow / 2 - nav.offsetHeight / 2;
    
    // Éviter les changements inutiles
    if (lastNavPosition !== calculatedTop) {
      nav.style.top = calculatedTop + 'px';
      lastNavPosition = calculatedTop;
    }
  }
  // Cache for updateTouchUIPositions
  let lastTouchUIPosition = null;
  let lastTouchUICalculation = 0;
  const touchUIThrottle = 150; // 150ms between calculations
  
  function updateTouchUIPositions() {
    const isTouch = utils.isTouch();
    if (!isTouch) return;
    
    const now = Date.now();
    if (now - lastTouchUICalculation < touchUIThrottle) {
      return; // Throttle les calculs
    }
    lastTouchUICalculation = now;
    
    const isMobile = window.matchMedia(`(max-width: ${768}px)`).matches;
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    const wrapper = domCache.wrapper;
    const cursor = domCache.cursor;
    const mainNav = domCache.nav;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const computed = getComputedStyle(document.documentElement);
    const vh = getVH();
    
    // 🔑 Create cache key based on dimensions
    const cacheKey = `${rect.top}-${rect.bottom}-${vh}-${isMobile}-${isLandscape}`;
    if (lastTouchUIPosition === cacheKey) {
      return; // No change needed
    }
    lastTouchUIPosition = cacheKey;
    
    if (cursor) {
        if (isMobile) {
            const safeTop = parseFloat(computed.getPropertyValue('--safe-top')) || 0;
            const blankAbove = rect.top - safeTop;
            const topPos = safeTop + (blankAbove / 2) - (cursor.offsetHeight / 2);
            cursor.style.top = `${Math.max(20, topPos + 20)}px`;
        } else {
            const safeTop = parseFloat(computed.getPropertyValue('--safe-top')) || 0;
            const blankAbove = rect.top - safeTop;
            let topPos = safeTop + (blankAbove / 2) - (cursor.offsetHeight / 2);
            if (!isLandscape) {
              topPos += 10;
            }
            topPos += 10;
            
            const isMobileLandscape = document.body.classList.contains('mobile-landscape');
            if (isMobileLandscape) {
              topPos += 25;
            }
            
            cursor.style.top = `${topPos}px`;
        }
    }
    if (!isMobile) { 
        const safeBottom = parseFloat(computed.getPropertyValue('--safe-bottom')) || 0;
        const blankBelow = vh - rect.bottom - safeBottom;
        const elementsToPosition = [mainNav, galleryNav];
        elementsToPosition.forEach(el => {
            if (el && el.offsetHeight > 0) {
                let bottomPos = safeBottom + (blankBelow / 2) - (el.offsetHeight / 2);
                if (!isLandscape) {
                  bottomPos -= 10;
                } else {
                  bottomPos -= 10;
                }
                el.style.position = 'fixed';
                el.style.bottom = `${bottomPos}px`;
                el.style.top = 'auto';
            }
        });
    }
  }
  window.updateDynamicUIPositions = updateTouchUIPositions;
  document.body.style.backgroundColor = 'white';
  const introBackground = domCache.get('intro-background') || document.createElement('div');
  if (!introBackground.id) {
    introBackground.id = 'intro-background';
    introBackground.style.backgroundColor = 'black';
    document.body.appendChild(introBackground);
  }
  introBackground.addEventListener('transitionend', function(e) {
    if (e.propertyName === 'transform') {
      if (nav) {
        nav.style.display = 'flex';
        if (mediaCache) {
          preloadAllMedia();
        }
        updateTouchUIPositions();
        updateNavPosition();
        // Activate custom cursor
        document.body.classList.add('intro-complete');
      }
    }
  }, { once: true });
  let images = [];
  let galleryImages = [];
  let previousAlbumKey = null;
  let previousCategory = null;
  // manifestData, orderData already declared globally
  let currentCategory = '';
  let currentAlbumKey = '';
  let logoTimeout = null;
  // lastActiveCategory already declared globally
  // fromGallery already declared globally
  let logoShownForCurrentAlbum = false; 
  let isLoadingAlbum = false; 
  let isIntroSequenceActive = true;
  let logoQueue = null;
  let isFirstArtDirectionLoad = true;
  
  let currentGalleryAlbum = null;
  
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwipeActive = false;
  
  
  
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

  // Updated: 2024-12-19 - Fixed desktop/mobile file filtering
  function filterUniqueImages(files) {
    const uniqueImages = new Map();
    
    files.forEach(file => {
      // Extract base name by removing _desktop or _mobile after numbers
      let baseName = file;
      
      // Pattern: 000_desktop_xxx ou 000_mobile_xxx ou 000_desktop ou 000_mobile
      if (baseName.includes('_desktop_')) {
        baseName = baseName.replace(/_desktop_/, '_');
      } else if (baseName.includes('_mobile_')) {
        baseName = baseName.replace(/_mobile_/, '_');
      } else if (baseName.match(/\d+_desktop\./)) {
        baseName = baseName.replace(/_desktop\./, '.');
      } else if (baseName.match(/\d+_mobile\./)) {
        baseName = baseName.replace(/_mobile\./, '.');
      }
      
      // Now remove the extension
      baseName = baseName.replace(/\.(jpg|jpeg|avif|png|gif|mp4|webm)$/i, '');
      
      if (!uniqueImages.has(baseName)) {
        const isMobile = window.matchMedia ? window.matchMedia(`(max-width: ${768}px)`).matches : false;
        
        let bestVersion;
        
        if (isMobile) {
          // Mobile: look ONLY for mobile version
          bestVersion = files.find(f => {
            // Apply same cleaning logic
            let fBase = f;
            if (fBase.includes('_desktop_')) {
              fBase = fBase.replace(/_desktop_/, '_');
            } else if (fBase.includes('_mobile_')) {
              fBase = fBase.replace(/_mobile_/, '_');
            } else if (fBase.match(/\d+_desktop\./)) {
              fBase = fBase.replace(/_desktop\./, '.');
            } else if (fBase.match(/\d+_mobile\./)) {
              fBase = fBase.replace(/_mobile\./, '.');
            }
            fBase = fBase.replace(/\.(jpg|jpeg|avif|png|gif|mp4|webm)$/i, '');
            
            return fBase === baseName && f.includes('_mobile');
          });
        } else {
          // Desktop: look ONLY for desktop version
          bestVersion = files.find(f => {
            // Apply same cleaning logic
            let fBase = f;
            if (fBase.includes('_desktop_')) {
              fBase = fBase.replace(/_desktop_/, '_');
            } else if (fBase.includes('_mobile_')) {
              fBase = fBase.replace(/_mobile_/, '_');
            } else if (fBase.match(/\d+_desktop\./)) {
              fBase = fBase.replace(/_desktop\./, '.');
            } else if (fBase.match(/\d+_mobile\./)) {
              fBase = fBase.replace(/_mobile\./, '.');
            }
            fBase = fBase.replace(/\.(jpg|jpeg|avif|png|gif|mp4|webm)$/i, '');
            
            return fBase === baseName && f.includes('_desktop');
          });
        }
        
        if (bestVersion) {
          uniqueImages.set(baseName, bestVersion);
        }
      }
    });
    
    return Array.from(uniqueImages.values());
  }

  function finishLoad(files) {
    if (isLoadingAlbum) {
      return;
    }
    
    if (!files || files.length === 0) {
      return;
    }
    
    // 🔍 Filter images to avoid duplicates (JPEG + mobile JPEG)
    const filteredFiles = filterUniqueImages(files);

    isLoadingAlbum = true;
    logoShownForCurrentAlbum = false;
    images = filteredFiles;
    totalImages = images.length;

    // Manage index according to category and history
    const hasChangedCategory = (previousCategory && previousCategory !== currentCategory);

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
          threshold: 0.15,          // Normal sensitivity (15%)
          transitionDuration: 300,  // Normal duration (300ms)
          inertiaThreshold: 100,    // Seuil normal (100ms)
          throttleMs: 16            // 60fps (16ms)
        });
        
        // Pass cache reference to slideshow
        if (mediaCache) {
          fluidSlideshow.setMediaCache(mediaCache);
        }
        
        // Écouter les changements de slide
        wrapper.addEventListener('slidechange', (e) => {
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
        wrapper.addEventListener('videoactive', (e) => {
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
    
    const hasAlbumChanged = (previousCategory !== currentCategory || previousAlbumKey !== currentAlbumKey);
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
    } else if (currentCategory === 'artdirection' || (currentCategory && currentCategory.includes('artdirection'))) {
      lastActiveCategory = 'artdirection';
    } else if (currentCategory === 'photography' || (currentCategory && currentCategory.includes('photography'))) {
      lastActiveCategory = 'photography';
    }
    
    // 🎬 Fluid slideshow now handles touch/swipe on all devices
  }
  
  function nextAlbumDesktop() {
    if (!introText || !mainContent) return;
    
    // Show wrapper as soon as intro starts
    document.body.classList.add('intro-started');
    
    const isMobileLandscape = document.body.classList.contains('mobile-landscape');
    if (!isMobileLandscape) {
      introText.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      introText.style.opacity = '0';
      introText.style.transform = 'translateY(-100px)';
    }
    
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
        imageMask.addEventListener('transitionend', () => {
          document.body.classList.add('intro-complete');
          if (document.body.classList.contains('mobile-landscape')) {
            const cursor = document.getElementById('custom-cursor');
          }
          setTimeout(() => {
            updateNavPosition();
            updateTouchUIPositions();
          }, 10);
        }, { once: true });
      } else {
        document.body.classList.add('intro-complete');
        if (document.body.classList.contains('mobile-landscape')) {
          const cursor = document.getElementById('custom-cursor');
          if (cursor) cursor.style.opacity = '1';
        }
        setTimeout(() => {
          updateNavPosition();
          updateTouchUIPositions();
        }, 10);
      }
      updateImage();
      updateNavPosition();
      // Enable autoplay after album change
      enableAutoplay();
    }, 800);
  }
  function preloadAllMedia() {
    manifestPromise.then(manifest => {
      if (!manifest) {
        return;
      }
      
      // Load only current album (photography or artdirection)
      const currentSection = isArtDirectionPage ? 'artdirection' : 'photography';
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
    return safeAsync(async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Cache-Control': 'no-cache',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    }, `fetch_${url}`, null);
  }

  const manifestPromise = safeFetch(`/albums.json?v=${Date.now()}`).then(data => {
    if (!data) {
      return {
        photography: {},
        'artdirection': {}
      };
    }
    return data;
  }).catch(error => {
    return {
      photography: {},
      'artdirection': {}
    };
  });
  
  const orderPromise = safeFetch(`/order.json?v=${Date.now()}`)
    .then(data => data || { photography: [], artdirection: [] })
    .catch(() => ({ photography: [], artdirection: [] }));
  const albumMatch = location.pathname.match(/\/(photography|artdirection)\/(.+)/);
  
  Promise.all([manifestPromise, orderPromise]).then(([manifest, order]) => {
    manifestData = manifest;
    orderData = order;
    let files;
    if (albumMatch) {
      const category = albumMatch[1]; 
      let albumKey = decodeURIComponent(albumMatch[2]);
      currentCategory = category;
      currentAlbumKey = albumKey;
      files = manifest?.[category]?.[albumKey] || 
              manifest?.[category]?.[albumKey.toLowerCase()] || [];
    } else {
      if (currentDomain === 'paulthery.studio' && window.autoOpenCategory === 'artdirection') {
        const defaultKey = manifest?.artdirection ? Object.keys(manifest.artdirection).find(k => k.toLowerCase() === 'work') : undefined;
        currentCategory = 'artdirection';
        currentAlbumKey = defaultKey;
        files = defaultKey ? manifest.artdirection[defaultKey] : [];
      } else if (window.autoOpenCategory === 'artdirection') {
        const defaultKey = manifest?.artdirection ? Object.keys(manifest.artdirection).find(k => k.toLowerCase() === 'work') : undefined;
        currentCategory = 'artdirection';
        currentAlbumKey = defaultKey;
        files = defaultKey ? manifest.artdirection[defaultKey] : [];
      } else {
        const defaultKey = manifest?.photography ? Object.keys(manifest.photography).find(k => k.toLowerCase() === 'recent') : undefined;
        currentCategory = 'photography';
        currentAlbumKey = defaultKey;
        files = defaultKey ? manifest.photography[defaultKey] : [];
      }
    }
    
    if (window.location.pathname.includes('/artdirection/')) {
      lastActiveCategory = 'artdirection';
    } else if (currentCategory === 'artdirection' || (currentCategory && currentCategory.includes('artdirection'))) {
      lastActiveCategory = 'artdirection';
    } else if (currentCategory === 'photography' || (currentCategory && currentCategory.includes('photography'))) {
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
  } else {
  }
  const customCursor = document.createElement('div');
  customCursor.id = 'custom-cursor';
  document.body.appendChild(customCursor);
  
  function calculateInitialCursorPosition() {
    const mainContent = domCache.mainContent;
    if (mainContent) {
      const mainContentRect = mainContent.getBoundingClientRect();
      const wrapperTop = mainContentRect.top;
      const pageTop = 0;
      const centerPosition = (wrapperTop - pageTop) / 2 + 55;
      
      customCursor.style.top = centerPosition + 'px';
      customCursor.style.left = '50%';
      customCursor.style.transform = 'translate(-50%, -50%)';
    }
  }
  
  calculateInitialCursorPosition();
  window.addEventListener('resize', calculateInitialCursorPosition);
  const isMobile = window.matchMedia(`(max-width: ${768}px)`).matches;
  const isMobileLandscape = document.body.classList.contains('mobile-landscape');
  if (isMobile || isMobileLandscape) {
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
  window.addEventListener('touchstart', function onFirstTouch() {
    touchDetected = true;
    window.removeEventListener('touchstart', onFirstTouch, { capture: true });
  }, { once: true, capture: true, passive: true });
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
            customCursor.style.top = (linkRect.top - 10) + 'px';
          } else {
            customCursor.style.left = (e.clientX - 20) + 'px';
            customCursor.style.top = (e.clientY + 10) + 'px';
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
        customCursor.style.top = (e.clientY + 10) + 'px';
        customCursor.style.opacity = '';
      }
      
      updateNavPosition();
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

  // ⚡ Conditional optimization: disable events when not needed
  function optimizeEventListeners() {
    const galleryOpen = document.body.classList.contains('gallery-open');
    const indexOpen = domCache.indexOverlay && domCache.indexOverlay.classList.contains('active');
    
    // Disable mouse events if gallery is open
    // But keep events active if index is open (for pointer cursor)
    if (galleryOpen) {
      disableMouseEvents();
    } else if (document.body.classList.contains('intro-complete')) {
      enableMouseEvents();
    }
  }

  // Observe class changes to automatically optimize
  const classObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
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
    }
  });
  function updateCursor() {
    let albumName = "recent";
    const albumMatch = location.pathname.match(/\/(photography|artdirection)\/(.+)/);
    if (albumMatch) {
      albumName = decodeURIComponent(albumMatch[2]);
    } else {
      const defaultAlbum = document.querySelector('#gallery-nav span:first-child');
      if (defaultAlbum && defaultAlbum.textContent) {
        albumName = defaultAlbum.textContent;
      }
    }
        const formattedAlbumName = capitalizeWordsOver3Letters(albumName);
        customCursor.textContent = `${formattedAlbumName} — ${currentIndex + 1}/${totalImages}`;
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
        if (logoPath && (!logoShownForCurrentAlbum || fromGallery)) {
          showLogo(logoPath);
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
          timestamp: new Date().toISOString()
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
        
        const cachedVideo = mediaCache.getCachedVideo(src);
        
        // If video is fully loaded, use blob URL
        if (cachedVideo && cachedVideo.isFullyLoaded) {
          if (vidEl.src !== cachedVideo.blobUrl) {
            vidEl.src = cachedVideo.blobUrl;
          }
        } else if (cachedVideo && cachedVideo.posterUrl) {
          // Afficher le poster d'abord
          vidEl.poster = cachedVideo.posterUrl;
          
          // Load complete video
          mediaCache.loadVideoFull(src).then(blobUrl => {
            if (vidEl.src !== blobUrl) {
              vidEl.src = blobUrl;
            }
            vidEl.play().catch(() => {});
          }).catch(error => {
            if (vidEl.src !== src) {
              vidEl.src = src; // Fallback
            }
          });
        } else {
          // Fallback : charger normalement
          if (vidEl.src !== src) {
            vidEl.src = src;
          }
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
              timestamp: new Date().toISOString()
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
        
        vidEl.onerror = (e) => {
          errorManager.handleError({
            type: 'video_load_error',
            message: 'Failed to load video',
            source: src,
            context: 'video_load',
            timestamp: new Date().toISOString()
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
            updateNavPosition();
            // Fix CLS: Mark wrapper as loaded after first image (even from cache)
            const wrapper = domCache.wrapper;
            if (wrapper && !wrapper.classList.contains('loaded')) {
              wrapper.classList.add('loaded');
            }
          }, 50);
        } else {
          // Batch DOM updates : tout faire d'un coup
          imgEl.style.cssText = 'display: block; opacity: 1;';
          imgEl.src = formatDetector.getOptimalImageUrl(src);
          
          imgEl.onerror = () => {
            errorManager.handleError({
              type: 'image_load_error',
              message: 'Failed to load image',
              source: src,
              context: 'image_load',
              timestamp: new Date().toISOString()
            });
            imgEl.style.opacity = '0.5';
            imgEl.alt = 'Image non disponible';
          };
          
          imgEl.onload = () => {
            // Lazy UI updates: wait a bit before updating
            setTimeout(() => {
              updateNavPosition();
              // Fix CLS: Mark wrapper as loaded after first image
              const wrapper = domCache.wrapper;
              if (wrapper && !wrapper.classList.contains('loaded')) {
                wrapper.classList.add('loaded');
              }
            }, 50);
          };
        }
        imgEl.alt = `Image ${currentIndex + 1} sur ${totalImages} de l'album`;
      }
      
      // Lazy UI updates: wait before updating cursor
      setTimeout(() => {
        safeExecute(updateCursor, 'cursor_update');
      }, 100);
      
      const isMobile = window.matchMedia(`(max-width: ${768}px)`).matches;
      if (isMobile && document.body.classList.contains('intro-complete')) {
        safeExecute(updateTouchUIPositions, 'touch_ui_update');
      }
      
      safeExecute(updateNavPosition, 'nav_position_final_update');
      
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
      
      setTimeout(() => {
        const isArtDirection = currentCategory === 'artdirection' || 
                              window.location.pathname.includes('/artdirection/') ||
                              (currentDomain === 'paulthery.studio' && window.autoOpenCategory === 'artdirection');
        
        if (isArtDirection && images.length > 0) {
        }
      }, 100);
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
    const isArtDirectionCategory = currentCategory === 'artdirection' || 
                                   (currentCategory && currentCategory.includes('artdirection'));
    
    const isArtDirectionUrl = window.location.pathname.includes('/artdirection/');
    
    const isArtDirectionImage = images[currentIndex] && images[currentIndex].includes('/artdirection/');
    
    const isStudioDomain = currentDomain === 'paulthery.studio';
    
    const result = isArtDirectionCategory || isArtDirectionUrl || isArtDirectionImage || isStudioDomain;
    
    return result;
  }
  
  function adjustLogoForImageOrientation() {
    const logoImage = document.getElementById('logo-image');
    const mainImage = document.getElementById('main-image');
    const mainVideo = document.getElementById('main-video');
    
    if (!logoImage) return;
    
    const checkImageDimensions = () => {
      const currentMedia = (mainImage && mainImage.style && mainImage.style.display !== 'none') ? mainImage : mainVideo;
      const isVideo = currentMedia === mainVideo;
      
      // For images: check complete, for videos: check readyState
      const isMediaReady = currentMedia ? (isVideo ? 
        (currentMedia.readyState >= 2) : // HAVE_CURRENT_DATA for videos
        currentMedia.complete) : false;
      
      if (!currentMedia || !isMediaReady) {
        requestAnimationFrame(checkImageDimensions);
        return;
      }
      
      const imageWidth = currentMedia.naturalWidth || currentMedia.videoWidth || currentMedia.clientWidth;
      const imageHeight = currentMedia.naturalHeight || currentMedia.videoHeight || currentMedia.clientHeight;
      
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
    
    const isMobileLandscape = utils.isMobileLandscape();
    if (!isMobileLandscape) {
      // Le transform du parent s'ajoute aux animations glideUp des enfants
      introText.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      introText.style.opacity = '0';
      introText.style.transform = 'translateY(-100px)';
    }
    
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
        imageMask.addEventListener('transitionend', () => {
          document.body.classList.add('intro-complete');
          document.dispatchEvent(new Event('introFinished'));
          if (document.body.classList.contains('mobile-landscape')) {
            const cursor = document.getElementById('custom-cursor');
          }
          updateNavPosition();
        }, { once: true });
      } else {
        document.body.classList.add('intro-complete');
        document.dispatchEvent(new Event('introFinished'));
        if (document.body.classList.contains('mobile-landscape')) {
          const cursor = document.getElementById('custom-cursor');
          if (cursor) cursor.style.opacity = '1';
        }
        updateNavPosition();
      }
      updateImage();
      updateNavPosition();
      // Enable autoplay after initialization
      enableAutoplay();
    }, 800);
  }
  if (introText) {
    introText.style.color = 'white';
  }
  document.addEventListener('keydown', (e) => {
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
    const isMobileLandscape = utils.isMobileLandscapeHover();
    const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    if (!indexContent || !bioSection) return;
    const albumList = indexContent.querySelector('.albums-list.unified');
    const indexFooter = indexContent.querySelector('.index-footer');
    if (albumList && indexFooter) {
      requestAnimationFrame(() => {
        const albumListBottom = albumList.offsetTop + albumList.offsetHeight;
        const footerTop = indexFooter.offsetTop;
        const bioHeight = bioSection.offsetHeight;
        const availableSpace = footerTop - albumListBottom;
        const centeredTop = albumListBottom + (availableSpace / 2) - (bioHeight / 2);
        bioSection.style.position = 'absolute';
        bioSection.style.top = `${centeredTop}px`;
        bioSection.style.bottom = 'auto';
        if (isMobileLandscape) {
          bioSection.style.left = 'auto';
          bioSection.style.right = '30px';
          bioSection.style.width = '225px';
          bioSection.style.bottom = '120px';
          bioSection.style.top = 'auto';
        } else if (isIPad && isPortrait) {
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
    if (window.innerWidth <= 768) {
      const cursor = document.getElementById('custom-cursor');
      if (cursor) {
        const top = cursor.getBoundingClientRect().top;
        indexContent.style.paddingTop = `${top}px`;
      }
    } else {
      const wrapperRect = imageWrapper.getBoundingClientRect();
      indexContent.style.paddingTop = `${wrapperRect.top}px`;
      const indexFooter = indexContent.querySelector('.index-footer');
      if (indexFooter) {
        const windowHeight = getVH();
        const isMobileLandscape = document.body.classList.contains('mobile-landscape');
        const adjustment = isMobileLandscape ? +30 : -5;
        const footerBottom = windowHeight - wrapperRect.bottom + adjustment;
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
        const creativeServicesHtml = `<p><span class="medium">Creative Services</span> : image + art direction, photography, brand elevation, content creation, post production, ai.</p>`;
        
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
              <a href="https://twitter.com/paulthery" target="_blank" rel="noopener noreferrer">Twitter</a><span class="separator"> — </span>
              <a href="https://www.linkedin.com/in/paulthery/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>
        `;
        setSecureInnerHTML(indexContent, secureContent);
      }
      const logoVideo = indexContent.querySelector('#index-footer-photo');
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const isSimulator = /iPhone|iPad|iPod/.test(navigator.userAgent) && (
        !window.navigator.standalone || 
        /Simulator|SimulatorApp/.test(navigator.userAgent) ||
        window.navigator.platform === 'MacIntel' ||
        /Xcode/.test(navigator.userAgent) ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      );
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
        logoVideo.addEventListener('error', (e) => {
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
              document.addEventListener('touchstart', () => {
                logoVideo.play().catch(err => {
                  fallbackToPNG();
                });
              }, { once: true });
            });
          }
        }
      }
      indexOverlay.classList.add('active');
      updateIndexLayout();
      imageWrapper.classList.add('index-mode');
      
      const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      
      if (isIPad && isPortrait) {
        imageWrapper.style.transform = 'translateX(-50vw)';
        indexContent.style.width = '100%';
        indexContent.style.left = '0';
        indexContent.style.right = '0';
      } else {
        imageWrapper.style.transform = 'translateX(-25vw)';
      }
      Promise.all([manifestPromise, orderPromise]).then(([manifest, order]) => {
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
          
          const workAlbumNames = ["recent", "work l", "work ll", "lv s:s 24"];
          
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
          
          const workAlbumNames = ["work", "louis vuitton", "chanel", "loewe", "lancôme"];
          
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
          tab.addEventListener('click', (ev) => {
            ev.preventDefault();
            const key = tab.getAttribute('data-tab');
            const url = tab.getAttribute('href');
            history.pushState({category: key}, '', url);
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
        if(activeTab) activeTab.classList.add('active');
        if (category === 'artdirection') {
            renderArtDirection();
        } else {
            renderPhotography();
        }
        window.addEventListener('resize', centerTabsDynamically, { passive: true });
        window.addEventListener('popstate', (event) => {
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
            const isTabletPortrait = window.matchMedia("(max-width: 1200px)").matches && window.matchMedia("(orientation: portrait)").matches;
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
      }).catch(error => {
        // Secure use for error messages
        const errorElement = createSecureElement('p', {}, 'Error loading album data. Please refresh the page.');
        indexContent.innerHTML = '';
        indexContent.appendChild(errorElement);
      });
    }
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
        const reversePlayback = (currentTime) => {
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
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const isTabletPortrait = window.matchMedia("(orientation: portrait) and (min-width: 768px) and (max-width: 1200px)").matches;
        
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
    
    indexOverlay.addEventListener('touchstart', e => {
      const isTabletPortrait = window.matchMedia("(orientation: portrait) and (min-width: 768px) and (max-width: 1200px)").matches;
      const isMobilePortrait = window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
      const isTabletLandscape = window.matchMedia("(orientation: landscape) and (min-width: 768px) and (max-width: 1200px)").matches;
      if ((isTabletPortrait || isMobilePortrait || isTabletLandscape) && indexOverlay.classList.contains('active')) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });
    
    indexOverlay.addEventListener('touchend', e => {
      const isTabletPortrait = window.matchMedia("(orientation: portrait) and (min-width: 768px) and (max-width: 1200px)").matches;
      const isMobilePortrait = window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
      const isTabletLandscape = window.matchMedia("(orientation: landscape) and (min-width: 768px) and (max-width: 1200px)").matches;
      if ((isTabletPortrait || isMobilePortrait || isTabletLandscape) && indexOverlay.classList.contains('active')) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        if (deltaX > 50 && Math.abs(deltaY) < 100) {
          closeIndexOverlay();
        }
      }
    }, { passive: true });
    
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
    }
    if (document.body.classList.contains('intro-complete')) {
        handleRouting();
    } else {
        const observer = new MutationObserver((mutations) => {
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
    bottomMask.style.height = (vhMask - rect.bottom) + 'px';
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
    updateGalleryMasks();
    
    hideLogo();
    const customCursor = document.getElementById('custom-cursor');
    const isMobileGallery = window.matchMedia(`(max-width: ${768}px)`).matches;
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
      let video;

      // 🎬 Try to reuse video from slideshow cache
      if (fluidSlideshow && fluidSlideshow.videoElements && fluidSlideshow.videoElements.has(src)) {
        const cachedVideo = fluidSlideshow.videoElements.get(src);
        // Clone the video element to use in thumbnail (can't reuse same element in 2 places)
        video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.controls = false;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.playsinline = true;
        // Reuse the same src URL - browser will use cached data
        video.src = cachedVideo.src;
        video.preload = 'metadata'; // First frame visible, but data already cached
      } else {
        // 📥 Create new video element
        video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.controls = false;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.playsinline = true;
        video.src = src;
        video.preload = 'metadata';
      }

      video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;

      container.appendChild(video);

      // Play on hover
      container.addEventListener('mouseenter', () => {
        video.preload = 'auto'; // Load completely (or use cached data)
        video.play().catch(() => {});
      }, { once: true });
    }

    function createImageThumbnail(container, src) {
      const img = document.createElement('img');

      // 🖼️ Try to use cached image from slideshow
      const cachedImg = mediaCache ? mediaCache.getCachedMedia(src) : null;
      if (cachedImg && cachedImg.src) {
        // Use cached image - browser will reuse already loaded data
        img.src = cachedImg.src;
      } else {
        // Get optimal URL (desktop vs mobile, AVIF support)
        img.src = formatDetector.getOptimalImageUrl(src);
      }

      img.alt = src.split('/').pop();
      img.loading = 'lazy'; // Lazy load thumbnails for better performance
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
      galleryGrid.addEventListener('click', (e) => {
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
      const isMobileClose = window.matchMedia(`(max-width: ${768}px)`).matches;
      if (isMobileClose && document.body.classList.contains('intro-complete')) {
      }
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
    let step = Math.ceil(ratio * 100 / increment) * increment;
    step = Math.max(increment, Math.min(100, step));
    const newHeight = Math.round(initialBase * step / 100);
    imageWrapper.style.height = newHeight + 'px';
    const newWidth = Math.round(newHeight * 4 / 5);
    imageWrapper.style.width = newWidth + 'px';
    mainImage.style.maxWidth = '100%';
    mainImage.style.width = 'auto';
    mainImage.style.height = 'auto';
    updateNavPosition();
    updateTouchUIPositions();
  }
  updateImageStep();
  setMainContentHeight();
  window.updateDynamicUIPositions();
  updateTouchUIPositions();
  updateIndexLayout();
  setTimeout(() => {
    updateNavPosition();
  }, 10);
  setTimeout(() => {
    updateNavPosition();
  }, 100);
  setTimeout(() => {
    updateNavPosition();
  }, 500);
  // Coalesce via rAF to avoid multiple recalculations in same frame
  let pendingUIFrame = false;
  const scheduleUIUpdate = () => {
    if (pendingUIFrame) return;
    pendingUIFrame = true;
    requestAnimationFrame(() => {
      pendingUIFrame = false;
      updateImageStep();
      updateNavPosition();
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
  detectMobileLandscape();
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
    if (manifestData && manifestData[currentCategory] && manifestData[currentCategory][currentAlbumKey]) {
      const firstImage = manifestData[currentCategory][currentAlbumKey][0];
      if (firstImage && /\.(jpg|jpeg|avif)$/i.test(firstImage)) {
        const optimalUrl = formatDetector.getOptimalImageUrl(firstImage);
        
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
        formatInfo: mediaCache.getFormatInfo()
      }),
      clearCache: () => mediaCache.clearCache(),
      retryMedia: (src) => mediaCache.retryFailedMedia(src),
      safeExecute,
      safeAsync,
      errorManager
    };
  }

  window.addEventListener('beforeunload', () => {
    safeExecute(() => {
      // Cleanup autoplay observer & timeout
      if (autoplayObserver) {
        try { autoplayObserver.disconnect(); } catch (e) {}
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
});
