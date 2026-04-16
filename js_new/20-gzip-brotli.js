/**
 * Q20. Gzip vs Brotli and where each is applied
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS COMPRESSION?
 * ──────────────────────
 * HTTP compression reduces the byte size of text-based responses
 * (HTML, CSS, JavaScript, JSON, SVG) before sending them over the wire.
 * The browser decompresses them transparently.
 *
 * Only compresses TEXT. Binary formats (JPEG, PNG, WebP, WOFF2)
 * are already compressed internally — HTTP compression won't help them.
 *
 * HOW IT WORKS
 * ─────────────
 * 1. Browser sends: Accept-Encoding: gzip, deflate, br
 * 2. Server compresses and responds: Content-Encoding: br (or gzip)
 * 3. Browser decompresses transparently
 *
 * GZIP vs BROTLI COMPARISON
 * ──────────────────────────
 *
 *  Property          Gzip                   Brotli (br)
 *  ───────────────  ─────────────────────  ─────────────────────────────
 *  Introduced        1992 (RFC 1952)         2015 (Google)
 *  Browser support   All browsers (99.9%)   Chrome 49+, Firefox 44+, Safari 11+
 *                                            (all modern browsers)
 *  Compression ratio ~60-70% savings        ~15-25% better than gzip
 *  Speed (compress)  Fast                   Slow at high levels (for static)
 *  Speed (decompress) Fast                  Same or slightly faster than gzip
 *  Levels            1-9                    0-11
 *  Ideal for         Dynamic responses      Static files
 *  CDN support       Universal              Major CDNs (Cloudflare, AWS, Fastly)
 *
 * REAL-WORLD SIZE SAVINGS
 * ────────────────────────
 *  Angular app bundle (uncompressed: 1.1 MB)
 *    gzip level 6:   ~220 KB  (80% reduction)
 *    brotli level 11: ~190 KB  (83% reduction = ~15% smaller than gzip)
 *
 *  React (react + react-dom, uncompressed: 330 KB)
 *    gzip:    ~103 KB
 *    brotli:  ~88 KB
 */

// ─────────────────────────────────────────────────────────────────────────────
// WHERE EACH IS APPLIED
// ─────────────────────────────────────────────────────────────────────────────

// STATIC FILES (pre-compressed at build time)
// ────────────────────────────────────────────
/*
  Pre-compress static assets at build time for maximum compression.
  Brotli level 11 is very slow but produces the smallest files.
  Since files are compressed once and served many times, the slow
  compression is worth it.

  Build-time compression (Webpack):
  ───────────────────────────────────
  const CompressionPlugin = require("compression-webpack-plugin");
  const zlib = require("zlib");

  plugins: [
    // Gzip (compatibility fallback)
    new CompressionPlugin({
      filename: "[path][base].gz",
      algorithm: "gzip",
      test: /\.(js|css|html|svg|json)$/,
      threshold: 10240,   // only compress files > 10 KB
      minRatio: 0.8,      // only if compression reduces size by 20%+
    }),

    // Brotli (preferred)
    new CompressionPlugin({
      filename: "[path][base].br",
      algorithm: "brotliCompress",
      test: /\.(js|css|html|svg|json)$/,
      compressionOptions: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } },
      threshold: 10240,
      minRatio: 0.8,
    }),
  ]

  Vite (vite-plugin-compression):
  ─────────────────────────────────
  import viteCompression from 'vite-plugin-compression';
  plugins: [
    viteCompression({ algorithm: 'brotliCompress' }),
    viteCompression({ algorithm: 'gzip' }),
  ]
*/

// DYNAMIC RESPONSES (compressed at request time by server/CDN)
// ────────────────────────────────────────────────────────────
/*
  For server-generated responses (SSR HTML, API responses, dynamic JSON),
  compression happens per-request. Use a lower Brotli level for speed:

  Node.js / Express:
  ──────────────────
  const compression = require("compression");

  app.use(compression({
    // gzip for dynamic content (fast compression)
    level: 6,        // gzip level 6: good balance of speed vs size
    threshold: 1024, // min 1 KB to compress
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }));

  // For Brotli on dynamic content (Node 10.16+):
  const zlib = require("zlib");
  const { promisify } = require("util");
  const brotliCompress = promisify(zlib.brotliCompress);

  app.get("/api/data", async (req, res) => {
    const acceptEncoding = req.headers["accept-encoding"] ?? "";
    const data = JSON.stringify(await getData());

    if (acceptEncoding.includes("br")) {
      const compressed = await brotliCompress(Buffer.from(data), {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }, // fast for dynamic
      });
      res.set({ "Content-Encoding": "br", "Content-Type": "application/json" });
      res.send(compressed);
    } else if (acceptEncoding.includes("gzip")) {
      res.set("Content-Encoding", "gzip");
      res.send(zlib.gzipSync(data, { level: 6 }));
    } else {
      res.json(data);
    }
  });
*/

// NGINX CONFIGURATION
// ────────────────────
/*
  # Serve pre-compressed static files (Brotli preferred, gzip fallback)
  # Requires: ngx_http_brotli_static_module

  gzip on;
  gzip_static on;       # serve .gz files if they exist
  gzip_types text/plain text/css application/json application/javascript
             text/xml application/xml application/xml+rss text/javascript;
  gzip_comp_level 6;
  gzip_min_length 256;
  gzip_vary on;

  brotli on;
  brotli_static on;     # serve .br files if they exist
  brotli_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript;
  brotli_comp_level 6;

  # The server checks for file.br first, then file.gz, then file (raw)
*/

// CDN CONFIGURATION
// ──────────────────
/*
  Most CDNs handle compression automatically:

  Cloudflare:
    • Gzip: always enabled
    • Brotli: enabled for all visitors on HTTPS (from 2019)
    • Speed → Optimization → check "Brotli" (free tier)

  AWS CloudFront:
    • Compress Objects Automatically: enable in cache behavior
    • Supports both gzip and Brotli (Brotli since 2022)
    • Requires: Viewer Protocol Policy = HTTPS only

  Vercel:
    • Brotli enabled by default for all static assets

  Netlify:
    • Gzip and Brotli enabled by default
*/

// ─────────────────────────────────────────────────────────────────────────────
// CHECKING COMPRESSION IN DEVTOOLS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools → Network tab:
    1. Click on a resource
    2. Headers → Response Headers:
       Content-Encoding: br    (Brotli ✅)
       Content-Encoding: gzip  (Gzip ✅)
       (nothing)               (uncompressed ❌)

  Network panel column:
    • "Size" = compressed (over wire) / uncompressed
    • e.g., "45.2 kB / 180 kB" = 75% savings

  Lighthouse:
    • "Enable text compression" audit fires if assets aren't compressed
*/

/**
 * DECISION GUIDE
 * ──────────────
 *
 *  Content Type          Recommendation
 *  ─────────────────────────────────────────────────────────────────
 *  Static JS/CSS/HTML    Pre-compressed Brotli level 11 + gzip fallback
 *  Dynamic SSR HTML      Brotli level 4-6 or gzip level 6
 *  API JSON responses    Brotli level 4 (fast) or gzip level 6
 *  Images (JPEG/PNG)     Skip (already compressed)
 *  WOFF2 fonts           Skip (already compressed)
 *  WebP/AVIF             Skip (already compressed)
 *
 *  Always provide gzip as a fallback for environments that don't support Brotli.
 *  Both can coexist: pre-build .br and .gz versions and serve based on Accept-Encoding.
 *
 * KEY NUMBERS
 * ───────────
 *  Brotli saves ~15-25% more bytes than gzip.
 *  On a 500 KB bundle: Brotli ≈ 90 KB, gzip ≈ 105 KB → saves 15 KB per user visit.
 *  On 1M page views → saves 15 GB of bandwidth (not trivial for CDN cost).
 */
