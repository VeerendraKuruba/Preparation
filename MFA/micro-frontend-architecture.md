MICRO FRONTEND ARCHITECTURE — INTERVIEW QUESTIONS & ANSWERS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TABLE OF CONTENTS
  1.  What is Micro Frontend Architecture?
  2.  Why Micro Frontends? Problems they solve.
  3.  Integration approaches (Build-time vs Run-time)
  4.  Module Federation (Webpack 5)
  5.  iFrame-based integration
  6.  Web Components approach
  7.  Routing in Micro Frontends
  8.  Shared state management across MFEs
  9.  Communication between Micro Frontends
  10. CSS isolation strategies
  11. Authentication & session sharing
  12. Performance considerations
  13. CI/CD and independent deployments
  14. Trade-offs and when NOT to use MFEs
  15. Real-world scenario questions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. WHAT IS MICRO FRONTEND ARCHITECTURE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What is micro frontend architecture and how does it differ from a monolithic frontend?

A:
Micro frontend architecture applies microservices principles to the frontend. Instead of
one large application, the UI is split into independently developed, deployed, and
maintained pieces owned by different teams.

MONOLITHIC FRONTEND:
  - Single codebase, single deployment unit
  - All teams work in same repo (often)
  - One build pipeline, one release cycle
  - Scaling = scaling the whole app
  - Tech stack locked in globally

MICRO FRONTEND:
  - Multiple small apps composed into one UI
  - Each team owns an end-to-end vertical slice
  - Independent builds and deployments
  - Teams can choose their own tech stack
  - Failures are isolated

Real analogy:
  Shell (container app) = Shopping mall building
  Each MFE = Individual store with its own staff, products, decor

Example breakdown of an e-commerce site:
  - container/shell      → routing, layout, auth
  - products MFE         → product listing, search
  - cart MFE             → cart, checkout
  - account MFE          → profile, orders
  - marketing MFE        → banners, promotions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. WHY MICRO FRONTENDS? PROBLEMS THEY SOLVE.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What are the main motivations for adopting micro frontend architecture?

A:
PROBLEM → SOLUTION

1. TEAM SCALING
   Problem: 50 engineers in one frontend repo → merge conflicts, slow PRs, coordination hell
   Solution: Each team has its own repo, pipeline, and deployment — no contention

2. INDEPENDENT DEPLOYMENTS
   Problem: One team blocks others from releasing
   Solution: Teams ship independently without waiting for a joint release

3. TECH DEBT / LEGACY MIGRATION
   Problem: Need to migrate from AngularJS to React but can't rewrite everything at once
   Solution: Migrate feature by feature — new MFEs in React while old ones stay in Angular

4. DIFFERENT TECH STACKS
   Problem: Some features need Vue, others need React, some are vanilla JS
   Solution: Each MFE can use any framework — composed at runtime

5. FAULT ISOLATION
   Problem: One bug crashes the entire app
   Solution: A failing MFE can be replaced with a fallback; rest of app is unaffected

6. DOMAIN OWNERSHIP
   Problem: Cross-team PRs and unclear ownership
   Solution: Team owns full vertical: backend API + MFE UI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. INTEGRATION APPROACHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What are the different ways to integrate micro frontends?

A:

A) BUILD-TIME INTEGRATION (NPM packages)
   - Each MFE is published as an npm package
   - Container installs and bundles them at build time

   Pros:  Simple, type-safe, familiar workflow
   Cons:  Any MFE change requires container to rebuild & redeploy
          NOT truly independent — defeats the purpose

   Example:
     // container package.json
     { "dependencies": { "@company/products-mfe": "^1.2.0" } }

B) RUN-TIME INTEGRATION — SERVER-SIDE (SSI / Edge)
   - Server stitches HTML fragments from multiple services
   - Nginx/CDN merges <include> directives before sending to browser

   Pros:  Good SEO, fast initial paint, no JS overhead
   Cons:  Complex server infra, harder dynamic interactivity

C) RUN-TIME INTEGRATION — CLIENT-SIDE (Most common)
   - Container fetches and mounts MFEs in the browser at runtime
   - Three main techniques: Module Federation, iFrames, Web Components

   This is the most widely used approach — covered in detail below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. MODULE FEDERATION (WEBPACK 5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: Explain Webpack Module Federation. How does it enable micro frontends?

A:
Module Federation lets one JS application dynamically load code from another application
at runtime — sharing dependencies, exposing components, without build-time coupling.

KEY CONCEPTS:
  Host (container):    the app that consumes remote modules
  Remote:              the app that exposes modules
  Shared:              libraries shared between host and remotes (e.g. React)

CONTAINER WEBPACK CONFIG (host):
  // container/webpack.config.js
  new ModuleFederationPlugin({
    name: 'container',
    remotes: {
      products: 'products@http://localhost:3001/remoteEntry.js',
      cart:     'cart@http://localhost:3002/remoteEntry.js',
    },
    shared: {
      react:     { singleton: true, requiredVersion: deps.react },
      'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
    },
  })

PRODUCTS MFE WEBPACK CONFIG (remote):
  // products/webpack.config.js
  new ModuleFederationPlugin({
    name: 'products',
    filename: 'remoteEntry.js',        // entry point exposed to host
    exposes: {
      './ProductList': './src/components/ProductList',
      './App':         './src/App',
    },
    shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
  })

USING IN CONTAINER (React lazy loading):
  // container/src/App.js
  const ProductList = React.lazy(() => import('products/ProductList'));

  function App() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <ProductList />
      </Suspense>
    );
  }

HOW IT WORKS AT RUNTIME:
  1. Container loads, sees import('products/ProductList')
  2. Browser fetches http://localhost:3001/remoteEntry.js  (manifest file)
  3. remoteEntry.js tells browser what chunks to fetch
  4. Shared dependencies (React) are negotiated — only one copy loaded
  5. ProductList component is mounted inside container

SINGLETON SHARING — Why it matters:
  React must exist only once in memory. If products loads its own React
  and container has another, hooks break. singleton: true ensures only one
  version runs — the highest compatible version wins.

VERSIONING STRATEGY:
  shared: {
    react: {
      singleton: true,
      strictVersion: false,   // warn but don't crash on version mismatch
      requiredVersion: '^18.0.0',
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. IFRAME-BASED INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: When would you use iFrames for micro frontend integration? What are the trade-offs?

A:
iFrames are the most isolated integration method — each MFE runs in a completely
separate browsing context with its own JS runtime, cookies, and DOM.

USE CASES:
  - Legacy apps that can't be refactored (old Silverlight, Flash, AngularJS)
  - High-security widgets (payment forms, OAuth flows)
  - Third-party embeds where you don't control the source

PROS:
  - Complete JS and CSS isolation — zero leakage
  - Can embed any technology (even non-JS apps)
  - Security boundary — XSS in iframe can't reach parent
  - No dependency conflicts whatsoever

CONS:
  - UX problems: no native scroll pass-through, broken keyboard nav
  - URL not reflected in parent browser bar
  - Accessibility problems (focus trapping, screen readers)
  - Performance: separate document parse + render per iframe
  - Communication only via postMessage (verbose, type-unsafe)
  - Cannot share React state, context, or event bus directly

COMMUNICATION EXAMPLE:
  // Parent → Child
  document.getElementById('cart-iframe').contentWindow.postMessage(
    { type: 'USER_LOGGED_IN', payload: { userId: '123' } },
    'http://localhost:3002'   // target origin — always specify for security
  );

  // Child listening
  window.addEventListener('message', (event) => {
    if (event.origin !== 'http://localhost:3001') return;  // validate origin!
    if (event.data.type === 'USER_LOGGED_IN') {
      initUser(event.data.payload);
    }
  });

VERDICT: Use iframes as a last resort or for genuine isolation needs.
For most micro frontend use cases, Module Federation is preferred.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. WEB COMPONENTS APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: How can Web Components be used as an integration strategy for micro frontends?

A:
Web Components (Custom Elements + Shadow DOM) are a browser-native way to package
a MFE as a custom HTML element that any framework can consume.

DEFINE A MFE AS A WEB COMPONENT:
  // products-mfe/src/index.js
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import App from './App';

  class ProductsMFE extends HTMLElement {
    connectedCallback() {
      this._root = ReactDOM.createRoot(this);
      this._root.render(<App />);
    }
    disconnectedCallback() {
      this._root.unmount();
    }
  }

  customElements.define('products-mfe', ProductsMFE);

USE IN CONTAINER (any framework or plain HTML):
  <!-- container/index.html -->
  <script src="http://localhost:3001/bundle.js"></script>

  <!-- Use like a native HTML element -->
  <products-mfe></products-mfe>

PASSING DATA VIA ATTRIBUTES:
  // Setting attributes from container
  const el = document.querySelector('products-mfe');
  el.setAttribute('user-id', '123');

  // Receiving in the Web Component
  static get observedAttributes() { return ['user-id']; }
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'user-id') this.userId = newVal;
  }

SHADOW DOM FOR CSS ISOLATION:
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    // styles only apply inside shadow root
    const style = document.createElement('style');
    style.textContent = '.btn { color: red; }';  // won't leak out
    shadow.appendChild(style);
    shadow.appendChild(wrapper);
    ReactDOM.createRoot(wrapper).render(<App />);
  }

PROS:
  - Framework-agnostic — works in Vue, Angular, plain HTML
  - Shadow DOM gives true CSS isolation
  - Versioned independently as a script tag

CONS:
  - React and Shadow DOM have friction (events don't bubble through shadow DOM natively)
  - Server-side rendering is complex
  - Attribute values are always strings — objects need JSON.parse

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. ROUTING IN MICRO FRONTENDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: How does routing work across micro frontends? Who owns the URL?

A:
Routing is one of the trickiest parts of MFE architecture. There are two levels:

LEVEL 1 — TOP-LEVEL ROUTING (Container owns this)
  The container/shell decides which MFE to mount based on the URL path.

  // container/src/App.js (using React Router)
  function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/products/*" element={<ProductsApp />} />
          <Route path="/cart/*"     element={<CartApp />} />
          <Route path="/account/*"  element={<AccountApp />} />
        </Routes>
      </BrowserRouter>
    );
  }

LEVEL 2 — IN-APP ROUTING (Each MFE owns its sub-routes)
  The MFE handles its own sub-routes using MemoryRouter (not BrowserRouter)
  to avoid conflicting with the container's router.

  // products-mfe/src/App.js
  function ProductsApp() {
    return (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/"        element={<ProductList />} />
          <Route path="/:id"     element={<ProductDetail />} />
          <Route path="/search"  element={<SearchResults />} />
        </Routes>
      </MemoryRouter>
    );
  }

  WHY MemoryRouter?
  If the MFE uses BrowserRouter, it fights the container's BrowserRouter over
  the history object. MemoryRouter keeps routing state in memory, isolated.

CROSS-MFE NAVIGATION:
  MFEs should NOT directly import each other's routes. Instead:
  - Use the browser's history API: window.history.pushState()
  - Or emit a custom event: window.dispatchEvent(new CustomEvent('navigate', { detail: '/cart' }))
  - Container listens and updates top-level route

STRATEGY SUMMARY:
  Container: BrowserRouter  — handles /products, /cart, /account
  Each MFE:  MemoryRouter   — handles sub-routes internally
  Cross-MFE nav: custom events or history API

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. SHARED STATE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: How do you manage state that needs to be shared across multiple micro frontends?

A:
Shared state is the hardest problem in MFE architecture. Options ranked by coupling:

OPTION 1 — URL / Query Params (least coupling, best for SEO)
  Share state via the URL. Any MFE can read it.
  Use case: search query, filters, pagination
  ?q=shoes&category=footwear&page=2

OPTION 2 — Custom Events / Event Bus (pub-sub)
  MFEs communicate via browser custom events. No shared library needed.

  // Publisher (cart MFE)
  window.dispatchEvent(new CustomEvent('cart:item-added', {
    detail: { productId: 'abc', quantity: 1 }
  }));

  // Subscriber (header MFE showing cart count)
  window.addEventListener('cart:item-added', (event) => {
    updateCartBadge(event.detail.quantity);
  });

  Pros: Zero coupling, works across any framework
  Cons: No type safety, hard to debug, event names need convention

OPTION 3 — Shared Library (published to npm)
  A shared @company/store package wraps a Zustand/Redux store.
  Both MFEs import it. Module Federation ensures singleton.

  // @company/store/index.js
  import { create } from 'zustand';
  export const useCartStore = create((set) => ({
    items: [],
    addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  }));

  Cons: Creates coupling — MFEs must use same store version

OPTION 4 — Backend for Frontend (BFF) / Server as source of truth
  State lives server-side. Each MFE fetches its own slice.
  Use case: user auth state, preferences, cart persisted in DB
  This is the most scalable approach for production.

GOLDEN RULE:
  Minimize cross-MFE state sharing. If two MFEs constantly share state,
  they probably belong in the same MFE. Use the event bus for notifications,
  the URL for navigation state, and the server for persistent state.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. COMMUNICATION BETWEEN MICRO FRONTENDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What are the patterns for MFE-to-MFE communication?

A:

PATTERN 1 — PROPS / CALLBACKS (parent-to-child, tight coupling)
  Container passes data to MFE as props (if using Module Federation):

  // Container renders products MFE
  <ProductsApp
    userId={currentUser.id}
    onAddToCart={(item) => cartService.add(item)}
  />

  Good for: container→MFE communication
  Bad for:  sibling MFE communication

PATTERN 2 — CUSTOM DOM EVENTS (loosely coupled broadcast)
  Any MFE fires an event; any MFE listens. No direct reference needed.

  // Namespaced event convention prevents collisions
  const EVENT_TYPES = {
    USER_LOGIN:      'auth:user-login',
    CART_UPDATED:    'cart:updated',
    ROUTE_CHANGE:    'shell:route-change',
  };

  // Fire
  window.dispatchEvent(new CustomEvent(EVENT_TYPES.CART_UPDATED, {
    bubbles: true,
    detail: { itemCount: 3 }
  }));

  // Listen
  window.addEventListener(EVENT_TYPES.CART_UPDATED, handler);

PATTERN 3 — SHARED SINGLETON SERVICE (via Module Federation)
  A service module is shared and accessed by multiple MFEs.
  Because it's a singleton (Module Federation ensures one instance),
  all MFEs reference the same object in memory.

  // @company/auth-service (exposed via Module Federation)
  class AuthService {
    constructor() { this._user = null; }
    login(user) { this._user = user; this._notify(); }
    getUser()   { return this._user; }
    subscribe(fn) { this._listeners.push(fn); }
    _notify()   { this._listeners.forEach(fn => fn(this._user)); }
  }
  export const authService = new AuthService();  // singleton

PATTERN 4 — LOCALSTORAGE / SESSIONSTORAGE (simple, low-fi)
  Works across MFEs on same origin without any framework.
  Use for: auth tokens, user preferences, cart IDs

  // Products MFE reads auth token
  const token = localStorage.getItem('auth_token');

  Pros: zero coupling, survives page refresh
  Cons: no reactivity — MFE won't know when another MFE updates it
        (fix: combine with storage event listener)

  window.addEventListener('storage', (e) => {
    if (e.key === 'auth_token') refreshAuth(e.newValue);
  });

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. CSS ISOLATION STRATEGIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: How do you prevent CSS from one micro frontend from bleeding into another?

A:
CSS isolation is critical — without it, one MFE's styles will break another's.

STRATEGY 1 — CSS Modules (compile-time scoping)
  Each class name gets a unique hash: .btn → .btn_a3f9k2
  Styles never conflict because class names are unique per MFE.

  // ProductCard.module.css
  .card { padding: 16px; }
  .title { font-size: 18px; }

  // In component
  import styles from './ProductCard.module.css';
  <div className={styles.card}>  // becomes class="card_a3f9k2"

STRATEGY 2 — BEM Naming Convention with MFE Prefix
  Team discipline approach — prefix every class with the MFE name.

  /* products MFE */
  .products-card { }
  .products-card__title { }
  .products-card--featured { }

  /* cart MFE */
  .cart-item { }
  .cart-item__price { }

STRATEGY 3 — Shadow DOM (Web Components)
  True browser-native isolation. Styles inside shadow root cannot leak out
  and external styles cannot bleed in (unless using CSS custom properties).

  const shadow = this.attachShadow({ mode: 'open' });
  // styles here are truly isolated

STRATEGY 4 — CSS-in-JS (Styled Components, Emotion)
  Generates unique class names at runtime. Zero global namespace pollution.

  const Card = styled.div`
    padding: 16px;
    background: white;
  `;  // generates class like .sc-abc123

STRATEGY 5 — Scoped Resets
  Each MFE applies its own CSS reset scoped to its root element:

  #products-mfe * { box-sizing: border-box; margin: 0; }

RECOMMENDATION:
  CSS Modules or CSS-in-JS for most teams. Shadow DOM only if using Web Components.
  Always establish a shared design token system (CSS custom properties) so MFEs
  share brand colors, spacing, typography without style conflicts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. AUTHENTICATION & SESSION SHARING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: How do you handle authentication and share user session across micro frontends?

A:
Auth is typically owned by the shell/container. MFEs should not handle login themselves.

ARCHITECTURE:

  Browser
    └── Container (shell)
          ├── Handles login redirect / OAuth flow
          ├── Stores JWT in httpOnly cookie OR memory
          └── Passes auth context to MFEs

APPROACH 1 — Shared Auth Service (Module Federation singleton)
  Container exposes an auth module that all MFEs import:

  // shell/src/auth/index.js  (exposed via Module Federation)
  export function getAuthToken() { return window.__authToken; }
  export function getUser()      { return window.__currentUser; }

  // Any MFE
  import { getUser } from 'shell/auth';
  const user = getUser();

APPROACH 2 — HTTP-only Cookie (most secure)
  Auth cookie is set server-side, scoped to top-level domain.
  All MFEs on subdomains automatically send it with every API request.
  No JS-accessible token → immune to XSS.

  Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Domain=.company.com

  MFEs simply make API calls — browser attaches cookie automatically.

APPROACH 3 — Silent Token Refresh Pattern
  Container gets a short-lived access token (15 min) + long-lived refresh token.
  Container silently refreshes access token in the background.
  MFEs request a token from the container when needed:

  // MFE requests fresh token from shell
  window.parent.postMessage({ type: 'GET_TOKEN' }, origin);
  window.addEventListener('message', (e) => {
    if (e.data.type === 'TOKEN_RESPONSE') apiClient.setToken(e.data.token);
  });

SINGLE SIGN-ON (SSO) FLOWS:
  - Container detects unauthenticated state
  - Redirects to Identity Provider (Auth0, Okta, Cognito)
  - Container handles callback, stores token
  - All MFEs inherit authenticated state

IMPORTANT — What MFEs should NOT do:
  - Do NOT redirect to login — emit an event, let container handle it
  - Do NOT store tokens in localStorage (XSS risk in other MFEs)
  - Do NOT have their own auth flow — delegate to container

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. PERFORMANCE CONSIDERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What are the performance risks of micro frontends and how do you mitigate them?

A:

RISK 1 — DUPLICATE DEPENDENCIES
  Products MFE and Cart MFE both bundle React → user downloads React twice.

  Mitigation:
  - Module Federation shared config with singleton: true
  - Both MFEs negotiate to use one shared copy of React at runtime

RISK 2 — MULTIPLE NETWORK WATERFALLS
  Container loads → fetches remoteEntry.js for each MFE → each fetches its chunks.
  3 sequential round trips before user sees content.

  Mitigation:
  - Preload critical MFEs: <link rel="preload" href="remoteEntry.js" as="script">
  - Render container skeleton first, lazy-load MFEs
  - Use HTTP/2 to multiplex requests
  - CDN-host remote entry files

RISK 3 — LARGE INITIAL BUNDLE (if not lazy loading)
  Container eagerly imports all MFEs = one massive bundle.

  Mitigation:
  - Always use React.lazy + Suspense for MFE imports
  - Route-based code splitting (only load cart MFE on /cart route)

  const CartApp = React.lazy(() => import('cart/App'));

RISK 4 — TOO MANY JS RUNTIMES
  Each MFE using a different version of React means multiple React runtimes.

  Mitigation:
  - Standardize on one major React version across all MFEs
  - Use strictVersion in Module Federation shared config to warn on mismatch

PERFORMANCE BUDGET CHECKLIST:
  - LCP < 2.5s → preload critical MFE, SSR shell
  - TTI < 5s   → lazy load non-visible MFEs
  - Bundle per MFE < 200KB gzipped
  - Shared deps (React, ReactDOM) load only once
  - Measure with Lighthouse, Web Vitals per MFE in isolation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. CI/CD AND INDEPENDENT DEPLOYMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: How does CI/CD work in a micro frontend setup? How do teams deploy independently?

A:
Independent deployment is the #1 business value of MFEs. Here's how to achieve it:

DEPLOYMENT MODEL:
  Each MFE:
    1. Has its own Git repo (or monorepo with independent pipelines)
    2. Builds to a static bundle (JS + CSS chunks)
    3. Deploys to a CDN (S3 + CloudFront, GCS + Cloud CDN)
    4. Has a stable URL for its remoteEntry.js

  Container:
    - Points to MFE URLs at runtime (not build time)
    - Does NOT need to redeploy when an MFE changes

STATIC URL STRATEGY:
  Option A — Always-latest URL (floating):
    http://cdn.company.com/products/latest/remoteEntry.js
    Pros: instant MFE updates without container redeploy
    Cons: a bad MFE deploy immediately breaks production for all users

  Option B — Versioned URL + config service:
    http://cdn.company.com/products/v2.3.1/remoteEntry.js
    Container reads active version from a config endpoint:
    GET /api/mfe-config → { products: 'v2.3.1', cart: 'v1.8.0' }
    Pros: rollbacks are instant (update config, no redeploy needed)
    Cons: extra config service to maintain

RECOMMENDED CI PIPELINE PER MFE:
  push → lint → test → build → upload to CDN → smoke test → done

  No coordination with other teams needed.

ROLLBACK STRATEGY:
  Option A (floating): Redeploy previous artifact to 'latest' path
  Option B (versioned): Update config service to point to previous version
  Both are instant (seconds, not minutes)

CANARY / GRADUAL ROLLOUTS:
  Config service can return different versions per user segment:
  { products: { default: 'v2.3.1', canary: 'v2.4.0', canaryPercent: 5 } }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. TRADE-OFFS AND WHEN NOT TO USE MFEs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What are the downsides of micro frontend architecture? When would you NOT use it?

A:

GENUINE TRADE-OFFS:

  Complexity          │ Each MFE has its own build, deploy, versioning.
                      │ Infra overhead is real. Small teams get crushed by it.

  Consistency         │ Different MFEs can drift in UX — different button styles,
                      │ animations, font rendering. Requires a strong design system.

  Testing             │ Integration testing across MFEs is hard.
                      │ You need contract tests (Pact) + E2E tests at the seam.

  Debugging           │ Stack traces cross MFE boundaries.
                      │ Need distributed tracing, correlation IDs, unified logging.

  Initial Load        │ Multiple network requests before page is interactive.
                      │ Monolith with code splitting can achieve same perf for less cost.

  Shared lib updates  │ When a shared package (design system) releases a breaking change,
                      │ all MFEs must upgrade — coordination is unavoidable.

WHEN NOT TO USE MFEs:

  - Small team (< 5 frontend engineers): Overhead outweighs benefits
  - Single deployment unit: If every MFE deploys together anyway, use a monolith
  - Simple CRUD app: Complexity is never justified for a basic dashboard
  - Startup/MVP: Move fast with a monolith; split later when scale demands it
  - Tight UI cohesion: Apps where UX consistency is paramount (design tools, IDEs)

RULE OF THUMB:
  MFEs solve an ORGANIZATIONAL problem (multiple teams, independent releases).
  If you don't have that problem, you don't need the solution.
  Premature MFE adoption is one of the worst frontend architecture mistakes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. REAL-WORLD SCENARIO QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCENARIO A: "One MFE fails to load. What happens to the user?"

  Bad implementation: Uncaught promise rejection crashes the whole shell.
  Good implementation:
    - React.lazy + Suspense with Error Boundary catches the failure
    - Show a fallback UI ("This section is temporarily unavailable")
    - Log error to monitoring (Sentry, Datadog)
    - Rest of the app continues to work

  // Defensive MFE loading
  class MFEErrorBoundary extends React.Component {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
      if (this.state.hasError) return <FallbackUI />;
      return this.props.children;
    }
  }

  function ProductsSection() {
    return (
      <MFEErrorBoundary>
        <Suspense fallback={<Skeleton />}>
          <ProductsApp />
        </Suspense>
      </MFEErrorBoundary>
    );
  }

──────────────────────────────────────────────────────────────

SCENARIO B: "Two MFEs need to use different versions of React. Is this possible?"

  Yes, but costly.
  In Module Federation, remove React from shared config for those MFEs.
  Each will bundle its own React. This works but means two React runtimes
  in memory — no React context sharing between them.
  Hooks and Context API only work within the same React instance.

  Real-world approach: negotiate a shared version. React 18 is backwards
  compatible enough that strict version mismatches are rare in practice.

──────────────────────────────────────────────────────────────

SCENARIO C: "How do you test a micro frontend in isolation AND in the container?"

  THREE LAYERS:
  1. Unit tests in MFE repo (Jest, React Testing Library) — fast, local
  2. Integration tests in MFE repo — MFE mounted with mock shell APIs
  3. E2E tests in a staging environment — real container + real MFEs

  CONTRACT TESTING (critical):
  Use Pact or similar to define the interface between container and MFE.
  Verifies that the container provides what MFEs expect, and vice versa.
  Catches interface breaks without full E2E runs.

──────────────────────────────────────────────────────────────

SCENARIO D: "How would you migrate a monolith to micro frontends?"

  STRANGLER FIG PATTERN — migrate incrementally, never big-bang rewrite:

  Step 1: Add a shell/container in front of the monolith
          Shell serves the monolith by default
  Step 2: Identify a low-risk, self-contained feature (e.g., account settings)
          Extract it as the first MFE
  Step 3: Shell routes /account to the new MFE, everything else to monolith
  Step 4: Repeat — extract cart, then products, then marketing
  Step 5: When monolith is empty, decommission it

  Key: Users never notice the migration. The URL structure stays the same.

──────────────────────────────────────────────────────────────

SCENARIO E: "How do you share a Design System across all MFEs?"

  Publish design system as an npm package: @company/design-system
  It contains: buttons, inputs, modals, tokens (colors, spacing, typography)

  Expose it via Module Federation as a shared singleton:
    shared: { '@company/design-system': { singleton: true } }

  Benefits:
  - One copy in memory at runtime
  - Consistent UI across all MFEs
  - Design updates ship to all MFEs when they upgrade the package

  Challenge: Major version breaks require coordinated upgrades across MFEs
  Solution: Semantic versioning + backwards compatibility + migration guides

──────────────────────────────────────────────────────────────

QUICK FIRE SUMMARY
  Q: What is Module Federation?
  A: Webpack 5 plugin enabling runtime JS sharing between separate applications.

  Q: What's remoteEntry.js?
  A: The manifest file a remote MFE exposes — tells the host what modules are available.

  Q: Why singleton: true in shared config?
  A: Ensures only one copy of React runs — required for hooks and Context to work.

  Q: Container uses BrowserRouter, MFE should use?
  A: MemoryRouter — avoids routing conflicts.

  Q: Best way to communicate between sibling MFEs?
  A: Custom DOM events (window.dispatchEvent / window.addEventListener).

  Q: How to handle auth in MFEs?
  A: Container owns auth, exposes token/user via shared service or events.

  Q: Biggest MFE risk?
  A: Organizational complexity and UX inconsistency — not a technical risk.

  Q: Module Federation vs iFrames?
  A: Module Federation for most cases; iFrames only for true isolation needs.
