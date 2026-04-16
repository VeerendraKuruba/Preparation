/**
 * Q34. Sprite sheets vs icon fonts vs inline SVG at scale
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THREE APPROACHES TO ICONS
 * ──────────────────────────
 *
 * 1. CSS SPRITE SHEETS (image sprites)
 *    Multiple icons in one PNG/SVG file; use background-position to show each
 *
 * 2. ICON FONTS (Font Awesome, Ionicons, Material Icons)
 *    Icons delivered as a web font; rendered as text characters via CSS classes
 *
 * 3. INLINE SVG
 *    SVG markup directly in the HTML; styled with CSS
 *
 * 4. SVG SPRITES (hybrid)
 *    SVG symbol definitions in a sprite file; referenced via <use>
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. CSS SPRITE SHEETS
// ─────────────────────────────────────────────────────────────────────────────
/*
  How it works:
  • Combine all icons into one image file
  • Use background-image + background-position to show individual icons

  .icon { background-image: url('/sprites/icons.png'); width: 24px; height: 24px; }
  .icon-home    { background-position: 0    0; }
  .icon-search  { background-position: -24px 0; }
  .icon-profile { background-position: -48px 0; }

  ✅ Pros:
  • Single HTTP request for all icons (HTTP/1.1 era benefit)
  • Works everywhere (even old IE)

  ❌ Cons:
  • Raster (PNG): blurry on retina displays
  • Can't be styled with CSS color (fill/stroke)
  • Tedious to maintain (regenerate entire sheet on any change)
  • Position arithmetic is fragile
  • SVG sprite is better in every way → prefer SVG sprites over PNG sprites

  Status: Legacy. Use SVG sprites instead.
*/

// ─────────────────────────────────────────────────────────────────────────────
// 2. ICON FONTS
// ─────────────────────────────────────────────────────────────────────────────
/*
  How it works:
  • Each icon is a character in a font file (WOFF2)
  • CSS class adds the character via ::before pseudo-element

  <!-- Font Awesome -->
  <i class="fa-solid fa-house"></i>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  (CSS: ~250 KB! Font files: ~500 KB)

  ✅ Pros:
  • Easy to use (single CSS class)
  • Scalable (vector)
  • CSS color via `color` property
  • Single font file for hundreds of icons

  ❌ Cons:
  • Accessibility nightmare: screen readers may read the Unicode character
  • Rendered as text → inherits text rendering quirks (anti-aliasing, subpixel)
  • Can't be multicolor
  • Entire font file downloaded even if you use 3 icons
  • Font loading flicker (FOIT) — icons invisible until font loads
  • External CDN → extra DNS/TCP/TLS connection
  • Lighthouse will flag it: "Eliminate render-blocking resources" and
    "Avoid serving legacy JavaScript to modern browsers"

  Status: Popular but declining. Inline SVG or SVG sprites are better.
*/

// ─────────────────────────────────────────────────────────────────────────────
// 3. INLINE SVG
// ─────────────────────────────────────────────────────────────────────────────
/*
  SVG markup directly embedded in HTML:

  <!-- Home icon directly in HTML -->
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>

  ✅ Pros:
  • Fully CSS styleable (fill, stroke, color, opacity, animation)
  • Multicolor icons possible
  • Perfect accessibility (title, desc, aria-label)
  • No extra HTTP request
  • Instantly available (no download/font load)
  • Interactive: can animate paths with CSS/JS

  ❌ Cons:
  • Bloats HTML if icon is reused many times
  • Not cacheable (part of the HTML)
  • Maintenance: updating icon requires updating HTML everywhere it's used
  • Large SVGs (complex illustrations) can bloat DOM

  BEST FOR: icons used 1-2 times per page, React components, interactive icons.
*/

// React component for inline SVG icon
function HomeIcon({ size = 24, color = "currentColor", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SVG SPRITES (best of both worlds)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Define all SVG symbols ONCE in the HTML or a separate file.
  Reference them anywhere with <use href="#id">.

  === Option A: Inline sprite (in HTML) ===
  <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
    <symbol id="icon-home" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </symbol>
    <symbol id="icon-search" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </symbol>
  </svg>

  Use anywhere:
  <svg width="24" height="24" aria-hidden="true">
    <use href="#icon-home"/>
  </svg>

  === Option B: External sprite file (cached) ===
  <svg width="24" height="24">
    <use href="/icons/sprite.svg#icon-home"/>
  </svg>
  → sprite.svg is a separate HTTP request BUT cached aggressively.
  → Perfect for icons reused many times.

  ✅ Pros:
  • Define once, use anywhere (no duplication)
  • Cached if external file
  • CSS styleable (via currentColor and CSS custom properties)
  • Accessible
  • One HTTP request for all icons (external sprite)

  ❌ Cons:
  • External sprite: cross-origin restrictions (must serve from same origin)
  • Slightly more complex setup than inline SVG
*/

// React SVG sprite usage:
function Icon({ name, size = 24, ...props }) {
  return (
    <svg width={size} height={size} aria-hidden="true" {...props}>
      <use href={`/icons/sprite.svg#icon-${name}`} />
    </svg>
  );
}

// Usage: <Icon name="home" size={20} color="blue" />

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON MATRIX
// ─────────────────────────────────────────────────────────────────────────────
/*
  Feature              PNG Sprite   Icon Font    Inline SVG   SVG Sprite
  ─────────────────   ──────────   ──────────   ──────────   ──────────
  Vector (sharp)        ❌           ✅           ✅           ✅
  CSS color             ❌           ✅ (color)   ✅ (all)     ✅ (all)
  Multicolor            ❌           ❌           ✅           ✅ (partial)
  Accessible            ❌           ❌ (needs    ✅           ✅
                                     aria-hidden)
  Cacheable             ✅           ✅           ❌           ✅
  DOM footprint         Low          Low          High         Low
  Animations            ❌           ❌           ✅           ✅
  Setup effort          Medium       Low          Low          Medium
  Performance           OK           Poor*        Good         Good
  Recommended?          ❌           ❌           ✅ (few)     ✅ (many)

  * Icon fonts: ~500KB download, render-blocking, FOIT
*/

/**
 * RECOMMENDATION BY SCALE
 * ─────────────────────────
 *  < 5 icons on a page:    Inline SVG (simplest, no extra requests)
 *  5-50 icons:             SVG sprites (inline sprite or external sprite.svg)
 *  50+ icons / design sys: SVG sprites + tree-shakeable icon library
 *                          (Heroicons, Radix Icons, Lucide — import only what's used)
 *  Legacy/no build tool:   SVG sprites from external file
 *  Avoid:                  Icon fonts (performance + accessibility issues)
 */
