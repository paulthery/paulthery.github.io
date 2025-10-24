import formatDetector from './format-detector.min.js';

class MediaCacheManager {
  constructor() {
    this.cache = new Map(); // 🖼️ Images
    this.loadingPromises = new Map(); // 🚫 Avoid multiple loads
    this.preloadQueue = new Set();
    this.isPreloading = false;
    this.failedLoads = new Set();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;

    this.timeouts = {
      default: 30000,
      chanel: 60000,
      video: 45000,
      image: 15000
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
    const optimalUrl = formatDetector.getOptimalImageUrl(src);
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
  startSequentialPreload(files, startIndex = 0, windowSize = 5) {
    if (this.isPreloading) {
      this.stopPreloading();
    }

    if (!files || files.length === 0) {
      return;
    }

    this.isPreloading = true;
    const totalSlides = files.length;
    const slidesPerWindow = windowSize * 2 + 1; // windowSize = 5 → 11 slides per window
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
        const filesToLoad = windowFiles.filter(file =>
          !this.cache.has(file) && !this.failedLoads.has(file)
        );

        // ⚡ Load all files from this window in parallel
        if (filesToLoad.length > 0) {
          await Promise.allSettled(
            filesToLoad.map(file => this.preloadMedia(file))
          );
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

  startPreloading(files) {
    // 🔄 Old function - redirects to new one
    this.startSequentialPreload(files, 0);
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
      isPreloading: this.isPreloading
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
      const timeoutDuration = 10000;
      
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
    const optimalUrl = formatDetector.getOptimalImageUrl(src);
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
      originalSrc: url
    };
  }
  
  getFormatInfo() {
    return formatDetector.getSupportInfo();
  }
}

export default MediaCacheManager;