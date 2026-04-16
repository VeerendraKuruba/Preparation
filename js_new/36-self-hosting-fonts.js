/**
 * Q36. Self-hosting fonts vs Google Fonts — performance and privacy
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * GOOGLE FONTS (CDN-hosted)
 * ──────────────────────────
 * <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">
 *
 * Flow:
 * 1. Browser downloads stylesheet from fonts.googleapis.com
 * 2. Stylesheet references woff2 files from fonts.gstatic.com
 * 3. Browser downloads woff2 font files
 *
 * Each step = extra DNS lookup + TCP handshake + TLS negotiation + download
 *
 * SELF-HOSTING
 * ─────────────
 * Host font files on your own domain/CDN:
 * @font-face {
 *   font-family: "Inter";
 *   src: url("/fonts/inter-regular.woff2") format("woff2");
 *   font-display: swap;
 * }
 *
 * Fonts served from your own origin: same domain, same connection, same CDN.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE COMPARISON
// ─────────────────────────────────────────────────────────────────────────────
/*
  Google Fonts:
  ❌ Extra DNS lookup for fonts.googleapis.com (~20-120ms)
  ❌ Extra DNS lookup for fonts.gstatic.com (~20-120ms)
  ❌ Extra TCP + TLS for googleapis.com (~100-300ms)
  ❌ Extra TCP + TLS for gstatic.com (~100-300ms)
  ❌ Two sequential HTTP requests (CSS → then font files)
  ❌ Render-blocking CSS from external origin
  ❌ No <link rel="preload"> possible on Google's CSS (you don't know font URLs)
  ✅ Font files may be cached from visiting other Google Fonts sites (debatable*)

  Self-hosting:
  ✅ Same origin = already connected (no extra DNS/TCP/TLS)
  ✅ Can <link rel="preload" href="/fonts/inter.woff2"> directly
  ✅ Control over caching headers (max-age=31536000, immutable)
  ✅ Works offline with Service Worker
  ✅ Can pre-compress with Brotli
  ✅ CDN optimized the same as your other assets

  * Cross-site font cache sharing is disabled in Chrome since 2020 (partitioned cache)
    This means Google Fonts cache benefit is largely gone in modern browsers.

  Total savings from self-hosting: ~200-500ms on first load (no extra connections)
*/

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY COMPARISON
// ─────────────────────────────────────────────────────────────────────────────
/*
  Google Fonts:
  ❌ Every page visit sends user's IP address to Google's servers
  ❌ Google can track which websites users visit (via font requests)
  ❌ Potential GDPR compliance issue (EU regulators have flagged this)
     - German courts have fined sites for using Google Fonts without consent
     - User's IP = personal data under GDPR
  ❌ If Google's servers are slow/down, your fonts load slowly/not at all

  Self-hosting:
  ✅ No data shared with third parties
  ✅ GDPR compliant by design
  ✅ No dependency on Google's infrastructure availability
  ✅ Works in privacy-focused environments (corporate firewalls blocking Google)
*/

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO SELF-HOST (step by step)
// ─────────────────────────────────────────────────────────────────────────────

// Step 1: Download font files
/*
  Option A: google-webfonts-helper (gwfh.madebyevan.com)
    • Select font family + styles
    • Download woff2 + woff files
    • Copy generated CSS

  Option B: fontsource (npm package)
    npm install @fontsource/inter
    import '@fontsource/inter/400.css';
    import '@fontsource/inter/700.css';
    → Self-hosted, tree-shakeable, only imports what you use

  Option C: Manual download from Google Fonts + save WOFF2 files
*/

// Step 2: Include only the weights/styles you use
/*
  Download only:
  ✅ Regular (400) — body text
  ✅ Bold (700) — headings

  Skip:
  ❌ Light (300) if not used
  ❌ Medium (500) if not used
  ❌ Black (900) if not used

  Each weight = extra file. Only download what you need.
*/

// Step 3: CSS @font-face declarations
/*
  @font-face {
    font-family: "Inter";
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url("/fonts/inter-v13-latin-regular.woff2") format("woff2");
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC;
    /     ↑ Only load font for characters in this range (subsetting)
  }

  @font-face {
    font-family: "Inter";
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url("/fonts/inter-v13-latin-700.woff2") format("woff2");
    unicode-range: U+0000-00FF;
  }
*/

// Step 4: Cache fonts aggressively
/*
  nginx:
  location ~* \.(woff2)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "*";
  }

  Or in the HTML response headers for the font files.
*/

// Step 5: Preload critical fonts
/*
  <link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/inter-bold.woff2"    as="font" type="font/woff2" crossorigin>

  Note: crossorigin is REQUIRED even for same-origin fonts (CORS credential mode)
*/

// ─────────────────────────────────────────────────────────────────────────────
// FONTSOURCE (npm-based self-hosting — easiest approach)
// ─────────────────────────────────────────────────────────────────────────────
/*
  npm install @fontsource/inter @fontsource/roboto

  In your app entry:
  import '@fontsource/inter/400.css';      // only 400 weight
  import '@fontsource/inter/700.css';      // only 700 weight
  import '@fontsource/inter/latin.css';    // only latin subset (smaller)

  Your bundler (Webpack/Vite) copies fonts to output and generates @font-face CSS.
  Result: fully self-hosted, one npm install, automatic updates with deps.

  Benefits:
  ✅ Zero manual file management
  ✅ Tree-shakeable (only load what you import)
  ✅ Works with Webpack, Vite, Next.js, Create React App
  ✅ Fonts versioned with your app
*/

// ─────────────────────────────────────────────────────────────────────────────
// IF YOU MUST USE GOOGLE FONTS: Optimize the connection
// ─────────────────────────────────────────────────────────────────────────────
/*
  If you decide to keep Google Fonts, at minimum:

  <!-- Preconnect to warm connections before stylesheet requests them -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- Add display=swap (or optional) -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">

  This saves ~200-300ms by eliminating cold DNS/TCP/TLS for gstatic.com.
*/

/**
 * RECOMMENDATION
 * ──────────────
 *  New projects:    Fontsource (npm) — easiest self-hosting
 *  Performance-critical: Manual self-hosting + preload + subset + aggressive caching
 *  GDPR-sensitive:  Must self-host (no Google Fonts)
 *  Quick prototype: Google Fonts OK temporarily (with preconnect)
 *  Best of all:     System font stack — zero cost, zero privacy risk, instant
 *
 * Self-hosting is almost always worth it:
 *  • ~200-500ms faster on first visit
 *  • Better privacy
 *  • More control
 *  • Works with Service Workers for offline
 *  • Takes ~15 minutes to set up with Fontsource
 */
