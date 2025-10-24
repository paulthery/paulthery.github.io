/**
 * 🖼️ IMAGE FORMAT DETECTION MODULE
 * @fileoverview Automatically detects AVIF/JPEG support and device type
 */

/**
 * 🖼️ IMAGE FORMAT & BROWSER CAPABILITIES DETECTOR
 * @class FormatDetector
 */
class FormatDetector {
  constructor() {
    this.supportedFormats = {
      avif: false,
      jpeg: true // JPEG is always supported as fallback
    };

    this.preferredFormat = 'jpeg';
    this.isMobile = null;
    this.mobileBreakpoint = 768;
    this._ready = false;
    this._readyPromise = null;

    this._detectDevice();
    this._readyPromise = this._detectSupport();
  }

  /**
   * ⏳ Wait for AVIF detection to complete
   * @returns {Promise<void>}
   */
  async ready() {
    if (this._ready) return;
    await this._readyPromise;
  }

  /**
   * Detect modern format support (AVIF)
   * @private
   * @async
   */
  async _detectSupport() {
    // 🔍 AVIF Detection
    this.supportedFormats.avif = await this._checkImageFormat(
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI='
    );

    // ✅ Set preferred format (priority: AVIF > JPEG)
    if (this.supportedFormats.avif) {
      this.preferredFormat = 'avif';
    }

    this._ready = true;
  }

  /**
   * 🔍 Check support for specific image format
   * @private
   * @param {string} dataUri - Data URL of test image
   * @returns {Promise<boolean>} True if format is supported
   */
  _checkImageFormat(dataUri) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = dataUri;
    });
  }

  /**
   * 📱 Detect if device is mobile based on screen width
   * @private
   */
  _detectDevice() {
    // 📱 Detection based on screen width
    this.isMobile = window.matchMedia(`(max-width: ${this.mobileBreakpoint}px)`).matches;
    
    // 👂 Listen for screen size changes
    window.matchMedia(`(max-width: ${this.mobileBreakpoint}px)`).addEventListener('change', (e) => {
      this.isMobile = e.matches;
    });
  }

  /**
   * 🎯 Generate optimal image URL based on device and supported format
   * @param {string} originalUrl - Original image URL
   * @returns {string} Optimized URL (AVIF mobile/desktop or JPEG)
   */
  getOptimalImageUrl(originalUrl) {
    // 🔍 Only process JPEG files (AVIF already optimized in albums.json)
    if (!/(\.jpe?g)$/i.test(originalUrl)) {
      return originalUrl;
    }

    // ✂️ Extract path parts
    const ext = originalUrl.match(/\.(jpe?g)$/i)[0];
    const basePath = originalUrl.substring(0, originalUrl.lastIndexOf(ext));
    
    // 🚫 If already mobile/desktop version, don't modify
    if (basePath.endsWith('_mobile') || basePath.endsWith('_desktop')) {
      return originalUrl;
    }

    // 🏗️ Build optimal path
    let optimalUrl;
    
    if (this.isMobile) {
      // 📱 Mobile version with preferred format
      if (this.preferredFormat === 'jpeg') {
        optimalUrl = `${basePath}_mobile${ext}`;
      } else {
        optimalUrl = `${basePath}_mobile.${this.preferredFormat}`;
      }
    } else {
      // 🖥️ Desktop version with preferred format
      if (this.preferredFormat === 'jpeg') {
        optimalUrl = `${basePath}_desktop${ext}`;
      } else {
        optimalUrl = `${basePath}_desktop.${this.preferredFormat}`;
      }
    }

    return optimalUrl;
  }

  /**
   * 📊 Return format support information
   * @returns {Object} Object containing browser capabilities
   */
  getSupportInfo() {
    return {
      avif: this.supportedFormats.avif,
      preferredFormat: this.preferredFormat,
      isMobile: this.isMobile
    };
  }
}

// 📤 Export singleton
const formatDetector = new FormatDetector();
export default formatDetector;