/**
 * Q10. Code splitting at the route and component level
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS CODE SPLITTING?
 * ────────────────────────
 * Code splitting means dividing your JavaScript bundle into smaller chunks
 * that are loaded on-demand instead of all upfront. The initial page load only
 * downloads the code it actually needs.
 *
 * PROBLEM WITHOUT CODE SPLITTING
 * ────────────────────────────────
 *  • app.js = 2 MB (all routes, all components, all libraries)
 *  • User visits /login → downloads 2 MB, uses 50 KB
 *  • High TTI (Time to Interactive), bad LCP, wasted bandwidth
 *
 * SOLUTION: SPLIT BY ROUTE (most impactful)
 * ──────────────────────────────────────────
 *  • /login.js      = 40 KB
 *  • /dashboard.js  = 200 KB
 *  • /settings.js   = 60 KB
 *  • shared.js      = 150 KB  (common vendor code)
 *  User visits /login → downloads 40 + 150 = 190 KB
 */

// ─────────────────────────────────────────────────────────────────────────────
// REACT: Route-level splitting with React.lazy + Suspense
// ─────────────────────────────────────────────────────────────────────────────
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Each of these becomes a separate chunk in the build
const Home      = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings  = lazy(() => import("./pages/Settings"));
const Profile   = lazy(() => import("./pages/Profile"));

function App() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="/profile"   element={<Profile />} />
      </Routes>
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEXT.JS: Automatic route splitting (built-in)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Next.js automatically creates a separate bundle per page file.
  pages/index.js      → chunk for /
  pages/dashboard.js  → chunk for /dashboard

  For dynamic imports in Next.js:
*/
// import dynamic from "next/dynamic";
// const HeavyChart = dynamic(() => import("../components/Chart"), { ssr: false });

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT-LEVEL SPLITTING
// ─────────────────────────────────────────────────────────────────────────────

// Split large components that aren't needed on first render
const RichTextEditor = lazy(() => import("./components/RichTextEditor")); // heavy
const DataGrid       = lazy(() => import("./components/DataGrid"));        // heavy
const PdfViewer      = lazy(() => import("./components/PdfViewer"));       // heavy

function DocumentEditor({ showPreview }) {
  return (
    <div>
      <Suspense fallback={<div>Loading editor…</div>}>
        <RichTextEditor />
      </Suspense>
      {showPreview && (
        <Suspense fallback={<div>Loading PDF preview…</div>}>
          <PdfViewer />
        </Suspense>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTION-BASED SPLITTING
// ─────────────────────────────────────────────────────────────────────────────
// Import on first interaction — even lazier than route splitting

let chartModule = null;

async function handleChartButtonClick() {
  if (!chartModule) {
    chartModule = await import("./chart-lib"); // downloads only when clicked
  }
  chartModule.render("#chart", getData());
}

// ─────────────────────────────────────────────────────────────────────────────
// PRELOADING LAZY CHUNKS (Predictive prefetch)
// ─────────────────────────────────────────────────────────────────────────────

// Prefetch when user hovers (likely to navigate)
function NavLink({ to, children }) {
  const handleMouseEnter = () => {
    // Start downloading the chunk before the user clicks
    import(`./pages/${to}`).catch(() => {}); // ignore errors — just a hint
  };
  return (
    <a href={to} onMouseEnter={handleMouseEnter}>
      {children}
    </a>
  );
}

// In webpack, you can also use magic comments:
const LazyPage = lazy(() =>
  import(/* webpackPrefetch: true */ "./pages/Settings")
  // → <link rel="prefetch" href="settings.chunk.js"> added automatically
);

// webpackPreload: true → high priority, loads with parent chunk
// webpackPrefetch: true → low priority, loads in browser idle time

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR SPLITTING (Separate node_modules from app code)
// ─────────────────────────────────────────────────────────────────────────────
/*
  In Webpack config (webpack.config.js):

  optimization: {
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        // Separate react + react-dom (rarely changes)
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: "vendor-react",
          chunks: "all",
        },
        // All other node_modules
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: -10,
        },
      },
    },
  },

  Result:
    • vendor-react.js  → cached forever (rarely changes)
    • vendors.js       → cached long-term
    • app.js           → changes frequently (only this busts the cache)
*/

// ─────────────────────────────────────────────────────────────────────────────
// VITE CODE SPLITTING
// ─────────────────────────────────────────────────────────────────────────────
/*
  // vite.config.js
  export default {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom"],
            "vendor-router": ["react-router-dom"],
            "vendor-charts": ["recharts", "d3"],
          },
        },
      },
    },
  };
*/

// ─────────────────────────────────────────────────────────────────────────────
// MEASURING THE IMPACT
// ─────────────────────────────────────────────────────────────────────────────
/*
  Before splitting:
    bundle.js = 1.8 MB (uncompressed) = ~350 KB gzipped
    TTI = 8.2s on 4G

  After route splitting:
    initial.js = 80 KB (compressed) — what user actually downloads for /
    TTI = 1.8s on 4G

  Tools:
    • webpack-bundle-analyzer → visual chunk breakdown
    • source-map-explorer     → what's inside each chunk
    • Chrome DevTools Network → check chunk waterfall
    • Lighthouse              → "Remove unused JavaScript" audit
*/

/**
 * RULES OF THUMB
 * ──────────────
 *  1. Split every top-level route — minimum viable code splitting.
 *  2. Split components > 30 KB that aren't needed on first paint.
 *  3. Split modals, drawers, and heavy 3rd-party widgets by default.
 *  4. Separate your vendors from your app code for long-term caching.
 *  5. Prefetch likely next routes on hover / idle time.
 *  6. Don't over-split — too many tiny chunks hurt HTTP/1.1; fine for HTTP/2.
 *  7. Aim for initial bundle < 100–150 KB (compressed).
 */

function getData() { return []; }
