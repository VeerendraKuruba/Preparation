/**
 * Q11. Tree shaking — what gets eliminated and what silently survives
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS TREE SHAKING?
 * ──────────────────────
 * Tree shaking is dead code elimination performed by module bundlers
 * (Webpack, Rollup, esbuild, Vite). It removes exports that are never imported
 * anywhere in your application.
 *
 * The name comes from "shaking a tree and watching dead leaves fall".
 *
 * REQUIREMENT: ES Modules (static imports)
 * ─────────────────────────────────────────
 * Tree shaking ONLY works with ES module syntax (import/export).
 * It does NOT work with CommonJS (require/module.exports) because:
 *   • require() is dynamic — can be called conditionally at runtime
 *   • Bundlers cannot statically analyse what is "used" vs "unused"
 *   • ES imports are static — analysable at compile time
 */

// ─────────────────────────────────────────────────────────────────────────────
// WHAT GETS ELIMINATED ✅
// ─────────────────────────────────────────────────────────────────────────────

// utils.js — a file with three exports
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; } // ← never imported anywhere

// main.js
import { add, subtract } from "./utils.js";
console.log(add(1, 2), subtract(5, 3));
// → `multiply` is tree-shaken OUT of the bundle ✅

// ─────────────────────────────────────────────────────────────────────────────
// WHAT SILENTLY SURVIVES ❌ (common pitfalls)
// ─────────────────────────────────────────────────────────────────────────────

// 1. SIDE-EFFECT IMPORTS — anything that runs code on import
import "./polyfills.js";          // ← runs immediately, cannot be removed
import "./analytics-init.js";     // ← registers global listeners, never removed

// 2. NAMESPACE IMPORTS — import * pulls everything in
import * as Utils from "./utils.js"; // ← bundler must include ALL exports
const fn = Utils.multiply;           //   even if only .multiply is used

// 3. RE-EXPORTS through barrels (index.js files)
// components/index.js:
//   export { Button } from './Button';
//   export { Modal }  from './Modal';
//   export { Table }  from './Table';
//
// main.js:
//   import { Button } from './components'; // ← may pull in Modal & Table too
//                                            depending on how sideEffects is set

// 4. CommonJS MODULES — require() defeats tree shaking
const lodash = require("lodash");         // ← entire lodash included (70 KB)
const _ = lodash.debounce;               //   even though only debounce is used

// Fix: use ES module version
// import { debounce } from "lodash-es";  // ← only debounce included ✅
// or import directly:
// import debounce from "lodash/debounce"; // ← subpath import ✅

// 5. DYNAMIC requires
const moduleName = condition ? "a" : "b";
// require(moduleName)  ← bundler can't know which one, includes both

// 6. CLASS METHODS — class methods are not tree-shaken individually
class MyService {
  usedMethod()   { return "used"; }
  unusedMethod() { return "never called"; } // stays in bundle (can't tree-shake methods)
}
// Fix: use pure functions instead of class methods where tree-shaking matters

// 7. Object spread re-export
// export default { add, subtract, multiply }; // ← exports as one object, all included

// ─────────────────────────────────────────────────────────────────────────────
// MARKING A PACKAGE AS SIDE-EFFECT FREE
// ─────────────────────────────────────────────────────────────────────────────
/*
  In package.json of a library:

  {
    "sideEffects": false
  }

  → Tells bundlers: "Every file in this package is safe to tree-shake."
  → Without this, bundlers are conservative and keep all imported files.

  Granular (only some files have side effects):
  {
    "sideEffects": ["./src/polyfills.js", "*.css"]
  }

  Your own app's package.json can also declare:
  {
    "sideEffects": ["src/index.css", "src/polyfills.js"]
  }
*/

// ─────────────────────────────────────────────────────────────────────────────
// /*#__PURE__*/ ANNOTATION
// ─────────────────────────────────────────────────────────────────────────────
// Tells the bundler a function call has no side effects → can be tree-shaken

const result1 = /*#__PURE__*/ createSomething(); // safe to remove if unused
// Without the annotation, bundlers assume function calls may have side effects

// ─────────────────────────────────────────────────────────────────────────────
// REAL EXAMPLE: Lodash (the classic tree-shaking failure)
// ─────────────────────────────────────────────────────────────────────────────
/*
  ❌ Includes entire lodash (~70 KB gzipped):
     import _ from 'lodash';
     const result = _.debounce(fn, 300);

  ✅ Only includes debounce (~2 KB):
     import { debounce } from 'lodash-es';

  ✅ Also works (CJS subpath import):
     import debounce from 'lodash/debounce';
*/

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO VERIFY TREE SHAKING IS WORKING
// ─────────────────────────────────────────────────────────────────────────────
/*
  1. webpack-bundle-analyzer:
     • Run: npx webpack-bundle-analyzer stats.json
     • Look for unexpected large modules

  2. source-map-explorer:
     • npx source-map-explorer dist/main.js
     • Shows exact bytes from each source file

  3. Rollup REPL (rollupjs.org/repl):
     • Paste code and see output — easiest way to verify tree-shaking

  4. Build output analysis:
     • vite build --report → generates stats.html
     • CRA: npx cra-bundle-analyzer

  5. Test manually: add a large export that is clearly never used.
     Build and grep the output for a unique string from that export.
*/

/**
 * CHECKLIST FOR EFFECTIVE TREE SHAKING
 * ──────────────────────────────────────
 *  [ ] Use ES module syntax (import/export) everywhere
 *  [ ] Avoid import * namespace imports
 *  [ ] Avoid barrel files that re-export everything in one index.js
 *  [ ] Mark your packages with "sideEffects": false in package.json
 *  [ ] Use lodash-es instead of lodash
 *  [ ] Use named imports from libraries that support them
 *  [ ] Prefer functions over classes for utility code
 *  [ ] Use /*#__PURE__*\/ for constructors/calls the bundler can't analyse
 *  [ ] Verify with bundle analyser before and after
 */

function createSomething() { return {}; }
