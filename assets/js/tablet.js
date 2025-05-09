(function() {
    let originalWidth = window.innerWidth;
    let originalHeight = window.innerHeight;
    
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
    
    function setSafeAreaVariables() {
      if (CSS && CSS.supports && CSS.supports('padding: env(safe-area-inset-top)')) {
        const style = document.createElement('style');
        style.textContent = `
          :root {
            --safe-area-inset-top: env(safe-area-inset-top, 0px);
            --safe-area-inset-right: env(safe-area-inset-right, 0px);
            --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
            --safe-area-inset-left: env(safe-area-inset-left, 0px);
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    function getSafeAreaInsets() {
      return {
        top: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0px',
        right: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0px',
        bottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0px',
        left: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0px'
      };
    }
    
    function pxToNumber(pxValue) {
      return parseFloat(pxValue) || 0;
    }
    
    function updateViewportSize() {
      const width = window.innerWidth;
      if (width >= 768 && width <= 1366) {
        const vh = window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        document.body.style.width = `${width}px`;
        document.body.style.height = `${vh}px`;
        document.body.style.maxHeight = `${vh}px`;
        document.body.style.overflow = 'hidden';
        
        const wrapper = document.getElementById('image-wrapper');
        if (wrapper) {
          const maxHeight = vh - 160;
          const calculatedWidth = maxHeight * 0.8;
          
          if (calculatedWidth <= width * 0.8) {
            wrapper.style.height = `${maxHeight}px`;
            wrapper.style.width = `${calculatedWidth}px`;
          } else {
            const maxAllowedWidth = width * 0.8;
            wrapper.style.width = `${maxAllowedWidth}px`;
            wrapper.style.height = `${maxAllowedWidth * 1.25}px`;
          }
        }
        
        updateUIPositions();
      }
    }
    
    function updateUIPositions() {
      const mainContent = document.getElementById('main-content');
      if (mainContent && mainContent.classList.contains('landscape-ipad')) {
        return;
      }
      
      const nav = document.querySelector('nav');
      const imageWrapper = document.getElementById('image-wrapper');
      const customCursor = document.getElementById('custom-cursor');
      
      if (!nav || !imageWrapper) return;
      
      const wrapperRect = imageWrapper.getBoundingClientRect();
      const vh = window.innerHeight;
      
      const safeAreas = getSafeAreaInsets();
      const safeAreaBottom = pxToNumber(safeAreas.bottom);
      const safeAreaTop = pxToNumber(safeAreas.top);
      
      nav.style.position = 'fixed';
      nav.style.bottom = `calc(${(vh - wrapperRect.bottom) / 2 - nav.offsetHeight / 2}px + ${safeAreaBottom}px)`;
      
      if (customCursor) {
        customCursor.style.position = 'fixed';
        customCursor.style.top = `calc(${wrapperRect.top / 2}px + ${safeAreaTop}px)`;
        customCursor.style.left = '50%';
        customCursor.style.transform = 'translateX(-50%)';
        
        if (parseFloat(customCursor.style.top) < (20 + safeAreaTop)) {
          customCursor.style.top = `calc(20px + ${safeAreaTop}px)`;
        }
        
        customCursor.style.fontSize = '14px';
      }
      
      const galleryNav = document.getElementById('gallery-nav');
      if (galleryNav && galleryNav.style.display !== 'none') {
        galleryNav.style.bottom = `calc(${(vh - wrapperRect.bottom) / 2 - galleryNav.offsetHeight / 2}px + ${safeAreaBottom}px)`;
        galleryNav.style.fontSize = '14px';
      }
    }
    
    function preventAllScrolling() {
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
      
      const preventScrollingEvents = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      window.addEventListener('scroll', preventScrollingEvents, { passive: false });
      window.addEventListener('mousewheel', preventScrollingEvents, { passive: false });
      window.addEventListener('wheel', preventScrollingEvents, { passive: false });
      window.addEventListener('touchmove', preventScrollingEvents, { passive: false });
      document.addEventListener('touchmove', preventScrollingEvents, { passive: false });
      document.body.addEventListener('touchmove', preventScrollingEvents, { passive: false });
      
      window.addEventListener('scroll', function() {
        window.scrollTo(0, 0);
      });
      
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
    
    function fixIndexOverlay() {
      const indexTrigger = document.getElementById('index-trigger');
      const indexOverlay = document.getElementById('index-overlay');
      const imageWrapper = document.getElementById('image-wrapper');
      
      if (!indexTrigger || !indexOverlay || !imageWrapper) return;
      
      const originalClick = indexTrigger.onclick;
      indexTrigger.onclick = function(e) {
        if (originalClick) {
          originalClick.call(this, e);
        }
        
        setTimeout(function() {
          if (indexOverlay.classList.contains('active')) {
            const safeAreas = getSafeAreaInsets();
            
            indexOverlay.style.position = 'fixed';
            indexOverlay.style.top = '0';
            indexOverlay.style.left = '0';
            indexOverlay.style.right = '0';
            indexOverlay.style.bottom = '0';
            indexOverlay.style.width = '100%';
            indexOverlay.style.height = '100%';
            indexOverlay.style.transform = 'none';
            indexOverlay.style.display = 'block';
            
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
                indexContent.style.paddingTop = `calc(100px + ${safeAreas.top})`;
                indexContent.style.paddingRight = safeAreas.right;
                indexContent.style.paddingBottom = `calc(130px + ${safeAreas.bottom})`;
                indexContent.style.paddingLeft = safeAreas.left;
              } else {
                indexContent.style.paddingTop = `calc(151px + ${safeAreas.top})`;
                indexContent.style.paddingRight = safeAreas.right;
                indexContent.style.paddingBottom = `calc(151px + ${safeAreas.bottom})`;
                indexContent.style.paddingLeft = safeAreas.left;
              }
              
              indexContent.style.overflow = 'auto';
              indexContent.style.webkitOverflowScrolling = 'touch';
              indexContent.style.touchAction = 'pan-y';
            }
          }
        }, 100);
      };
      
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
    
    function patchMainJsImageResize() {
      if (window.updateImageStep) {
        const originalUpdateImageStep = window.updateImageStep;
        window.updateImageStep = function() {
          const width = window.innerWidth;
          
          if (width >= 768 && width <= 1366) {
            return;
          }
          
          originalUpdateImageStep();
        };
      }
    }
    
    function forceScrollReset() {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    
    function setupResizeListener() {
      let resizeTimeout;
      window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
          if (originalWidth !== window.innerWidth || originalHeight !== window.innerHeight) {
            originalWidth = window.innerWidth;
            originalHeight = window.innerHeight;
            updateViewportSize();
            forceScrollReset();
          }
        }, 200);
      });
    }
    
    function initialize() {
      lockViewport();
      setSafeAreaVariables();
      updateViewportSize();
      preventAllScrolling();
      fixIndexOverlay();
      setupResizeListener();
      
      setTimeout(patchMainJsImageResize, 500);
      
      forceScrollReset();
      
      setTimeout(function() {
        updateViewportSize();
        updateUIPositions();
        forceScrollReset();
      }, 1000);
      
      setTimeout(updateUIPositions, 1500);
      setTimeout(updateUIPositions, 2500);
      setTimeout(updateUIPositions, 3500);
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
    
    window.addEventListener('load', function() {
      updateViewportSize();
      forceScrollReset();
      
      updateUIPositions();
      
      setTimeout(updateUIPositions, 100);
      setTimeout(updateUIPositions, 500);
      setTimeout(updateUIPositions, 1000);
      setTimeout(updateUIPositions, 2000);
      
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