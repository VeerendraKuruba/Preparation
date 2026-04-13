# Web Performance

## Q1. What are Core Web Vitals and how do you improve each?

**Answer:**

Google's Core Web Vitals are the primary UX performance signals used for search ranking.

### LCP — Largest Contentful Paint (loading)
**Goal: < 2.5s**
Measures when the largest visible element (hero image, h1, video thumbnail) is rendered.

**Fixes:**
- Preload hero image: `<link rel="preload" as="image" href="/hero.webp">`
- Use `priority` prop in Next.js `<Image>`
- Serve images in modern formats (WebP, AVIF)
- Eliminate render-blocking resources (defer non-critical JS/CSS)
- Use CDN for assets

```tsx
// Next.js — priority preloads the image
<Image src="/hero.webp" alt="Hero" width={1200} height={600} priority />
```

### INP — Interaction to Next Paint (responsiveness)
**Goal: < 200ms** (replaced FID in 2024)
Measures latency of all user interactions (click, key, tap) throughout the page lifecycle.

**Fixes:**
- Break up long tasks with `scheduler.yield()` or `setTimeout`
- Defer non-critical work after interaction
- Avoid heavy JS on the main thread (use Web Workers)
- Optimize event handlers — debounce/throttle expensive operations

```tsx
// Yield to browser between chunks
async function processLargeList(items: Item[]) {
  for (let i = 0; i < items.length; i++) {
    process(items[i]);
    if (i % 100 === 0) await scheduler.yield(); // give browser a chance
  }
}
```

### CLS — Cumulative Layout Shift (visual stability)
**Goal: < 0.1**
Measures unexpected layout shifts — images loading without dimensions, dynamic content injected above fold.

**Fixes:**
- Always specify `width` and `height` on images/videos
- Reserve space for dynamic content (ad slots, banners)
- Avoid inserting content above existing content
- Use `font-display: optional` to prevent FOIT/FOUT shifts

```css
/* Reserve space for dynamic content */
.ad-slot {
  min-height: 90px;
  contain: layout;
}
```

---

## Q2. Explain code splitting and lazy loading in React

**Answer:**

**Code splitting** breaks the JS bundle into smaller chunks loaded on demand, reducing initial bundle size.

```tsx
// React.lazy + Suspense — component-level splitting
const DocumentEditor = React.lazy(() => import('./DocumentEditor'));
const AdminPanel = React.lazy(() => import('./AdminPanel'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/editor" element={<DocumentEditor />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  );
}

// Next.js dynamic import
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // don't SSR if it needs browser APIs
});
```

**Route-based splitting** is the most impactful — each route loads its own chunk.

---

## Q3. What is the difference between preload, prefetch, and preconnect?

**Answer:**

| Hint | Priority | When to use |
|------|----------|-------------|
| `preload` | High — fetch now | Critical resources needed for current page (hero image, main font) |
| `prefetch` | Low — fetch when idle | Resources needed for likely next navigation |
| `preconnect` | DNS + TCP + TLS handshake | Third-party origins you'll fetch from soon (CDN, API) |
| `dns-prefetch` | DNS only | Fallback for browsers without preconnect |

```html
<!-- Preload critical CSS and fonts -->
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>
<link rel="preload" href="/hero.webp" as="image">

<!-- Preconnect to API and CDN -->
<link rel="preconnect" href="https://api.docusign.com">
<link rel="preconnect" href="https://cdn.docusign.com" crossorigin>

<!-- Prefetch next page -->
<link rel="prefetch" href="/dashboard">
```

---

## Q4. How do you optimize images in a React/Next.js application?

**Answer:**

1. **Modern formats:** Use WebP/AVIF (30-50% smaller than JPEG/PNG)
2. **Responsive images:** Serve correct size per viewport
3. **Lazy loading:** Load images below the fold only when needed
4. **CDN:** Serve from edge locations close to the user

```tsx
// Next.js Image component handles all of this automatically
import Image from 'next/image';

<Image
  src="/document-preview.png"
  alt="Document preview"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"  // responsive
  loading="lazy"  // default for non-priority
  placeholder="blur"  // show blurred placeholder
  blurDataURL="data:image/jpeg;base64,..."
/>
```

---

## Q5. Explain bundle size optimization strategies

**Answer:**

1. **Tree shaking:** Import only what you use
   ```tsx
   // BAD
   import _ from 'lodash'; // imports entire lodash (~70kb)
   // GOOD
   import debounce from 'lodash/debounce'; // only debounce
   ```

2. **Dynamic imports:** Lazy-load heavy libraries
   ```tsx
   async function exportPDF() {
     const { generatePDF } = await import('heavy-pdf-lib');
     generatePDF(data);
   }
   ```

3. **Analyze your bundle:**
   ```bash
   npx next build && npx @next/bundle-analyzer
   # or
   npx webpack-bundle-analyzer
   ```

4. **Replace heavy deps:**
   - `moment` (67kb) → `date-fns` (tree-shakeable) or `dayjs` (2kb)
   - `lodash` → native ES methods or `lodash-es`

5. **Externalize large deps:** Load from CDN for caching benefits

---

## Q6. What is the Critical Rendering Path and how do you optimize it?

**Answer:**

The browser's process to convert HTML/CSS/JS into pixels:
1. Parse HTML → DOM
2. Parse CSS → CSSOM
3. Combine → Render Tree
4. Layout
5. Paint
6. Composite

**Blockers to eliminate:**
- **Render-blocking CSS:** All `<link>` stylesheets block rendering — inline critical CSS, defer the rest
- **Parser-blocking JS:** `<script>` without `async`/`defer` stops HTML parsing

```html
<!-- GOOD — non-blocking JS -->
<script src="analytics.js" defer></script>    <!-- executes after HTML parsed -->
<script src="widget.js" async></script>       <!-- executes as soon as loaded -->

<!-- Inline critical CSS for above-the-fold content -->
<style>
  /* Only styles needed for first viewport */
  body { margin: 0; font-family: Inter, sans-serif; }
  .header { ... }
</style>
<!-- Load full CSS async -->
<link rel="preload" href="/main.css" as="style" onload="this.rel='stylesheet'">
```

---

## Q7. How do you measure and monitor frontend performance in production?

**Answer:**

**Tools:**
- **Lighthouse / PageSpeed Insights** — lab data, audits
- **Chrome DevTools Performance tab** — flame charts, long tasks
- **Web Vitals JS library** — collect real user metrics (RUM)
- **Sentry Performance** — transaction tracking, p75/p95
- **Datadog / NewRelic RUM** — production monitoring

```tsx
// Collect Web Vitals and send to analytics
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, delta, rating, id }: Metric) {
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({ name, delta, rating, id, url: location.href }),
  });
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);

// Next.js built-in
export function reportWebVitals(metric: NextWebVitalsMetric) {
  if (metric.label === 'web-vital') {
    sendToAnalytics(metric);
  }
}
```
