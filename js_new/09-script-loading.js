/**
 * Q9. Script loading — defer, async, and module
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE DEFAULT (PARSER-BLOCKING) PROBLEM
 * ──────────────────────────────────────
 * When the HTML parser hits a <script> tag:
 *   1. Parser STOPS
 *   2. Browser downloads the script
 *   3. Script executes
 *   4. Parser resumes
 *
 * Result: a 500 KB bundle on a slow connection = seconds of blank page.
 *
 * THREE LOADING STRATEGIES
 * ────────────────────────
 *
 *  <script src="app.js">           → parser-blocking (synchronous)
 *  <script src="app.js" defer>     → download parallel, execute after HTML parsed
 *  <script src="app.js" async>     → download parallel, execute ASAP (may block)
 *  <script type="module">          → always deferred + strict mode + module scope
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE DIAGRAMS
// ─────────────────────────────────────────────────────────────────────────────
/*

  === Normal ===
  HTML:  ──────── BLOCKED ─────────── resume ───► DOMContentLoaded
  Net:              ↓download↓
  JS:                          execute

  === async ===
  HTML:  ──────────────────────── BLOCKED ── resume ───► DOMContentLoaded
  Net:      ↓download↓
  JS:                  execute (might interrupt HTML parsing)

  === defer ===
  HTML:  ─────────────────────────────────────► DOMContentLoaded
  Net:      ↓download↓ (in parallel)
  JS:                               execute (after HTML, before DOMContentLoaded)

  === module ===
  HTML:  ─────────────────────────────────────► DOMContentLoaded
  Net:      ↓download↓ + ↓imports↓ (in parallel)
  JS:                               execute (same as defer, but after all imports)
*/

// ─────────────────────────────────────────────────────────────────────────────
// defer ATTRIBUTE
// ─────────────────────────────────────────────────────────────────────────────
/*
  <script src="app.js" defer></script>

  Behaviour:
  ✅ Downloads in parallel with HTML parsing (non-blocking)
  ✅ Executes AFTER the full HTML document is parsed
  ✅ Executes IN ORDER if multiple defer scripts (a.js then b.js)
  ✅ Fires before DOMContentLoaded event
  ✅ Safe to access any DOM element (HTML is fully parsed)
  ✅ Best for: main application bundles, libraries that need the DOM

  When NOT to use:
  ❌ Not for inline scripts (ignored if no src)
  ❌ Not for scripts that must run BEFORE DOM is available
*/

// ─────────────────────────────────────────────────────────────────────────────
// async ATTRIBUTE
// ─────────────────────────────────────────────────────────────────────────────
/*
  <script src="analytics.js" async></script>

  Behaviour:
  ✅ Downloads in parallel with HTML parsing (non-blocking download)
  ⚠️  Executes AS SOON AS downloaded — may interrupt HTML parsing
  ⚠️  Order NOT guaranteed — whichever downloads first runs first
  ✅ Best for: truly independent scripts (analytics, ads, chat widgets)
  ✅ Does NOT wait for DOMContentLoaded

  When NOT to use:
  ❌ Scripts that depend on each other (order not preserved)
  ❌ Scripts that need the full DOM (may execute mid-parse)
  ❌ Scripts that reference other scripts (may not be loaded yet)
*/

// ─────────────────────────────────────────────────────────────────────────────
// type="module"
// ─────────────────────────────────────────────────────────────────────────────
/*
  <script type="module" src="app.mjs"></script>

  Behaviour (= defer by default):
  ✅ Always deferred — executes after HTML is fully parsed
  ✅ Downloads in parallel (like defer)
  ✅ Strict mode automatically enabled
  ✅ Module scope — no global pollution
  ✅ ES import/export syntax supported
  ✅ Each module URL is cached — won't be executed twice even if imported twice
  ✅ CORS required for cross-origin modules
  ⚠️  Can add async attribute to get async behaviour: <script type="module" async>

  Inline module:
    <script type="module">
      import { setup } from './setup.mjs';
      setup();
    </script>
    → inline modules are also deferred

  Fallback for old browsers:
    <script type="module" src="modern.mjs"></script>
    <script nomodule src="legacy.js"></script>
    → nomodule is ignored by module-supporting browsers
*/

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON TABLE
// ─────────────────────────────────────────────────────────────────────────────
/*
  Attribute        Download   Execution         Order     DOM safe   Strict
  ──────────────  ──────────  ────────────────  ────────  ─────────  ───────
  (none)           Blocking    Immediately       Yes       Maybe      No
  async            Parallel    ASAP (may block)  No        Maybe      No
  defer            Parallel    After parse       Yes       Yes        No
  type="module"    Parallel    After parse       Yes       Yes        Yes

  Recommendation for modern apps:
  • Main bundles: defer or type="module"
  • Analytics/ads: async
  • Legacy fallback: defer in <head> (with type="module"+ nomodule pair)
*/

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCED: Dynamic imports
// ─────────────────────────────────────────────────────────────────────────────

// On-demand loading — doesn't block anything
async function loadFeature() {
  const { default: Chart } = await import("./chart.js");
  Chart.render("#canvas", data);
}

// Load when user interacts (true laziness)
document.querySelector("#show-map").addEventListener("click", async () => {
  const { initMap } = await import("./maps.js");
  initMap();
});

// ─────────────────────────────────────────────────────────────────────────────
// PRELOADING SCRIPTS (resource hints)
// ─────────────────────────────────────────────────────────────────────────────
/*
  <link rel="preload" href="critical.js" as="script">
  → Downloads ASAP but doesn't execute until the <script> tag is encountered.
  → Use for scripts you know will be needed immediately.

  <link rel="modulepreload" href="app.mjs">
  → Same as preload but also parses the module graph.
*/

/**
 * BEST PRACTICES SUMMARY
 * ──────────────────────
 *  1. Put <script> tags at the end of <body> if you can't use defer/async.
 *  2. Use defer for all app-critical scripts in the <head>.
 *  3. Use async for truly independent 3rd-party scripts (analytics).
 *  4. Use type="module" for modern ESM codebases.
 *  5. Use dynamic import() for route/feature-level code splitting.
 *  6. Pair type="module" + nomodule for progressive enhancement.
 *  7. Preload critical scripts with <link rel="preload" as="script">.
 */

const data = {};
