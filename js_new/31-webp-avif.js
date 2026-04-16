/**
 * Q31. WebP and AVIF — when to use each
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE PROBLEM WITH JPEG AND PNG
 * ──────────────────────────────
 *  JPEG: good lossy compression but outdated algorithm; no alpha channel
 *  PNG:  lossless but huge file sizes; alpha channel supported
 *  GIF:  limited colors (256), large for animation
 *
 * MODERN ALTERNATIVES: WebP and AVIF
 * ────────────────────────────────────
 *
 * WEBP
 * ─────
 *  • Created by Google in 2010
 *  • Based on VP8 video codec
 *  • Supports: lossy, lossless, alpha, animation
 *  • File size: 25-35% smaller than JPEG, 26% smaller than PNG
 *  • Quality: same visual quality as JPEG at smaller size
 *  • Browser support: 96%+ (all modern browsers; IE11 doesn't support)
 *  • Encoding speed: FAST (suitable for on-the-fly resizing)
 *  • Decoding speed: Fast
 *
 * AVIF
 * ─────
 *  • Created by the Alliance for Open Media in 2019
 *  • Based on AV1 video codec (more modern than VP8)
 *  • Supports: lossy, lossless, alpha, animation, HDR, wide color gamut
 *  • File size: 50% smaller than JPEG, 20% smaller than WebP
 *  • Quality: excellent at low bit rates; better detail preservation
 *  • Browser support: 90%+ (Chrome 85+, Firefox 93+, Safari 16.1+)
 *  • Encoding speed: SLOW (3-10× slower than WebP; not for on-the-fly)
 *  • Decoding speed: Comparable to WebP (improving with hardware acceleration)
 *
 * SIZE COMPARISON (same visual quality, approximate):
 *  JPEG:  100 KB
 *  WebP:   70 KB  (-30%)
 *  AVIF:   45 KB  (-55%)
 */

// ─────────────────────────────────────────────────────────────────────────────
// WHEN TO USE EACH
// ─────────────────────────────────────────────────────────────────────────────
/*
  Use AVIF when:
  ✅ Highest quality at smallest file size (hero images, product photography)
  ✅ Images are pre-generated at build time (slow encoding is acceptable)
  ✅ You can afford the 90% browser support and serve JPEG fallback
  ✅ Photographic images with fine detail
  ✅ Images with gradients or subtle color transitions

  Use WebP when:
  ✅ On-the-fly image resizing/conversion (fast encoding)
  ✅ You need broad compatibility (96% vs 90%)
  ✅ Animations (replacing GIF)
  ✅ Logos, icons with transparency (replacing PNG)
  ✅ Server-side image processing pipelines where AVIF is too slow

  Use JPEG when:
  ✅ Universal compatibility is required (IE11, very old devices)
  ✅ As a fallback for WebP/AVIF
  ✅ Simple photographic images where WebP savings aren't worth the complexity

  Use PNG when:
  ✅ Screenshots with text (lossless required)
  ✅ As a fallback for WebP/AVIF where alpha channel is needed
  ✅ Images that must be lossless (logos for print)
*/

// ─────────────────────────────────────────────────────────────────────────────
// SERVING MODERN FORMATS WITH FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

// HTML: <picture> element — browser picks first supported format
/*
  <picture>
    <source srcset="/images/hero.avif" type="image/avif">
    <source srcset="/images/hero.webp" type="image/webp">
    <img
      src="/images/hero.jpg"
      alt="Hero"
      width="1200"
      height="600"
      fetchpriority="high"
      loading="eager"
    >
  </picture>

  Browser logic:
    1. Try AVIF — if supported and available, use it
    2. Try WebP — if supported and available, use it
    3. Fall back to JPEG
*/

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE + MODERN FORMAT COMBINED
// ─────────────────────────────────────────────────────────────────────────────
/*
  <picture>
    <!-- AVIF with responsive sizes -->
    <source
      type="image/avif"
      srcset="
        /images/hero-400.avif   400w,
        /images/hero-800.avif   800w,
        /images/hero-1200.avif 1200w
      "
      sizes="(max-width: 600px) 100vw, 800px"
    >
    <!-- WebP fallback with responsive sizes -->
    <source
      type="image/webp"
      srcset="
        /images/hero-400.webp   400w,
        /images/hero-800.webp   800w,
        /images/hero-1200.webp 1200w
      "
      sizes="(max-width: 600px) 100vw, 800px"
    >
    <!-- JPEG ultimate fallback -->
    <img
      src="/images/hero-800.jpg"
      alt="Hero"
      width="800"
      height="450"
    >
  </picture>
*/

// ─────────────────────────────────────────────────────────────────────────────
// NEXT.JS <Image> COMPONENT (automatic format selection)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Next.js automatically:
  • Serves AVIF if browser supports it
  • Falls back to WebP
  • Falls back to JPEG/PNG (original format)
  • Resizes to requested width
  • Adds proper lazy loading and CLS-prevention

  import Image from 'next/image';

  <Image
    src="/images/hero.jpg"
    alt="Hero"
    width={1200}
    height={600}
    priority                    // LCP image: preload
    quality={80}                // compress (default: 75)
    sizes="(max-width: 768px) 100vw, 1200px"
  />

  next.config.js to enable AVIF:
  module.exports = {
    images: {
      formats: ['image/avif', 'image/webp'],  // try AVIF first
    },
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// GENERATING WebP AND AVIF AT BUILD TIME
// ─────────────────────────────────────────────────────────────────────────────
/*
  Using Sharp (Node.js):
  const sharp = require('sharp');

  // Convert to WebP
  await sharp('hero.jpg')
    .webp({ quality: 80 })
    .toFile('hero.webp');

  // Convert to AVIF
  await sharp('hero.jpg')
    .avif({ quality: 60, effort: 6 })  // effort 0-9 (9=slowest/best)
    .toFile('hero.avif');

  // Responsive variants
  for (const width of [400, 800, 1200]) {
    await sharp('hero.jpg')
      .resize(width)
      .webp({ quality: 80 })
      .toFile(`hero-${width}.webp`);
  }

  Build tools:
  • imagemin + imagemin-webp + imagemin-avif
  • vite-plugin-imagemin
  • next/image (handles automatically)
  • Cloudinary / imgix (on-demand CDN-based conversion)
*/

// ─────────────────────────────────────────────────────────────────────────────
// DETECTING SUPPORT IN JAVASCRIPT (if needed)
// ─────────────────────────────────────────────────────────────────────────────

async function supportsAvif() {
  const img = new Image();
  return new Promise((resolve) => {
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQ==";
  });
}

async function supportsWebP() {
  const img = new Image();
  return new Promise((resolve) => {
    img.onload  = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JZQCdAEO/gAA";
  });
}

/**
 * QUICK DECISION MATRIX
 * ──────────────────────
 *  Need smallest possible size, build-time generation?    → AVIF
 *  Need fast on-the-fly conversion / broad support?       → WebP
 *  Need lossless with transparency?                       → WebP (or PNG fallback)
 *  Need animation?                                        → WebP (or AVIF for quality)
 *  Serving to all users including IE11?                   → JPEG/PNG fallback
 *  Using Next.js / Astro / modern framework?              → Let the framework decide
 *
 * Always serve <picture> with multiple <source> types for progressive enhancement.
 * Never serve a single format assuming all browsers support it.
 */
