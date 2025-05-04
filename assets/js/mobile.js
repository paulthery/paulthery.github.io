// --- Mobile‑only helpers (width handled by CSS, JS only for height) ---
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                 (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

if (isMobile) {
  /** Update --vh custom property and max‑height for the wrapper **/
  function updateViewportHeight() {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    const wrapper = document.getElementById('image-wrapper');
    if (wrapper) {
      wrapper.style.maxHeight = `${vh - 160}px`; // nav 80 px top + bottom
      updateCursorMobilePosition();
    }
  }

  // Sync on viewport changes
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportHeight);
    window.visualViewport.addEventListener('scroll', updateViewportHeight);
  }
  window.addEventListener('resize', updateViewportHeight);

  // Initial run once DOM is ready
  document.addEventListener('DOMContentLoaded', updateViewportHeight);

  // === DYNAMIC MOBILE CURSOR POSITIONING ===
  function updateCursorMobilePosition() {
    const wrapper = document.getElementById('image-wrapper');
    const cursor = document.getElementById('custom-cursor');
    if (!wrapper || !cursor) return;

    // Retrieve safe-area insets from CSS variables
    const computed = getComputedStyle(document.documentElement);
    const safeTop = parseFloat(computed.getPropertyValue('--safe-top')) || 0;
    const safeBottom = parseFloat(computed.getPropertyValue('--safe-bottom')) || 0;

    // Compute blank space above and below wrapper, accounting for insets
    const rect = wrapper.getBoundingClientRect();
    const blankAbove = rect.top - safeTop;
    const blankBelow = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - safeBottom - rect.bottom;

    // Center cursor in the blank region above by default
    const topPos = blankAbove / 2 - (cursor.offsetHeight / 2);
    cursor.style.position = 'fixed';
    cursor.style.top = `${topPos}px`;
    cursor.style.bottom = 'auto';
    cursor.style.left = '50%';
    cursor.style.transform = 'translateX(-50%)';
  }
  // Initialize and recalculate on load and resize/orientation change
  document.addEventListener('DOMContentLoaded', updateCursorMobilePosition);
  window.addEventListener('load', updateViewportHeight);
  window.addEventListener('load', updateCursorMobilePosition);
  window.addEventListener('resize', updateCursorMobilePosition);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateCursorMobilePosition);
  }
}