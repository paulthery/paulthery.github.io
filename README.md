# Paul Thery Studio

**Photographer & Art Director Based in Paris**

Portfolio website showcasing personal and commissioned photography and art direction work.

## 🌐 Live Sites

- **Photography**: [paulthery.com](https://paulthery.com)
- **Art Direction**: [paulthery.studio](https://paulthery.studio)

---

## ✨ Features

- **Custom Fluid Slideshow**: Vanilla JS slideshow with drag, swipe, keyboard navigation, and inertia
- **Performance Optimized**: DOM caching, intelligent media caching, AVIF/H.265 formats, minified assets
- **Modern Stack**: Pure vanilla JavaScript (ES6+ modules), no frameworks
- **SEO Ready**: JSON-LD structured data, automatic sitemap generation, dual-domain support
- **Security**: Enhanced CSP, security headers, 0 vulnerabilities
- **Responsive**: Optimized for desktop, tablet, and mobile

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥18
- Image/video tools: `libavif`, `ffmpeg`, `imagemagick`

```bash
# macOS
brew install libavif ffmpeg imagemagick

# Ubuntu/Debian
sudo apt install libavif-bin ffmpeg imagemagick
```

### Installation

```bash
git clone https://github.com/paulthery/paulthery.github.io.git
cd paulthery.github.io
npm install
```

---

## 📦 Build Scripts

### Development

```bash
npm run dev              # Watch albums and auto-rebuild
npm run build            # Generate albums.json from folders
npm test                 # Run automated tests (32 tests)
```

### Production

```bash
npm run build:full       # Complete build pipeline
npm run bump             # Build and bump version
```

Complete pipeline: image export → video export → albums → minify JS/CSS → cache-busting → sitemaps → robots.txt

### Assets

```bash
npm run build:minify     # Minify all JS files
npm run build:minify-css # Minify all CSS files
npm run update-js        # Update cache-busting timestamps
```

### Media Optimization

```bash
npm run export-images    # PNG → AVIF (desktop + mobile)
npm run export-videos    # MOV/MP4 → H.265 (desktop + mobile)
npm run optimize-images  # Optimize existing AVIF files
```

---

## 📁 Project Structure

```
paulthery.github.io/
├── photography/          # Photography albums
├── artdirection/         # Art direction albums
├── assets/
│   ├── js/
│   │   ├── main.js              # Main application
│   │   ├── main.min.js          # Minified version
│   │   └── modules/             # Reusable modules
│   ├── css/
│   │   ├── main.css             # Bundled stylesheet
│   │   └── main.min.css         # Minified version
│   └── fonts/                   # Untitled Sans WOFF2
├── scripts/
│   ├── build/                   # Album/sitemap/robots builders
│   ├── optimization/            # Image/video export scripts
│   └── utils/                   # Watch, clean, test utilities
├── index.html / artdirection.html
├── albums.json                  # Auto-generated manifest
└── order.json                   # Album display order
```

---

## 🔧 Adding Content

### New Album

1. Create folder in `photography/` or `artdirection/`
2. Add master files (`001_master.png`, `001_master.mov`)
3. Export media: `npm run export-images` / `npm run export-videos`
4. Update `order.json` with album name
5. Build: `npm run build`

### Master Files Naming

**Masters:**
- Images: `001_master.png`, `001_master_chanel.png`
- Videos: `001_master.mov`, `001_master_chanel.mov`

**After Export:**
- `001_master_chanel.png` → `001_desktop_chanel.avif` + `001_mobile_chanel.avif`
- `001_master.mov` → `001_desktop.mp4` + `001_mobile.mp4`

**Export Specs:**
- **AVIF Images**: Desktop (2000×2500px @ Q65), Mobile (1600×2000px @ Q55)
- **H.265 Videos**: Desktop (1920p @ 3000kbps), Mobile (1280p @ 1500kbps)

---

## 🚢 Deployment

Automatic deployment to Cloudflare Pages on push to main:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

**Domains:**
- `paulthery.com` → Photography (index.html)
- `paulthery.studio` → Art Direction (artdirection.html)

---

## 📊 Project Status

✅ **Production Ready** (October 2025)

- All dependencies up to date (Node.js v24.10.0)
- Zero security vulnerabilities
- 32/32 tests passing
- Optimized performance (60fps slideshow, minified assets)
- Security score: 10/10 (Enhanced CSP, security headers)
- SEO enhanced with JSON-LD structured data

---

## 📄 License

ISC License - © Paul Thery

---

## 📧 Contact

- **Email**: [studio@paulthery.com](mailto:studio@paulthery.com)
- **LinkedIn**: [Paul Thery](https://www.linkedin.com/in/paulthery/)
- **Twitter**: [@paulthery](https://twitter.com/paulthery)

---

**Made with ❤️ in Paris**
