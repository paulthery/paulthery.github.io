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

  // ✂️ Remove extension
  baseName = baseName.replace(/\.(jpg|jpeg|avif|png|gif|mp4|webm)$/i, '');

  return baseName;
}

// 🔍 FILTER UNIQUE FILES FUNCTION (desktop/mobile)
export function filterUniqueImages(files) {
  const uniqueImages = new Map();
  const isMobile = window.matchMedia ? window.matchMedia(`(max-width: ${768}px)`).matches : false;
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
  return text.split(' ').map(word => {

    if (/^[ivxlcdm]+$/i.test(word)) {
      return word.toLowerCase();
    }

    if (/[;:.\/]/.test(word)) {
      return word.toLowerCase();
    }

    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ').replace(/s:s/g, 's/s').replace(/lv s\/s/g, 'LV s/s');
}

export { capitalizeWordsOver3Letters };

export function appendItem(container, route, key, count) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  const currentDomain = window.location.hostname;
  a.href = `/${route}/${encodeURIComponent(key)}`;
  a.textContent = capitalizeWordsOver3Letters(key);
  const span = document.createElement('span');
  span.className = 'count';
  span.textContent = String(count).padStart(2, '0');
  li.append(a, span);
  container.append(li);
}
export function buildList(manifestSection, orderList, container, route) {
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
