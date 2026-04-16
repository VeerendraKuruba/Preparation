/**
 * Q19. HTTP/2 multiplexing and what it means for bundling
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HTTP/1.1 PROBLEM: HEAD-OF-LINE BLOCKING
 * ─────────────────────────────────────────
 * In HTTP/1.1:
 *   • One request per TCP connection at a time
 *   • Browsers open 6 parallel connections per origin (workaround)
 *   • Each connection has its own TCP + TLS handshake overhead
 *   • Serving many small files = many round trips = slow
 *
 * This is WHY bundling was invented for HTTP/1.1:
 *   → Bundle 500 JS files into 1 → 1 request instead of 500
 *   → Sprite sheets → 1 image request instead of 50
 *   → Icon fonts → 1 font request instead of individual SVGs
 *
 * HTTP/2 SOLUTION: MULTIPLEXING
 * ─────────────────────────────
 * HTTP/2 sends multiple requests and responses over A SINGLE TCP connection
 * simultaneously, using "streams". No waiting for previous response to finish.
 *
 * Key HTTP/2 features:
 *   • Multiplexing: many requests/responses in parallel over one connection
 *   • Header compression (HPACK): headers sent as binary, compressed
 *   • Stream prioritisation: hint the server which resources matter most
 *   • Server push: server sends resources before they're requested
 *   • Binary framing: more efficient than HTTP/1.1 text protocol
 *   • Single connection per origin: less handshake overhead
 *
 * HTTP/3 (QUIC):
 *   • Built on UDP instead of TCP
 *   • Solves TCP-level head-of-line blocking (HTTP/2 still has this at TCP layer)
 *   • Faster connection setup (0-RTT or 1-RTT for known servers)
 */

// ─────────────────────────────────────────────────────────────────────────────
// WHAT MULTIPLEXING MEANS FOR BUNDLING STRATEGY
// ─────────────────────────────────────────────────────────────────────────────
/*
  HTTP/1.1 optimal strategy:
    → Big bundles (fewer requests is better)
    → Concatenate all JS into one file
    → Sprite all images
    → Inline small files with data URIs

  HTTP/2 optimal strategy:
    → Many small files is OK (multiplexing makes parallel requests cheap)
    → More granular code splitting = better caching granularity
    → Avoid OVER-splitting into tiny chunks (parsing overhead still costs)
    → Each chunk still needs a separate parse/compile step

  Modern RECOMMENDATION (HTTP/2 world):
    → Code split by ROUTE (not one big bundle)
    → Separate vendor chunks (cache long-term)
    → ~10-20 chunks per page is reasonable
    → Avoid hundreds of micro-chunks (too many parallel parse steps)
*/

// ─────────────────────────────────────────────────────────────────────────────
// CACHING BENEFIT OF GRANULAR CHUNKS (the real HTTP/2 win)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Scenario: App with React, Lodash, and your code.

  HTTP/1.1 approach (one bundle):
    bundle.v1.js = React + Lodash + AppCode = 350 KB

    You update one button in AppCode →
    bundle.v2.js = React + Lodash + AppCode = 350 KB (ENTIRE cache busted)
    User must download 350 KB again.

  HTTP/2 approach (split chunks):
    vendor-react.js      = 130 KB  (hash: abc123)  ← rarely changes
    vendor-lodash.js     = 26 KB   (hash: def456)  ← rarely changes
    app.js               = 50 KB   (hash: ghi789)  ← changes often

    You update one button →
    vendor-react.js = still cached ✅ (hash unchanged)
    vendor-lodash.js = still cached ✅
    app.js          = new hash → 50 KB download (only your code)

  User downloads 50 KB instead of 350 KB on updates.
*/

// ─────────────────────────────────────────────────────────────────────────────
// WEBPACK CONFIGURATION FOR HTTP/2 OPTIMAL SPLITTING
// ─────────────────────────────────────────────────────────────────────────────
/*
  // webpack.config.js
  module.exports = {
    optimization: {
      splitChunks: {
        chunks: "all",
        minSize: 20000,           // 20 KB minimum (avoid tiny chunks)
        maxSize: 250000,          // 250 KB maximum (avoid huge chunks)
        minChunks: 1,
        maxAsyncRequests: 30,     // HTTP/2: more parallel requests allowed
        maxInitialRequests: 30,   // same
        cacheGroups: {
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
            name: "vendor-react",
            chunks: "all",
            priority: 30,
          },
          libs: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Separate chunk per large library
              const name = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )[1];
              return `npm.${name.replace("@", "")}`;
            },
            chunks: "all",
            priority: 20,
            minSize: 50000, // only split large libs
          },
        },
      },
    },
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// VITE: AUTOMATIC HTTP/2 AWARE SPLITTING
// ─────────────────────────────────────────────────────────────────────────────
/*
  Vite uses Rollup and is designed for HTTP/2 by default.
  It automatically generates:
    • index.html
    • assets/index.[hash].js         (your app entry)
    • assets/vendor.[hash].js        (node_modules)
    • assets/[route].[hash].js       (per lazy route)
    • assets/[component].[hash].js   (per lazy component)

  Manual control:
  // vite.config.js
  export default {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react":  ["react", "react-dom"],
            "vendor-router": ["react-router-dom"],
            "vendor-ui":     ["@radix-ui/react-dialog", "@radix-ui/react-tooltip"],
          },
        },
      },
    },
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// CHECKING IF YOUR SERVER USES HTTP/2
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools → Network tab:
  • Right-click on a column header → add "Protocol" column
  • Look for "h2" (HTTP/2) or "h3" (HTTP/3)
  • "http/1.1" = still on HTTP/1.1 → bundling more aggressively makes sense

  HTTPS is REQUIRED for HTTP/2 in all browsers.
*/

// ─────────────────────────────────────────────────────────────────────────────
// HTTP/2 ANTI-PATTERNS TO AVOID
// ─────────────────────────────────────────────────────────────────────────────
/*
  ❌ Still using HTTP/1.1 domain sharding (cdn1.example.com, cdn2.example.com)
     → HTTP/1.1 workaround; hurts HTTP/2 (more connections, more overhead)

  ❌ Thousands of tiny chunks (< 5 KB each)
     → HTTP/2 makes round trips cheap but each chunk still has parse overhead

  ❌ No cache-busting hashes in filenames
     → Can't use long-lived caching even with HTTP/2

  ❌ All code in one bundle "because HTTP/2 is fast"
     → Cache busting on every deploy is still expensive for users
*/

/**
 * SUMMARY
 * ───────
 *  HTTP/1.1:  Bundle aggressively to minimise request count.
 *  HTTP/2:    Split smartly for caching granularity; request count is less critical.
 *
 *  The real HTTP/2 win is NOT just parallelism — it's enabling better caching
 *  via granular chunks that don't bust the cache on every deploy.
 *
 *  Rules:
 *  1. Enable HTTP/2 on your server (requires HTTPS).
 *  2. Split vendors from app code (long-term caching of stable libs).
 *  3. Keep chunk count reasonable (10-30 for initial load).
 *  4. Minimum chunk size ~20 KB (avoid micro-chunk overhead).
 *  5. Use content hashing for all asset filenames.
 */
