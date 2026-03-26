# 20. Reduce Bundle Size in Large Applications

## Why It Matters

Bundle size directly impacts two user-facing metrics:

**LCP (Largest Contentful Paint) on slow networks:** A 1MB JavaScript bundle takes ~10 seconds to download on a 3G connection (1Mbps). The page cannot render until critical JS is parsed. Every 100KB saved on the critical path saves roughly 1 second of LCP on median mobile connections.

**Parse and compile time on low-end devices:** Modern Chrome on a Pixel 9 Pro parses 1MB of JS in ~50ms. The same JS on a budget Android phone (Moto G4 class) takes 3–5 seconds — just for parse and compile, before a single line of your code executes. This is the "JS tax" that disproportionately affects emerging market users.

**Rule: audit first, then optimize.** Cutting a 50KB library nobody uses is less impactful than splitting a 400KB chart library used only on the admin dashboard. Find the biggest offenders before writing code.

---

## Step 1: Audit — Find the Biggest Offenders

### webpack-bundle-analyzer (webpack)

```js
// webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static', // generates a report.html
      openAnalyzer: false,
    })
  ]
};
```

### vite-plugin-visualizer (Vite)

```js
// vite.config.js
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      open: true,          // opens browser with treemap after build
      gzipSize: true,      // show gzip-compressed sizes (more realistic)
      brotliSize: true,    // show brotli-compressed sizes
    })
  ]
});
```

**What to look for:** Treemap rectangles are sized by their contribution to the bundle. Find:
- Third-party libraries occupying > 100KB uncompressed (moment, lodash, faker, etc.)
- Duplicate copies of the same library (e.g., two versions of `lodash` from different transitive deps)
- Libraries imported in their entirety when only one function is used

**Chrome Coverage tab:** DevTools → Coverage → record page load. Shows which bytes of each JS file were actually executed. High grey % = dead code loaded on the critical path.

---

## Technique 1: Code Splitting — Dynamic import()

Never ship code for a route or feature to users who have not navigated there.

```jsx
// BEFORE: All routes bundled into one chunk — every user downloads chart library
// even if they never visit the analytics dashboard.
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';   // contains Recharts (400KB!)
import Settings from './pages/Settings';

// AFTER: Route-based splitting — each route becomes its own chunk.
// Analytics chunk only downloads when the user navigates to /analytics.
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**Component-level splitting for heavy features:**

```jsx
// A rich text editor (Quill, TipTap) is 200KB+ — only load it when the user
// clicks "Edit" — not during the initial page render.
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));

function PostEditor({ post }) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <p>{post.content}</p>
      <button onClick={() => setEditing(true)}>Edit</button>
      {editing && (
        <Suspense fallback={<div>Loading editor...</div>}>
          <RichTextEditor initialContent={post.content} />
        </Suspense>
      )}
    </div>
  );
}
```

**Preloading:** If you know the user will likely navigate to Analytics next, preload the chunk during idle time:

```js
// Preload the Analytics chunk without rendering it
const preloadAnalytics = () => import('./pages/Analytics');

// Trigger preload on hover — by the time they click, the chunk is cached
<Link to="/analytics" onMouseEnter={preloadAnalytics}>Analytics</Link>
```

---

## Technique 2: Tree Shaking — Only Import What You Use

Tree shaking eliminates exported code that is never imported. It only works with ES modules (`import`/`export`), not CommonJS (`require`).

```js
// BAD: Imports the entire lodash bundle (~72KB gzipped).
// Bundlers cannot tree-shake CommonJS modules.
const _ = require('lodash');
const result = _.groupBy(items, 'category');

// BAD with ESM: lodash/index.js re-exports everything — bundler may still include it all.
import _ from 'lodash';

// GOOD: Named import from lodash-es (fully ESM, tree-shakeable).
// Only the groupBy code is included in the bundle.
import { groupBy } from 'lodash-es';
const result = groupBy(items, 'category');

// BETTER for single functions: direct import from the function file.
import groupBy from 'lodash-es/groupBy';
```

**sideEffects field in package.json:**

```json
// In your own library or app package.json.
// "sideEffects: false" tells the bundler that no file in this package
// has side effects when imported — so unused exports can be safely dropped.
{
  "name": "my-component-library",
  "sideEffects": false
}

// If some files DO have side effects (e.g., CSS imports, polyfills),
// list them explicitly so they are not accidentally dropped.
{
  "sideEffects": [
    "*.css",
    "./src/polyfills.js"
  ]
}
```

---

## Technique 3: Replace Heavy Dependencies

Before adding a dependency, check bundlephobia.com for its minified + gzipped size. Consider whether a lighter alternative exists.

| Heavy Dep | Size (min+gz) | Lightweight Alternative | Alternative Size |
|---|---|---|---|
| moment | ~67KB | date-fns (tree-shakeable) | ~3KB per function |
| moment | ~67KB | dayjs | ~7KB |
| lodash | ~24KB | lodash-es (tree-shakeable) | per-function |
| lodash | ~24KB | native array methods | 0KB |
| axios | ~13KB | native fetch + small wrapper | 0KB |
| joi | ~24KB | zod | ~14KB |
| chart.js | ~60KB | d3 (tree-shakeable) | per-module |

```js
// BEFORE: moment (67KB gzipped) for formatting one date.
import moment from 'moment';
const formatted = moment(date).format('MMMM D, YYYY');

// AFTER: date-fns (only imports the format function, ~2KB).
import { format } from 'date-fns';
const formatted = format(new Date(date), 'MMMM d, yyyy');

// OR: Intl.DateTimeFormat (zero KB — browser built-in).
const formatted = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'long', day: 'numeric'
}).format(new Date(date));
```

---

## Technique 4: Lazy Load Below-the-Fold Components

Components the user cannot see on initial load do not need to be in the critical bundle.

```jsx
import { lazy, Suspense } from 'react';

// HeavyCarousel is a large dependency — only load it when it enters the viewport.
const HeavyCarousel = lazy(() => import('./components/HeavyCarousel'));

function ProductPage() {
  const [carouselVisible, setCarouselVisible] = useState(false);
  const carouselRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setCarouselVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' }); // start loading 200px before it enters viewport

    if (carouselRef.current) observer.observe(carouselRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <ProductHero />
      <ProductDetails />
      <div ref={carouselRef}>
        {carouselVisible ? (
          <Suspense fallback={<CarouselSkeleton />}>
            <HeavyCarousel />
          </Suspense>
        ) : (
          <CarouselSkeleton />
        )}
      </div>
    </div>
  );
}
```

---

## Technique 5: Externalize React via CDN

For apps served from a CDN-heavy environment (or a micro-frontend shell that already loads React), you can mark React as external and load it from a CDN. Users who have visited any site using the same CDN URL already have React cached.

```js
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        }
      }
    }
  }
});
```

```html
<!-- index.html — load React from CDN before your bundle -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script type="module" src="/dist/app.js"></script>
```

**Trade-off:** This couples your app to CDN availability. Prefer this for micro-frontends with a shared shell, not for standalone apps.

---

## Technique 6: Image Optimization

Images are not JavaScript, but they are the single largest contributor to page weight and LCP for most sites. They belong in a bundle-size conversation.

```html
<!-- Use modern formats: WebP ~30% smaller than JPEG, AVIF ~50% smaller -->
<!-- Responsive srcset: serve the right size for the user's screen -->
<!-- Lazy loading: browser defers off-screen images automatically -->
<img
  src="product-800.webp"
  srcset="product-400.webp 400w, product-800.webp 800w, product-1200.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  loading="lazy"
  alt="Product name"
  width="800"
  height="600"
/>
```

```jsx
// Next.js Image component handles all of this automatically.
import Image from 'next/image';
<Image src="/product.jpg" width={800} height={600} alt="Product" />
```

---

## Technique 7: Compression — Brotli > gzip

JavaScript bundles are compressed before being sent over the network. Brotli achieves ~15–20% better compression than gzip for text content (HTML, CSS, JS).

**Pre-compress at build time** (faster response, no CPU overhead per request):

```js
// vite.config.js with vite-plugin-compression
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    viteCompression({ algorithm: 'gzip', ext: '.gz' }), // fallback for older clients
  ]
});
```

**Nginx config to serve pre-compressed files:**

```nginx
# Serve .br file if client supports Brotli, .gz as fallback, original otherwise.
brotli_static on;
gzip_static on;
location ~* \.(js|css|html|svg)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

**Impact:** A 500KB JS bundle compresses to ~150KB with gzip, ~125KB with Brotli. On a 1Mbps connection, that is 0.2 seconds saved per page load.

---

## Bundle Budgets in CI

Prevent bundle regressions from reaching production by failing the build when a chunk exceeds a defined size limit.

```json
// package.json — using bundlesize
{
  "bundlesize": [
    { "path": "./dist/assets/index-*.js", "maxSize": "150 kB" },
    { "path": "./dist/assets/vendor-*.js", "maxSize": "300 kB" },
    { "path": "./dist/assets/*.css", "maxSize": "50 kB" }
  ]
}
```

```yaml
# GitHub Actions CI
- name: Check bundle size
  run: npx bundlesize
```

**BundleMon** is a more advanced alternative that posts a comment to your PR showing exactly which chunks grew or shrank compared to the base branch:

```yaml
- name: BundleMon
  uses: nickvdyck/bundlemon-action@v1
  with:
    config: '{"files": [{"path": "./dist/**/*.js", "maxSize": "500kb"}]}'
```

---

## Summary: The Optimization Checklist

```
1. Audit: run bundle analyzer → identify chunks > 100KB
2. Code split: lazy() every route; lazy() heavy below-fold features
3. Tree shake: switch to lodash-es / date-fns; check sideEffects in package.json
4. Replace: moment → date-fns or Intl, axios → fetch
5. Lazy load: below-fold components with IntersectionObserver
6. Externalize: CDN for shared deps in micro-frontend architectures
7. Images: WebP/AVIF + srcset + loading="lazy"
8. Compress: Brotli pre-compressed, served via CDN
9. Budget: bundlesize or BundleMon in CI to prevent regressions
```

---

## Interview Sound Bite

"Bundle size matters because parse-and-compile time on low-end devices is 3–5x worse than on a developer laptop, and every 100KB saved on the critical path is roughly 1 second of LCP on a slow connection. My process: run `vite-plugin-visualizer` to find the biggest offenders in the treemap — typically a few third-party libraries. Then I apply code splitting with `React.lazy` and dynamic `import()` for every route and heavy feature like a rich-text editor. I switch moment to date-fns or native `Intl` (67KB → 2KB), and lodash to lodash-es for tree-shaking. Below-fold components get lazy-loaded with IntersectionObserver. Images move to WebP with responsive `srcset` and `loading='lazy'`. I configure Brotli pre-compression in the build pipeline and gate bundle growth with `bundlesize` in CI so no PR can silently ship a 200KB regression."
