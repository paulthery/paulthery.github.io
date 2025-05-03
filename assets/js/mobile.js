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

  // SOLUTION RADICALE: Repositionner complètement le pied de page
  document.addEventListener('DOMContentLoaded', function() {
    // Fonction pour manipuler l'injection du footer
    function modifyIndexFooter() {
      const indexOverlay = document.getElementById('index-overlay');
      
      if (!indexOverlay) return;
      
      // Observer les changements sur l'overlay
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class' && 
              indexOverlay.classList.contains('active')) {
            
            // Attendre un court instant que le contenu soit pleinement injecté
            setTimeout(function() {
              const footer = indexOverlay.querySelector('.index-footer');
              
              if (!footer) return;
              
              // Forcer le repositionnement du footer avec des styles inline
              // Ces styles auront la priorité sur tout autre style CSS
              footer.style.cssText = `
                position: fixed !important;
                bottom: 110px !important;
                left: 0 !important;
                right: 0 !important;
                padding: 0 20px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: flex-end !important;
                z-index: 9999 !important;
                background-color: white !important;
                margin: 0 !important;
              `;
              
              // Manipuler la taille de la photo
              const photo = footer.querySelector('#index-footer-photo');
              if (photo) {
                photo.style.cssText = `
                  width: 45px !important;
                  height: 45px !important;
                  flex-shrink: 0 !important;
                  margin-right: 15px !important;
                `;
              }
              
              // Manipuler la section des liens
              const linksSection = footer.querySelector('.footer-right');
              if (linksSection) {
                linksSection.style.cssText = `
                  display: flex !important;
                  align-items: flex-end !important;
                  justify-content: flex-end !important;
                  flex-wrap: nowrap !important;
                  gap: 0 !important;
                  font-size: 7.5px !important;
                  white-space: nowrap !important;
                  overflow: visible !important;
                  margin-right: 20px !important;
                `;
                
                // Manipuler chaque lien individuellement
                const links = linksSection.querySelectorAll('a');
                links.forEach(function(link) {
                  link.style.cssText = `
                    margin: 0 2px !important;
                    white-space: nowrap !important;
                    letter-spacing: -0.2px !important;
                  `;
                });
                
                // Manipuler chaque séparateur
                const separators = linksSection.querySelectorAll('.separator');
                separators.forEach(function(separator) {
                  separator.style.cssText = `
                    margin: 0 !important;
                    padding: 0 !important;
                    transform: none !important;
                    font-size: 7.5px !important;
                    position: relative !important;
                    top: -1px !important;
                  `;
                });
              }
            }, 50); // Petit délai pour s'assurer que le DOM est prêt
          }
        });
      });
      
      // Observer les changements d'attributs de classe
      observer.observe(indexOverlay, { attributes: true });
      
      // S'assurer que le main.js a fini d'injecter le HTML avant d'appliquer nos styles
      if (indexOverlay.classList.contains('active')) {
        const footer = indexOverlay.querySelector('.index-footer');
        if (footer) {
          // Si l'overlay est déjà actif, appliquer directement nos styles
          footer.style.bottom = '110px !important';
        }
      }
    }
    
    // Attendre un peu que tout soit chargé
    setTimeout(modifyIndexFooter, 200);
  });
}