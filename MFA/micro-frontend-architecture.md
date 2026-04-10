# Micro Frontend Architecture — Interview Q&A

## Index
1. What is a Micro Frontend?
2. Why would you choose MFE over a monolith?
3. How do you actually integrate multiple MFEs into one page?
4. What is Module Federation and how does it work?
5. What is remoteEntry.js and why does it matter?
6. Shared Modules — what they are and how versioning works
7. What happens when two MFEs need different versions of a shared lib?
8. How does routing work across MFEs?
9. How do MFEs talk to each other?
10. How do you share state across MFEs?
11. How do you handle authentication?
12. How do you prevent CSS from one MFE breaking another?
13. How does independent deployment actually work?
14. How do you handle a MFE that fails to load?
15. What are the real downsides? When would you NOT use MFE?
16. How would you migrate an existing monolith to MFEs?
17. Quick-fire scenario questions

---

## Q1: Can you explain micro frontend architecture in simple terms?

Think of a shopping mall. The mall building (the **shell**) provides the entrance, floors, and escalators. But each store inside operates independently — the shoe store doesn't close because the electronics store is renovating. Each store has its own staff and inventory system.

**Micro frontend architecture applies this to a web app.**

Instead of one big React app where all teams work in the same codebase, you split the UI into smaller, independently owned apps — each called a **Micro Frontend (MFE)**. A container/shell ties them into one seamless UI.

**Concrete example — e-commerce site:**

| Route | Responsibility | Owner |
|---|---|---|
| shell / container | layout, nav, auth, routing | Platform team |
| /products | product listing, search, filters | Team A |
| /cart | cart, checkout flow | Team B |
| /account | profile, order history | Team C |
| /promotions | banners, deals, recommendations | Team D |

Each team has its own Git repo, deploys independently, can use their own tech stack, and releases without coordinating with other teams. The user sees one app — behind the scenes it's 4–5 separate apps.

---

## Q2: We have a large React app. What problems would MFE solve for us?

MFE is **not a technical upgrade** — it solves **organizational problems**.

**Pain point 1 — "Our repo is a battlefield"**
50 engineers in one frontend repo = constant merge conflicts, giant PRs, someone's change breaks someone else's feature.
→ MFE: each team has its own repo. Zero contention between teams.

**Pain point 2 — "We can't release without everyone being ready"**
Team A is ready to ship but Team B has a half-done feature. Everyone waits.
→ MFE: Team A deploys their MFE independently. Fully decoupled.

**Pain point 3 — "We need to migrate off Angular but can't rewrite everything"**
→ MFE: New features in React. Old screens stay in Angular. This is the **Strangler Fig pattern** — old code dies piece by piece.

**Pain point 4 — "One team's bug brought down the whole app"**
→ MFE: The failing MFE shows an error boundary. Other MFEs keep working.

**Pain point 5 — "Ownership is unclear"**
→ MFE: Each MFE has a clear owner. Team B owns `/cart` end to end — backend API and frontend UI.

> **Counter-point:** If your team is small (< 8 frontend engineers) and you deploy together anyway, MFE gives you overhead without benefit. A well-optimized monolith is the right answer for most teams.

---

## Q3: What are the different ways to integrate multiple MFEs into one page?

### A) Build-time integration (npm packages)

Each MFE is published as an npm package. The container installs them like any dependency.

```js
// container/package.json
{
  "dependencies": {
    "@acme/products-mfe": "^2.1.0",
    "@acme/cart-mfe": "^1.5.0"
  }
}
```

**Why this is usually wrong:** Every time Products team ships, the container must update `package.json` → `npm install` → rebuild → redeploy. That's not independent deployment — it's just a slower monolith. Use build-time only for shared UI components like a design system.

### B) Server-side integration (SSI / Edge composition)

The server stitches HTML fragments from multiple services before the browser receives a response.

```nginx
<!-- Nginx SSI -->
<div id="products">
  <!--# include virtual="/products-service/fragment" -->
</div>
```

When to use: content-heavy sites (news, landing pages) where SEO matters. Downside: complex infra, harder dynamic interactions.

### C) Client-side runtime (most common for React teams)

Container fetches and mounts MFEs in the browser at runtime. Three techniques: **Module Federation**, iFrames, Web Components. Module Federation is the industry standard for React teams.

---

## Q4: Explain Module Federation. How does it enable micro frontends?

Module Federation (Webpack 5) lets one JS app **load code from a completely separate app at runtime** — without build-time coupling.

- **Host (Container):** the app that consumes modules from others
- **Remote (MFE):** the app that exposes its modules to others

### Step 1 — Configure the Remote (Products MFE)

```js
// products/webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'products',           // unique name — used by the host
      filename: 'remoteEntry.js', // the file the host will fetch first

      exposes: {
        './App': './src/App',
        './ProductList': './src/components/ProductList',
      },

      shared: {
        react:     { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

Products MFE deploys to `https://cdn.acme.com/products/remoteEntry.js`. It doesn't know about the container at all.

### Step 2 — Configure the Host (Container)

```js
// container/webpack.config.js
new ModuleFederationPlugin({
  name: 'container',

  remotes: {
    // alias: 'remoteName@URL_to_remoteEntry.js'
    products: 'products@https://cdn.acme.com/products/remoteEntry.js',
    cart:     'cart@https://cdn.acme.com/cart/remoteEntry.js',
  },

  shared: {
    react:     { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
})
```

### Step 3 — Use the remote module in the container

```js
// container/src/App.js
import React, { Suspense } from 'react';

// Looks like a local import — hits the network at runtime
const ProductsApp = React.lazy(() => import('products/App'));
const CartApp     = React.lazy(() => import('cart/App'));

export default function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsApp />
    </Suspense>
  );
}
```

### What happens at runtime (step by step)

1. Browser loads container's main bundle
2. User navigates to `/products`
3. `React.lazy` triggers → browser fetches `remoteEntry.js` from CDN
4. `remoteEntry.js` is a manifest: "here are my modules and chunks"
5. Browser negotiates shared deps (React) — **only one copy loaded**
6. Browser fetches the actual ProductsApp chunk
7. ProductsApp renders inside container's Suspense boundary

Products team deploys a new version → container picks it up automatically. No container rebuild. No container redeploy.

---

## Q5: What exactly is remoteEntry.js and why does it matter?

`remoteEntry.js` is the **manifest/entry point** a remote MFE exposes. It's a small JS file that tells the host:
- "Here are the modules I expose" → `./App`, `./ProductList`
- "Here are my chunk file names and hashes" → for cache busting
- "Here are the shared dependencies I need" → `react@18.2.0`

Think of it as a **table of contents** for the MFE.

```js
// Simplified shape of what remoteEntry.js does
var products = {
  get: (module) => {
    if (module === './App') return () => import('./src_App.chunk.js');
  },
  init: (shareScope) => { /* negotiate shared deps */ }
};
```

### Caching strategy (critical)

```
remoteEntry.js       →  Cache-Control: no-cache, must-revalidate
products.abc123.js   →  Cache-Control: max-age=31536000  (1 year)
```

When Products team deploys, the browser always fetches a fresh `remoteEntry.js` (tiny file), gets new chunk hashes, and only downloads **changed** chunks — unchanged ones hit the CDN cache.

---

## Q6: Explain shared modules. How does versioning work between MFEs?

### The problem shared modules solve

Without shared modules, every MFE bundles its own React:

```
container bundle:  React 18.2  (200KB)
products bundle:   React 18.2  (200KB)
cart bundle:       React 18.2  (200KB)
```

The user downloads React **three times** (600KB wasted). Worse — three separate React instances running = **hooks break across MFE boundaries**.

### How shared modules work

Declare `shared` in **every** MFE and the container:

```js
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
```

At runtime, Module Federation runs a **negotiation** step:
1. Each MFE announces: "I need `react@18.2.0`"
2. Module Federation picks the **highest compatible version**
3. That one version loads. All MFEs use the same instance.

### Version negotiation rules

```
container: react ^18.0.0  (has 18.2.0)
products:  react ^18.0.0  (has 18.3.0)
cart:      react ^18.0.0  (has 18.1.0)
→ Picks 18.3.0. Versions 18.1 and 18.2 are never downloaded.

container: react ^17.0.0  (has 17.0.2)
products:  react ^18.0.0  (has 18.2.0)
→ 17 and 18 are INCOMPATIBLE (different majors)
→ Two React instances loaded → hooks and Context break (see Q7)
```

### All shared config options explained

```js
shared: {
  react: {
    singleton: true,
    // Only one instance allowed. If incompatible versions exist,
    // warn rather than silently loading two copies.

    requiredVersion: '^18.0.0',
    // Semver range this MFE needs. Used to check compatibility
    // against what other MFEs declare.

    strictVersion: false,
    // false (default): console.warn on mismatch, keep going
    // true: throw a hard error if incompatible version is loaded

    eager: false,
    // false (default): React loaded lazily when first needed
    // true: bundle React into the initial chunk
    //       Use eager: true only in the HOST/container, not remotes
  }
}
```

### What to share (and what not to)

| Library | Share? | Why |
|---|---|---|
| `react`, `react-dom` | Must (singleton) | Hooks requirement |
| `react-router-dom` | Should (singleton) | Single history object |
| `@tanstack/react-query` | Should (singleton) | Single cache instance |
| `styled-components` / `emotion` | Should (singleton) | Single style injection context |
| `@company/design-system` | Yes | Shared UI components, size savings |
| `lodash` / `date-fns` | Optional | Tree-shakeable, fine to duplicate |

> **Don't share everything blindly.** Sharing = coupling. Only share what must be a singleton or is large enough to justify it.

### Versioning strategies for your own shared packages

**Option A — Semver + private npm registry (most common)**
Publish `@company/design-system` to Artifactory / GitHub Packages. Each MFE pins a version range. Teams upgrade on their own schedule. Downside: breaking changes require each team to upgrade independently.

**Option B — Floating "latest" (fast, risky)**
Always load the latest version. Any breaking change immediately affects all MFEs. Use only for stable, backward-compatible utilities.

**Option C — Expose via Module Federation from container (most integrated)**

```js
// container webpack config
exposes: {
  './DesignSystem': './src/design-system/index.js',
  './auth':         './src/auth/index.js',
}

// Any MFE consumes it
import { Button, Modal } from 'container/DesignSystem';
import { authService }   from 'container/auth';
```

Risk: a breaking change in the design system breaks all MFEs simultaneously. Only use with a stable, well-tested design system.

---

## Q7: What happens if the container is on React 18 but one MFE is still on React 17?

**Scenario:**
```
container: react@18.2.0, requiredVersion: '^18.0.0'
cart-mfe:  react@17.0.2, requiredVersion: '^17.0.0'
```

**Without `singleton: true`:** Both versions are downloaded and run in the same tab. Two React runtimes breaks `useContext`, `ReactDOM.createRoot`, Error Boundaries, and React DevTools.

**With `singleton: true` (recommended):** Module Federation picks React 18 (higher version). Cart MFE runs on React 18 under the hood. React 18 is backwards compatible in most cases. You get a console warning: *"Shared module react@17.0.2 is not a singleton..."*

### How to handle the migration

**Phase 1 — Keep both working during transition**

Remove React from `shared` config for the legacy MFE temporarily. It bundles its own React 17 (adds bundle size — acceptable short-term). Container and other MFEs share React 18 normally.

**Phase 2 — Upgrade the legacy MFE**

React 18 upgrade is mostly non-breaking (`React.render` → `createRoot`). Add React back to shared config. Back to one React instance.

> **Key insight:** Never keep mixed major versions long-term. The bugs are subtle and hard to trace. Treat a React version gap as tech debt with a deadline.

---

## Q8: Who controls the URL? How does routing work across MFEs?

There are **two distinct levels**. Getting this wrong causes subtle URL bugs.

### Level 1 — Top-level routing (Container owns this)

The shell uses `BrowserRouter` because it needs to own the real browser history.

```js
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
          {/* /* tells React Router to pass remaining segments to the MFE */}
          <Route path="/products/*" element={<ProductsApp />} />
          <Route path="/cart/*"     element={<CartApp />} />
          <Route path="/account/*"  element={<AccountApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Level 2 — Internal MFE routing (Each MFE owns its sub-routes)

**Wrong:** Using `BrowserRouter` inside an MFE creates a second history instance. Two history objects fighting over the URL = unpredictable back-button behavior.

**Right:** Use `MemoryRouter` inside MFEs. It keeps routing state in memory, not in the browser URL. The container's `BrowserRouter` owns the real URL.

```js
// products/src/App.js
import { MemoryRouter, Routes, Route } from 'react-router-dom';

export default function ProductsApp() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/"       element={<ProductList />} />
        <Route path="/:id"    element={<ProductDetail />} />
        <Route path="/search" element={<SearchResults />} />
      </Routes>
    </MemoryRouter>
  );
}
```

### How MFEs trigger navigation to other MFEs

An MFE should **never** import the container's router. Fire a custom event instead:

```js
// Inside products MFE — user clicks "Go to Cart"
window.dispatchEvent(new CustomEvent('mfe:navigate', {
  detail: { path: '/cart' }
}));

// Container listens and uses its own router
window.addEventListener('mfe:navigate', (e) => {
  navigate(e.detail.path); // container's react-router navigate()
});
```

---

## Q9: How do MFEs communicate with each other?

**Golden rule: MFEs must not directly import each other.** If products imports cart, you've coupled two teams' codebases — defeats the purpose.

### Pattern 1 — Props from container (parent → child)

Best for data the container already has (user info, feature flags).

```js
<ProductsApp
  userId={currentUser.id}
  onAddToCart={(item) => cartService.add(item)}
  featureFlags={flags}
/>
```

### Pattern 2 — Custom DOM events (pub-sub)

Best for sibling MFEs communicating without knowing about each other.

```js
// auth MFE fires on login
window.dispatchEvent(new CustomEvent('auth:login', {
  bubbles: true,
  detail: { userId: '123', name: 'Veerendra' }
}));

// cart MFE listens — doesn't know who fired the event
window.addEventListener('auth:login', (event) => {
  loadUserCart(event.detail.userId);
});

// header MFE also listens independently
window.addEventListener('auth:login', (event) => {
  showUserAvatar(event.detail.name);
});
```

**Naming convention** (prevents collisions): prefix with the MFE name — `auth:login`, `cart:item-added`, `shell:theme-changed`.

### Pattern 3 — Shared singleton service

A service object shared via Module Federation's singleton mechanism. All MFEs get the same instance.

```js
// @company/auth-service/index.js
class AuthService {
  constructor() {
    this._user = null;
    this._listeners = [];
  }
  setUser(user) {
    this._user = user;
    this._listeners.forEach(fn => fn(user));
  }
  getUser() { return this._user; }
  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }
}

export const authService = new AuthService(); // singleton instance
```

```js
// Any MFE
import { authService } from '@company/auth-service';
const unsubscribe = authService.onChange(user => setCurrentUser(user));
```

### Pattern 4 — URL / query params (simplest, most durable)

Put shared state in the URL. Any MFE can read it. Survives page refresh.
`/products?userId=123&category=shoes&page=2`

### Which pattern to choose?

| Scenario | Pattern |
|---|---|
| Container passing data to a specific MFE | Props |
| Sibling MFEs, loose coupling, one fires many listen | Custom events |
| Auth/user state, needs reactivity + getter | Singleton service |
| Navigation state, shareable links, filters | URL params |

---

## Q10: The header MFE needs to show cart count — that state is in cart MFE. How?

**Wrong answer:** One global Redux store. That recreates monolith coupling — every team depends on the same store shape.

**Right approach:** Cart MFE owns its state and fires an event when it changes.

```js
// Inside cart MFE
const addItem = (item) => {
  const updatedCart = [...cartItems, item];
  setCartItems(updatedCart);

  window.dispatchEvent(new CustomEvent('cart:updated', {
    detail: { count: updatedCart.length }
  }));
};
```

```js
// Header MFE listens
function CartBadge() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const handler = (e) => setCartCount(e.detail.count);
    window.addEventListener('cart:updated', handler);
    return () => window.removeEventListener('cart:updated', handler);
  }, []);

  return <span>{cartCount}</span>;
}
```

Cart MFE doesn't know about the header. Header doesn't reach into cart's state. Clean and decoupled.

### Guidelines for shared state

| State type | Strategy |
|---|---|
| Auth / user identity | Singleton service + events (or httpOnly cookie) |
| Cart count / badge | Events from cart MFE, header listens |
| Current route | Browser URL (owned by container) |
| Feature flags | Container fetches, passes via props |
| User preferences | `localStorage` + storage event for reactivity |
| Server-persisted data | Each MFE fetches from its own API — no sharing needed |

> **Key rule:** If two MFEs constantly share a lot of state, they probably belong in the same MFE. Frequent state sharing = wrong domain boundaries.

---

## Q11: If a user logs in on the auth MFE, how does the products MFE know?

Auth is **always owned by the container/shell**. MFEs should never handle the login flow.

**The flow:**
1. User hits the app unauthenticated
2. Container detects this (no token / 401 from API)
3. Container redirects to IdP (Auth0, Okta, Cognito)
4. Login completes → token returned to container
5. Container stores token + exposes user info to MFEs

### Option A — Container exposes an auth module (Module Federation)

```js
// shell/src/auth/index.js  (exposed in shell's webpack config)
let _user = null;
let _token = null;
const _listeners = [];

export const authService = {
  init(user, token) {
    _user = user; _token = token;
    _listeners.forEach(fn => fn(user));
  },
  getUser()  { return _user; },
  getToken() { return _token; },
  onChange(fn) { _listeners.push(fn); },
};
```

```js
// Any MFE
import { authService } from 'shell/auth';
const token = authService.getToken();
```

### Option B — httpOnly Cookie (most secure, recommended for production)

```
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Domain=.acme.com
```

Auth token lives server-side. Browser sends it automatically with every API request. No JS ever touches it — immune to XSS. MFEs make API calls normally; the cookie attaches invisibly. This is the cleanest approach — no token passing between MFEs at all.

### What MFEs must NOT do

- **Redirect to /login themselves** → fire an event, let the container handle it
- **Store token in localStorage** → XSS in any MFE can steal it
- **Have their own login page** → container owns auth, single responsibility

---

## Q12: Team A uses Tailwind, Team B uses Bootstrap — won't those conflict?

Yes — global CSS is the enemy in MFE architecture.

### Strategy 1 — BEM + MFE namespace prefix

```css
/* products MFE */
.products-card { padding: 16px; }
.products-card__title { font-size: 18px; }

/* cart MFE */
.cart-item { border-bottom: 1px solid #eee; }
```

Works if teams follow the convention. Breaks if they forget.

### Strategy 2 — CSS Modules (recommended for React MFEs)

The build tool transforms class names into unique hashes at compile time.

```css
/* ProductCard.module.css */
.card  { padding: 16px; }
.title { font-size: 18px; }
```

```js
import styles from './ProductCard.module.css';

function ProductCard() {
  return <div className={styles.card}>...</div>; // → class="card_a3f9k2"
}
```

Cannot conflict with any other MFE's classes. No runtime overhead.

### Strategy 3 — CSS-in-JS (Styled Components / Emotion)

```js
const Card = styled.div`
  padding: 16px;
  background: white;
`; // → class="sc-xyz123 iBcYst"
```

> `styled-components` must be a singleton in Module Federation. Two instances = styles injected twice or incorrectly.

### Strategy 4 — Shadow DOM (strongest isolation — Web Components)

```js
connectedCallback() {
  const shadow = this.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `.btn { color: red; }`;  // won't leak outside shadow root
  shadow.appendChild(style);
}
```

### Shared design tokens (work across all isolation strategies)

Use CSS custom properties in a shared `@company/design-tokens` package:

```css
/* @company/design-tokens/index.css */
:root {
  --color-primary: #007bff;
  --spacing-md: 16px;
  --font-size-body: 14px;
}
```

Custom properties pierce Shadow DOM via inheritance. Updating the tokens package updates all MFEs simultaneously.

---

## Q13: Walk me through what happens when a team deploys their MFE. Does the container redeploy?

**No — that's the whole point.**

### Setup

Each MFE builds to static assets and uploads to a CDN:
```
https://cdn.acme.com/products/latest/remoteEntry.js    ← always current
https://cdn.acme.com/products/latest/main.abc123.js    ← content-hashed chunk
```

Container config points to the CDN URL — not a version number:

```js
remotes: {
  products: 'products@https://cdn.acme.com/products/latest/remoteEntry.js',
}
```

### What happens when Team A deploys a fix

1. Team A merges PR → CI pipeline triggers
2. Webpack builds new chunks → new content-hash filenames
3. New `remoteEntry.js` updated with new chunk hashes
4. Files uploaded to CDN (overwriting `/latest/remoteEntry.js`)
5. **Done. Container is not touched. Container is not redeployed.**

When users next visit: browser fetches fresh `remoteEntry.js` (no-cache), gets new chunk hashes, downloads only changed chunks — rest hits CDN cache.

### Versioned URL strategy (safer for production)

Instead of `/latest`, use versioned paths + a config service:

```js
// GET /api/mfe-versions → { "products": "v2.4.0", "cart": "v1.9.1" }

async function getRemoteUrls() {
  const versions = await fetch('/api/mfe-versions').then(r => r.json());
  return {
    products: `products@https://cdn.acme.com/products/${versions.products}/remoteEntry.js`,
    cart:     `cart@https://cdn.acme.com/cart/${versions.cart}/remoteEntry.js`,
  };
}
```

- **Rollback:** update config API response → instant, no redeploy needed
- **Canary:** 5% of users get `v2.5.0`, 95% get `v2.4.0` via config API logic

---

## Q14: What happens to the user if the cart MFE's CDN goes down?

**Bad implementation:** entire page crashes.
**Good implementation:** only the cart section shows an error. Everything else keeps working.

The tool: **React Error Boundary + Suspense**

```js
class MFEErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
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
```

```js
// Wrap every MFE mount in the container
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
```

If cart's CDN is unreachable → Error Boundary catches it → user sees "Temporarily unavailable. [Retry]" → Header, Products, Navigation all continue working normally.

---

## Q15: MFE sounds great. What's the catch? When would you NOT use it?

### Genuine costs

**Operational complexity** — Every MFE needs its own CI/CD pipeline, CDN config, monitoring, and alerting. 5 apps = 5× the infrastructure burden.

**UX inconsistency** — Different teams → different button styles, animations, font rendering. The app looks built by four companies — because it was. Requires a shared design system with strong enforcement.

**Performance overhead** — Multiple network requests before page is interactive. Without careful lazy loading and caching, initial load is slower than a well-optimized monolith.

**Debugging across boundaries** — Stack trace: "Error in products MFE." But the state that caused it came from auth MFE via an event. Needs correlation IDs and unified logging across all MFEs.

**Version coordination (the hidden coupling)** — Upgrading `react-router` v5 → v6 requires ALL teams to upgrade before anyone can use v6 features in the shared module. You traded release coupling for upgrade coupling.

**Testing is harder** — Unit tests are fine. Integration tests are hard (need both MFEs running). E2E tests require the entire stack deployed.

### When NOT to use MFE

- Team < 8 frontend engineers — coordination overhead eats velocity
- Already deploying everything together — no independence gained
- MVP or early product — wrong time for infra complexity
- High UX consistency requirements — design tools, IDEs, creative apps
- No clear domain boundaries — forced split creates artificial pain

> **The litmus test:** "Would independent deployment actually save us time this quarter?"
> Yes → MFE is worth exploring.
> No → optimize your monolith (code splitting, feature flags, modular architecture).

---

## Q16: We have a 4-year-old React monolith. How do we migrate to MFE without a big-bang rewrite?

Use the **Strangler Fig pattern.** You never rewrite — you grow the new system around the old one until the old one has nothing left.

### Phase 1 — Add a shell in front of the monolith

Create a minimal container app. For now it just proxies everything to the monolith. Users notice zero change.

```js
// shell routes ALL traffic to the old monolith initially
remotes: {
  legacy: 'legacy@https://your-old-app.com/remoteEntry.js'
}
```

### Phase 2 — Extract the lowest-risk feature first

Pick a feature that is self-contained, has a clear URL boundary (`/account`, `/help`), and is owned by one team. Shell routes `/account` → new Account MFE. Everything else → monolith unchanged.

### Phase 3 — Repeat, feature by feature

```
Month 1: /account   → Account MFE
Month 2: /cart      → Cart MFE
Month 3: /search    → Search MFE
Month 6: /products  → Products MFE
```

Monolith shrinks with each extraction. Users never see a disruption.

### Phase 4 — Decommission the monolith

When it serves no routes, shut it down. Migration complete.

### Handling shared code in the monolith

Identify code used across multiple features (utils, hooks, services). Extract it into `@company/shared-utils` **before** extracting the MFEs. Both the monolith and new MFEs import from it during the transition.

---

## Q17: Quick-fire Scenario Questions

**Q: What is remoteEntry.js?**
The manifest file a remote MFE exposes — tells the host what modules are available and what chunks to fetch. Must **not** be cached; chunks should be cached aggressively.

---

**Q: Why `singleton: true` for React?**
React must exist as one instance in memory. Two instances = hooks don't work across MFE boundaries; React Context is invisible between them.

---

**Q: Container uses BrowserRouter. What should each MFE use?**
`MemoryRouter` — avoids two history objects fighting over the URL.

---

**Q: Two sibling MFEs need to communicate. How?**
Custom DOM events — `window.dispatchEvent` / `window.addEventListener`. Namespace events by MFE name to avoid collisions.

---

**Q: Your design system releases v3.0 with breaking changes. How do you coordinate?**
Publish v3.0 to npm with a migration guide. Teams upgrade on their own timeline. If it's a Module Federation singleton (e.g. `styled-components`), coordinate a synchronized upgrade window across all MFEs.

---

**Q: How do you test a MFE?**
Three layers:
1. **Unit tests** inside the MFE repo (Jest + RTL) — fast, isolated
2. **Integration tests** with a mocked shell — MFE mounts correctly, events fire correctly
3. **E2E tests** in staging with real container + real MFEs (Cypress / Playwright)

Add **contract tests** (Pact) to verify the container ↔ MFE interface without running both simultaneously.

---

**Q: Performance got worse after migrating to MFE. Why?**
Common causes:
- MFEs loading eagerly instead of lazily → fix: `React.lazy` + route-based splitting
- React not in `shared` config → fix: deduplicate via Module Federation singleton
- `remoteEntry.js` not preloaded → fix: `<link rel="preload">`
- Too many sequential requests → fix: HTTP/2, CDN, preload critical MFEs

---

**Q: Module Federation vs Web Components — which to choose?**
**Module Federation** — React-centric, shares React components and state primitives, tightest integration, no CSS isolation out of the box.
**Web Components** — framework-agnostic, browser-native, true CSS isolation via Shadow DOM, but has friction with React events and SSR.

Choose Web Components when teams use different frameworks or you need a tech-agnostic hard boundary. Otherwise Module Federation is the better choice.
