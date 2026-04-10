MICRO FRONTEND ARCHITECTURE — INTERVIEW Q&A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INDEX
  1.  What is a Micro Frontend?
  2.  Why would you choose MFE over a monolith?
  3.  How do you actually integrate multiple MFEs into one page?
  4.  What is Module Federation and how does it work?
  5.  What is remoteEntry.js and why does it matter?
  6.  Shared Modules — what they are and how versioning works
  7.  What happens when two MFEs need different versions of a shared lib?
  8.  How does routing work across MFEs?
  9.  How do MFEs talk to each other?
  10. How do you share state across MFEs?
  11. How do you handle authentication?
  12. How do you prevent CSS from one MFE breaking another?
  13. How does independent deployment actually work?
  14. How do you handle a MFE that fails to load?
  15. What are the real downsides? When would you NOT use MFE?
  16. How would you migrate an existing monolith to MFEs?
  17. Quick-fire scenario questions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. WHAT IS A MICRO FRONTEND?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: Can you explain micro frontend architecture in simple terms?

A:
Think of it like this — you go to a shopping mall. The mall building (the shell)
provides the entrance, the floors, the escalators. But each store inside operates
independently. The shoe store doesn't need to close because the electronics store
is renovating. Each store has its own staff, décor, and inventory system.

Micro frontend architecture is the same idea applied to a web app.

Instead of ONE big React app where all teams work in the same codebase, you split
the UI into smaller, independently owned apps — each called a Micro Frontend (MFE).
A container/shell app ties them all together visually into one seamless experience.

CONCRETE EXAMPLE — An e-commerce site:
  shell / container    →  layout, navigation bar, auth, routing
  /products            →  product listing, search, filters     (Team A)
  /cart                →  cart, checkout flow                  (Team B)
  /account             →  profile, order history               (Team C)
  /promotions          →  banners, deals, recommendations      (Team D)

Each team:
  - Has its own Git repo
  - Deploys independently
  - Can use their own tech stack
  - Can release without coordinating with other teams

The user sees one app. Behind the scenes, it's 4-5 apps stitched together.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. WHY WOULD YOU CHOOSE MFE OVER A MONOLITH?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: We have a large React app. What problems would MFE architecture solve for us?

A:
This is the right question to ask first. MFE is not a technical upgrade — it solves
ORGANIZATIONAL problems. Here are the pain points that push teams toward MFE:

PAIN POINT 1 — "Our repo is a battlefield"
  50 engineers in one frontend repo = constant merge conflicts, giant PRs,
  someone's change breaks someone else's feature. No one fully understands the codebase.
  → MFE: each team has its own repo. Zero contention between teams.

PAIN POINT 2 — "We can't release without everyone being ready"
  Team A is ready to ship, but Team B has a half-done feature.
  The whole frontend is held hostage until everyone is green.
  → MFE: Team A deploys their MFE. Team B deploys when they're ready. Fully independent.

PAIN POINT 3 — "We need to migrate off Angular but can't rewrite everything"
  A big-bang rewrite is too risky. But you can't run two apps side-by-side... or can you?
  → MFE: New features are built in React. Old screens stay in Angular. User never notices.
  This is called the Strangler Fig pattern — old code dies piece by piece.

PAIN POINT 4 — "One team's bug brought down the whole app"
  In a monolith, a JS runtime error can crash the entire page.
  → MFE: The faulty MFE shows an error boundary. Other MFEs keep working.

PAIN POINT 5 — "Ownership is unclear"
  Bug filed on the cart. Whose code is it? Backend? Frontend Team A? Team B?
  → MFE: Each MFE has a clear owner. Team B owns /cart — end to end.

IMPORTANT COUNTER-POINT:
  If your team is small (< 8 frontend engineers) and you deploy together anyway,
  MFE gives you the overhead without the benefit. A monolith with good code splitting
  is the right answer for most teams.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. HOW DO YOU ACTUALLY INTEGRATE MULTIPLE MFEs INTO ONE PAGE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: There are three different ways people talk about integrating MFEs. Can you walk me through them?

A:
Yes — the three main strategies are build-time, server-side run-time, and client-side run-time.

─────────────────────────────────────────────────────────────
STRATEGY 1: BUILD-TIME (npm packages)
─────────────────────────────────────────────────────────────
Each MFE is published as an npm package. The container installs them like any dependency.

  // container/package.json
  {
    "dependencies": {
      "@acme/products-mfe": "^2.1.0",
      "@acme/cart-mfe": "^1.5.0"
    }
  }

  // container/src/App.js
  import { ProductsApp } from '@acme/products-mfe';
  import { CartApp } from '@acme/cart-mfe';

WHY THIS IS USUALLY WRONG:
  Every time the Products team ships a change, the container has to:
  1. Update its package.json
  2. Run npm install
  3. Rebuild the entire container
  4. Re-deploy

  That's not independent deployment — that's just a slower monolith.
  Use this only for true shared UI components like a design system.

─────────────────────────────────────────────────────────────
STRATEGY 2: SERVER-SIDE INTEGRATION (SSI / Edge composition)
─────────────────────────────────────────────────────────────
The server stitches together HTML fragments from multiple services before
the browser receives any response.

  <!-- Nginx SSI directive -->
  <div id="header">
    <!--# include virtual="/header-service/fragment" -->
  </div>
  <div id="products">
    <!--# include virtual="/products-service/fragment" -->
  </div>

WHEN TO USE:
  - Content-heavy sites (news, e-commerce landing pages) where SEO matters
  - When you want fast first paint with no JS overhead
  - When MFEs have mostly server-rendered content

DOWNSIDE: Complex infra, harder to do dynamic client-side interactions.

─────────────────────────────────────────────────────────────
STRATEGY 3: CLIENT-SIDE RUNTIME (most common in React ecosystems)
─────────────────────────────────────────────────────────────
The container fetches and mounts MFEs in the browser at runtime.
Three techniques: Module Federation, iFrames, Web Components.

This is what most teams mean when they say "MFE architecture."
Module Federation is the industry standard for React teams.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. WHAT IS MODULE FEDERATION AND HOW DOES IT WORK?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: I keep hearing about Module Federation. Explain it like I'm going to use it tomorrow.

A:
Module Federation is a Webpack 5 feature that lets one JavaScript application
load code from a completely separate application at runtime — without them knowing
about each other at build time.

The two sides of the relationship:

  HOST (Shell/Container):   the app that CONSUMES code from others
  REMOTE (MFE):             the app that EXPOSES its code to others

─────────────────────────────────────────────────────────────
SETTING UP THE REMOTE (Products MFE)
─────────────────────────────────────────────────────────────

  // products/webpack.config.js
  const { ModuleFederationPlugin } = require('webpack').container;

  module.exports = {
    plugins: [
      new ModuleFederationPlugin({
        name: 'products',            // unique name — used by the host
        filename: 'remoteEntry.js', // the file the host will load first

        exposes: {
          // what this MFE is willing to share
          './App':         './src/App',
          './ProductList': './src/components/ProductList',
        },

        shared: {
          react:     { singleton: true, requiredVersion: '^18.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        },
      }),
    ],
  };

The Products MFE is now deployed to: https://cdn.acme.com/products/remoteEntry.js
It doesn't care about the container at all. It just runs and exposes itself.

─────────────────────────────────────────────────────────────
SETTING UP THE HOST (Container)
─────────────────────────────────────────────────────────────

  // container/webpack.config.js
  new ModuleFederationPlugin({
    name: 'container',

    remotes: {
      // alias: 'remoteName@URL_to_its_remoteEntry.js'
      products: 'products@https://cdn.acme.com/products/remoteEntry.js',
      cart:     'cart@https://cdn.acme.com/cart/remoteEntry.js',
    },

    shared: {
      react:     { singleton: true, requiredVersion: '^18.0.0' },
      'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
    },
  })

─────────────────────────────────────────────────────────────
USING THE REMOTE MODULE IN CONTAINER
─────────────────────────────────────────────────────────────

  // container/src/App.js
  import React, { Suspense } from 'react';

  // This import looks local but it hits the network at runtime
  const ProductsApp = React.lazy(() => import('products/App'));
  const CartApp     = React.lazy(() => import('cart/App'));

  export default function App() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <ProductsApp />
      </Suspense>
    );
  }

─────────────────────────────────────────────────────────────
WHAT HAPPENS AT RUNTIME (step by step)
─────────────────────────────────────────────────────────────

  1. Browser loads container's main bundle
  2. User navigates to /products
  3. React.lazy triggers → browser fetches remoteEntry.js from CDN
  4. remoteEntry.js is a manifest: "here are my modules, here are my chunks"
  5. Browser negotiates shared dependencies (React) — only loads once
  6. Browser fetches the actual ProductsApp chunk
  7. ProductsApp renders inside the container's Suspense boundary

The Products team can deploy a new version of their MFE.
The container picks it up automatically — no rebuild, no redeploy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. WHAT IS remoteEntry.js AND WHY DOES IT MATTER?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What exactly is remoteEntry.js? I see it mentioned everywhere.

A:
remoteEntry.js is the manifest/entry point that a remote MFE exposes.
It is a small JavaScript file that tells the host:

  - "Here are the modules I expose"             (./App, ./ProductList)
  - "Here are my chunk file names and hashes"   (for cache busting)
  - "Here are the shared dependencies I need"   (react@18.2.0)

Think of it as a table of contents for the MFE.

WHAT IT LOOKS LIKE (simplified):
  var products;           // global variable matching the 'name' in config
  products = {
    get: (module) => {   // host calls this to get a specific exposed module
      if (module === './App') return () => import('./src_App.chunk.js');
    },
    init: (shareScope) => { /* negotiate shared deps */ }
  };

WHY IT MATTERS FOR CACHING:
  remoteEntry.js should NOT be cached (or have a very short TTL).
  The chunks it points to CAN be cached aggressively (they're content-hashed).

  Strategy:
    remoteEntry.js         → Cache-Control: no-cache, must-revalidate
    products.abc123.js     → Cache-Control: max-age=31536000 (1 year)

  This way, when the Products team deploys:
  - Browser always fetches fresh remoteEntry.js (tiny file)
  - Gets new chunk hashes
  - Only downloads changed chunks; unchanged chunks hit the cache

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. SHARED MODULES — WHAT THEY ARE AND HOW VERSIONING WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: Explain shared modules in Module Federation. How does versioning work between MFEs?

A:
This is one of the most important and misunderstood parts of MFE architecture.

─────────────────────────────────────────────────────────────
THE PROBLEM SHARED MODULES SOLVE
─────────────────────────────────────────────────────────────
Without shared modules, every MFE bundles its own copy of React.

  container bundle:    React 18.2 (200KB)
  products bundle:     React 18.2 (200KB)
  cart bundle:         React 18.2 (200KB)

The user downloads React THREE times. 600KB wasted.
Worse: three separate React instances running = hooks break across MFE boundaries.

─────────────────────────────────────────────────────────────
HOW SHARED MODULES WORK
─────────────────────────────────────────────────────────────
Each MFE declares what it wants to share in the webpack config:

  // In EVERY MFE and the container
  shared: {
    react: {
      singleton: true,
      requiredVersion: '^18.0.0',
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '^18.0.0',
    },
    'react-router-dom': {
      singleton: true,
      requiredVersion: '^6.0.0',
    },
  }

At runtime, Module Federation runs a "negotiation" step:
  1. Each MFE announces: "I need react@18.2.0"
  2. Module Federation picks the HIGHEST compatible version
  3. That one version is loaded. All MFEs use the same instance.

─────────────────────────────────────────────────────────────
VERSION NEGOTIATION RULES
─────────────────────────────────────────────────────────────
Module Federation uses semver ranges to decide compatibility.

  container needs:  react ^18.0.0    (has 18.2.0 installed)
  products needs:   react ^18.0.0    (has 18.3.0 installed)
  cart needs:       react ^18.0.0    (has 18.1.0 installed)

  → Module Federation picks 18.3.0 (highest compatible)
  → All three MFEs use react@18.3.0
  → react@18.1.0 and react@18.2.0 are NOT downloaded at all

  container needs:  react ^17.0.0    (has 17.0.2)
  products needs:   react ^18.0.0    (has 18.2.0)

  → 17 and 18 are NOT compatible (different major versions)
  → Two separate React instances are loaded
  → Hooks and Context BREAK between them — this is a problem (see Q7)

─────────────────────────────────────────────────────────────
THE SHARED CONFIG OPTIONS EXPLAINED
─────────────────────────────────────────────────────────────

  shared: {
    react: {
      singleton: true,
      // Only one instance allowed. If two incompatible versions are needed,
      // throw a warning rather than silently loading two copies.

      requiredVersion: '^18.0.0',
      // The semver range this MFE needs. Used to check compatibility
      // against what other MFEs declare.

      strictVersion: false,
      // false (default): warn in console if version mismatch, but keep going
      // true: throw a hard error if an incompatible version is used

      eager: false,
      // false (default): React is loaded lazily when first needed
      // true: React is bundled into the initial chunk (use for the host only)

      version: '18.2.0',
      // Override the detected version. Rarely needed — usually auto-detected
      // from node_modules.
    }
  }

─────────────────────────────────────────────────────────────
WHAT CAN YOU SHARE? (not just React)
─────────────────────────────────────────────────────────────
Anything in node_modules can be shared. Commonly shared:

  react, react-dom              → must be singleton (hooks requirement)
  react-router-dom              → should be singleton (single history object)
  @tanstack/react-query         → should be singleton (single cache)
  styled-components / emotion   → should be singleton (style injection)
  @company/design-system        → your shared UI component library
  @company/auth-utils           → shared auth helpers
  lodash / date-fns             → optional, fine to duplicate if small

DO NOT share everything blindly. Sharing creates coupling.
A change to a shared lib version forces all MFEs to negotiate.
Only share what truly must be a singleton or is large enough to justify it.

─────────────────────────────────────────────────────────────
INTERNAL SHARED LIBRARY VERSIONING
─────────────────────────────────────────────────────────────
Your own shared packages (design system, auth utils) need a versioning strategy.

OPTION A — Semver with npm (most common)
  Publish @company/design-system to a private npm registry (Artifactory, GitHub Packages).
  Each MFE pins a version range.

  MFE team controls when they upgrade — no forced upgrades.
  Downside: breaking changes require each team to upgrade independently.

OPTION B — Floating "latest" (fast, risky)
  Always load the latest version. No version numbers in config.
  Any breaking change in the design system immediately breaks all MFEs.
  Only use this for truly stable, backward-compatible utilities.

OPTION C — Expose via Module Federation (most integrated)
  The container exposes the design system as a shared module.
  All MFEs get it from the container at runtime — one copy, always in sync.

  // container exposes it
  exposes: { './DesignSystem': './src/design-system/index.js' }

  // MFEs consume it
  import { Button } from 'container/DesignSystem';

  Risk: design system breaking change = all MFEs broken simultaneously.
  Use with a stable, well-tested design system only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. WHAT HAPPENS WHEN TWO MFEs NEED DIFFERENT VERSIONS OF A SHARED LIB?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What actually happens if the container is on React 18 but one MFE is still on React 17?

A:
This is a real scenario during migrations. Here's exactly what happens and your options.

SCENARIO:
  container: react@18.2.0, requiredVersion: '^18.0.0'
  cart-mfe:  react@17.0.2, requiredVersion: '^17.0.0'

RESULT WITHOUT singleton:true:
  Both versions are downloaded and run in the same browser tab.
  Two React runtimes. This breaks:
  - React.createContext / useContext (cart MFE context invisible to container)
  - ReactDOM.createRoot (may error)
  - React DevTools (confused by two instances)
  - Error boundaries across MFE boundaries

RESULT WITH singleton:true (recommended):
  Module Federation picks one version (usually the higher one — React 18).
  The React 17 MFE runs on React 18 under the hood.
  React 18 is backwards compatible with React 17 code in most cases,
  so this often just works. You get a console warning:
  "Shared module react@17.0.2 is not a singleton..."

HOW TO HANDLE THE MIGRATION PROPERLY:

  Phase 1: Keep both working during transition
    - Remove React from shared for the legacy MFE temporarily
    - It bundles its own React 17 (adds bundle size, breaks cross-MFE context — acceptable short-term)
    - Container and other MFEs share React 18 normally

  Phase 2: Upgrade the legacy MFE to React 18
    - React 18 upgrade is mostly non-breaking (remove React.render → createRoot)
    - Add React back to shared config
    - Back to one React instance

  Phase 3: Done — all MFEs on React 18

KEY INSIGHT:
  Never keep mixed major versions of React long-term. The breakage is subtle and
  hard to debug. Treat a React version gap as tech debt with a deadline.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. HOW DOES ROUTING WORK ACROSS MFEs?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: If I have a container and multiple MFEs, who controls the URL? Who handles routing?

A:
Routing in MFE has two distinct levels. Getting this wrong causes subtle bugs.

─────────────────────────────────────────────────────────────
LEVEL 1: TOP-LEVEL ROUTING (Container owns this)
─────────────────────────────────────────────────────────────
The shell/container decides which MFE to show based on the URL path.
It uses BrowserRouter because it needs to own the real browser history.

  // container/src/App.js
  import { BrowserRouter, Routes, Route } from 'react-router-dom';
  const ProductsApp = React.lazy(() => import('products/App'));
  const CartApp     = React.lazy(() => import('cart/App'));

  export default function App() {
    return (
      <BrowserRouter>
        <Header />
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/products/*" element={<ProductsApp />} />
            <Route path="/cart/*"     element={<CartApp />} />
            <Route path="/account/*"  element={<AccountApp />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }

Note the /* — this tells React Router "pass remaining path segments to the MFE."

─────────────────────────────────────────────────────────────
LEVEL 2: INTERNAL MFE ROUTING (Each MFE owns its sub-routes)
─────────────────────────────────────────────────────────────
Each MFE handles its own sub-routes — /products/123, /products/search, etc.

WRONG: Using BrowserRouter inside an MFE
  If the MFE creates its own BrowserRouter, it creates a second history instance.
  Two history objects fighting over the URL = unpredictable back button behavior.

RIGHT: Use MemoryRouter inside the MFE
  MemoryRouter keeps routing state in memory, not in the browser URL.
  The container's BrowserRouter owns the real URL. The MFE handles
  logical sub-navigation internally without touching the browser bar.

  // products/src/App.js
  import { MemoryRouter, Routes, Route } from 'react-router-dom';

  export default function ProductsApp() {
    return (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/"         element={<ProductList />} />
          <Route path="/:id"      element={<ProductDetail />} />
          <Route path="/search"   element={<SearchResults />} />
        </Routes>
      </MemoryRouter>
    );
  }

─────────────────────────────────────────────────────────────
HOW MFEs TRIGGER NAVIGATION TO OTHER MFEs
─────────────────────────────────────────────────────────────
An MFE should never import the container's router. Instead, it fires an event:

  // Inside products MFE — user clicks "Go to Cart"
  window.dispatchEvent(new CustomEvent('mfe:navigate', {
    detail: { path: '/cart' }
  }));

  // Container listens and uses its own router
  window.addEventListener('mfe:navigate', (e) => {
    navigate(e.detail.path);   // container's react-router navigate()
  });

This keeps the MFE completely decoupled from the container's routing implementation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. HOW DO MFEs TALK TO EACH OTHER?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: If the cart MFE needs to know the user just logged in (which is handled by the auth MFE),
   how do they communicate?

A:
The golden rule: MFEs should not directly import each other.
If products imports cart, you've just coupled two teams' codebases — defeats the purpose.

─────────────────────────────────────────────────────────────
PATTERN 1: PROPS FROM CONTAINER (parent to child)
─────────────────────────────────────────────────────────────
Container passes data down to an MFE like any React component.
Best for: data the container already has (user info, feature flags).

  // container mounts the MFE and passes what it knows
  <ProductsApp
    userId={currentUser.id}
    onAddToCart={(item) => cartService.add(item)}
    featureFlags={flags}
  />

─────────────────────────────────────────────────────────────
PATTERN 2: CUSTOM DOM EVENTS (the pub-sub approach)
─────────────────────────────────────────────────────────────
Best for: sibling MFEs communicating without knowing about each other.

  // auth MFE fires an event when user logs in
  window.dispatchEvent(new CustomEvent('auth:login', {
    bubbles: true,
    detail: { userId: '123', name: 'Veerendra' }
  }));

  // cart MFE listens — it doesn't know who fired this event
  window.addEventListener('auth:login', (event) => {
    loadUserCart(event.detail.userId);
  });

  // header MFE also listens
  window.addEventListener('auth:login', (event) => {
    showUserAvatar(event.detail.name);
  });

NAMING CONVENTION (prevents collisions):
  'auth:login'          → auth MFE fires this
  'cart:item-added'     → cart MFE fires this
  'shell:theme-changed' → container fires this

  Prefix with the MFE name. Any team can listen, none need to coordinate.

─────────────────────────────────────────────────────────────
PATTERN 3: SHARED SINGLETON SERVICE
─────────────────────────────────────────────────────────────
A service object shared via Module Federation's singleton mechanism.
Because Module Federation guarantees one instance, all MFEs see the same state.

  // @company/auth-service/index.js (published package or exposed by container)
  class AuthService {
    constructor() {
      this._user = null;
      this._listeners = [];
    }
    setUser(user) {
      this._user = user;
      this._listeners.forEach(fn => fn(user));
    }
    getUser()              { return this._user; }
    onUserChange(fn)       { this._listeners.push(fn); return () => {
      this._listeners = this._listeners.filter(l => l !== fn); // unsubscribe
    }; }
  }

  export const authService = new AuthService();  // singleton instance

  // Products MFE
  import { authService } from '@company/auth-service';
  const user = authService.getUser();
  authService.onUserChange((u) => setCurrentUser(u));

─────────────────────────────────────────────────────────────
PATTERN 4: URL / QUERY PARAMS (simplest, most durable)
─────────────────────────────────────────────────────────────
Put shared state in the URL. Any MFE can read it. Survives page refresh.

  /products?userId=123&category=shoes

Best for: search state, filters, navigation context.
Not for: sensitive data like tokens.

─────────────────────────────────────────────────────────────
WHICH PATTERN TO CHOOSE?
─────────────────────────────────────────────────────────────

  Props from container    →  container needs to pass data to a specific MFE
  Custom events           →  sibling MFEs, loose coupling, one fires many listen
  Singleton service       →  auth/user state, needs reactivity and getter
  URL params              →  navigation state, shareable links, filters

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. HOW DO YOU SHARE STATE ACROSS MFEs?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What if the header MFE needs to show the cart count? That's state owned by the cart MFE.

A:
This is the question that reveals if someone truly understands MFE trade-offs.

WRONG ANSWER: Just use Redux globally.
  If you have one global Redux store shared across all MFEs, you've recreated the
  monolith's coupling problem — just with a different technology. Every team now
  depends on the same store shape.

RIGHT APPROACH: Minimal sharing, the right tool per type.

─────────────────────────────────────────────────────────────
THE CART COUNT PROBLEM — SOLVED
─────────────────────────────────────────────────────────────
The cart MFE owns the cart state. When items change, it fires an event:

  // Inside cart MFE
  const addItem = (item) => {
    const updatedCart = [...cartItems, item];
    setCartItems(updatedCart);
    window.dispatchEvent(new CustomEvent('cart:updated', {
      detail: { count: updatedCart.length }
    }));
  };

  // Header MFE listens
  const [cartCount, setCartCount] = useState(0);
  useEffect(() => {
    const handler = (e) => setCartCount(e.detail.count);
    window.addEventListener('cart:updated', handler);
    return () => window.removeEventListener('cart:updated', handler);
  }, []);

The cart MFE doesn't know about the header MFE. The header MFE doesn't need to
reach into the cart's state. Clean, decoupled, observable.

─────────────────────────────────────────────────────────────
GUIDELINES FOR SHARED STATE
─────────────────────────────────────────────────────────────

  Auth / user identity     → Singleton service + events (or httpOnly cookie + server)
  Cart count / badge       → Events from cart MFE, header listens
  Current route            → Browser URL (owned by container)
  Feature flags            → Container fetches, passes via props or shared service
  User preferences         → localStorage (any MFE can read; storage events for reactivity)
  Server-persisted data    → Each MFE fetches from its own API (no sharing needed)

─────────────────────────────────────────────────────────────
THE REAL RULE
─────────────────────────────────────────────────────────────
If two MFEs need to share a lot of state constantly, they probably belong in the
same MFE. Frequent state sharing is a signal of wrong domain boundaries.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. HOW DO YOU HANDLE AUTHENTICATION?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: If a user logs in on the auth MFE, how does the products MFE know they're logged in?

A:
Auth is always owned by the container/shell. MFEs should never handle the login flow.

THE FLOW:
  1. User hits the app unauthenticated
  2. Container detects this (no token, 401 from API)
  3. Container redirects to IdP (Auth0, Okta, Cognito) or shows login MFE
  4. Login completes → token returned to container
  5. Container stores token + exposes user info to MFEs

HOW MFEs ACCESS AUTH:

  Option A — Container exposes an auth module (Module Federation)
    // shell/src/auth/index.js  (exposed in shell's webpack config)
    let _user = null;
    let _token = null;
    const listeners = [];

    export const authService = {
      init(user, token) {
        _user = user; _token = token;
        listeners.forEach(fn => fn(user));
      },
      getUser()   { return _user; },
      getToken()  { return _token; },
      onChange(fn) { listeners.push(fn); },
    };

    // Any MFE
    import { authService } from 'shell/auth';
    const token = authService.getToken();

  Option B — httpOnly Cookie (most secure, recommended for production)
    Auth token lives in a server-set httpOnly cookie on the parent domain.
    Browser automatically sends it with every API request to that domain.
    No JS ever touches the token → immune to XSS.

    Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Domain=.acme.com

    MFEs make API calls normally. The token attaches invisibly.
    This is the cleanest approach — no token passing between MFEs at all.

WHAT MFEs MUST NOT DO:
  - Redirect to /login themselves → fire an event, let the container handle it
  - Store the token in localStorage → XSS in any MFE can steal it
  - Have their own login page → single responsibility, container owns auth

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. HOW DO YOU PREVENT CSS FROM ONE MFE BREAKING ANOTHER?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: Team A uses Tailwind, Team B uses Bootstrap. Won't those conflict?

A:
Yes — this is a real problem. Global CSS is the enemy in MFE architecture.
Here are the strategies from weakest to strongest isolation:

─────────────────────────────────────────────────────────────
STRATEGY 1: BEM + MFE Namespace prefix (low-tech, requires discipline)
─────────────────────────────────────────────────────────────
Every class in every MFE is prefixed with the MFE name.

  /* products MFE — no class named just "card" */
  .products-card { padding: 16px; }
  .products-card__title { font-size: 18px; }

  /* cart MFE */
  .cart-item { border-bottom: 1px solid #eee; }

  Works if teams follow the convention. Breaks if they forget.

─────────────────────────────────────────────────────────────
STRATEGY 2: CSS Modules (best for React MFEs)
─────────────────────────────────────────────────────────────
The build tool transforms class names into unique hashes at compile time.

  /* ProductCard.module.css */
  .card  { padding: 16px; }
  .title { font-size: 18px; }

  // In component
  import styles from './ProductCard.module.css';
  <div className={styles.card}>    // → class="card_a3f9k2"

  No runtime overhead. Cannot conflict with any other MFE's classes.
  This is the recommended approach for most teams.

─────────────────────────────────────────────────────────────
STRATEGY 3: CSS-in-JS (Styled Components / Emotion)
─────────────────────────────────────────────────────────────
Generates unique class names at runtime. Zero global namespace.

  const Card = styled.div`
    padding: 16px;
    background: white;
  `;  // → class="sc-xyz123 iBcYst"

  Must ensure styled-components is a singleton (Module Federation shared).
  Two instances = styles injected twice or incorrectly.

─────────────────────────────────────────────────────────────
STRATEGY 4: Shadow DOM (strongest isolation — for Web Components)
─────────────────────────────────────────────────────────────
Styles inside a shadow root are completely isolated from the page.
External styles can't get in. Internal styles can't get out.

  class ProductsMFE extends HTMLElement {
    connectedCallback() {
      const shadow = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `.btn { color: red; }`;  // won't leak outside
      shadow.appendChild(style);
    }
  }

HANDLING SHARED DESIGN TOKENS:
  Regardless of isolation strategy, MFEs need to share brand colors,
  spacing, typography. Use CSS custom properties (variables):

  /* published in @company/design-tokens */
  :root {
    --color-primary: #007bff;
    --spacing-md: 16px;
    --font-size-body: 14px;
  }

  These pierce Shadow DOM via inheritance and are available to all MFEs.
  Updating the design token package updates all MFEs simultaneously.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. HOW DOES INDEPENDENT DEPLOYMENT ACTUALLY WORK?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: Walk me through what happens when Team A deploys their MFE. Does the container need to
   redeploy too?

A:
No — that's the whole point. Here's the end-to-end flow:

SETUP:
  Each MFE builds to static assets (JS + CSS chunks) and uploads to a CDN.

  https://cdn.acme.com/products/latest/remoteEntry.js    ← always current
  https://cdn.acme.com/products/latest/main.abc123.js    ← content-hashed chunk

  Container config points to the CDN URL, not a version:
    remotes: { products: 'products@https://cdn.acme.com/products/latest/remoteEntry.js' }

TEAM A DEPLOYS A FIX:
  1. Team A merges PR → CI pipeline triggers
  2. Webpack builds new chunks → new content-hash filenames
  3. New remoteEntry.js updated to point to new chunk hashes
  4. Files uploaded to CDN (overwriting /latest/remoteEntry.js)
  5. Done. Container is NOT touched. Container is NOT redeployed.

  When users next visit the site:
  6. Container loads (from CDN cache or server)
  7. React.lazy triggers → fetches /latest/remoteEntry.js (no-cache)
  8. Gets new chunk hashes → fetches new chunks
  9. Users see the updated products MFE

VERSIONED URL STRATEGY (safer for production):
  Instead of /latest, use versioned paths + a config service:

  https://cdn.acme.com/products/v2.4.0/remoteEntry.js

  A config API tells the container which version to load:
  GET /api/mfe-versions  →  { "products": "v2.4.0", "cart": "v1.9.1" }

  BENEFITS:
  - Rollback is instant: just update the config API response
  - Canary deployments: 5% of users get v2.5.0, rest get v2.4.0
  - No user sees a broken deploy if you gate through the config service

CACHING RULES (critical for correctness):
  remoteEntry.js          →  Cache-Control: no-cache  (always fresh)
  *.chunk.js files        →  Cache-Control: max-age=31536000  (1 year, content-hashed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. HOW DO YOU HANDLE A MFE THAT FAILS TO LOAD?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What happens to the user if the cart MFE's CDN goes down?

A:
In a poorly built MFE app: the whole page crashes. In a well-built one: only the
cart section shows an error. Everything else keeps working.

The tool that makes this possible is React Error Boundary + Suspense.

  // A reusable wrapper for any MFE
  class MFEErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, info) {
      // Log to Sentry, Datadog, etc.
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

  // Usage in container
  const CartApp = React.lazy(() => import('cart/App'));

  function CartSection() {
    return (
      <MFEErrorBoundary name="cart">
        <Suspense fallback={<CartSkeleton />}>
          <CartApp />
        </Suspense>
      </MFEErrorBoundary>
    );
  }

If cart's remoteEntry.js is unreachable:
  - React.lazy import throws → Suspense catches it while loading
  - If it errors → Error Boundary catches it
  - User sees "This section is temporarily unavailable. [Retry]"
  - Header, Products, Navigation all continue working normally

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. WHAT ARE THE REAL DOWNSIDES? WHEN WOULD YOU NOT USE MFE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: MFE sounds great. What's the catch?

A:
The MFE architecture is often oversold. Here are the honest trade-offs:

GENUINE COSTS:

  Operational complexity
    Every MFE needs its own CI/CD pipeline, CDN config, monitoring, alerting.
    What was one deployment artifact is now five. Infrastructure burden is real.

  UX inconsistency
    Team A uses their own button style. Team B uses another. Over time, the app
    looks like it was built by four different companies — because it was.
    Requires a shared design system + enforcement process.

  Performance overhead
    Multiple network requests to load MFEs. Without careful lazy loading and
    caching, initial page load is slower than a well-optimized monolith.

  Debugging across boundaries
    Stack trace says "Error in products MFE." But the state that caused it
    came from auth MFE via an event. Distributed debugging is hard.
    Need correlation IDs and unified logging across all MFEs.

  Version coordination (the hidden coupling)
    Upgrading react-router from v5 to v6 now requires ALL teams to upgrade
    before anyone can use v6 features in the shared module. You've traded
    release coupling for upgrade coupling.

  Testing is harder
    Unit tests: fine (each MFE in isolation).
    Integration tests: hard (testing two MFEs together requires both to run).
    E2E tests: require the whole stack to be deployed.

WHEN NOT TO USE MFE:
  - Team < 8 frontend engineers — coordination overhead eats your velocity
  - Already deploying everything together — no actual independence gain
  - MVP or early product — wrong time to take on infra complexity
  - High UX consistency requirements — design tools, creative apps, IDEs
  - No clear domain boundaries — forced split = artificial boundaries = more pain

THE TEST: "Would independent deployment actually save us time this quarter?"
  If yes → MFE is worth exploring.
  If no  → optimize your monolith (better code splitting, feature flags, modular architecture).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. HOW WOULD YOU MIGRATE AN EXISTING MONOLITH TO MFEs?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: We have a 4-year-old React monolith. How do we migrate to MFE without a big-bang rewrite?

A:
Use the Strangler Fig pattern. You never rewrite — you grow the new system around
the old one until the old one has nothing left.

─────────────────────────────────────────────────────────────
PHASE 1: ADD A SHELL IN FRONT OF THE MONOLITH
─────────────────────────────────────────────────────────────
Create a minimal shell/container app. For now, it just proxies everything to the
monolith. Users don't notice any change.

  // shell routes ALL traffic to monolith MFE
  remotes: { legacy: 'legacy@https://your-old-app.com/remoteEntry.js' }

  // OR simply render the monolith in an iframe temporarily
  // (crude but buys you the shell structure without any monolith changes)

─────────────────────────────────────────────────────────────
PHASE 2: EXTRACT THE LOWEST-RISK FEATURE FIRST
─────────────────────────────────────────────────────────────
Pick a feature that is:
  - Self-contained (few external dependencies)
  - Has a clear URL boundary (/account, /help, /promotions)
  - Owned by one team

Build it as a new MFE. Shell routes /account to new MFE, everything else to monolith.

─────────────────────────────────────────────────────────────
PHASE 3: REPEAT, FEATURE BY FEATURE
─────────────────────────────────────────────────────────────
  Month 1: /account → Account MFE
  Month 2: /cart    → Cart MFE
  Month 3: /search  → Search MFE
  Month 6: /products → Products MFE

The monolith shrinks with each extraction. Users never see a disruption.

─────────────────────────────────────────────────────────────
PHASE 4: DECOMMISSION THE MONOLITH
─────────────────────────────────────────────────────────────
When the monolith serves no routes, shut it down. Migration complete.

WHAT TO DO ABOUT SHARED CODE IN THE MONOLITH:
  Identify code used across multiple features (utilities, hooks, services).
  Extract it into a shared package before you extract the MFEs.
  Publish to your private npm registry as @company/shared-utils.
  Both the monolith and new MFEs can import from it during transition.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. QUICK-FIRE SCENARIO QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What is remoteEntry.js?
A: The manifest file a remote MFE exposes — tells the host what modules are available
   and what chunks to fetch. Should never be cached; chunks are cached aggressively.

Q: Why singleton: true for React?
A: React must exist as one instance in memory. Two instances = hooks don't work
   across MFE boundaries, context is invisible between them.

Q: Container uses BrowserRouter. What should each MFE use?
A: MemoryRouter. Avoids two history objects fighting over the URL.

Q: Two sibling MFEs need to communicate. How?
A: Custom DOM events via window.dispatchEvent / window.addEventListener.
   Namespace events by MFE name to avoid collisions.

Q: Your design system releases v3.0 with breaking changes. How do you coordinate?
A: Publish v3.0 to npm. Communicate the migration guide to all teams.
   Teams upgrade on their own timeline. During transition, some MFEs are on v2,
   some on v3. This is fine as long as Module Federation doesn't force a singleton.
   For singletons (styled-components), coordinate a synchronized upgrade window.

Q: How do you test a MFE?
A: Three layers:
   1. Unit tests inside the MFE repo (Jest + RTL) — fast, in isolation
   2. Integration tests with a mocked shell (test MFE mounts correctly, events fire)
   3. E2E tests in staging with the real container + real MFEs (Cypress / Playwright)
   Add contract tests (Pact) to verify the interface between container and MFE
   without running both simultaneously.

Q: Team A wants to use Vue, everyone else uses React. Is that OK?
A: Technically yes — that's the whole promise of MFEs. But you lose React Context
   and shared React libs between Team A and others. You also maintain two dev cultures.
   The organizational cost usually outweighs the technical freedom. Strongly encourage
   alignment on one framework unless there's a compelling reason (legacy system, specialty tool).

Q: Performance got worse after migrating to MFE. Why?
A: Common reasons:
   - MFEs loading eagerly instead of lazily (fix: React.lazy + route-based splitting)
   - React or other libs not in shared config (fix: deduplicate via Module Federation)
   - remoteEntry.js files not preloaded (fix: <link rel="preload">)
   - Too many sequential network requests (fix: HTTP/2, CDN, preloading)

Q: What's the difference between Module Federation and Web Components for MFE?
A: Module Federation: React-centric, shares JS modules and React components,
   no CSS isolation out of the box, tightest integration.
   Web Components: framework-agnostic, browser-native, true CSS isolation via Shadow DOM,
   but has friction with React events and SSR. Choose Web Components when teams use
   different frameworks or you need a truly tech-agnostic boundary.
