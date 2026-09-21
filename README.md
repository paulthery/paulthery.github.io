# Paul Thery Studio

**Photographer & Art Director Based in Paris**

Portfolio website showcasing photography and art direction work for luxury brands including Louis Vuitton, Chanel, Loewe, and Lancôme.

---

## 🌐 Live Site

- **Photography**: [paulthery.com](https://paulthery.com)
- **Art Direction**: [paulthery.studio](https://paulthery.studio)

---

## ✨ Features

- **Fluid Slideshow**: Vanilla JS slideshow with drag, swipe, keyboard navigation, and inertia
- **Performance**: AVIF images, Service Worker caching, DOM optimization
- **Responsive**: Desktop, tablet, and mobile optimized
- **SEO**: Schema.org structured data, dual-domain sitemaps
- **Modern**: Pure vanilla JavaScript ES6+, no frameworks

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Images**: AVIF format (optimal compression)
- **Videos**: H.265/MP4
- **Deployment**: GitHub Pages + Cloudflare Pages
- **CI/CD**: GitHub Actions

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

## 📁 Project Structure

```
paulthery.github.io/
├── photography/          # Photography albums (recent, work, costa rica, etc.)
├── artdirection/         # Art direction albums (work, chanel, louis vuitton, etc.)
├── assets/
│   ├── js/
│   │   ├── main.js              # Main application (bundled)
│   │   └── main.min.js          # Minified version
│   ├── css/
│   │   ├── main.css             # Bundled stylesheet
│   │   └── main.min.css         # Minified version
│   └── fonts/                   # Untitled Sans WOFF2
├── scripts/
│   ├── build/                   # Album/sitemap/robots builders
│   ├── optimization/            # Image/video export scripts
│   ├── utils/                   # Watch, clean, test utilities
│   └── cloudflare/              # Cloudflare Pages management scripts
├── index.html / artdirection.html
├── sw.js                        # Service Worker for offline support
├── albums.json                  # Auto-generated manifest
├── order.json                   # Album display order
├── sitemap.xml / robots.txt     # SEO files
└── _headers / _redirects        # Cloudflare configuration
```

---

## 📦 Build Scripts

### Development

```bash
npm run dev              # Watch albums and auto-rebuild
npm run build            # Generate albums.json from folders
npm run rebuild          # Rebuild with detailed stats
```

### Production

```bash
npm run build:full       # Complete build pipeline
npm run bump             # Build and bump version
```

Runs: image export → video export → albums → minify JS/CSS → cache-busting → sitemaps → robots.txt

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
npm run optimize-images:force  # Force re-optimization of all images
npm run optimize-images:clean  # Clean optimization cache
npm run clean-exports    # Remove exported files (keeps masters)
```

---

## 📁 Master Files Workflow

⚠️ **Scripts NEVER modify master files** - you manage them manually.

### Naming Convention

**Masters:**

- Images: `001_master.png`, `001_master_chanel.png`
- Videos: `001_master.mov`, `001_master_chanel.mov`

**After Export:**

- `001_master_chanel.png` → `001_desktop_chanel.avif` + `001_mobile_chanel.avif`
- `001_master.mov` → `001_desktop.mp4` + `001_mobile.mp4`

**Rule:** Brand suffix stays last, `master` becomes `desktop`/`mobile`

### Workflow

1. Add masters to album folders
2. Run `npm run export-images` and/or `npm run export-videos`
3. Run `npm run build` to update `albums.json`

### Export Specs

**AVIF Images:**

- Desktop: 2000×2500px @ Q65
- Mobile: 1600×2000px @ Q55
- Source: PNG @ Q100 (4000×5000px)

**H.265 Videos:**

- Desktop: 1920p @ 3000kbps (max 15MB)
- Mobile: 1280p @ 1500kbps (max 7.5MB)
- Codec: libx265, AAC 128k audio

Masters (`.png`, `*_master.*`) are git-ignored, only exports are versioned.

---

## 🔧 Development

### Adding Albums

1. Create folder in `photography/` or `artdirection/`
2. Add masters to folder
3. Export: `npm run export-images` / `export-videos`
4. Update `config/order.json` to set album display order
5. Build: `npm run build`

### Modifying Code

**CSS:**

```bash
# Edit assets/css/main.css
npm run build:minify-css
npm run update-js
```

**JavaScript:**

```bash
# Edit assets/js/main.js
npm run build:minify
npm run update-js
```

### Performance Features

- **DOM Caching**: Reduces repeated queries
- **Media Caching**: Intelligent retry logic, format detection
- **Memory Management**: Proper cleanup of video elements and observers
- **Async AVIF Detection**: Non-blocking format support check
- **CSS Optimization**: Bundled stylesheets, minification, and duplicate removal
- **JavaScript Bundling**: Single file for reduced HTTP requests
- **Service Worker**: Offline support and instant page loads (see [SERVICE-WORKER.md](SERVICE-WORKER.md))

---

## 🚢 Deployment

The site uses a dual deployment strategy:

1. **GitHub Pages**: Primary hosting for the repository
2. **Cloudflare Pages**: Production hosting with custom domains

### Automatic Deployment

The site is automatically deployed when pushed to GitHub:

```bash
# Commit changes
git add .
git commit -m "Your commit message"

# Push to GitHub (auto-deploys to both GitHub Pages and Cloudflare)
git push origin main
```

### Domain Configuration

- **Photography**: `paulthery.com` (Cloudflare Pages)
- **Art Direction**: `paulthery.studio` (Cloudflare Pages)
- **Repository**: `paulthery.github.io` (GitHub Pages)

---

## 📄 License

ISC License - © Paul Thery

---

## 📧 Contact

- **Email**: [studio@paulthery.com](mailto:studio@paulthery.com)
- **Instagram**: [@paulthery](http://www.instagram.com/paulthery)
- **LinkedIn**: [Paul Thery](https://www.linkedin.com/in/paulthery/)
- **Vimeo**: [paulthery](https://vimeo.com/paulthery)

---

## 🙏 Credits

- **Design & Development**: Paul Thery Studio
- **Slideshow Inspiration**: Slick.js (recreated in vanilla JS)
- **Photography & Art Direction**: Paul Thery

---

**Made with ❤️ in Paris**
