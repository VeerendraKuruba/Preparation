# JP Morgan Tech Stack & Open-Source Ecosystem

**Why this matters:** Mentioning their open-source work in interviews shows genuine initiative and interest.  
**Where to use:** Recruiter screen ("Why JPMC?"), behavioral round, system design ("I'd consider using Perspective for real-time data visualization, similar to how JPMC uses it internally")

---

## JP Morgan's Open-Source Projects

### 1. Salt DS (Design System Component Library)
- **GitHub:** `jpmorganchase/salt-ds`
- **What it is:** Open-source React component library — accessible, customizable, composable
- **Design principles:** Uses design tokens, WCAG compliant, dark/light mode support
- **Real usage:** Powers internal tools and is the open-source version of their internal Manhattan Design System
- **Stack:** React, TypeScript, Storybook, CSS custom properties for tokens

```bash
# Salt DS usage
npm install @salt-ds/core @salt-ds/theme

import { Button, Input, FormField } from '@salt-ds/core';
import '@salt-ds/theme/index.css';

<FormField label="Trade Symbol">
  <Input value={symbol} onChange={setSymbol} />
</FormField>
<Button variant="cta" onClick={executeTrade}>Execute</Button>
```

---

### 2. Perspective (Real-Time Data Visualization)
- **GitHub:** `finos/perspective`
- **What it is:** High-performance, streaming data visualization framework
- **Used for:** Real-time financial dashboards, live market data rendering
- **Key feature:** WebAssembly-powered — handles millions of rows, updates in real-time
- **Stack:** C++ compiled to WASM, JavaScript/Python APIs, React wrappers

```javascript
// Perspective with WebSockets for live market data
import perspective from '@finos/perspective';

const worker = perspective.worker();
const table = await worker.table({ symbol: 'string', price: 'float', volume: 'integer' });

// Stream live updates
websocket.onmessage = (e) => {
  const tick = JSON.parse(e.data);
  table.update([tick]); // renders update in <1ms
};

// Bind to viewer
const viewer = document.querySelector('perspective-viewer');
viewer.load(table);
```

---

### 3. Modular (Frontend Development Framework)
- **GitHub:** `jpmorganchase/modular`
- **What it is:** A set of tools and libraries for building modular TypeScript/React applications
- **Built on:** Create React App + module federation concepts
- **Use case:** Manages large monorepo of frontend packages with a consistent dev workflow

---

### 4. Mosaic (Data Exploration Platform)
- **What it is:** Interactive visualization and data exploration, linked views
- **Use case:** Financial analysts exploring large datasets with cross-filtered charts

---

### 5. Elemental (API Documentation)
- **What it is:** Embeddable API reference documentation using React + Web Components
- **Based on:** OpenAPI specs → interactive docs
- **Used for:** Internal API documentation across 50+ teams

---

### 6. FINOS Contributions
JP Morgan is a major contributor to **FINOS (Fintech Open Source Foundation)**:
- **FDC3** (Financial Desktop Connectivity) — standard for app interoperability on trading desktops
- **Legend** — data modeling platform used for trade lifecycle management
- Perspective (see above)

---

## Manhattan Design System (MDS)

**Internal, not open-source, but discussed publicly:**
- Serves ~1,000 designers and ~3,000 engineers
- Design tokens as single source of truth across all products
- Built on top of Figma + custom tokens pipeline
- Components sync between design (Figma) and code (Salt DS) via automation
- **Key challenge they solved:** Allowing team customization without breaking system consistency

**What to say in interviews:**
> "I've read about how JP Morgan built the Manhattan Design System to serve 3,000 engineers across 50 product teams. The challenge of maintaining token consistency while allowing team customization is exactly the kind of architecture problem I find compelling — and I've faced similar challenges at scale in my previous work."

---

## JPMC Frontend Tech Standards

Based on their engineering blog and job descriptions:

| Area | Technology |
|---|---|
| Primary framework | React + TypeScript |
| Component library | Salt DS (open-source) / MDS (internal) |
| State management | Redux Toolkit, React Query |
| Build tooling | Webpack 5 (with Module Federation), Vite |
| Testing | Jest, React Testing Library, Cypress |
| Accessibility | WCAG 2.1 AA mandatory, axe-core in CI |
| Design | Figma (with custom plugins for token sync) |
| Monorepo | Turborepo / Nx |
| Real-time data | WebSockets, Perspective |
| CI/CD | Jenkins + internal tooling |
| API style | REST + GraphQL (consumer choice) |

---

## Accessibility — Non-Negotiable at JPMC

JP Morgan's legal and compliance teams mandate WCAG 2.1 AA compliance for all customer-facing products.

**Key WCAG principles (POUR):**
- **Perceivable** — content available to all senses (alt text, captions)
- **Operable** — keyboard navigable, no seizure-inducing content
- **Understandable** — clear labels, error messages, consistent nav
- **Robust** — works with assistive technology (screen readers)

**Practical implementation:**

```jsx
// 1. Semantic HTML first
<button onClick={handleTrade}>Execute Trade</button> // NOT <div onClick={...}>

// 2. ARIA where semantic HTML isn't enough
<div 
  role="alert" 
  aria-live="polite"
  aria-atomic="true"
>
  {errorMessage}
</div>

// 3. Focus management for modals
function TradeModal({ isOpen, onClose }) {
  const firstFocusRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) firstFocusRef.current?.focus();
  }, [isOpen]);

  return isOpen ? (
    <div role="dialog" aria-modal="true" aria-label="Confirm Trade">
      <button ref={firstFocusRef}>Confirm</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ) : null;
}

// 4. Color contrast — text must be 4.5:1 against background (WCAG AA)
// Use contrast checker tools; don't rely on design team alone

// 5. Keyboard navigation — all interactive elements reachable by Tab
// Use tabIndex={0} for non-semantic interactive elements
// Use tabIndex={-1} for programmatic focus only (modals, etc.)
```

**Testing accessibility:**
```bash
# In Jest + Testing Library
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('Trade form is accessible', async () => {
  const { container } = render(<TradeForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Performance at JPMC Scale

Key performance topics for financial dashboards:

### Core Web Vitals
- **LCP** (Largest Contentful Paint) < 2.5s — main content loads fast
- **FID/INP** (Interaction to Next Paint) < 200ms — UI stays responsive
- **CLS** (Cumulative Layout Shift) < 0.1 — no unexpected layout jumps

### Optimization strategies they care about:

```javascript
// 1. Code splitting — don't load everything upfront
const AnalyticsDashboard = React.lazy(() => import('./AnalyticsDashboard'));
const TradingDashboard = React.lazy(() => import('./TradingDashboard'));

// 2. Web Workers — offload heavy computation from main thread
const worker = new Worker(new URL('./priceCalculator.worker.js', import.meta.url));
worker.postMessage({ trades, prices });
worker.onmessage = (e) => updatePortfolioValue(e.data);

// 3. Service Worker — cache static assets, offline support
// Register in index.js for production builds

// 4. Bundle optimization
// - Tree shaking: import { Button } from '@salt-ds/core' (not default import)
// - Analyze: use webpack-bundle-analyzer to find bloat
// - Chunk splitting: vendor chunks cached separately from app code

// 5. Image optimization
// - Use WebP format; provide JPEG fallback
// - Use srcset for responsive images
// - Lazy load below-the-fold images: loading="lazy"
```

---

## Preparation Checklist

- [ ] Read the JPMC open-source GitHub page (jpmorganchase.github.io/projects)
- [ ] Understand Salt DS purpose and how it differs from MUI/Ant Design
- [ ] Be able to explain Perspective's use case for real-time financial data
- [ ] Know WCAG 2.1 AA key requirements and how to test
- [ ] Know Core Web Vitals and what they measure
- [ ] Prepare a "Why JP Morgan" answer that mentions MDS, Salt DS, or FINOS contributions
