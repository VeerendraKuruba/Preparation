/**
 * Q30. Chrome DevTools and Lighthouse for finding real bottlenecks
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * TWO TOOLS, TWO PURPOSES
 * ────────────────────────
 *  Chrome DevTools → Diagnose SPECIFIC problems on your page in real-time
 *  Lighthouse      → Audit overall performance and get prioritised suggestions
 *
 *  Use Lighthouse FIRST to identify what to investigate.
 *  Use DevTools THEN to pinpoint the exact cause.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LIGHTHOUSE
// ─────────────────────────────────────────────────────────────────────────────
/*
  Access:
    Chrome DevTools → Lighthouse tab → Generate report
    Or: npx lighthouse https://yoursite.com --view
    Or: web.dev/measure (remote)

  IMPORTANT SETTINGS:
    Mode:     Navigation (best for page load) vs Timespan vs Snapshot
    Device:   Mobile (default, as Google uses mobile-first scoring)
    Throttle: Applied CPU 4× slowdown + Slow 4G network (important for real-world sim)

  REPORT STRUCTURE:
    Performance score (0-100) — weighted combination of metrics
    Metrics: FCP, LCP, TBT (Total Blocking Time), CLS, Speed Index, TTI
    Opportunities: specific things to fix with estimated savings
    Diagnostics: additional information (not scored)
    Passed audits: what's already working

  KEY METRICS IN LIGHTHOUSE:
    LCP         → largest contentful paint (Core Web Vital)
    TBT         → total blocking time (lab proxy for INP)
    CLS         → cumulative layout shift (Core Web Vital)
    FCP         → first contentful paint
    Speed Index → how quickly content is visually populated
    TTI         → time to interactive

  SCORE WEIGHTS (2024):
    LCP:          25%
    TBT:          30%
    CLS:          25%
    FCP:          10%
    Speed Index:  10%

  READING OPPORTUNITIES:
    Each opportunity shows:
      • What to fix
      • Estimated savings (seconds)
      • Which resources are affected

    Prioritise by largest savings first.
    e.g., "Eliminate render-blocking resources: 1.45s savings" → fix this first

  CI INTEGRATION:
    # .github/workflows/lighthouse.yml
    - uses: treosh/lighthouse-ci-action@v10
      with:
        urls: |
          https://yoursite.com
        budgetPath: ./budget.json
        uploadArtifacts: true

    # budget.json
    [{
      "path": "/*",
      "resourceSizes": [{ "resourceType": "script", "budget": 300 }],
      "timings": [{ "metric": "interactive", "budget": 5000 }]
    }]
*/

// ─────────────────────────────────────────────────────────────────────────────
// CHROME DEVTOOLS: PERFORMANCE PANEL
// ─────────────────────────────────────────────────────────────────────────────
/*
  How to record:
  1. DevTools → Performance tab
  2. Optional: Check "Screenshots" for frame-by-frame visual
  3. Click Record (or Ctrl+Shift+E)
  4. Interact with the page
  5. Stop recording
  6. Analyze the flame chart

  KEY TRACKS TO INSPECT:
  ┌─────────────────────────────────────────────────────────────────┐
  │ Experience   │ CLS markers (red), INP markers                  │
  ├─────────────────────────────────────────────────────────────────┤
  │ Interactions │ Interaction timeline (click, keydown)           │
  ├─────────────────────────────────────────────────────────────────┤
  │ Main thread  │ YELLOW = JS execution                           │
  │              │ PURPLE = Layout/Style recalculation             │
  │              │ GREEN  = Paint                                  │
  │              │ DARK GREEN = Composite                          │
  │              │ RED indicator on top = Long task                │
  ├─────────────────────────────────────────────────────────────────┤
  │ Raster       │ Tile rasterization (GPU threads)                │
  ├─────────────────────────────────────────────────────────────────┤
  │ Compositor   │ Compositing frames                              │
  ├─────────────────────────────────────────────────────────────────┤
  │ Network      │ Resource download waterfall                     │
  ├─────────────────────────────────────────────────────────────────┤
  │ Timings      │ FCP, LCP, DCL, Load event markers               │
  └─────────────────────────────────────────────────────────────────┘

  READING FLAME CHARTS:
  • Wide yellow blocks at the top = expensive JS functions (investigate these)
  • Long tasks (red corner) = blocks main thread > 50ms
  • Purple "Layout" inside yellow "JS" = forced synchronous layout (bad!)
  • Thin function bars = normal; stacked bars = call chain

  BOTTOM-UP VIEW:
  • Shows total self-time for each function across the recording
  • Best for finding "who is slow" vs flame chart's "when was it slow"

  CALL TREE VIEW:
  • Top-down hierarchy from task entry points
  • Good for understanding call flow

  FILTERING:
  • "Hide native functions" to see only your code
  • "Group by function" to aggregate multiple calls
*/

// ─────────────────────────────────────────────────────────────────────────────
// CHROME DEVTOOLS: NETWORK PANEL
// ─────────────────────────────────────────────────────────────────────────────
/*
  Key features for performance:
  1. Waterfall view:
     • Blue lines = FCP, red lines = LCP
     • Thick connection bars = DNS/TCP/TLS overhead
     • Gaps between requests = main thread busy (not downloading)

  2. Throttling:
     • Presets: Fast 3G, Slow 3G, Offline
     • Custom: simulate exact target user's connection

  3. Disable cache:
     • Check "Disable cache" to simulate first visit

  4. Protocol column:
     • h2 = HTTP/2, h3 = HTTP/3, http/1.1 = legacy

  5. Priority column:
     • Shows fetching priority for each resource
     • Verify LCP image has "Highest" priority

  6. Filter by type:
     • JS, CSS, Img, Font — isolate specific resource categories
     • "Third-party" preset — see third-party impact
*/

// ─────────────────────────────────────────────────────────────────────────────
// CHROME DEVTOOLS: RENDERING PANEL
// ─────────────────────────────────────────────────────────────────────────────
/*
  Access: DevTools → More tools → Rendering

  Key features:
  • Paint flashing:    Green overlay on repainted areas (find paint storms)
  • Layer borders:     Green = composited layer, blue = paint layer
  • Layout shift regions: Blue flash on shifted elements (CLS debug)
  • Scrolling performance issues: Highlights janky scroll areas
  • Core Web Vitals: Live FCP, LCP, CLS overlay on the page
  • Emulate CSS media: Test dark/light mode, print
*/

// ─────────────────────────────────────────────────────────────────────────────
// CHROME DEVTOOLS: COVERAGE TAB
// ─────────────────────────────────────────────────────────────────────────────
/*
  Access: DevTools → More tools → Coverage

  Shows: what % of each CSS/JS file was used during the recording.
  Unused bytes in red, used bytes in green.

  Use for:
  • Identifying dead CSS to remove with PurgeCSS
  • Identifying JS code that should be code-split (lazy loaded)
  • Quantifying how much code can be eliminated

  Typical finding: 40-60% of CSS is unused on first load.
*/

// ─────────────────────────────────────────────────────────────────────────────
// CHROME DEVTOOLS: MEMORY PANEL
// ─────────────────────────────────────────────────────────────────────────────
/*
  Three profiling modes:
  1. Heap Snapshot    → point-in-time memory map; find detached nodes, leaks
  2. Allocation Timeline → watch objects being created and retained over time
  3. Allocation Sampling → sampling profiler; find which functions allocate most

  For memory leaks:
  → Take snapshot → do the operation → take another snapshot → compare
  → Filter "Detached" to find detached DOM nodes
*/

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW: Finding Real Bottlenecks
// ─────────────────────────────────────────────────────────────────────────────
/*
  Step 1: Run Lighthouse (mobile, incognito, cleared cache)
     → Get score and top 3 "Opportunities" by savings

  Step 2: Open Performance panel, throttle to Slow 4G + 4× CPU
     → Record a full page load
     → Find: what is the long bar before FCP? before LCP?

  Step 3: Look at flame chart
     → Is there a large JS execution block? → what script/function?
     → Is there a late network request for the LCP resource?
     → Are there forced layouts (purple inside yellow)?

  Step 4: Network panel
     → Does the LCP image have "Highest" priority?
     → Is there a render-blocking CSS request delaying FCP?
     → Are there unnecessary third-party requests?

  Step 5: Coverage tab
     → How much CSS/JS is unused? → code split or purge

  Step 6: Fix the #1 issue → re-run Lighthouse → confirm improvement

  NEVER optimize without measuring first.
  ALWAYS re-measure after changes to verify improvement.
*/

/**
 * QUICK REFERENCE
 * ────────────────
 *  Tool / Panel          Best for
 *  ─────────────────     ──────────────────────────────────────────────
 *  Lighthouse            Overall audit, prioritized recommendations
 *  Performance panel     Exact timing, call stacks, long tasks
 *  Network panel         Resource loading order, priorities, waterfall
 *  Rendering panel       Paint, layout shifts, layer visualization
 *  Coverage panel        Unused JS/CSS bytes
 *  Memory panel          Memory leaks, detached DOM nodes
 *  Layers panel          GPU layer explosion, over-promotion
 */
