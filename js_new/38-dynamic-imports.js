/**
 * Q38. Dynamic imports without creating too many small chunks
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE GOLDILOCKS PROBLEM
 * ───────────────────────
 * Too few chunks → users download code they don't need
 * Too many chunks → HTTP overhead, many parse steps, waterfall delays
 * Just right     → major routes split, tiny utilities merged
 *
 * WHY TOO MANY CHUNKS IS A PROBLEM (even on HTTP/2)
 * ───────────────────────────────────────────────────
 * Each chunk has:
 *   • A separate HTTP request (even with multiplexing, there's overhead)
 *   • A separate V8 parse + compile step
 *   • A separate entry in the browser's module cache
 *   • A separate cache entry that must be checked on each visit
 *
 * 500 micro-chunks of 2 KB each is worse than 10 chunks of 100 KB each,
 * even on HTTP/2. Parse overhead accumulates.
 *
 * MINIMUM CHUNK SIZE: ~20 KB (Webpack's default)
 * MAXIMUM CHUNK SIZE: ~250 KB (before considering further splitting)
 * INITIAL CHUNKS: aim for < 10-20 for most apps
 */

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC IMPORT BASICS
// ─────────────────────────────────────────────────────────────────────────────

// Each dynamic import() = one new chunk in the bundle
const SettingsPage  = () => import("./pages/Settings");       // good split
const HeavyChart    = () => import("./components/HeavyChart"); // good split
const TinyHelper    = () => import("./utils/tiny-helper");     // BAD — 2 KB chunk

// ─────────────────────────────────────────────────────────────────────────────
// GROUPING SMALL CHUNKS WITH WEBPACK MAGIC COMMENTS
// ─────────────────────────────────────────────────────────────────────────────

// webpackChunkName groups imports into ONE chunk
const SettingsBundle = {
  Main:        () => import(/* webpackChunkName: "settings" */ "./pages/Settings/Main"),
  Privacy:     () => import(/* webpackChunkName: "settings" */ "./pages/Settings/Privacy"),
  Billing:     () => import(/* webpackChunkName: "settings" */ "./pages/Settings/Billing"),
  // → All three become ONE chunk: settings.abc123.js (not 3 separate files)
};

// webpackPrefetch: starts loading in browser idle time (for future navigation)
const NextPage = () => import(
  /* webpackChunkName: "next-page", webpackPrefetch: true */
  "./pages/NextPage"
);

// webpackPreload: loads in parallel with the current chunk (for same-page needs)
const CriticalModal = () => import(
  /* webpackChunkName: "modal", webpackPreload: true */
  "./components/Modal"
);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE-BASED SPLITTING (correct granularity)
// ─────────────────────────────────────────────────────────────────────────────
import { lazy, Suspense } from "react";

// ✅ Split at route level — each route is a meaningful chunk
const Home         = lazy(() => import("./pages/Home"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const UserProfile  = lazy(() => import("./pages/UserProfile"));
const AdminPanel   = lazy(() => import("./pages/AdminPanel"));

// ✅ Group small utility pages into one chunk
const LegalPages = {
  Privacy:  lazy(() => import(/* webpackChunkName: "legal" */ "./pages/Privacy")),
  Terms:    lazy(() => import(/* webpackChunkName: "legal" */ "./pages/Terms")),
  Cookies:  lazy(() => import(/* webpackChunkName: "legal" */ "./pages/Cookies")),
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT-LEVEL SPLITTING (only for heavy components)
// ─────────────────────────────────────────────────────────────────────────────

// ✅ Split only components that are genuinely heavy (> 30 KB)
const PdfViewer     = lazy(() => import("./components/PdfViewer"));     // ~150 KB
const RichTextEditor = lazy(() => import("./components/RichTextEditor")); // ~200 KB
const CodeEditor    = lazy(() => import("./components/CodeEditor"));    // ~300 KB

// ❌ DON'T split every small component
// const Button = lazy(() => import('./components/Button')); // 3 KB = pointless overhead
// const Icon   = lazy(() => import('./components/Icon'));   // 1 KB = pointless overhead

// ─────────────────────────────────────────────────────────────────────────────
// WEBPACK splitChunks CONFIGURATION (the right balance)
// ─────────────────────────────────────────────────────────────────────────────
/*
  // webpack.config.js (production)
  module.exports = {
    optimization: {
      splitChunks: {
        chunks: "all",

        // Minimum size for a chunk to be created (don't create tiny chunks)
        minSize: 20000,          // 20 KB — below this, merge into parent chunk

        // Maximum size for a chunk (split if above this)
        maxSize: 244000,         // ~244 KB — split into smaller pieces

        // Minimum number of chunks that share the module before it gets its own chunk
        minChunks: 1,

        // Maximum parallel requests for initial page load
        maxInitialRequests: 30,  // HTTP/2: allow more parallel requests

        // Maximum parallel requests for a single dynamic import
        maxAsyncRequests: 30,

        cacheGroups: {
          // Everything in node_modules
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
            name(module) {
              // Group packages by name for better caching
              const match = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              const name  = match ? match[1].replace("@", "") : "vendor";
              return `vendor.${name}`;
            },
          },

          // React specifically (stable, cache separately)
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: "vendor.react",
            chunks: "all",
            priority: 20,
          },

          default: {
            minChunks: 2,          // if shared by 2+ chunks, extract it
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    },
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// VITE MANUAL CHUNKS
// ─────────────────────────────────────────────────────────────────────────────
/*
  // vite.config.js
  export default {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Group React into one vendor chunk
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
              return "vendor-react";
            }
            // Group other large libraries
            if (id.includes("node_modules/recharts")) return "vendor-charts";
            if (id.includes("node_modules/@radix-ui")) return "vendor-radix";
            // Everything else in node_modules → one vendors chunk
            if (id.includes("node_modules")) return "vendor";
          },
        },
      },
    },
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// DETECTING CHUNK SIZE ISSUES
// ─────────────────────────────────────────────────────────────────────────────
/*
  Too many chunks: DevTools Network tab shows 50+ JS requests on first load
  Too large chunks: Lighthouse "Reduce JS payload" > 250 KB warning

  Webpack stats:
  "chunkGroups": {
    "main": { "assets": [{ "name": "main.abc.js", "size": 1500000 }] }  ← too big
  }

  vite build output:
  dist/assets/index-abc123.js       1,200 kB  ← too big
  dist/assets/vendor-react.js         130 kB  ✅
  dist/assets/dashboard-def456.js      45 kB  ✅
*/

/**
 * CHUNK SIZING GUIDELINES
 * ─────────────────────────
 *  Initial chunks (loaded on first page):
 *    • Core vendor (React, router): ~130 KB compressed
 *    • App shell / layout:          < 50 KB
 *    • Total initial JS:            < 200 KB compressed
 *
 *  Async chunks (lazy loaded routes/features):
 *    • Per route: ~10-100 KB compressed (average 30 KB)
 *    • Large component: up to 150 KB (PDF viewer, code editor)
 *
 *  Do NOT split into chunks smaller than ~10 KB (HTTP + parse overhead not worth it)
 *  Use webpackChunkName to group related small files into one chunk
 */
