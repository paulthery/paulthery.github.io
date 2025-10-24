/**
 * 🎬 FLUID SLIDESHOW - "Scrub" Mode with Persistent Video Cache
 * ✅ ✅ FIX: Persistent video cache to avoid reloads and duplicates
 */

import formatDetector from './format-detector.min.js';

export class FluidSlideshow {
  constructor(wrapper, options = {}) {
    this.wrapper = wrapper;
    this.images = options.images || [];
    this.currentIndex = options.currentIndex || 0;
    
    // ⚡ Performance options
    this.throttleMs = options.throttleMs || 16; // 60fps throttling
    
    // 🎯 Virtualization: only create N slides around current index
    this.virtualWindowSize = 5; // Create 5 slides before and after (11 total max)
    
    this.isDragging = false;
    this.startX = 0;
    this.startMouseX = 0;
    this.startSlideIndex = 0;
    this.startTime = 0;
    this.lastTime = 0;
    this.lastMoveTime = 0;
    this.velocity = 0;
    
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
    
    video.addEventListener('webkitendfullscreen', (e) => {
      e.preventDefault();
    });
    video.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  createImageSlide(slide, src, index) {
    const img = document.createElement('img');
    
    const cachedImg = this.mediaCache ? this.mediaCache.getCachedMedia(src) : null;
    img.src = cachedImg ? cachedImg.src : formatDetector.getOptimalImageUrl(src);
    
    img.id = index === this.currentIndex ? 'main-image' : '';
    img.alt = `Slide ${index + 1}`;
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
        
        // ✅ 🎯 GPU TRANSFORM: Move slides with translateX
        slideElement.style.transform = `translateX(${relativePosition * 100}%)`;
        slideElement.style.willChange = 'transform';
        
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
    this.startMouseX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    this.lastMouseX = this.startMouseX;
    this.startSlideIndex = this.currentIndex;
    this.startTime = now;
    this.lastTime = now;
    this.lastMoveTime = now;
    this.velocity = 0;
    
    this.wrapperWidth = this.wrapper.offsetWidth;
    
    clearTimeout(this.inertiaTimer);
    
    e.preventDefault();
  }

  onMove(e) {
    if (!this.isDragging) return;
    
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
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
    this.wrapper.style.cursor = 'none';
    this.wrapper.classList.remove('grabbing');
    
    const now = Date.now();
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
      delta = delta * 1.1 + (iteration * 0.1);
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
    
    this.wrapper.dispatchEvent(new CustomEvent('slidechange', { 
      detail: { 
        index: this.currentIndex,
        src: this.images[this.currentIndex]
      } 
    }));
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
              this.wrapper.dispatchEvent(new CustomEvent('videoactive', { 
                detail: { 
                  src: this.images[this.currentIndex],
                  video: media
                } 
              }));
            }, 200);
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

  destroy() {
    clearTimeout(this.inertiaTimer);
    
    // 🧹 Clean video observers
    if (this.videoObservers) {
      this.videoObservers.forEach(observer => observer.disconnect());
      this.videoObservers.clear();
    }
    
    // ⏹️ Stop all videos in memory
    this.videoElements.forEach(video => {
      video.pause();
      video.src = ''; // 💾 Free memory on complete destruction
    });
    this.videoElements.clear();
    
    this.slides = [];
    this.slidesContainer.innerHTML = '';
  }
}