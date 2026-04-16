/**
 * Q37. Bundle analysis with source-map-explorer and webpack-bundle-analyzer
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY ANALYSE YOUR BUNDLE?
 * ─────────────────────────
 * Before optimising, you need to know WHAT is large and WHY.
 * Bundle analysis tools answer:
 *   • Which module/library takes the most space?
 *   • Is there duplicate code (same lib, different versions)?
 *   • Which route/component contributes the most?
 *   • Is tree-shaking working? (are unused exports still present?)
 *   • Are there unexpected large transitive dependencies?
 */

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 1: source-map-explorer
// ─────────────────────────────────────────────────────────────────────────────
/*
  What it does:
  • Reads your production bundle AND its source map
  • Shows exactly which SOURCE FILE contributed how many bytes
  • Treemap visualisation: large blocks = large source files

  Installation and usage:
  ──────────────────────
  npm install --save-dev source-map-explorer

  # Add to package.json scripts:
  "analyze": "source-map-explorer 'build/static/js/*.js'"

  # Run:
  npm run build    # First build with source maps enabled
  npm run analyze  # Open treemap in browser

  Source maps required:
  CRA:     GENERATE_SOURCEMAP=true npm run build (default in CRA)
  Vite:    vite build --sourcemap
  Webpack: devtool: 'source-map' in webpack.config.js (production)

  READING THE TREEMAP:
  • Each rectangle = one source file
  • Rectangle size = bytes it contributes to the bundle
  • Hover to see: file path, size, percentage of total
  • Nested structure = directory hierarchy

  RED FLAGS to look for:
  ❌ node_modules/moment → entire moment.js (300 KB)
  ❌ node_modules/lodash → entire lodash (70 KB) — should be tree-shaken
  ❌ Duplicate: react-dom appearing twice (different versions)
  ❌ Test files (*.test.js, *.spec.js) in production bundle
  ❌ Source maps or dev tooling code in production
  ❌ Any module larger than your entire app code (balance is wrong)
*/

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 2: webpack-bundle-analyzer
// ─────────────────────────────────────────────────────────────────────────────
/*
  What it does:
  • Interactive zoomable treemap
  • Shows chunks (files outputted by webpack), not just source files
  • Can view: stat size (raw), parsed size (after minification), gzip size

  Installation and usage:
  ──────────────────────
  npm install --save-dev webpack-bundle-analyzer

  # In webpack.config.js:
  const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

  module.exports = {
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',      // 'server' (auto-open) or 'static' (HTML file)
        reportFilename: 'bundle-report.html',
        openAnalyzer: false,
        generateStatsFile: true,
        statsFilename: 'stats.json',
      }),
    ],
  };

  # For Create React App (no eject):
  npm install --save-dev cra-bundle-analyzer
  npx cra-bundle-analyzer

  # For Next.js:
  npm install --save-dev @next/bundle-analyzer
  // next.config.js:
  const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
  module.exports = withBundleAnalyzer({});
  // Run: ANALYZE=true npm run build

  # For Vite:
  npm install --save-dev rollup-plugin-visualizer
  // vite.config.js:
  import { visualizer } from 'rollup-plugin-visualizer';
  export default { plugins: [visualizer({ open: true, gzipSize: true })] };

  WHAT TO LOOK FOR:
  • "stat" size vs "gzip" size — compression ratio reveals redundancy
  • Click into chunks → see what's inside each lazy chunk
  • Large chunks: consider splitting further
  • Tiny chunks: consider merging (HTTP overhead)
  • Duplicate modules: same module appearing in multiple chunks
*/

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 3: bundlephobia.com (pre-install research)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Before adding a dependency, check its cost:
  bundlephobia.com/package/moment@2.29.4

  Shows:
  • Minified + Gzipped size
  • Download time (4G, 3G estimates)
  • Whether package is tree-shakeable
  • Similar packages that are smaller
  • Export map (named exports for tree shaking)
  • Historical size trend (is it growing?)

  Use for: evaluating alternatives before choosing a library
*/

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 4: depcheck (find unused dependencies)
// ─────────────────────────────────────────────────────────────────────────────
/*
  npx depcheck

  Shows:
  • Unused dependencies (installed but never imported)
  • Missing dependencies (used but not in package.json)

  Action: uninstall unused packages:
  npm uninstall moment lodash some-old-library
*/

// ─────────────────────────────────────────────────────────────────────────────
// OPTIMISATION WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
/*
  1. Build production bundle:
     npm run build

  2. Analyse with source-map-explorer or webpack-bundle-analyzer:
     npm run analyze

  3. Identify the top 3 largest items (usually node_modules)

  4. For each large item, investigate:
     a. Is it fully used? Check with DevTools Coverage tab
     b. Can it be replaced by a smaller alternative? (bundlephobia)
     c. Can it be tree-shaken? (use named imports, lodash-es, etc.)
     d. Can it be code-split? (lazy import for routes that need it)
     e. Can it be removed entirely? (use native browser APIs)

  5. Make ONE change at a time → rebuild → re-analyse → measure savings

  6. Repeat until initial bundle is under target (< 150 KB compressed)
*/

// ─────────────────────────────────────────────────────────────────────────────
// COMMON FINDINGS AND FIXES
// ─────────────────────────────────────────────────────────────────────────────
/*
  Finding                         Fix
  ─────────────────────────────  ──────────────────────────────────────────────
  moment.js (300 KB)              Replace with date-fns or native Intl (-280 KB)
  lodash (full, 70 KB)            Use lodash-es + named imports or write own (-60 KB)
  chart.js (all types, 194 KB)    Import only needed chart types (-100 KB)
  Both old + new react version    npm dedupe or audit peerDependencies (-50 KB)
  Test files in bundle            Check include/exclude in webpack config (-?? KB)
  All i18n locales (moment)       Webpack IgnorePlugin to exclude locales (-100 KB)
  firebase (all services)         Use modular API, import only used services (-200 KB)
  Large image assets in bundle    Move to public folder or CDN (not in JS)
  Polyfills for modern browsers   differential serving (type=module/nomodule) (-30 KB)
*/

// Example: Excluding moment locales with Webpack
/*
  const webpack = require('webpack');
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
  ],
  // Then manually import only needed locales:
  import 'moment/locale/en-gb';
*/

/**
 * QUICK START COMMANDS
 * ──────────────────────
 *  # source-map-explorer (CRA / Vite)
 *  npx source-map-explorer 'build/static/js/*.js'
 *
 *  # Next.js
 *  ANALYZE=true npx next build
 *
 *  # Vite
 *  vite build (with rollup-plugin-visualizer in plugins)
 *
 *  # Check a package before installing
 *  open https://bundlephobia.com/package/[package-name]
 *
 *  # Find unused deps
 *  npx depcheck
 *
 *  # npm deduplicate (after resolving conflicts)
 *  npm dedupe
 */
