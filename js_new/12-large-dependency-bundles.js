/**
 * Q12. The real cost of large dependency bundles
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE HIDDEN COSTS (not just download size)
 * ──────────────────────────────────────────
 * People often focus on transfer size, but a large bundle has 4 distinct costs:
 *
 *  1. DOWNLOAD  — bytes over the wire (mitigated by compression + CDN)
 *  2. PARSE     — browser parses the raw JS text into tokens
 *  3. COMPILE   — V8 compiles JS to bytecode (JIT compilation)
 *  4. EXECUTE   — running the module-level code (side effects, class setup)
 *
 * Parse + Compile + Execute can take 3–5× longer than download on mid-tier
 * mobile devices, because CPU is slower than bandwidth on modern networks.
 *
 * RULE OF THUMB: 1 MB of JS costs ~2–10s of CPU time on a mid-tier phone.
 * Compression helps download, but NOT parse/compile/execute.
 *
 * SIZE BUDGET (Google's recommendation)
 * ───────────────────────────────────────
 *  • Total JS < 300 KB compressed (≈1 MB uncompressed) for most sites
 *  • Initial (above-the-fold) JS < 100 KB compressed
 *  • Route chunk < 30 KB compressed (typical for a single page)
 */

// ─────────────────────────────────────────────────────────────────────────────
// REAL EXAMPLES OF COSTLY DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────
/*
  Library          Minified    Gzipped    Notes
  ─────────────   ──────────  ─────────  ──────────────────────────────────────
  moment.js          329 KB      72 KB   Includes all locales; mostly unused
  lodash (CJS)       72 KB       26 KB   Full version; usually only ~5 fns needed
  lodash-es          72 KB       26 KB   Same size but tree-shakeable
  date-fns (full)    78 KB       14 KB   Tree-shakeable; usually much smaller
  chart.js           194 KB      63 KB   Full charting library
  jquery             87 KB       30 KB   Often unnecessary in modern apps
  rxjs (full)        200 KB      53 KB   Tree-shakeable but easy to pull in too much
  firebase (all)     930 KB     200 KB   Take only what you use (modular API)
*/

// ─────────────────────────────────────────────────────────────────────────────
// COMMON OVER-IMPORT MISTAKES
// ─────────────────────────────────────────────────────────────────────────────

// ❌ Entire moment.js (329 KB) for one date format
import moment from "moment";
const formatted = moment().format("YYYY-MM-DD");

// ✅ native Intl (0 KB) or tiny date library
const formatted2 = new Intl.DateTimeFormat("en-CA").format(new Date());
// or: import { format } from "date-fns"; // ~1 KB for just format

// ─────────────────────────────────────────────────────────────────────────────

// ❌ All of lodash (72 KB) for debounce
import _ from "lodash";
const debouncedFn = _.debounce(handleInput, 300);

// ✅ Just the function (~2 KB)
import debounce from "lodash/debounce";
// or write your own (debounce is 12 lines)
function debounceOwn(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─────────────────────────────────────────────────────────────────────────────

// ❌ Entire icons pack (Heroicons full) — hundreds of SVGs
// import { HomeIcon } from "@heroicons/react/outline"; // pulls in all icons

// ✅ Direct path import (only one SVG)
// import HomeIcon from "@heroicons/react/outline/HomeIcon";

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSE WHAT'S IN YOUR BUNDLE
// ─────────────────────────────────────────────────────────────────────────────
/*
  1. bundlephobia.com — check any npm package's size before installing
     → Shows: minified, gzipped, download time, and treeshaken size
     → "Similar packages" section shows lighter alternatives

  2. source-map-explorer (most accurate):
     npx source-map-explorer dist/static/js/*.js

  3. webpack-bundle-analyzer:
     npm install --save-dev webpack-bundle-analyzer
     // webpack.config.js:
     const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
     plugins: [new BundleAnalyzerPlugin()]

  4. Vite:
     vite build --report   → generates dist/stats.html

  5. Next.js:
     npm install @next/bundle-analyzer
     ANALYZE=true npm run build
*/

// ─────────────────────────────────────────────────────────────────────────────
// ALTERNATIVES TO HEAVY LIBRARIES
// ─────────────────────────────────────────────────────────────────────────────
/*
  Instead of…          Use…                      Savings
  ─────────────────   ─────────────────────────  ────────
  moment.js           date-fns / dayjs / Intl    -300 KB
  lodash (full)       lodash-es + tree shaking   -60 KB
  jquery              Vanilla JS / DOM API       -87 KB
  axios               fetch() (native)           -14 KB
  chart.js (full)     uPlot / lightweight-charts -130 KB
  react + 2 libs      Preact + compat            -100 KB
  font-awesome CSS    inline SVG icons           -150 KB
  animate.css         CSS transitions (custom)   -70 KB
*/

// ─────────────────────────────────────────────────────────────────────────────
// MEASURING PARSE/COMPILE COST (not just size)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools:
  1. Performance tab → start recording → reload page
  2. Look at the flame chart: yellow = Script Evaluation, blue = Parse
  3. The "Scripting" time in the summary shows parse + compile + execute

  V8 coverage:
  DevTools → Coverage tab → reload → shows unused JS bytes per file
  → Anything unused after load is a candidate for lazy loading
*/

// ─────────────────────────────────────────────────────────────────────────────
// DIFFERENTIAL LOADING (modern vs legacy bundles)
// ─────────────────────────────────────────────────────────────────────────────
/*
  <script type="module" src="modern.js"></script>      <!-- ES2020, no polyfills -->
  <script nomodule      src="legacy.js"></script>      <!-- ES5, with polyfills -->

  Modern browsers download modern.js (smaller, no babel transforms).
  IE/old browsers download legacy.js.
  This alone saves 15-20% bundle size for modern users.
*/

/**
 * KEY TAKEAWAYS
 * ─────────────
 *  1. Always check bundlephobia.com before adding a dependency.
 *  2. The real cost = download + parse + compile + execute (not just size).
 *  3. 1 MB of JS takes 3–10s on a mid-tier phone (2024 stats).
 *  4. Prefer small focused libraries over monoliths.
 *  5. Prefer native browser APIs over polyfills/wrappers when possible.
 *  6. Code split libraries only used on certain routes.
 *  7. Audit your bundle regularly with bundle analyzer.
 */

function handleInput() {}
