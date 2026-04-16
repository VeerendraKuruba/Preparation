/**
 * Q40. Measuring build performance and keeping CI fast
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY BUILD PERFORMANCE MATTERS
 * ──────────────────────────────
 * Slow builds cost engineering productivity:
 *   • 5-minute build × 50 engineers × 10 builds/day = 41+ engineer-hours/day wasted
 *   • Slow CI → PR feedback delayed → slower iteration cycles
 *   • Developer experience degrades → engineers avoid running tests/builds
 *
 * TARGET BUILD TIMES (rough guidelines)
 * ──────────────────────────────────────
 *   Dev server start:    < 5s  (HMR / hot module replacement for changes < 100ms)
 *   Production build:    < 60s for medium apps, < 5min for large apps
 *   CI full pipeline:    < 10 min (including lint, type-check, tests, build)
 *   Unit tests:          < 30s for small suites, < 3min for large suites
 */

// ─────────────────────────────────────────────────────────────────────────────
// MEASURING BUILD PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

// 1. Simple timing
/*
  time npm run build
  → shows real, user, sys time

  # npm has built-in timing:
  npm run build --timing
  → creates .npm-debug.log with timing for each plugin
*/

// 2. Webpack build profiling
/*
  // webpack.config.js
  module.exports = {
    profile: true,      // record module timing data
    stats: {
      modules: true,
      reasons: true,     // why each module was included
    },
  };

  # Generate stats file:
  webpack --profile --json > stats.json

  # Analyse:
  npx webpack-bundle-analyzer stats.json
  # or upload to: webpack.github.io/analyse/
*/

// 3. Vite build analysis
/*
  vite build --debug      → verbose timing output in terminal
  vite build --profile    → flamegraph via 0x profiler

  vite.config.js:
  export default {
    build: {
      reportCompressedSize: false,  // skip gzip estimation (saves time)
    },
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// FASTER BUILDS: TOOL CHOICES
// ─────────────────────────────────────────────────────────────────────────────
/*
  THE TRANSFORMER STACK MATTERS MOST:

  Old stack (slow):
    Webpack + Babel + ts-loader + CSS Modules + PostCSS
    → Build time: 3-8 minutes for medium apps

  New stack (fast):
    Vite + esbuild (transpiler) + Rollup (bundler)
    → Dev start: < 1s, Build: 20-60s for same app

  Even faster:
    Turbopack (Vercel, still maturing) — Rust-based
    Farm (Rust-based bundler)
    Rspack (Rust-based webpack-compatible)

  Key insight: moving transpilation to native code (Rust/Go):
    Babel (JS):    ~1000 files/sec
    esbuild (Go):  ~100,000 files/sec   ← 100× faster
    SWC (Rust):    ~50,000 files/sec

  Migrate from Babel to SWC/esbuild:
    CRA:   SKIP_PREFLIGHT_CHECK=true npx react-scripts build  (not great)
           Better: migrate to Vite
    Next:  uses SWC by default since Next 12
    Vite:  uses esbuild by default
*/

// ─────────────────────────────────────────────────────────────────────────────
// CACHING: BIGGEST WIN FOR CI SPEED
// ─────────────────────────────────────────────────────────────────────────────
/*
  Cache levels in CI:
  1. node_modules cache (most impactful — saves 2-5 min per run)
  2. Build cache (webpack/babel/SWC/TypeScript incremental)
  3. Docker layer cache
  4. Test result cache (Jest --ci --cache)

  GitHub Actions example:
  ─────────────────────────
  - name: Cache node_modules
    uses: actions/cache@v3
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      restore-keys: ${{ runner.os }}-node-

  - name: Cache Next.js build
    uses: actions/cache@v3
    with:
      path: |
        ~/.npm
        ${{ github.workspace }}/.next/cache
      key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**.[jt]s', '**.[jt]sx') }}
      restore-keys: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-

  - name: Cache webpack
    uses: actions/cache@v3
    with:
      path: .webpack-cache
      key: ${{ runner.os }}-webpack-${{ hashFiles('**/package-lock.json') }}

  Webpack persistent cache (filesystem cache):
  ─────────────────────────────────────────────
  // webpack.config.js
  module.exports = {
    cache: {
      type: "filesystem",           // cache to disk (not just memory)
      buildDependencies: {
        config: [__filename],       // invalidate when webpack.config changes
      },
      cacheDirectory: path.resolve(__dirname, ".webpack-cache"),
    },
  };
  → First build: normal. Subsequent builds: MUCH faster (only rebuilds changed files).

  TypeScript incremental compilation:
  ─────────────────────────────────────
  // tsconfig.json
  {
    "compilerOptions": {
      "incremental": true,
      "tsBuildInfoFile": ".tsbuildinfo"   // cache file to persist across builds
    }
  }
  → TypeScript only rechecks changed files.

  Babel cache:
  ─────────────────────────────────────
  BABEL_ENV=production babel --cache-path .babel-cache src/
  → Babel caches per-file. CI must persist .babel-cache across runs.
*/

// ─────────────────────────────────────────────────────────────────────────────
// PARALLELIZATION (run things in parallel, not sequence)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Sequential (slow):
    lint → type-check → test → build
    10min total

  Parallel (fast):
    lint ─────────┐
    type-check ───┤→ all finish at ~4min → build
    test ─────────┘
    Total: ~5min

  GitHub Actions:
  jobs:
    lint:
      runs-on: ubuntu-latest
      steps: ...
    typecheck:
      runs-on: ubuntu-latest
      steps: ...
    test:
      runs-on: ubuntu-latest
      steps: ...
    build:
      needs: [lint, typecheck, test]   ← only depends on all three passing
      runs-on: ubuntu-latest
      steps: ...

  Jest: parallel tests
    jest --maxWorkers=4  (or use % of CPU: --maxWorkers=50%)
    → Jest runs test files in parallel across workers

  ESLint: parallel linting
    npm install eslint-parallel
    eslint-parallel --workers 4 "src/**/*.ts"
*/

// ─────────────────────────────────────────────────────────────────────────────
// TURBOREPO / NX: SMART CACHING IN MONOREPOS
// ─────────────────────────────────────────────────────────────────────────────
/*
  In a monorepo with 20 packages, you don't need to rebuild ALL packages
  when only one changed.

  Turborepo:
  ─────────────
  npm install turbo

  // turbo.json
  {
    "pipeline": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["dist/**"]
      },
      "test": {
        "dependsOn": ["build"]
      },
      "lint": {}
    }
  }

  npx turbo run build test lint

  → Turborepo:
    1. Hashes all inputs for each task
    2. If hash matches → skip (use cache) ← "remote caching" saves hours
    3. If hash changed → run task
    4. Cache can be shared in Vercel Remote Cache (team-wide)

  Result:
    First run: 15 minutes
    Second run (no changes): 3 seconds (all cache hits!)
    PR that changed 1 package: builds/tests only the affected package + dependents
*/

// ─────────────────────────────────────────────────────────────────────────────
// PRUNING WHAT RUNS IN CI
// ─────────────────────────────────────────────────────────────────────────────
/*
  Not every commit needs the full pipeline:

  GitHub Actions: path filtering
  ─────────────────────────────────
  on:
    push:
      branches: [main]
      paths:
        - "src/**"
        - "package*.json"
        - ".github/workflows/**"
    # Skip build if only docs/* changed

  Skip expensive checks for draft PRs:
  if: github.event.pull_request.draft == false

  Lightweight pre-push hooks vs full CI:
    Pre-push: lint + type-check + related tests  (< 30s locally)
    CI: full lint + type-check + all tests + build + e2e  (full pipeline)
*/

// ─────────────────────────────────────────────────────────────────────────────
// BUILD PERFORMANCE MONITORING
// ─────────────────────────────────────────────────────────────────────────────
/*
  Track build time trends over time:
  • GitHub Actions: build time is shown in CI logs
  • Vercel/Netlify: build time in deployment dashboard

  Set up alerts:
  • If CI time exceeds X minutes → fail/notify (build regression)
  • Track P50/P95 build times per week

  Regular audits:
  • Check for unused devDependencies: npx depcheck
  • Check for unnecessarily complex webpack plugins
  • Profile slow Jest tests: jest --verbose --testTimeout=5000
    → Any test taking > 5s is a candidate for optimization
  • Identify largest test files: jest --listTests | xargs wc -l | sort -rn
*/

/**
 * BUILD PERFORMANCE CHECKLIST
 * ────────────────────────────
 *  [ ] Use Vite / esbuild / SWC instead of Webpack + Babel where possible
 *  [ ] Enable webpack filesystem cache (cache: { type: 'filesystem' })
 *  [ ] Enable TypeScript incremental compilation
 *  [ ] Cache node_modules in CI (keyed on package-lock.json hash)
 *  [ ] Run lint / typecheck / tests in parallel in CI
 *  [ ] Use Turborepo/Nx for monorepos (task-level caching)
 *  [ ] Skip CI for non-code changes (path filtering)
 *  [ ] Profile build with --profile flag periodically
 *  [ ] Remove unused devDependencies (npx depcheck)
 *  [ ] Use Jest --cache and persist cache in CI
 */
