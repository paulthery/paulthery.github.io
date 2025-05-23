const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                 (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

if (isMobile) {
  function updateViewportHeight() {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    const wrapper = document.getElementById('image-wrapper');
    if (wrapper) {
      const maxHeight = vh - 160;
      wrapper.style.maxHeight = `${maxHeight}px`;
      
      const media = wrapper.querySelector('#main-image, #main-video');
      if (media) {
        media.style.maxHeight = `${maxHeight}px`;
      }
      
      updateCursorMobilePosition();
    }

    const nav = document.getElementById('nav');
    if (nav) {
      const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0;
      nav.style.bottom = `${Math.max(25, safeBottom)}px`;
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportHeight);
    window.visualViewport.addEventListener('scroll', updateViewportHeight);
  }
  window.addEventListener('resize', updateViewportHeight);

  document.addEventListener('DOMContentLoaded', updateViewportHeight);

  function updateCursorMobilePosition() {
    const wrapper = document.getElementById('image-wrapper');
    const cursor = document.getElementById('custom-cursor');
    if (!wrapper || !cursor) return;

    const computed = getComputedStyle(document.documentElement);
    const safeTop = parseFloat(computed.getPropertyValue('--safe-top')) || 0;
    const safeBottom = parseFloat(computed.getPropertyValue('--safe-bottom')) || 0;

    const rect = wrapper.getBoundingClientRect();
    const blankAbove = rect.top - safeTop;
    const blankBelow = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - safeBottom - rect.bottom;

    const topPos = blankAbove / 2 - (cursor.offsetHeight / 2);
    cursor.style.position = 'fixed';
    cursor.style.top = `${topPos}px`;
    cursor.style.bottom = 'auto';
    cursor.style.left = '50%';
    cursor.style.transform = 'translateX(-50%)';
  }
  document.addEventListener('DOMContentLoaded', updateCursorMobilePosition);
  window.addEventListener('load', updateViewportHeight);
  window.addEventListener('load', updateCursorMobilePosition);
  window.addEventListener('resize', updateCursorMobilePosition);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateCursorMobilePosition);
  }

  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 500 && tapLength > 0) {
      e.preventDefault();
      return false;
    }
    lastTap = currentTime;
  });

  const galleryScroll = document.getElementById('gallery-scroll');
  if (galleryScroll) {
    galleryScroll.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    }, { passive: true });
  }
}