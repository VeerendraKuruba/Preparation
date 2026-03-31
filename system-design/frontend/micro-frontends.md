# Micro frontends (frontend system design)

Use this doc when the prompt involves **multiple teams owning different parts of the same product**, **independent deploys for UI**, or **splitting a large SPA**.

## One-line definition

A **micro frontend** composes the browser UI from **independently built and deployed** front-end applications so users still experience **one cohesive product**, usually via a **host shell** that loads **remote** bundles or documents.

## When it helps (say this in the interview)

- Several teams ship UI on different cadences; a single SPA creates **bottlenecks** (build time, merge conflicts, release train).
- You want **clear ownership** per business domain (e.g. Catalog vs Checkout).
- You need **incremental migration** from a legacy stack without a big-bang rewrite.

## When to avoid

- **One small team**, one product surface → a **modular monolith** (feature folders, lazy routes, shared design tokens) is often enough.
- Heavy **shared state** across everything → micro frontends add **contract and versioning** pain; boundary design must be explicit.

## Integration patterns (know the names)

| Pattern | Idea | Trade-off |
|---------|------|-----------|
| **Build-time packages** | UI published as npm packages; host bundles them. | Simpler ops; host must **rebuild** to pick up remote changes. |
| **Runtime module federation** (e.g. Webpack 5) | Host loads remote **entry JS from URL** at runtime. | True independent deploy; need **version/sharing** discipline for shared libs (e.g. one React instance). |
| **iframes** | Each app is its own document. | Strong isolation; harder **seamless UX**, routing, and performance tuning. |
| **Web Components** | Encapsulated custom elements; shell is framework-agnostic. | Good for long-lived platforms and mixed stacks; learning curve. |
| **Reverse proxy / path-based** | e.g. `/catalog/*` → service A, `/account/*` → service B; shell ties navigation. | Often combined with federation or MPA-style loads. |

## Small example: e-commerce portal (2-minute story)

**Teams:** Team A owns **Catalog**, Team B owns **Checkout**.

1. **Host (shell)**  
   - Owns: chrome (header, nav), **authentication/session**, top-level **router**, design tokens.  
   - Routes: `/catalog/*` → load Catalog remote; `/checkout/*` → load Checkout remote.

2. **Catalog remote**  
   - Deployed to its own CDN origin or path.  
   - Exposes a bootstrap entry the host mounts (e.g. `CatalogApp`).

3. **Checkout remote**  
   - Same pattern; separate deploy pipeline.

4. **Contract between shell and remotes**  
   - **Routing:** shell owns browser history; remotes use a agreed **base path**.  
   - **Auth:** cookie/session or token passed via shell context—**no duplicate login**.  
   - **Cross-slice events:** thin channel (custom events, tiny event bus, or callback props)—avoid a fat shared global store.

5. **User flow**  
   User opens `app.example.com` → shell loads → navigates to catalog (lazy remote) → proceeds to checkout (second remote). URL and session stay consistent.

**Architecture sketch (describe or whiteboard):**

```mermaid
flowchart LR
  subgraph browser[Browser]
    Shell[Host shell]
    Cat[Remote: Catalog]
    Chk[Remote: Checkout]
  end
  Shell -->|lazy load| Cat
  Shell -->|lazy load| Chk
  Cat --> CDN[CDN / remote origins]
  Chk --> CDN
  Shell --> CDN
```

## Design decisions interviewers dig into

- **Routing and deep links:** refresh and back button must work; shell coordinates **404** vs remote **not found**.
- **Dependency sharing:** align React/Vue versions or use federation **shared** config to avoid **duplicate runtime** and bundle bloat.
- **Styling:** shared **design system** package (versioned); scoped CSS or tokens to prevent collisions.
- **Testing:** contract tests for shell–remote integration; E2E on critical cross-remote flows.
- **Versioning:** remotes stay **backward compatible** with the shell for a window, or use feature flags for coordinated rollouts.
- **Failure isolation:** if a remote fails to load, shell shows **fallback UI** and logs; optional retry or stale cached bundle policy.
- **Performance:** per-remote code splitting, CDN caching, avoid loading all remotes on first paint.

## If they ask: “How would you implement?”

In the interview you rarely write a full repo—show you know **build config**, **runtime loading**, **shared dependency rules**, and **how the shell mounts remotes**. Below are **minimal, realistic sketches** you can explain on a whiteboard or live code snippet.

### 1. Webpack 5 Module Federation (most common “real” answer)

**Remote** (Catalog app deployed to its own URL) declares what it **exposes** and shares React as a **singleton** so the host does not load two copies.

```js
// catalog/webpack.config.js (remote) — illustrative
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'catalog',
      filename: 'remoteEntry.js',
      exposes: {
        './CatalogApp': './src/CatalogApp.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
      },
    }),
  ],
};
```

**Host** declares **remotes** pointing at the deployed `remoteEntry.js` (often **env-specific** URL: dev/staging/prod).

```js
// shell/webpack.config.js (host) — illustrative
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        catalog: `catalog@${process.env.CATALOG_CDN_URL}/remoteEntry.js`,
        checkout: `checkout@${process.env.CHECKOUT_CDN_URL}/remoteEntry.js`,
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
      },
    }),
  ],
};
```

**Host app** loads the remote like a normal dynamic chunk (names must match `exposes`):

```tsx
// shell: lazy-load remote as if it were a local module
import React, { Suspense } from 'react';

const CatalogApp = React.lazy(() => import('catalog/CatalogApp'));

export function CatalogRoute() {
  return (
    <Suspense fallback={<div>Loading catalog…</div>}>
      <CatalogApp />
    </Suspense>
  );
}
```

**Talking points:** `remoteEntry.js` is the **manifest** the browser fetches at runtime; **singleton shared** deps avoid duplicate React; **version skew** is managed by pinning compatible ranges or **feature flags**; CDN should **cache** hashed chunks aggressively but **version** `remoteEntry` URL or filename on breaking changes.

**Alternatives you can name:** **Rspack** / **Module Federation v2** (similar ideas), **Vite** via `@module-federation/vite` or community federation plugins—concept is the same: **exposes/remotes + shared**.

---

### 2. Build-time package (npm) + lazy route in the host

No runtime `remoteEntry`; the host **bundles** the feature at build time. Good when remotes release less often or you accept coupling.

```tsx
// Host depends on @acme/catalog-ui in package.json
import React, { lazy, Suspense } from 'react';

const CatalogApp = lazy(() => import('@acme/catalog-ui'));

export function CatalogRoute() {
  return (
    <Suspense fallback={null}>
      <CatalogApp />
    </Suspense>
  );
}
```

**Talking points:** CI publishes `@acme/catalog-ui`; host bumps version and redeploys; **simpler ops**, **less** true decoupling than federation.

---

### 3. iframe + `postMessage` (isolation-first)

Useful for **third-party** or **legacy** apps where you need a hard boundary.

```html
<!-- Shell mounts a remote document -->
<iframe
  id="catalog-frame"
  title="Catalog"
  src="https://catalog.example.com/embed"
/>
```

```js
// Shell → remote (contract: message shape is your API)
const frame = document.getElementById('catalog-frame');
frame.contentWindow.postMessage(
  { type: 'AUTH', payload: { token: '…' } },
  'https://catalog.example.com'
);

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://catalog.example.com') return;
  if (event.data?.type === 'NAVIGATE') {
    // Shell updates top-level router, e.g. /checkout
  }
});
```

**Talking points:** **strict origin checks**; UX limits (focus, height auto-resize hacks); good when **security / blast radius** matters more than seamless SPA feel.

---

### 4. Meta-framework routing (shell owns the URL)

Example: **React Router** in the shell; remotes render **under** a path. Remotes should not call `history.push` with absolute app root unless coordinated—prefer **relative** navigation or callbacks up to the shell.

```tsx
// Shell routes (conceptual)
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/catalog/*" element={<CatalogRemoteMount />} />
  <Route path="/checkout/*" element={<CheckoutRemoteMount />} />
</Routes>
```

`CatalogRemoteMount` is where you put `React.lazy` + federation import or an iframe. The `/*` passes **subpaths** to the remote if it has internal routes.

---

### 5. Orchestration libraries (name-drop only unless you know them)

- **single-spa**: register apps by route, each app can be React/Vue/Angular; **import maps** or SystemJS historically used to load bundles.
- **qiankun** (popular in some regions): similar lifecycle, often with **sandboxed** styles/scripts.

**Sound bite:** “We’d either use **first-class federation** in webpack/vite or a **meta-framework** like single-spa if we need **multi-framework** lifecycles and a single registration layer.”

---

### 6. What “done” looks like in production (checklist)

| Piece | Example |
|-------|---------|
| Deploy | Remote → static host or object storage + CDN; **immutable** hashed assets |
| Config | Host reads remote URLs from **env** or **config service** |
| Auth | **HttpOnly cookie** (BFF) or shell passes **read-only context**; avoid duplicating token storage in every remote |
| Errors | `Suspense` / error boundary around each remote; **retry** load of `remoteEntry` |
| Observability | One **RUM** vendor in shell; remotes use same trace / user id if possible |

## Trade-offs (structured for interviews)

### Micro frontends vs a modular monolith

| Dimension | Modular monolith (single SPA, feature modules) | Micro frontends |
|-----------|-----------------------------------------------|-----------------|
| **Team autonomy** | Shared release train; boundaries are **conventional** (folders, ownership docs) | **Independent** deploys and pipelines per slice |
| **Consistency** | Easier **one** design system and one router | Risk of **visual drift** and duplicated patterns without strong governance |
| **Operational surface** | One build, one CDN artifact, simpler on-call | **Many** deployables, version skew shell ↔ remotes, more failure modes |
| **Runtime performance** | One graph of chunks; shared deps **trivial** | Must **share** React/etc. correctly or pay duplicate download + hook bugs |
| **Best when** | One product, few teams, fast iteration on shared codebase | Many teams, domains with **different cadences**, or incremental **migration** |

Neither is “better”—interviewers want **criteria**: team topology, release pressure, UX bar, and migration context.

---

### Trade-offs by integration pattern

| Pattern | You gain | You give up |
|---------|----------|-------------|
| **Runtime federation** | True decouple of deploys; load remotes **on demand** | Build/tooling complexity; **contract** testing; cache/`remoteEntry` versioning discipline |
| **Build-time npm packages** | Simple mental model; typecheck across packages in monorepo | Host must **rebuild** to pick up remote UI changes; weaker “true” autonomy |
| **iframe** | Maximum **isolation** (JS/CSS/global scope); good for untrusted or legacy | Weak **seamless** UX, awkward sizing/focus, **postMessage** API to maintain |
| **Web Components** | Framework-neutral shell; encapsulation via shadow DOM | Heavier **interop** story with React state/tools; team skills curve |
| **Orchestrator (single-spa, qiankun)** | Explicit **mount/unmount** lifecycles; multi-framework in one shell | Extra layer to learn; still need a loading and **routing** story underneath |

---

### Dimensional trade-offs (drill-down)

**Organization and velocity**

- **Pro:** Teams ship without blocking on a central front-end gate; clearer **ownership** and on-call per domain.
- **Con:** Need **interfaces** (routing, auth, events)—otherwise you get implicit coupling and meetings instead of code coupling.

**User experience and product coherence**

- **Pro:** Each domain can optimize its flows.
- **Con:** Inconsistent loading states, spacing, and patterns unless you enforce a **design system**, tokens, and shared primitives; **global** concerns (toasts, modals, focus management) are easy to get wrong across boundaries.

**Performance**

- **Pro:** Code-split by domain; users may not download unused remotes.
- **Con:** **Waterfalls** if shell waits on remote config missing; **multiple** loads of the same library if `shared`/singleton is misconfigured; harder to reason about total **JS budget** across teams.

**Security**

- **Pro:** iframes/sandbox can **contain** a less trusted remote.
- **Con:** More surfaces for **XSS** if remotes mishandle user content; **postMessage** without strict `origin` checks is risky; token patterns must be **consistent** (avoid each team inventing storage).

**Developer experience**

- **Pro:** Smaller repos per team; CI runs only for what changed (in polyrepo setups).
- **Con:** **Local dev** may require running shell + N remotes or mocks; **debugging** across bundles; onboarding “how do I run the whole app?” gets harder.

**Reliability and operations**

- **Pro:** Blast radius can be **smaller** if one remote fails and shell handles it.
- **Con:** **Partial outages** (remote CDN down, bad deploy) need **fallback UI**, retries, and monitoring **per** remote; harder **end-to-end** ownership stories without platform standards.

---

### What to say when they ask “so would you always use micro frontends?”

> “No. I’d default to a **well-boundaried monolith** until **organizational scale** or **release independence** clearly outweighs the **operational and consistency** cost. If we adopt micro frontends, I’d invest in a **shell**, **design system**, **shared dependency policy**, and **contract tests** up front—that’s where the hidden cost usually lives.”

## Closing sound bite

> “We use a **host shell** for shared concerns and routing, and **compose domain UIs as remotes**—often **runtime federation**—with a **small, stable contract** for auth and navigation. That gives **independent deploys** while the user sees **one application**.”

---

## Interview Questions & Answers

### Conceptual / Fundamentals

---

**Q1. What is a micro-frontend and when would you use one?**

> A micro-frontend splits a UI into **independently deployable slices**, each owned by a different team, composed at runtime or build time into a single user experience via a shell. Use it when teams have **different release cadences**, the monolith creates **merge or deploy bottlenecks**, or you need **incremental migration** from a legacy stack. Avoid it when you have a small team — a modular monolith with lazy routes is simpler.

---

**Q2. What are the main integration patterns?**

| Pattern | When to pick it |
|---|---|
| Runtime Module Federation | True independent deploys; teams on different schedules |
| Build-time npm packages | Simpler ops; lower frequency of remote changes |
| iframes + postMessage | Maximum isolation; third-party or legacy embeds |
| Web Components | Framework-agnostic shell; long-lived platform |
| single-spa / qiankun | Multi-framework shell with lifecycle management |

---

**Q3. What does the host shell own vs what do remotes own?**

- **Shell owns:** top-level router, auth/session, chrome (header, nav), design tokens, global error boundary, observability setup
- **Remotes own:** domain routes, domain state, domain-specific UI components

Remotes should never own shared concerns — that creates hidden coupling.

---

**Q4. How do you prevent loading React twice when using Module Federation?**

Use the `shared` config with `singleton: true`:

```js
shared: {
  react: { singleton: true, requiredVersion: '^18.0.0' },
  'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
}
```

Without singleton, each remote bundles its own React → React hooks break because they rely on a single React instance in the closure.

---

### Version Management

---

**Q5. If you change a shared component library, how do you avoid breaking all micro-frontends at once?**

Three layers of defense:

1. **Semantic versioning** — breaking changes → major bump; each MFE pins its own version and upgrades on its own schedule
2. **Changesets** — contributors declare change severity before merging; CI auto-bumps the version on merge
3. **Backward-compatible releases** — deprecate old API first, remove in the next major; give teams a migration window

Never auto-publish `latest` on every merge without a semver gate.

---

**Q6. In Module Federation, how do you manage which version of a remote the shell loads?**

The shell references the remote's `remoteEntry.js` via URL:

```js
remotes: {
  catalog: `catalog@${process.env.CATALOG_CDN_URL}/remoteEntry.js`
}
```

Strategies:
- **Floating URL** (`/remoteEntry.js`) — shell always loads whatever the remote team last deployed (true continuous deploy, higher risk)
- **Versioned URL** (`/v1.4.2/remoteEntry.js`) — shell pins a specific remote version; explicit upgrade
- **Config service** — shell fetches a manifest at boot that maps remote names to URLs; enables **canary / feature-flag** routing per user

---

**Q7. How do you handle a breaking change in the shell-to-remote contract?**

- Never break the contract unilaterally
- Add the new API, keep the old one, use a **feature flag** to roll remotes over one at a time
- Once all remotes are migrated, remove the old API in the next major shell version
- Document the contract in an **Interface Definition** (shared TypeScript types, or an AsyncAPI/OpenAPI-style contract doc)

---

### CSS & Styling

---

**Q8. How do you prevent CSS class name collisions between the shell and remotes?**

Four approaches, in order of strictness:

1. **BEM namespace prefix** — every class in the common lib is prefixed: `.cui-btn`, `.cui-card__header` (convention-based, zero tooling)
2. **CSS Modules** — compiler transforms `.btn` → `button_btn__x7k2p`; zero leakage by design
3. **CSS-in-JS** (styled-components / emotion) — runtime generates unique class names; adds bundle/runtime cost
4. **Shadow DOM** (Web Components) — full encapsulation; nothing leaks in or out

For most teams: CSS Modules inside each remote + BEM prefix on the shared design system.

---

**Q9. What is a CSS `@layer` and how does it help in micro-frontends?**

```css
/* common-ui */
@layer common-ui {
  .btn { color: red; }
}

/* app-level — always wins without !important */
.btn { color: blue; }
```

`@layer` lets you declare **specificity precedence** at the architecture level. Common-ui styles sit in a named layer; any unlayered app-level rule wins automatically. Prevents specificity wars across teams.

---

**Q10. If two remotes load different versions of the same CSS-in-JS library, what happens?**

Both inject `<style>` tags with their own class hashes — likely no collision, but you get **duplicate library runtime** (two emotion instances, two style sheets). Mitigation: add the CSS-in-JS library to the Module Federation `shared` config with `singleton: true`.

---

### Communication & State

---

**Q11. How do micro-frontends communicate with each other?**

- **Shell-to-remote props/context:** shell passes auth info, locale, user data as props or a React context at mount time
- **Custom events (DOM):** remotes emit `window.dispatchEvent(new CustomEvent('cart:updated', { detail }))`, other remotes listen — decoupled, no import needed
- **Shared state library:** if on the same framework, a tiny shared Zustand/Redux slice via federation `shared` config — use sparingly
- **URL / query params:** deep link state lives in the URL; all remotes read from it
- **BFF / API:** for cross-domain data, fetch from backend rather than passing across MFE boundary

Avoid: direct imports between remote bundles (tight coupling), large shared global stores.

---

**Q12. How does authentication work across micro-frontends?**

- Shell handles login, receives tokens
- Preferred: **HttpOnly cookie** set by a BFF — all remotes on the same domain get it automatically, no token passing needed
- Alternative: shell passes a **read-only auth context** (userId, roles) as props at mount; remotes never store the raw token
- Never store tokens in `localStorage` inside individual remotes — each team reinventing token storage is a security risk

---

### Performance

---

**Q13. What performance problems are unique to micro-frontends?**

1. **Duplicate dependencies** — if `shared` is misconfigured, React loads twice; use `singleton: true`
2. **Waterfall on boot** — shell fetches → remote manifest fetches → remote JS loads; mitigate with `<link rel=”preload”>` on critical remotes
3. **JS budget drift** — each team adds dependencies independently; introduce **size budgets per remote** in CI
4. **No shared chunk graph** — build-time optimizations like tree-shaking across remote boundaries don't exist; each remote is its own bundle

---

**Q14. How do you handle a remote that fails to load?**

```tsx
<ErrorBoundary fallback={<RemoteFailedBanner name=”Catalog” />}>
  <Suspense fallback={<Skeleton />}>
    <CatalogApp />
  </Suspense>
</ErrorBoundary>
```

- **Error boundary** catches render errors from the remote
- **Suspense** handles the async load
- On load failure: show a domain-specific fallback (not a white screen), log to observability, optionally retry with exponential backoff
- CDN should serve a **stale cached `remoteEntry`** if the origin is down (Cache-Control + stale-while-revalidate)

---

### Testing & DX

---

**Q15. How do you test across micro-frontend boundaries?**

| Layer | What to test | Tool |
|---|---|---|
| Unit | Each remote in isolation | Jest / Vitest |
| Contract | Shell ↔ remote interface (props, events) | Pact / shared TypeScript types |
| Integration | Shell mounting a real remote | Cypress / Playwright with both apps running |
| E2E | Critical cross-remote user flows (login → catalog → checkout) | Playwright / Cypress |

Contract tests are the most valuable — they catch breaking changes before runtime.

---

**Q16. How do you set up local development when you have 5 remotes?**

Options:
1. **Mock remotes** — shell has a `dev` config pointing remotes to local mock components or stubs; each team only runs their own remote + shell
2. **Remote dev servers** — run all remotes locally with `webpack-dev-server`; shell's env points to `localhost:3001`, `localhost:3002`, etc.
3. **Hybrid** — run only the remote you're working on; point others at the staging CDN URL

Most teams do option 3 — point unrelated remotes at staging and only start what you're developing.

---

**Q17. What would you put in a “platform team” to support micro-frontend teams?**

- **Shell** — routing, auth, global error boundary
- **Design system** — versioned component library, tokens
- **Shared tooling** — webpack/vite federation base config, eslint presets, CI templates
- **Contract testing infrastructure** — shared Pact broker or TypeScript interface package
- **Observability** — one RUM SDK, one error tracking config, standard logging shape
- **Local dev tooling** — a CLI to start any subset of remotes quickly

Without a platform team, each MFE team solves the same infrastructure problems independently and you lose the benefits of federation.

---

### Scenario / Trade-off

---

**Q18. Your manager says “just use iframes for isolation”. What do you say?**

> iframes give the strongest isolation but come with real UX costs: you can't seamlessly control scroll, focus, or height across the boundary; deep linking and the back button require `postMessage` coordination; accessibility (focus trapping, `aria` across documents) is hard to get right; and performance budgets are harder to reason about. I'd use iframes for **genuinely untrusted or legacy content** where security blast radius matters more than seamless UX. For our own teams, module federation with CSS Modules gives good-enough isolation with a far better developer and user experience.

---

**Q19. When would you NOT use micro-frontends?**

- Single small team — overhead of contracts, versioning, and multi-repo DX outweighs the autonomy benefit
- Highly coupled state across all domains — if checkout needs real-time catalog inventory and shared cart, the boundary is too expensive to maintain
- Early-stage product — boundaries that seem obvious now will be wrong in 6 months; wait until team and domain structure stabilizes
- Performance-critical single-page — every remote load is a network round trip; if every ms counts, a modular monolith with aggressive code splitting is simpler to tune

---

**Q20. End-to-end: Design a micro-frontend shell for an e-commerce site with 3 teams.**

**Teams:** Catalog (browse), Cart (add/review), Checkout (payment)

```
Shell responsibilities:
  - Auth (HttpOnly cookie via BFF)
  - Top-level router: /catalog/* → Catalog, /cart → Cart, /checkout/* → Checkout
  - Header/nav component (owns cart item count via custom event)
  - Global error boundary + observability init

Remotes (each team owns):
  - Own webpack/vite config with ModuleFederationPlugin
  - Own CDN deploy pipeline
  - Expose a single mount component

Cross-remote contract:
  - Auth: shell passes { userId, roles } as context; cookie handles API auth
  - Cart updates: Catalog emits CustomEvent('cart:item:added'); Shell header listens
  - Navigation: remotes call window.history.pushState for sub-routes; shell router owns top-level

CSS:
  - Shared design system: @company/ds, versioned npm, BEM-prefixed (.ds-btn)
  - Each remote: CSS Modules for internal styles

Version management:
  - Shared lib: Changesets for semver; each team upgrades independently
  - Remote URLs: env-var config service; staging points to each team's staging CDN
```

This gives 3 independent deploy pipelines, one consistent UX, and a clear platform contract.
