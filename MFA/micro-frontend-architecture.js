// ============================================================
// MICRO FRONTEND ARCHITECTURE — INTERVIEW Q&A
// ============================================================
//
// INDEX
//   1.  What is a Micro Frontend?
//   2.  Why would you choose MFE over a monolith?
//   3.  How do you actually integrate multiple MFEs into one page?
//   4.  What is Module Federation and how does it work?
//   5.  What is remoteEntry.js and why does it matter?
//   6.  Shared Modules — what they are and how versioning works
//   7.  What happens when two MFEs need different versions of a shared lib?
//   8.  How does routing work across MFEs?
//   9.  How do MFEs talk to each other?
//  10.  How do you share state across MFEs?
//  11.  How do you handle authentication?
//  12.  How do you prevent CSS from one MFE breaking another?
//  13.  How does independent deployment actually work?
//  14.  How do you handle a MFE that fails to load?
//  15.  What are the real downsides? When would you NOT use MFE?
//  16.  How would you migrate an existing monolith to MFEs?
//  17.  Quick-fire scenario questions
//
// ============================================================


// ============================================================
// Q1: Can you explain micro frontend architecture in simple terms?
// ============================================================
//
// Think of a shopping mall. The mall building (the shell) provides
// the entrance, floors, and escalators. Each store inside operates
// independently — the shoe store doesn't close because the electronics
// store is renovating. Each store has its own staff and inventory system.
//
// Micro frontend architecture applies this to a web app.
//
// Instead of ONE big React app where all teams work in the same codebase,
// you split the UI into smaller, independently owned apps — each called
// a Micro Frontend (MFE). A container/shell ties them into one seamless UI.
//
// CONCRETE EXAMPLE — e-commerce site:
//   shell / container  →  layout, nav, auth, routing
//   /products          →  product listing, search, filters    (Team A)
//   /cart              →  cart, checkout flow                 (Team B)
//   /account           →  profile, order history              (Team C)
//   /promotions        →  banners, deals, recommendations     (Team D)
//
// Each team:
//   - Has its own Git repo
//   - Deploys independently
//   - Can use their own tech stack
//   - Releases without coordinating with other teams
//
// The user sees one app. Behind the scenes, it's 4–5 separate apps.


// ============================================================
// Q2: We have a large React app. What problems would MFE solve for us?
// ============================================================
//
// MFE is NOT a technical upgrade — it solves ORGANIZATIONAL problems.
//
// PAIN POINT 1 — "Our repo is a battlefield"
//   50 engineers in one frontend repo = constant merge conflicts, giant PRs.
//   → MFE: each team has its own repo. Zero contention between teams.
//
// PAIN POINT 2 — "We can't release without everyone being ready"
//   Team A is ready, but Team B has a half-done feature. Everyone waits.
//   → MFE: Team A deploys their MFE. Fully independent.
//
// PAIN POINT 3 — "We need to migrate off Angular but can't rewrite everything"
//   → MFE: New features in React. Old screens stay in Angular.
//   This is the Strangler Fig pattern — old code dies piece by piece.
//
// PAIN POINT 4 — "One team's bug brought down the whole app"
//   → MFE: The failing MFE shows an error boundary. Others keep working.
//
// PAIN POINT 5 — "Ownership is unclear"
//   → MFE: Each MFE has a clear owner. Team B owns /cart end to end.
//
// COUNTER-POINT:
//   If your team is small (< 8 frontend engineers) and you deploy together
//   anyway, MFE gives you overhead without benefit. A well-optimized monolith
//   is the right answer for most teams.


// ============================================================
// Q3: What are the different ways to integrate multiple MFEs into one page?
// ============================================================
//
// THREE STRATEGIES:
//
// -----------------------------------------------------------
// A) BUILD-TIME INTEGRATION (npm packages)
// -----------------------------------------------------------
// Each MFE is published as an npm package. Container installs them like
// any dependency.

// container/package.json
const buildTimeExample = {
  dependencies: {
    "@acme/products-mfe": "^2.1.0",
    "@acme/cart-mfe": "^1.5.0",
  },
};

// WHY THIS IS USUALLY WRONG:
// Every time the Products team ships, the container must:
//   1. Update package.json → npm install → rebuild → redeploy
// That's not independent deployment — it's just a slower monolith.
// Use build-time only for shared UI components like a design system.

// -----------------------------------------------------------
// B) SERVER-SIDE INTEGRATION (SSI / Edge composition)
// -----------------------------------------------------------
// The server stitches HTML fragments from multiple services before
// the browser receives a response.
//
//   <!-- Nginx SSI -->
//   <!--# include virtual="/products-service/fragment" -->
//
// When to use: content-heavy sites (news, landing pages) where SEO matters.
// Downside: complex infra, harder dynamic client-side interactions.

// -----------------------------------------------------------
// C) CLIENT-SIDE RUNTIME (most common for React teams)
// -----------------------------------------------------------
// Container fetches and mounts MFEs in the browser at runtime.
// Three techniques: Module Federation, iFrames, Web Components.
// Module Federation is the industry standard for React teams.


// ============================================================
// Q4: Explain Module Federation. How does it enable micro frontends?
// ============================================================
//
// Module Federation (Webpack 5) lets one JS app load code from a completely
// separate app at runtime — without build-time coupling.
//
// HOST (Container):   the app that CONSUMES modules from others
// REMOTE (MFE):       the app that EXPOSES its modules to others

// -----------------------------------------------------------
// STEP 1: Configure the REMOTE (Products MFE)
// -----------------------------------------------------------

// products/webpack.config.js
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "products", // unique name — used by the host
      filename: "remoteEntry.js", // the file the host will fetch first

      exposes: {
        "./App": "./src/App",
        "./ProductList": "./src/components/ProductList",
      },

      shared: {
        react: { singleton: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.0.0" },
      },
    }),
  ],
};

// Products MFE deploys to: https://cdn.acme.com/products/remoteEntry.js
// It doesn't know about the container at all. It just runs and exposes itself.

// -----------------------------------------------------------
// STEP 2: Configure the HOST (Container)
// -----------------------------------------------------------

// container/webpack.config.js
const containerWebpackConfig = {
  plugins: [
    new ModuleFederationPlugin({
      name: "container",

      remotes: {
        // alias: 'remoteName@URL_to_remoteEntry.js'
        products: "products@https://cdn.acme.com/products/remoteEntry.js",
        cart: "cart@https://cdn.acme.com/cart/remoteEntry.js",
      },

      shared: {
        react: { singleton: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.0.0" },
      },
    }),
  ],
};

// -----------------------------------------------------------
// STEP 3: Use the remote module inside the container
// -----------------------------------------------------------

import React, { Suspense } from "react";

// This looks like a local import but hits the network at runtime
const ProductsApp = React.lazy(() => import("products/App"));
const CartApp = React.lazy(() => import("cart/App"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsApp />
    </Suspense>
  );
}

// -----------------------------------------------------------
// WHAT HAPPENS AT RUNTIME (step by step)
// -----------------------------------------------------------
// 1. Browser loads container's main bundle
// 2. User navigates to /products
// 3. React.lazy triggers → browser fetches remoteEntry.js from CDN
// 4. remoteEntry.js is a manifest: "here are my modules and chunks"
// 5. Browser negotiates shared deps (React) — only one copy loaded
// 6. Browser fetches the actual ProductsApp chunk
// 7. ProductsApp renders inside container's Suspense boundary
//
// Products team deploys a new version → container picks it up automatically.
// No container rebuild. No container redeploy.


// ============================================================
// Q5: What exactly is remoteEntry.js and why does it matter?
// ============================================================
//
// remoteEntry.js is the manifest/entry point a remote MFE exposes.
// It is a small JS file that tells the host:
//   - "Here are the modules I expose"         (./App, ./ProductList)
//   - "Here are my chunk file names/hashes"   (for cache busting)
//   - "Here are the shared deps I need"       (react@18.2.0)
//
// Think of it as a table of contents for the MFE.
//
// SIMPLIFIED SHAPE:
//   var products = {
//     get: (module) => {
//       if (module === './App') return () => import('./src_App.chunk.js');
//     },
//     init: (shareScope) => { /* negotiate shared deps */ }
//   };
//
// CACHING STRATEGY (critical):
//   remoteEntry.js       → Cache-Control: no-cache, must-revalidate
//   products.abc123.js   → Cache-Control: max-age=31536000 (1 year)
//
// When Products team deploys:
//   - Browser always fetches fresh remoteEntry.js (tiny file, no-cache)
//   - Gets new chunk hashes
//   - Only downloads changed chunks; unchanged ones hit the CDN cache


// ============================================================
// Q6: Explain shared modules. How does versioning work between MFEs?
// ============================================================

// -----------------------------------------------------------
// THE PROBLEM SHARED MODULES SOLVE
// -----------------------------------------------------------
// Without shared modules, every MFE bundles its own React:
//   container bundle:  React 18.2  (200KB)
//   products bundle:   React 18.2  (200KB)
//   cart bundle:       React 18.2  (200KB)
//   → user downloads React THREE times (600KB wasted)
//   → three React instances = hooks break across MFE boundaries

// -----------------------------------------------------------
// HOW SHARED MODULES WORK
// -----------------------------------------------------------
// Declare shared in EVERY MFE and the container:

const sharedConfig = {
  shared: {
    react: {
      singleton: true, // only one instance allowed in memory
      requiredVersion: "^18.0.0", // semver range this MFE needs
    },
    "react-dom": {
      singleton: true,
      requiredVersion: "^18.0.0",
    },
    "react-router-dom": {
      singleton: true,
      requiredVersion: "^6.0.0",
    },
  },
};

// At runtime, Module Federation runs a "negotiation" step:
//   1. Each MFE announces its version: "I need react@18.2.0"
//   2. Module Federation picks the HIGHEST compatible version
//   3. That one version loads. All MFEs use the same instance.

// -----------------------------------------------------------
// VERSION NEGOTIATION RULES
// -----------------------------------------------------------
// container needs:  react ^18.0.0  (has 18.2.0)
// products needs:   react ^18.0.0  (has 18.3.0)
// cart needs:       react ^18.0.0  (has 18.1.0)
// → Picks 18.3.0 (highest compatible). 18.1 and 18.2 never downloaded.

// container needs:  react ^17.0.0  (has 17.0.2)
// products needs:   react ^18.0.0  (has 18.2.0)
// → 17 and 18 are INCOMPATIBLE (different majors)
// → Two React instances loaded → hooks and context break (see Q7)

// -----------------------------------------------------------
// ALL SHARED CONFIG OPTIONS EXPLAINED
// -----------------------------------------------------------

const fullSharedConfig = {
  shared: {
    react: {
      singleton: true,
      // One instance only. If incompatible versions exist, warn rather
      // than silently loading two copies.

      requiredVersion: "^18.0.0",
      // Semver range this MFE needs. Used to check compatibility
      // against what other MFEs declare.

      strictVersion: false,
      // false (default): console warn on version mismatch, keep going
      // true: throw a hard error if incompatible version is loaded

      eager: false,
      // false (default): React is loaded lazily when first needed
      // true: bundle React into the initial chunk
      //       Use eager: true only in the HOST/container, not remotes

      version: "18.2.0",
      // Override the auto-detected version. Rarely needed.
    },
  },
};

// -----------------------------------------------------------
// WHAT TO SHARE (and what not to)
// -----------------------------------------------------------
// MUST BE SINGLETON:
//   react, react-dom              → hooks requirement
//   react-router-dom              → single history object
//   @tanstack/react-query         → single cache instance
//   styled-components / emotion   → single style injection context
//
// GOOD TO SHARE (size savings):
//   @company/design-system        → shared UI components
//   @company/auth-utils           → shared auth helpers
//
// SKIP SHARING (fine to duplicate):
//   lodash / date-fns             → tree-shakeable, small enough
//   axios                         → each MFE can have its own config
//
// DO NOT share everything blindly. Sharing = coupling.
// Only share what must be a singleton or is large enough to justify it.

// -----------------------------------------------------------
// VERSIONING STRATEGIES FOR YOUR OWN SHARED PACKAGES
// -----------------------------------------------------------
//
// OPTION A: Semver + private npm registry (most common)
//   Publish @company/design-system to Artifactory / GitHub Packages.
//   Each MFE pins a version range. Teams upgrade on their own schedule.
//   Downside: breaking changes require each team to upgrade independently.
//
// OPTION B: Floating "latest" (fast, risky)
//   Always load the latest version. No version pinning.
//   Any breaking change immediately affects all MFEs.
//   Use only for stable, backward-compatible utilities.
//
// OPTION C: Expose via Module Federation from container (most integrated)
//   Container exposes the design system as a shared module.
//   All MFEs get it from the container at runtime — one copy, always in sync.

// container webpack config
const containerWithDesignSystem = new ModuleFederationPlugin({
  name: "container",
  exposes: {
    "./DesignSystem": "./src/design-system/index.js",
    "./auth": "./src/auth/index.js",
  },
});

// Any MFE
import { Button, Modal } from "container/DesignSystem";
import { authService } from "container/auth";

// Risk: breaking change in design system = all MFEs broken at once.
// Only use this with a stable, well-tested design system.


// ============================================================
// Q7: What happens if the container is on React 18 but one MFE is on React 17?
// ============================================================
//
// SCENARIO:
//   container: react@18.2.0, requiredVersion: '^18.0.0'
//   cart-mfe:  react@17.0.2, requiredVersion: '^17.0.0'
//
// WITHOUT singleton:true:
//   Both React 17 and React 18 are downloaded and run.
//   Two runtimes = breaks useContext, ReactDOM.createRoot, Error Boundaries,
//   and React DevTools. Very hard to debug.
//
// WITH singleton:true (recommended):
//   Module Federation picks React 18 (higher version).
//   Cart MFE runs on React 18 under the hood.
//   React 18 is backwards compatible in most cases. You get a console warning:
//   "Shared module react@17.0.2 is not a singleton..."
//
// HOW TO HANDLE THE MIGRATION:
//
// Phase 1 — Keep both working during transition:
//   Remove React from shared config for the legacy MFE temporarily.
//   It bundles its own React 17 (adds bundle size, acceptable short-term).
//   Container and other MFEs share React 18 normally.
//
// Phase 2 — Upgrade the legacy MFE:
//   React 18 upgrade is mostly non-breaking (React.render → createRoot).
//   Add React back to shared config.
//   Back to one React instance.
//
// KEY INSIGHT:
//   Never keep mixed major versions long-term. The bugs are subtle and
//   hard to trace. Treat a React version gap as tech debt with a deadline.


// ============================================================
// Q8: Who controls the URL? How does routing work across MFEs?
// ============================================================
//
// Two distinct levels. Getting this wrong causes subtle URL bugs.

// -----------------------------------------------------------
// LEVEL 1: TOP-LEVEL ROUTING — Container owns this
// -----------------------------------------------------------
// Shell uses BrowserRouter because it needs to own the real browser history.

// container/src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";

const ProductsApp = React.lazy(() => import("products/App"));
const CartApp = React.lazy(() => import("cart/App"));

function ContainerApp() {
  return (
    <BrowserRouter>
      <Header />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* The /* tells React Router to pass remaining segments to the MFE */}
          <Route path="/products/*" element={<ProductsApp />} />
          <Route path="/cart/*" element={<CartApp />} />
          <Route path="/account/*" element={<AccountApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// -----------------------------------------------------------
// LEVEL 2: INTERNAL MFE ROUTING — Each MFE owns its sub-routes
// -----------------------------------------------------------
//
// WRONG: Using BrowserRouter inside an MFE
//   Two BrowserRouters = two history objects fighting over the URL.
//   Unpredictable back-button behavior.
//
// RIGHT: Use MemoryRouter inside MFEs
//   MemoryRouter keeps routing state in memory, not in the browser URL.
//   Container's BrowserRouter owns the real URL.
//   MFE handles sub-navigation internally without touching the browser bar.

// products/src/App.js
import { MemoryRouter, Routes, Route } from "react-router-dom";

function ProductsApp() {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/:id" element={<ProductDetail />} />
        <Route path="/search" element={<SearchResults />} />
      </Routes>
    </MemoryRouter>
  );
}

// -----------------------------------------------------------
// HOW MFEs TRIGGER NAVIGATION TO OTHER MFEs
// -----------------------------------------------------------
// An MFE should NEVER import the container's router directly.
// Instead it fires a custom event:

// Inside products MFE — user clicks "Go to Cart"
window.dispatchEvent(
  new CustomEvent("mfe:navigate", {
    detail: { path: "/cart" },
  })
);

// Container listens and uses its own router
window.addEventListener("mfe:navigate", (e) => {
  navigate(e.detail.path); // container's react-router navigate()
});

// This keeps MFEs completely decoupled from the container's routing.


// ============================================================
// Q9: How do MFEs communicate with each other?
// ============================================================
//
// GOLDEN RULE: MFEs must NOT directly import each other.
// If products imports cart, you've coupled two teams' codebases.

// -----------------------------------------------------------
// PATTERN 1: PROPS FROM CONTAINER (parent → child)
// -----------------------------------------------------------
// Best for: data the container already has (user info, feature flags)

function ContainerWithProps() {
  return (
    <ProductsApp
      userId={currentUser.id}
      onAddToCart={(item) => cartService.add(item)}
      featureFlags={flags}
    />
  );
}

// -----------------------------------------------------------
// PATTERN 2: CUSTOM DOM EVENTS (pub-sub, sibling MFEs)
// -----------------------------------------------------------
// Best for: sibling MFEs communicating without knowing about each other

// auth MFE fires on login
window.dispatchEvent(
  new CustomEvent("auth:login", {
    bubbles: true,
    detail: { userId: "123", name: "Veerendra" },
  })
);

// cart MFE listens — doesn't know who fired the event
window.addEventListener("auth:login", (event) => {
  loadUserCart(event.detail.userId);
});

// header MFE also listens
window.addEventListener("auth:login", (event) => {
  showUserAvatar(event.detail.name);
});

// NAMING CONVENTION (prevents collisions):
//   'auth:login'          → auth MFE fires this
//   'cart:item-added'     → cart MFE fires this
//   'shell:theme-changed' → container fires this
//   Prefix = MFE name. Any team can listen, none need to coordinate.

// -----------------------------------------------------------
// PATTERN 3: SHARED SINGLETON SERVICE
// -----------------------------------------------------------
// A service object shared via Module Federation's singleton mechanism.
// All MFEs get the same instance — same state in memory.

// @company/auth-service/index.js
class AuthService {
  constructor() {
    this._user = null;
    this._listeners = [];
  }
  setUser(user) {
    this._user = user;
    this._listeners.forEach((fn) => fn(user));
  }
  getUser() {
    return this._user;
  }
  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== fn); // unsubscribe
    };
  }
}

export const authService = new AuthService(); // singleton

// Any MFE
import { authService } from "@company/auth-service";
const user = authService.getUser();
const unsubscribe = authService.onChange((u) => setCurrentUser(u));

// -----------------------------------------------------------
// PATTERN 4: URL / QUERY PARAMS (simplest, most durable)
// -----------------------------------------------------------
// Any MFE reads the URL. State survives page refresh.
// Best for: search query, filters, pagination, navigation context.
// /products?userId=123&category=shoes&page=2

// -----------------------------------------------------------
// WHICH PATTERN TO CHOOSE?
// -----------------------------------------------------------
//   Props from container  →  container passing data to a specific MFE
//   Custom events         →  siblings, loose coupling, one fires many listen
//   Singleton service     →  auth/user state, needs reactivity + getter
//   URL params            →  navigation state, shareable links, filters


// ============================================================
// Q10: The header MFE needs to show cart count — that state is in cart MFE. How?
// ============================================================
//
// WRONG ANSWER: One global Redux store.
// That recreates monolith coupling — every team depends on the same store shape.
//
// RIGHT APPROACH: Cart MFE owns its state, fires events when it changes.

// Inside cart MFE
const addItem = (item) => {
  const updatedCart = [...cartItems, item];
  setCartItems(updatedCart);

  // Notify any MFE that cares
  window.dispatchEvent(
    new CustomEvent("cart:updated", {
      detail: { count: updatedCart.length },
    })
  );
};

// Header MFE listens
function CartBadge() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const handler = (e) => setCartCount(e.detail.count);
    window.addEventListener("cart:updated", handler);
    return () => window.removeEventListener("cart:updated", handler);
  }, []);

  return <span>{cartCount}</span>;
}

// Cart MFE doesn't know about the header. Header doesn't reach into cart state.

// -----------------------------------------------------------
// GUIDELINES FOR SHARED STATE
// -----------------------------------------------------------
//   Auth / user identity    → Singleton service + events (or httpOnly cookie)
//   Cart count / badge      → Events from cart MFE, header listens
//   Current route           → Browser URL (owned by container)
//   Feature flags           → Container fetches, passes via props
//   User preferences        → localStorage (storage event for reactivity)
//   Server-persisted data   → Each MFE fetches from its own API (no sharing)
//
// KEY RULE:
//   If two MFEs share a LOT of state, they probably belong in the same MFE.
//   Frequent state sharing = wrong domain boundaries.


// ============================================================
// Q11: If a user logs in on the auth MFE, how does the products MFE know?
// ============================================================
//
// Auth is ALWAYS owned by the container/shell.
// MFEs should never handle the login flow.
//
// THE FLOW:
//   1. User hits app unauthenticated
//   2. Container detects this (no token / 401 from API)
//   3. Container redirects to IdP (Auth0, Okta, Cognito)
//   4. Login completes → token returned to container
//   5. Container stores token + exposes user info to MFEs

// -----------------------------------------------------------
// OPTION A: Container exposes an auth module (Module Federation)
// -----------------------------------------------------------

// shell/src/auth/index.js  (exposed in shell's webpack config)
let _user = null;
let _token = null;
const _listeners = [];

export const authService = {
  init(user, token) {
    _user = user;
    _token = token;
    _listeners.forEach((fn) => fn(user));
  },
  getUser() { return _user; },
  getToken() { return _token; },
  onChange(fn) { _listeners.push(fn); },
};

// Any MFE
import { authService } from "shell/auth";
const token = authService.getToken();

// -----------------------------------------------------------
// OPTION B: httpOnly Cookie (most secure, recommended for production)
// -----------------------------------------------------------
//   Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Domain=.acme.com
//
//   Auth token lives server-side in a cookie.
//   Browser sends it automatically with every API request — no JS touches it.
//   Immune to XSS. MFEs make API calls normally; cookie attaches invisibly.
//   Cleanest approach — no token passing between MFEs at all.

// -----------------------------------------------------------
// WHAT MFEs MUST NOT DO:
// -----------------------------------------------------------
//   ✗  Redirect to /login themselves
//      → Fire an event instead, let the container handle it
//   ✗  Store token in localStorage
//      → XSS in any MFE can steal it
//   ✗  Have their own login page
//      → Container owns auth, single responsibility


// ============================================================
// Q12: Team A uses Tailwind, Team B uses Bootstrap — won't those conflict?
// ============================================================

// -----------------------------------------------------------
// STRATEGY 1: BEM + MFE namespace prefix (low-tech, requires discipline)
// -----------------------------------------------------------
//   .products-card { padding: 16px; }
//   .products-card__title { font-size: 18px; }
//   .cart-item { border-bottom: 1px solid #eee; }
//   Works if teams follow convention. Breaks if they forget.

// -----------------------------------------------------------
// STRATEGY 2: CSS Modules (recommended for React MFEs)
// -----------------------------------------------------------
//   Build tool transforms class names into unique hashes at compile time.
//
//   /* ProductCard.module.css */
//   .card  { padding: 16px; }
//   .title { font-size: 18px; }

import styles from "./ProductCard.module.css";
function ProductCard() {
  return <div className={styles.card}>...</div>; // → class="card_a3f9k2"
}
// Cannot conflict with any other MFE's classes. No runtime overhead.

// -----------------------------------------------------------
// STRATEGY 3: CSS-in-JS (Styled Components / Emotion)
// -----------------------------------------------------------
import styled from "styled-components";

const Card = styled.div`
  padding: 16px;
  background: white;
`; // → class="sc-xyz123 iBcYst"

// IMPORTANT: styled-components must be a singleton in Module Federation.
// Two instances = styles injected twice or incorrectly.

// -----------------------------------------------------------
// STRATEGY 4: Shadow DOM (strongest isolation — Web Components)
// -----------------------------------------------------------
//   class ProductsMFE extends HTMLElement {
//     connectedCallback() {
//       const shadow = this.attachShadow({ mode: 'open' });
//       const style = document.createElement('style');
//       style.textContent = `.btn { color: red; }`;  // won't leak outside
//       shadow.appendChild(style);
//     }
//   }

// -----------------------------------------------------------
// SHARED DESIGN TOKENS (work across all isolation strategies)
// -----------------------------------------------------------
//   Use CSS custom properties in a shared @company/design-tokens package:
//
//   :root {
//     --color-primary: #007bff;
//     --spacing-md: 16px;
//     --font-size-body: 14px;
//   }
//
//   Custom properties pierce Shadow DOM via inheritance.
//   Updating the design tokens package updates all MFEs simultaneously.


// ============================================================
// Q13: Walk me through what happens when a team deploys their MFE.
//      Does the container need to redeploy too?
// ============================================================
//
// No — that's the whole point.
//
// SETUP:
//   Each MFE builds to static assets and uploads to a CDN.
//   https://cdn.acme.com/products/latest/remoteEntry.js    ← always current
//   https://cdn.acme.com/products/latest/main.abc123.js    ← content-hashed
//
//   Container config points to the CDN URL, not a version number.

const containerRemotes = {
  products: "products@https://cdn.acme.com/products/latest/remoteEntry.js",
};

// TEAM A DEPLOYS A FIX:
//   1. Team A merges PR → CI pipeline triggers
//   2. Webpack builds new chunks → new content-hash filenames
//   3. New remoteEntry.js updated with new chunk hashes
//   4. Files uploaded to CDN (overwriting /latest/remoteEntry.js)
//   5. Done. Container is NOT touched. Container is NOT redeployed.
//
//   When users next visit:
//   6. Container loads from CDN cache
//   7. React.lazy triggers → fetches /latest/remoteEntry.js (no-cache header)
//   8. Gets new chunk hashes → fetches only changed chunks
//   9. Users see the updated MFE

// -----------------------------------------------------------
// VERSIONED URL STRATEGY (safer for production)
// -----------------------------------------------------------
//   Instead of /latest, use versioned paths + a config service:
//   https://cdn.acme.com/products/v2.4.0/remoteEntry.js
//
//   Config API tells the container which version to load:
//   GET /api/mfe-versions → { "products": "v2.4.0", "cart": "v1.9.1" }

async function getRemoteUrls() {
  const versions = await fetch("/api/mfe-versions").then((r) => r.json());
  return {
    products: `products@https://cdn.acme.com/products/${versions.products}/remoteEntry.js`,
    cart: `cart@https://cdn.acme.com/cart/${versions.cart}/remoteEntry.js`,
  };
}

// BENEFITS:
//   Rollback: update config API response → instant, no redeploy
//   Canary:   5% of users get v2.5.0, 95% get v2.4.0 (via config API)
//
// CACHING RULES:
//   remoteEntry.js      → Cache-Control: no-cache, must-revalidate
//   *.chunk.js files    → Cache-Control: max-age=31536000  (1 year, content-hashed)


// ============================================================
// Q14: What happens to the user if the cart MFE's CDN goes down?
// ============================================================
//
// Bad implementation: entire page crashes.
// Good implementation: only the cart section shows an error. Everything else works.
//
// The tool: React Error Boundary + Suspense

class MFEErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log to Sentry / Datadog
    errorMonitoring.capture(error, { mfe: this.props.name, ...info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mfe-error">
          <p>This section is temporarily unavailable.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage in container — wrap EVERY MFE mount with this
const CartApp = React.lazy(() => import("cart/App"));

function CartSection() {
  return (
    <MFEErrorBoundary name="cart">
      <Suspense fallback={<CartSkeleton />}>
        <CartApp />
      </Suspense>
    </MFEErrorBoundary>
  );
}

// If cart's remoteEntry.js is unreachable:
//   → React.lazy import throws → Suspense shows fallback during load
//   → If it errors out → Error Boundary catches it
//   → User sees "This section is temporarily unavailable. [Retry]"
//   → Header, Products, Navigation all continue working normally


// ============================================================
// Q15: MFE sounds great. What's the catch? When would you NOT use it?
// ============================================================
//
// MFE is often oversold. Honest trade-offs:
//
// GENUINE COSTS:
//
//   Operational complexity
//     Every MFE needs its own CI/CD, CDN config, monitoring, alerting.
//     5 apps = 5x the infrastructure burden.
//
//   UX inconsistency
//     Different teams → different button styles, animations, font rendering.
//     The app looks built by four companies — because it was.
//     Requires a shared design system + strong enforcement.
//
//   Performance overhead
//     Multiple network requests before page is interactive.
//     Without lazy loading + caching, initial load is slower than a monolith.
//
//   Debugging across boundaries
//     Stack trace: "Error in products MFE."
//     But the state that caused it came from auth MFE via an event.
//     Needs correlation IDs and unified logging across all MFEs.
//
//   Version coordination (hidden coupling)
//     Upgrading react-router v5 → v6 requires ALL teams to upgrade before
//     anyone can use v6 features via the shared module. You traded release
//     coupling for upgrade coupling.
//
//   Testing is harder
//     Unit tests: fine. Integration tests: hard (need both MFEs running).
//     E2E tests: require the entire stack deployed.
//
// WHEN NOT TO USE MFE:
//   - Team < 8 frontend engineers (overhead eats velocity)
//   - Already deploying everything together (no independence gained)
//   - MVP or early product (wrong time for infra complexity)
//   - High UX consistency requirements (design tools, IDEs, creative apps)
//   - No clear domain boundaries (forced split = artificial pain)
//
// THE LITMUS TEST:
//   "Would independent deployment actually save us time this quarter?"
//   Yes → MFE is worth exploring.
//   No  → optimize your monolith (code splitting, feature flags, modular arch).


// ============================================================
// Q16: We have a 4-year-old React monolith. How do we migrate to MFE?
// ============================================================
//
// Use the STRANGLER FIG PATTERN.
// You never rewrite — you grow the new system around the old one
// until the old one has nothing left.
//
// PHASE 1: Add a shell in front of the monolith
//   Create a minimal container app.
//   For now it just proxies everything to the monolith.
//   Users notice zero change.

// shell routes ALL traffic to the old monolith initially
const initialRemotes = {
  legacy: "legacy@https://your-old-app.com/remoteEntry.js",
};

// PHASE 2: Extract the lowest-risk feature first
//   Pick a feature that is:
//     - Self-contained (few external dependencies)
//     - Has a clear URL boundary (/account, /help, /promotions)
//     - Owned by one team
//
//   Shell routes /account → new Account MFE
//   Everything else → monolith (unchanged)
//
// PHASE 3: Repeat, feature by feature
//   Month 1: /account   → Account MFE
//   Month 2: /cart      → Cart MFE
//   Month 3: /search    → Search MFE
//   Month 6: /products  → Products MFE
//   Monolith shrinks with each extraction. No user disruption.
//
// PHASE 4: Decommission the monolith
//   When it serves no routes, shut it down. Migration complete.
//
// SHARED CODE IN THE MONOLITH:
//   Identify code used across multiple features (utils, hooks, services).
//   Extract into @company/shared-utils BEFORE extracting MFEs.
//   Both monolith and new MFEs import from it during transition.


// ============================================================
// Q17: QUICK-FIRE SCENARIO QUESTIONS
// ============================================================

// Q: What is remoteEntry.js?
// A: Manifest file a remote MFE exposes — tells the host what modules are available
//    and what chunks to fetch. Must NOT be cached; chunks should be cached aggressively.

// Q: Why singleton: true for React?
// A: React must exist as one instance in memory. Two instances = hooks don't work
//    across MFE boundaries; React Context is invisible between them.

// Q: Container uses BrowserRouter. What should each MFE use?
// A: MemoryRouter. Avoids two history objects fighting over the URL.

// Q: Two sibling MFEs need to communicate. How?
// A: Custom DOM events — window.dispatchEvent / window.addEventListener.
//    Namespace events by MFE name to avoid collisions.

// Q: Your design system releases v3.0 with breaking changes. How do you coordinate?
// A: Publish v3.0 to npm. Communicate the migration guide to all teams.
//    Teams upgrade on their own timeline. If it's a Module Federation singleton
//    (e.g. styled-components), coordinate a synchronized upgrade window.

// Q: How do you test a MFE?
// A: Three layers:
//    1. Unit tests inside the MFE repo (Jest + RTL) — fast, isolated
//    2. Integration tests with a mocked shell — MFE mounts correctly, events fire
//    3. E2E tests in staging with real container + real MFEs (Cypress / Playwright)
//    Add contract tests (Pact) to verify container↔MFE interface without full E2E.

// Q: Team A wants Vue, everyone else uses React. OK?
// A: Technically yes — that's the promise. But you lose React Context and shared
//    React libs across that boundary. Two dev cultures = maintenance burden.
//    Only accept this trade-off for legacy systems or genuinely specialized tools.

// Q: Performance got worse after migrating to MFE. Why?
// A: Common causes:
//    - MFEs loading eagerly instead of lazily → fix: React.lazy + route-based splitting
//    - React not in shared config → fix: deduplicate via Module Federation singleton
//    - remoteEntry.js not preloaded → fix: <link rel="preload">
//    - Too many sequential requests → fix: HTTP/2, CDN, preloading critical MFEs

// Q: Module Federation vs Web Components — which to choose?
// A: Module Federation: React-centric, shares React components and state primitives,
//    tightest integration, no CSS isolation out of the box.
//    Web Components: framework-agnostic, browser-native, true CSS isolation via Shadow DOM,
//    friction with React events and SSR.
//    Choose Web Components when teams use different frameworks or you need a
//    tech-agnostic hard boundary. Otherwise Module Federation is the better choice.
