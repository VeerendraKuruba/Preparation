/**
 * Q39. Module federation for sharing code across micro-frontends
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS MODULE FEDERATION?
 * ───────────────────────────
 * Module Federation (introduced in Webpack 5) is a mechanism that allows
 * one JavaScript application to dynamically load code from another application
 * AT RUNTIME — without build-time coupling.
 *
 * Think of it as: "npm packages, but served live from running applications."
 *
 * USE CASE: Micro-Frontends
 * ──────────────────────────
 * Large organisations split their frontend into independent applications:
 *   • Shell app (navigation, authentication, routing)
 *   • checkout-mfe (team A owns /checkout)
 *   • product-mfe  (team B owns /products)
 *   • account-mfe  (team C owns /account)
 *
 * Each team deploys independently, on their own schedule.
 * Module Federation wires them together into one seamless user experience.
 *
 * TERMINOLOGY
 * ────────────
 *  HOST (shell):    App that loads and uses remote modules (consumer)
 *  REMOTE:          App that exposes modules to be consumed (producer)
 *  SHARED:          Modules shared between host and remotes (e.g., React)
 *                   Prevents loading React 3× if 3 MFEs use it
 */

// ─────────────────────────────────────────────────────────────────────────────
// BASIC SETUP
// ─────────────────────────────────────────────────────────────────────────────

/*
  === REMOTE APP (e.g., products-mfe) — webpack.config.js ===
  const { ModuleFederationPlugin } = require('webpack').container;

  module.exports = {
    plugins: [
      new ModuleFederationPlugin({
        name: "productsMFE",          // unique name for this remote

        filename: "remoteEntry.js",   // manifest file (how host discovers modules)

        exposes: {
          "./ProductCard":  "./src/components/ProductCard",
          "./ProductList":  "./src/components/ProductList",
          "./useProducts":  "./src/hooks/useProducts",
        },

        shared: {
          react: {
            singleton: true,    // only ONE instance of React across all MFEs
            requiredVersion: "^18.0.0",
          },
          "react-dom": {
            singleton: true,
            requiredVersion: "^18.0.0",
          },
        },
      }),
    ],
  };

  // This produces: http://products.example.com/remoteEntry.js
  // Which contains the "module registry" for this remote.
*/

/*
  === HOST APP (shell) — webpack.config.js ===
  const { ModuleFederationPlugin } = require('webpack').container;

  module.exports = {
    plugins: [
      new ModuleFederationPlugin({
        name: "shell",

        remotes: {
          // Key: import alias  Value: remoteName@URL
          productsMFE: "productsMFE@http://products.example.com/remoteEntry.js",
          checkoutMFE: "checkoutMFE@http://checkout.example.com/remoteEntry.js",
          accountMFE:  "accountMFE@http://account.example.com/remoteEntry.js",
        },

        shared: {
          react:     { singleton: true, requiredVersion: "^18.0.0" },
          "react-dom": { singleton: true, requiredVersion: "^18.0.0" },
        },
      }),
    ],
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// CONSUMING A REMOTE MODULE IN THE HOST
// ─────────────────────────────────────────────────────────────────────────────

import { lazy, Suspense } from "react";

// Dynamic import using the remote alias defined in webpack config
const ProductCard = lazy(() => import("productsMFE/ProductCard"));
const CheckoutPage = lazy(() => import("checkoutMFE/CheckoutPage"));

function App() {
  return (
    <div>
      <Suspense fallback={<div>Loading product…</div>}>
        <ProductCard productId={123} />
      </Suspense>
      <Suspense fallback={<div>Loading checkout…</div>}>
        <CheckoutPage />
      </Suspense>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VITE MODULE FEDERATION (vite-plugin-federation)
// ─────────────────────────────────────────────────────────────────────────────
/*
  npm install @originjs/vite-plugin-federation --save-dev

  === REMOTE (products-mfe/vite.config.ts) ===
  import federation from '@originjs/vite-plugin-federation';

  export default {
    plugins: [
      federation({
        name: 'productsMFE',
        filename: 'remoteEntry.js',
        exposes: {
          './ProductCard': './src/components/ProductCard.tsx',
        },
        shared: ['react', 'react-dom'],
      }),
    ],
    build: { target: 'esnext', minify: false },  // required for federation
  };

  === HOST (shell/vite.config.ts) ===
  import federation from '@originjs/vite-plugin-federation';

  export default {
    plugins: [
      federation({
        name: 'shell',
        remotes: {
          productsMFE: 'http://localhost:5001/assets/remoteEntry.js',
        },
        shared: ['react', 'react-dom'],
      }),
    ],
    build: { target: 'esnext' },
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC REMOTE URLS (Runtime configuration)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Hardcoding remote URLs is inflexible. Use runtime configuration:

  // In the HOST — load remoteEntry dynamically based on environment config
  async function loadRemote(name, url) {
    await __webpack_init_sharing__("default");

    // Dynamically load the remote script
    const script = document.createElement("script");
    script.src = url;
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    const container = window[name];
    await container.init(__webpack_share_scopes__.default);
    return container;
  }

  // Use it:
  const remote = await loadRemote("productsMFE", "http://products.example.com/remoteEntry.js");
  const factory = await remote.get("./ProductCard");
  const ProductCard = factory().default;
*/

// ─────────────────────────────────────────────────────────────────────────────
// THE `shared` CONFIGURATION (critical for correctness)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Without `shared: react`:
    Shell loads React 18.2
    ProductsMFE loads React 18.2 independently
    → TWO copies of React in memory → hooks break (different React instances)
    → "Invalid hook call" error or context not shared

  With `shared: { react: { singleton: true } }`:
    The first one to load React "wins"
    All subsequent MFEs reuse the same React instance
    → ONE copy of React, hooks work correctly across MFEs

  Singleton: true = critical for React, React-Router, Redux, design system contexts.
  Use eager: true for modules that should be immediately available (not lazy):
    shared: {
      react: { singleton: true, eager: true, requiredVersion: "^18.0.0" },
    }

  Version negotiation:
    requiredVersion: "^18.0.0"  → if remote needs 18.x and host has 18.2, reuse host's
    strictVersion: true          → error if version mismatch (stricter)
*/

// ─────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT CONSIDERATIONS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Independent deployment is the whole point of MFEs.

  Team A deploys products-mfe → shell automatically gets new ProductCard
  No redeployment of shell required!

  BUT: this means version mismatches can happen at runtime:
    Shell expects ProductCard to accept { productId: number }
    ProductsMFE removed that prop in their latest deploy
    → Runtime error for users

  Mitigation strategies:
  1. Contract testing (Pact) — test the interface between host and remote
  2. Versioned remoteEntry.js:
     http://products.example.com/v2.1.4/remoteEntry.js
     → Shell pins to a specific version until ready to upgrade
  3. Feature flags — gradually roll out new remote versions
  4. Error boundaries — catch failures in lazy-loaded remotes

  CI/CD considerations:
  • Deploy remotes BEFORE deploying the shell (remotes must be live first)
  • Blue/green deployments for remotes
  • Health checks on remoteEntry.js availability
*/

/**
 * WHEN TO USE MODULE FEDERATION
 * ──────────────────────────────
 *  ✅ Large teams (5+ frontend teams) working on the same product
 *  ✅ Different teams need to deploy independently
 *  ✅ Sharing a design system or component library across apps
 *  ✅ Gradual migration (load legacy app as a remote inside new shell)
 *
 *  ❌ Small teams (prefer monorepo with shared packages)
 *  ❌ Simple apps (the setup complexity is not worth it)
 *  ❌ When you want strong build-time type safety across boundaries
 *
 * ALTERNATIVES
 * ────────────
 *  • iframes (strict isolation but poor UX)
 *  • npm packages (build-time coupling; no independent deploy)
 *  • Monorepo with turborepo/nx (shared code, single deploy pipeline)
 *  • Import Maps (native browser module federation — emerging standard)
 */

function ProductCard(props) { return null; }
function CheckoutPage(props) { return null; }
