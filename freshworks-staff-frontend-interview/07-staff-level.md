# Staff-Level Topics — Freshworks Frontend Q&A

These are the topics that differentiate Staff from Senior at Freshworks. Based on confirmed tech stack and Staff-level interview focus areas.

---

## Q1: Microfrontend Architecture — Module Federation (Freshworks uses this)

**Context:** Freshworks migrated Freshservice from a monolithic Rails + Ember frontend to React + Vite + **Module Federation**. Staff engineers must know why and how.

**What is Module Federation?**
Webpack 5 / Vite plugin feature that lets multiple independently deployed apps share code at runtime — not build time.

```
                    ┌──────────────────┐
                    │    Shell App     │  (host)
                    │  (Freshservice)  │
                    └────────┬─────────┘
                             │ loads at runtime
            ┌────────────────┼─────────────────┐
            ↓                ↓                 ↓
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Ticket MFE  │  │  Reports MFE │  │ Settings MFE │
   │  (Remote 1)  │  │  (Remote 2)  │  │  (Remote 3)  │
   └──────────────┘  └──────────────┘  └──────────────┘
```

**Vite config for a remote (microfrontend):**
```js
// vite.config.js — TicketModule (remote)
import { defineConfig } from 'vite';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    federation({
      name: 'ticketModule',
      filename: 'remoteEntry.js',
      exposes: {
        './TicketList': './src/TicketList',
        './TicketDetail': './src/TicketDetail',
      },
      shared: ['react', 'react-dom'], // avoid duplicating React
    }),
  ],
  build: { target: 'esnext' },
});
```

**Shell app consuming the remote:**
```js
// vite.config.js — Shell (host)
federation({
  name: 'shell',
  remotes: {
    ticketModule: 'http://tickets.freshservice.com/assets/remoteEntry.js',
  },
  shared: ['react', 'react-dom'],
})

// In React component
const TicketList = lazy(() => import('ticketModule/TicketList'));
```

**Why Freshworks chose this:**
- Teams can deploy independently (Ticket team ≠ Reports team deployment schedule)
- Shared design system loaded once, not duplicated in every bundle
- Legacy Ember components could coexist with new React modules during migration

**Trade-offs to discuss:**
- Versioning conflicts — shared `react` version must be compatible
- Network dependency at runtime — remote entry must be available
- Testing complexity — integration tests needed across MFE boundaries
- Debugging harder — errors span multiple repos/builds

---

## Q2: Design System Architecture (Staff scope)

**What interviewers want:** How do you build a component library that works across React, Ember, and Rails (Freshworks' actual requirement)?

**Framework-agnostic approach:**
```
Design Tokens (CSS Custom Properties)
  └── Primitive Components (Web Components or headless)
        └── React Wrappers
        └── Ember Wrappers
        └── Vue Wrappers
```

**Web Components for framework-agnostic primitives:**
```js
class FwButton extends HTMLElement {
  static observedAttributes = ['variant', 'disabled', 'size'];

  connectedCallback() {
    this.render();
    this.addEventListener('click', this._handleClick);
  }

  attributeChangedCallback() { this.render(); }

  _handleClick(e) {
    if (this.hasAttribute('disabled')) { e.stopPropagation(); return; }
    this.dispatchEvent(new CustomEvent('fw-click', { bubbles: true }));
  }

  render() {
    const variant = this.getAttribute('variant') || 'primary';
    this.innerHTML = `
      <button class="fw-btn fw-btn--${variant}" ${this.hasAttribute('disabled') ? 'disabled' : ''}>
        <slot></slot>
      </button>
    `;
  }
}

customElements.define('fw-button', FwButton);
```

**Usage across frameworks:**
```html
<!-- Works in Ember, Rails ERB, React, plain HTML -->
<fw-button variant="primary">Save Ticket</fw-button>
```

**Versioning strategy:**
- Semantic versioning (MAJOR.MINOR.PATCH)
- MAJOR = breaking API change → teams must opt-in
- MINOR = new component or prop → backwards compatible
- PATCH = bug fix → auto-upgradeable
- Publish to internal npm registry (Verdaccio / Artifactory)

---

## Q3: Performance at Scale — Core Web Vitals

**Metrics eBay/Freshworks track:**

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| LCP (Largest Contentful Paint) | Load performance | < 2.5s |
| FID / INP (Interaction to Next Paint) | Interactivity | < 200ms |
| CLS (Cumulative Layout Shift) | Visual stability | < 0.1 |
| TTFB (Time to First Byte) | Server response | < 600ms |
| FCP (First Contentful Paint) | First pixel | < 1.8s |

**LCP optimization:**
```html
<!-- Preload the LCP image -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

<!-- Use modern image formats -->
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="..." loading="eager" width="800" height="400">
</picture>
```

**CLS prevention:**
```css
/* Always set explicit dimensions — prevents layout shift */
img, video { width: 100%; aspect-ratio: 16/9; }

/* Reserve space for async content */
.skeleton { height: 200px; background: #eee; }
```

**INP (Interaction to Next Paint) — replaces FID:**
- Long tasks (> 50ms on main thread) hurt INP
- Break long tasks with `scheduler.yield()` (or `setTimeout(fn, 0)`)
- Move heavy work to Web Workers

---

## Q4: Monorepo Architecture — Turborepo / Nx

**Why monorepos for frontend platforms (Freshworks context):**
- Shared component library + multiple product apps in one repo
- Atomic commits — component + consumer change in one PR
- Differential CI — only rebuild/test what changed

```
freshworks-frontend/
├── packages/
│   ├── design-system/     # shared component library
│   ├── utils/             # shared utilities
│   └── icons/             # icon library
├── apps/
│   ├── freshdesk/
│   ├── freshsales/
│   └── freshservice/
├── turbo.json
└── package.json
```

**Turborepo pipeline:**
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],  // ^ = build deps first
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

**Differential CI (only run what changed):**
```bash
# Only build/test packages affected by the PR
turbo run build test --filter=[HEAD^1]
```

---

## Q5: Server-Side Rendering — when, why, how

**Rendering strategies:**

| Strategy | When HTML is generated | Best for |
|----------|----------------------|----------|
| CSR (Client-Side Rendering) | In browser | SPAs, auth-gated apps |
| SSR (Server-Side Rendering) | On request | Dynamic content, SEO, first-load perf |
| SSG (Static Site Generation) | At build time | Blogs, docs, marketing pages |
| ISR (Incremental Static Regeneration) | On-demand + cached | E-commerce, product pages |
| Streaming SSR | Progressively | Large pages with independent sections |

**Streaming SSR (React 18 + Node.js):**
```js
// server.js
import { renderToPipeableStream } from 'react-dom/server';

app.get('*', (req, res) => {
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/app.js'],
    onShellReady() {
      res.setHeader('Content-Type', 'text/html');
      pipe(res); // stream HTML as it's ready
    },
    onError(error) {
      console.error(error);
    },
  });
});
```

**Why Freshworks cares:** Multi-tenant SaaS with many customers. SSR for ticket/contact pages improves SEO and perceived load time. Streaming lets the page header render before ticket list data loads.

---

## Q6: Cross-team Technical Leadership (Staff-level behavioral-technical hybrid)

**"If given 3 free months, what would you build or improve in the frontend platform?"**

**Strong answer structure:**
1. Identify the pain point (from observation, metrics, developer feedback)
2. Propose the solution with trade-offs
3. Explain adoption strategy (can't force teams to upgrade)
4. Measure success

**Example answer:**
> "I'd tackle our JS bundle size problem. Right now our main bundle is 1.2MB gzipped — LCP is suffering on slow connections. I'd introduce a bundle size budget enforced in CI (using Bundlewatch), establish route-level code splitting as the default pattern, and audit the 10 largest dependencies for lighter alternatives. I'd measure success via LCP p75 in our RUM data — target under 2.5s on 4G. Adoption strategy: make it the path of least resistance — updated the starter template and pair-programmed with 3 teams to demonstrate the pattern."

**"How do you evolve the architecture of your most interesting project?"**

This is the core Staff-level question. Freshworks specifically asks this. Have a detailed answer about:
- What you built
- What architectural decisions you made and why
- What you'd do differently at 10x scale
- What technical debt you'd pay down first

---

## Q7: MessageChannel API — cross-frame communication

Freshworks uses this for microfrontend isolation. Web apps embedded in iframes need to communicate without `postMessage` security risks.

```js
// Parent app creates a channel
const channel = new MessageChannel();
const port1 = channel.port1;
const port2 = channel.port2;

// Send port2 to the iframe
iframe.contentWindow.postMessage({ type: 'init', port: port2 }, '*', [port2]);

// Parent listens on port1
port1.onmessage = (e) => {
  console.log('From iframe:', e.data);
};

port1.postMessage({ type: 'config', theme: 'dark' });

// ---- Inside iframe ----
window.addEventListener('message', (e) => {
  if (e.data.type !== 'init') return;
  const port = e.ports[0]; // the transferred port

  port.onmessage = (e) => {
    // receive messages from parent
    applyTheme(e.data.theme);
  };

  port.postMessage({ type: 'ready' });
});
```

**Advantages over `window.postMessage`:**
- Messages go directly between the two ports (no broadcast to all listeners)
- Port ownership is explicit — cleaner security model
- Performance: no origin checking overhead per message
