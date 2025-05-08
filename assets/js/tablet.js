// tablet.js: reconfigured for exact viewport fit and scroll prevention
(function() {
    // Store original viewport dimensions
    let originalWidth = window.innerWidth;
    let originalHeight = window.innerHeight;
    
    // Lock viewport size and prevent page zoom
    function lockViewport() {
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      } else {
        const newMeta = document.createElement('meta');
        newMeta.name = 'viewport';
        newMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        document.head.appendChild(newMeta);
      }
    }
    
    // Update viewport height variable and lock body dimensions
    function updateViewportSize() {
      const width = window.innerWidth;
      if (width >= 768 && width <= 1366) {
        // Set CSS viewport height variable
        const vh = window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Enforce fixed body size
        document.body.style.width = `${width}px`;
        document.body.style.height = `${vh}px`;
        document.body.style.maxHeight = `${vh}px`;
        document.body.style.overflow = 'hidden';
        
        // For larger tablets (iPad Pro 13")
        if (width > 1024) {
          const wrapper = document.getElementById('image-wrapper');
          if (wrapper) {
            // Calculate dimensions keeping aspect ratio
            const maxHeight = vh - 160;
            const calculatedWidth = maxHeight * 0.8; // 4:5 aspect ratio
            
            if (calculatedWidth <= width * 0.8) {
              wrapper.style.height = `${maxHeight}px`;
              wrapper.style.width = `${calculatedWidth}px`;
            } else {
              const maxAllowedWidth = width * 0.8;
              wrapper.style.width = `${maxAllowedWidth}px`;
              wrapper.style.height = `${maxAllowedWidth * 1.25}px`;
            }
            
            // Make sure wrapper doesn't exceed viewport
            if (parseFloat(wrapper.style.height) > (vh - 160)) {
              wrapper.style.height = `${vh - 160}px`;
              wrapper.style.width = 'auto';
              wrapper.style.maxWidth = '80vw';
            }
          }
          
          // Update positions of UI elements
          updateUIPositions();
        }
      }
    }
    
    // Update UI element positions
    function updateUIPositions() {
      const nav = document.querySelector('nav');
      const imageWrapper = document.getElementById('image-wrapper');
      const customCursor = document.getElementById('custom-cursor');
      
      if (!nav || !imageWrapper) return;
      
      const wrapperRect = imageWrapper.getBoundingClientRect();
      const vh = window.innerHeight;
      
      // Position nav in bottom space
      nav.style.position = 'fixed';
      nav.style.bottom = `${(vh - wrapperRect.bottom) / 2 - nav.offsetHeight / 2}px`;
      
      // Position cursor in top space
      if (customCursor) {
        customCursor.style.position = 'fixed';
        customCursor.style.top = `${wrapperRect.top / 2}px`;
        customCursor.style.left = '50%';
        customCursor.style.transform = 'translateX(-50%)';
        
        // Make sure cursor is visible
        if (parseFloat(customCursor.style.top) < 20) {
          customCursor.style.top = '20px';
        }
        
        // Update font size
        customCursor.style.fontSize = '14px';
      }
      
      // Update gallery nav if visible
      const galleryNav = document.getElementById('gallery-nav');
      if (galleryNav && galleryNav.style.display !== 'none') {
        galleryNav.style.bottom = `${(vh - wrapperRect.bottom) / 2 - galleryNav.offsetHeight / 2}px`;
        galleryNav.style.fontSize = '14px';
      }
    }
    
    // Prevent all scrolling
    function preventAllScrolling() {
      // Hard lock document and body
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.touchAction = 'none';
      document.documentElement.style.msScrollChaining = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.body.style.position = 'fixed';
      document.body.style.touchAction = 'none';
      document.body.style.msScrollChaining = 'none';
      document.body.style.overscrollBehavior = 'none';
      
      // Block all scroll events
      const preventScrollingEvents = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Connect to all possible scroll-triggering events
      window.addEventListener('scroll', preventScrollingEvents, { passive: false });
      window.addEventListener('mousewheel', preventScrollingEvents, { passive: false });
      window.addEventListener('wheel', preventScrollingEvents, { passive: false });
      window.addEventListener('touchmove', preventScrollingEvents, { passive: false });
      document.addEventListener('touchmove', preventScrollingEvents, { passive: false });
      document.body.addEventListener('touchmove', preventScrollingEvents, { passive: false });
      
      // Force window to top on any scroll attempt
      window.addEventListener('scroll', function() {
        window.scrollTo(0, 0);
      });
      
      // Block on specific containers that might have scroll
      const containers = ['#main-content', '#index-overlay', '#gallery-overlay'];
      containers.forEach(selector => {
        const container = document.querySelector(selector);
        if (container) {
          container.addEventListener('touchmove', preventScrollingEvents, { passive: false });
          container.addEventListener('wheel', preventScrollingEvents, { passive: false });
          container.addEventListener('mousewheel', preventScrollingEvents, { passive: false });
        }
      });
    }
    
    // Fix index overlay to be full screen
    function fixIndexOverlay() {
      const indexTrigger = document.getElementById('index-trigger');
      const indexOverlay = document.getElementById('index-overlay');
      const imageWrapper = document.getElementById('image-wrapper');
      
      if (!indexTrigger || !indexOverlay || !imageWrapper) return;
      
      // Create a new click handler
      const originalClick = indexTrigger.onclick;
      indexTrigger.onclick = function(e) {
        if (originalClick) {
          originalClick.call(this, e);
        }
        
        // For all tablets, especially iPad Pro 13"
        setTimeout(function() {
          if (indexOverlay.classList.contains('active')) {
            // Force fullscreen with no transforms
            indexOverlay.style.position = 'fixed';
            indexOverlay.style.top = '0';
            indexOverlay.style.left = '0';
            indexOverlay.style.right = '0';
            indexOverlay.style.bottom = '0';
            indexOverlay.style.width = '100%';
            indexOverlay.style.height = '100%';
            indexOverlay.style.transform = 'none';
            indexOverlay.style.display = 'block';
            
            // Force index content to fill screen
            const indexContent = document.getElementById('index-content');
            if (indexContent) {
              indexContent.style.position = 'absolute';
              indexContent.style.top = '0';
              indexContent.style.left = '0';
              indexContent.style.right = '0';
              indexContent.style.bottom = '0';
              indexContent.style.width = '100%';
              indexContent.style.height = '100%';
              indexContent.style.transform = 'none';
              indexContent.style.boxSizing = 'border-box';
              
              if (window.innerWidth > 1024) {
                indexContent.style.paddingTop = '100px';
                indexContent.style.paddingBottom = '130px';
              } else {
                indexContent.style.paddingTop = '151px';
                indexContent.style.paddingBottom = '151px';
              }
              
              // Make sure scrolling only works inside content
              indexContent.style.overflow = 'auto';
              indexContent.style.webkitOverflowScrolling = 'touch';
              indexContent.style.touchAction = 'pan-y';
            }
          }
        }, 100);
      };
      
      // Also handle closing
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && indexOverlay.classList.contains('active')) {
          setTimeout(function() {
            imageWrapper.style.opacity = '1';
            imageWrapper.style.visibility = 'visible';
          }, 300);
        }
      });
      
      indexOverlay.addEventListener('click', function(e) {
        if (e.target === indexOverlay && indexOverlay.classList.contains('active')) {
          setTimeout(function() {
            imageWrapper.style.opacity = '1';
            imageWrapper.style.visibility = 'visible';
          }, 300);
        }
      });
    }
    
    // Disable original site's image resizing
    function patchMainJsImageResize() {
      if (window.updateImageStep) {
        const originalUpdateImageStep = window.updateImageStep;
        window.updateImageStep = function() {
          const width = window.innerWidth;
          if (width >= 768 && width <= 1366) {
            // Skip for tablets
            return;
          }
          originalUpdateImageStep();
        };
      }
    }
    
    // Reset any forced scrolls
    function forceScrollReset() {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    
    // Set up resize listener with throttling
    function setupResizeListener() {
      let resizeTimeout;
      window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
          // Check if dimensions actually changed to avoid iOS keyboard triggering resize
          if (originalWidth !== window.innerWidth || originalHeight !== window.innerHeight) {
            originalWidth = window.innerWidth;
            originalHeight = window.innerHeight;
            updateViewportSize();
            forceScrollReset();
          }
        }, 200);
      });
      
      // Also listen for orientation changes
      window.addEventListener('orientationchange', function() {
        setTimeout(function() {
          updateViewportSize();
          forceScrollReset();
        }, 300);
      });
      
      // Visual viewport events
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function() {
          updateViewportSize();
          forceScrollReset();
        });
      }
    }
    
    // Initialize everything
    function initialize() {
      // Execute all functions in sequence
      lockViewport();
      updateViewportSize();
      preventAllScrolling();
      fixIndexOverlay();
      setupResizeListener();
      
      // Patch main.js after a delay
      setTimeout(patchMainJsImageResize, 500);
      
      // Force reset scroll position
      forceScrollReset();
      
      // Run another update after animations complete
      setTimeout(function() {
        updateViewportSize();
        updateUIPositions();
        forceScrollReset();
      }, 1000);
      
      // Add extra calls to updateUIPositions
      setTimeout(updateUIPositions, 1500);
      setTimeout(updateUIPositions, 2500);
      setTimeout(updateUIPositions, 3500);
    }
    
    // Run when DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
    
    // Also run on window load to ensure all resources are loaded
    window.addEventListener('load', function() {
      updateViewportSize();
      forceScrollReset();
      updateUIPositions();
      
      // Force recentering multiple times to ensure it works
      setTimeout(updateUIPositions, 100);
      setTimeout(updateUIPositions, 500);
      setTimeout(updateUIPositions, 1000);
      setTimeout(updateUIPositions, 2000);
      
      // Add a MutationObserver to detect index overlay changes
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.target.id === 'index-overlay' && 
              mutation.type === 'attributes' && 
              mutation.attributeName === 'class') {
            const indexOverlay = document.getElementById('index-overlay');
            if (indexOverlay && indexOverlay.classList.contains('active')) {
              fixIndexOverlay();
            }
          }
        });
      });
      
      const indexOverlay = document.getElementById('index-overlay');
      if (indexOverlay) {
        observer.observe(indexOverlay, { attributes: true });
      }
    });
  })();