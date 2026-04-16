/**
 * Q32. Responsive images with srcset and sizes done correctly
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE PROBLEM
 * ────────────
 * Without responsive images:
 *   • Mobile user downloads a 4000px wide image → displayed at 400px → 10× waste
 *   • Retina user sees blurry 1× image → looks low quality
 *
 * THE SOLUTION: srcset + sizes
 * ─────────────────────────────
 * Tell the browser which image variants exist (srcset) and
 * how wide the image will actually display (sizes).
 * The browser picks the best variant automatically.
 *
 * TWO TYPES OF SRCSET
 * ────────────────────
 *  1. Width descriptors (w): serve different size images
 *     srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
 *     → Use with `sizes` — browser calculates best fit
 *
 *  2. Pixel density descriptors (x): serve 1×/2×/3× for retina
 *     srcset="image.jpg 1x, image@2x.jpg 2x, image@3x.jpg 3x"
 *     → Use WITHOUT `sizes` — simple density-based selection
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. WIDTH DESCRIPTORS + SIZES (most flexible)
// ─────────────────────────────────────────────────────────────────────────────
/*
  srcset tells the browser: "Here are images and their intrinsic widths"
  sizes tells the browser:  "Here is how wide this image will display at each breakpoint"

  <img
    srcset="
      /images/photo-400.jpg   400w,
      /images/photo-800.jpg   800w,
      /images/photo-1200.jpg 1200w,
      /images/photo-1600.jpg 1600w
    "
    sizes="
      (max-width: 480px)  100vw,
      (max-width: 768px)  80vw,
      (max-width: 1200px) 50vw,
                          800px
    "
    src="/images/photo-800.jpg"
    alt="Landscape photo"
    width="800"
    height="600"
    loading="lazy"
  >

  HOW THE BROWSER PICKS:
  1. Evaluate `sizes` to find displayed width:
     e.g., on 600px viewport (phone): "100vw" → 600px display width
  2. Multiply by device pixel ratio:
     e.g., 2× retina: 600 × 2 = 1200 effective pixels needed
  3. Pick the image from srcset whose width is ≥ 1200w:
     → Picks photo-1200.jpg ✅

  THE `src` ATTRIBUTE:
  • Required as fallback for browsers without srcset support (old IE)
  • Pick the middle-of-the-road size
*/

// ─────────────────────────────────────────────────────────────────────────────
// 2. PIXEL DENSITY DESCRIPTORS (simpler, good for fixed-size images)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Best for: icons, logos, avatars with fixed display size

  <img
    src="/images/avatar.jpg"
    srcset="
      /images/avatar.jpg    1x,
      /images/avatar@2x.jpg 2x,
      /images/avatar@3x.jpg 3x
    "
    width="64"
    height="64"
    alt="User avatar"
  >

  On a 1× screen (most laptops): loads avatar.jpg (small)
  On a 2× retina: loads avatar@2x.jpg
  On a 3× phone: loads avatar@3x.jpg
*/

// ─────────────────────────────────────────────────────────────────────────────
// 3. WITH <picture> FOR ART DIRECTION
// ─────────────────────────────────────────────────────────────────────────────
/*
  Use <picture> when you need DIFFERENT IMAGES at different sizes
  (not just different sizes of the same image):

  <picture>
    <!-- Wide crop for desktop -->
    <source
      media="(min-width: 1024px)"
      srcset="
        /images/hero-landscape-1200.webp 1200w,
        /images/hero-landscape-2400.webp 2400w
      "
      sizes="100vw"
      type="image/webp"
    >
    <!-- Square crop for mobile -->
    <source
      media="(max-width: 1023px)"
      srcset="
        /images/hero-square-600.webp  600w,
        /images/hero-square-1200.webp 1200w
      "
      sizes="100vw"
      type="image/webp"
    >
    <!-- JPEG fallback -->
    <img
      src="/images/hero-landscape-1200.jpg"
      alt="Hero"
      width="1200"
      height="600"
    >
  </picture>
*/

// ─────────────────────────────────────────────────────────────────────────────
// 4. COMBINING FORMAT AND SIZE SELECTION
// ─────────────────────────────────────────────────────────────────────────────
/*
  The most complete pattern — AVIF → WebP → JPEG, each with responsive sizes:

  <picture>
    <source
      type="image/avif"
      srcset="img-400.avif 400w, img-800.avif 800w, img-1200.avif 1200w"
      sizes="(max-width: 600px) 100vw, 50vw"
    >
    <source
      type="image/webp"
      srcset="img-400.webp 400w, img-800.webp 800w, img-1200.webp 1200w"
      sizes="(max-width: 600px) 100vw, 50vw"
    >
    <img
      src="img-800.jpg"
      srcset="img-400.jpg 400w, img-800.jpg 800w, img-1200.jpg 1200w"
      sizes="(max-width: 600px) 100vw, 50vw"
      alt="Product"
      width="800"
      height="600"
      loading="lazy"
    >
  </picture>
*/

// ─────────────────────────────────────────────────────────────────────────────
// COMMON MISTAKES
// ─────────────────────────────────────────────────────────────────────────────
/*
  ❌ Missing `sizes` attribute with width descriptors:
     srcset="img-400.jpg 400w, img-1200.jpg 1200w"
     (No sizes → browser assumes 100vw → loads massive image on mobile)

  ❌ Incorrect `sizes` syntax:
     sizes="100%"        ← WRONG (must be CSS length, not %)
     sizes="100vw"       ← CORRECT

  ❌ Missing width/height attributes (causes CLS):
     <img srcset="..." sizes="...">    ← NO dimensions = layout shift

  ❌ sizes not matching actual CSS layout:
     Your image is displayed at 50vw but sizes says "100vw"
     → Browser downloads 2× more bytes than needed

  ❌ Using srcset for art direction (use <picture> instead):
     srcset can only change size, not crop/subject of the image.

  ❌ Not including `src` fallback:
     <img srcset="...">   ← needs src for legacy browsers
*/

// ─────────────────────────────────────────────────────────────────────────────
// REACT COMPONENT: RESPONSIVE IMAGE
// ─────────────────────────────────────────────────────────────────────────────
function ResponsiveImage({ src, alt, widths = [400, 800, 1200], sizes = "100vw", priority = false }) {
  const ext    = src.split(".").pop();
  const base   = src.replace(`.${ext}`, "");

  const srcset = widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");
  const srcsetWebp = widths.map((w) => `${base}-${w}.webp ${w}w`).join(", ");
  const srcsetAvif = widths.map((w) => `${base}-${w}.avif ${w}w`).join(", ");

  return (
    <picture>
      <source type="image/avif" srcSet={srcsetAvif} sizes={sizes} />
      <source type="image/webp" srcSet={srcsetWebp} sizes={sizes} />
      <img
        src={`${base}-${widths[Math.floor(widths.length / 2)]}.${ext}`}
        srcSet={srcset}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        style={{ width: "100%", height: "auto" }}
      />
    </picture>
  );
}

/**
 * BEST PRACTICES SUMMARY
 * ──────────────────────
 *  1. Always specify both srcset AND sizes for fluid images.
 *  2. Make sizes match your actual CSS layout (e.g., grid column widths).
 *  3. Always include width + height attributes to prevent CLS.
 *  4. Use <picture> for art direction (different crops at different sizes).
 *  5. Use <picture> for format selection (AVIF → WebP → JPEG fallback).
 *  6. Use density descriptors (1x/2x) only for fixed-size images.
 *  7. Verify in DevTools Network tab that the right image is being loaded.
 *  8. Use a CDN image service (Cloudinary, imgix) to automate all of this.
 */

function source(props) { return null; }
function img(props) { return null; }
function picture(props) { return null; }
