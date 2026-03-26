# Q5. Maps-heavy UI (markers, clustering, gestures)

**Prompt variants:** Web map with **many markers**, **clustering**, smooth **zoom/pan**.

[← Question index](./README.md)

**Deep dive:** [Google Maps zoom (frontend)](../google-maps-zoom-frontend.md)

---

### One-line mental model

The viewport drives **tile + marker work scheduling**: compute what is visible, fetch those tiles first, **cancel stale** requests as the camera moves, and **reuse GPU/DOM resources** rather than creating new ones — every frame of smooth panning depends on this discipline.

---

### Clarify scope in the interview

Before drawing anything, nail down:
- **Raster vs vector tiles** — Raster: simple PNG/WebP delivery from CDN. Vector: rendered client-side via WebGL (Mapbox GL), supports rotation and smooth fractional zoom.
- **How many markers?** — 100 is DOM-safe. 10 000 needs clustering. 1 million needs server-side aggregation or heatmaps.
- **Embedded iframe vs full app** — Iframe: CSP isolation, simpler auth; limits gesture ownership and cross-origin messaging.
- **Offline / PWA?** — Tile caching strategy: Cache API, IndexedDB for vector data.
- **Moving markers?** — Interpolated animation, batch RAF updates.

---

### Goals & requirements

**Functional**
- Smooth pan (mouse drag, touch) and zoom (wheel, pinch, double-tap)
- Render tiles that cover the current viewport
- Show markers; cluster overlapping ones at low zoom levels
- Click/tap a cluster to zoom in and expand it
- Click a single marker to show a detail panel

**Non-functional**
- Pan/zoom at 60 fps; no janky frames
- Bounded memory: evict tiles and markers that are far from the viewport
- Race-safe network: a fast zoom sequence must not paint tiles from a stale zoom level
- Accessible zoom controls for keyboard and screen reader users

---

### High-level frontend architecture

```
User Input (wheel, touch, keyboard)
           │
           ▼
  ┌─────────────────┐
  │  Camera State   │  { center: [lat, lng], zoom: 13, bearing: 0 }
  └────────┬────────┘
           │  on change (debounced for network, NOT for render)
     ┌─────┴──────┐
     │            │
     ▼            ▼
┌──────────┐  ┌────────────────────┐
│  Tile    │  │  Marker / Cluster  │
│Scheduler │  │     Pipeline       │
└────┬─────┘  └────────┬───────────┘
     │                 │
     │ fetch tiles     │ post raw points
     │ (with gen token)│ to Web Worker
     ▼                 ▼
┌──────────┐  ┌─────────────────┐
│  Tile    │  │  Cluster Worker │  (grid bucketing / supercluster)
│  Cache   │  │  (off main thread)│
└────┬─────┘  └────────┬────────┘
     │                 │ cluster result
     └────────┬────────┘
              ▼
     ┌─────────────────┐
     │    Renderer     │
     │ WebGL / Canvas  │  (or DOM for small marker counts)
     └─────────────────┘
              │
              ▼
         CDN / Tile Server
         (XYZ tiles: /tiles/{z}/{x}/{y}.png)
```

---

### What the client does (core mechanics)

#### 1. Tile pyramid and viewport-to-tile-coordinates

The map is divided into a grid at each zoom level. At zoom `z`, the world is `2^z × 2^z` tiles. Given a viewport in lat/lng, convert to tile coordinates to know exactly which tiles to fetch.

```js
// Mercator projection: lat/lng -> tile x,y at zoom z
function lngLatToTile(lng, lat, z) {
  const n = Math.pow(2, z);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y, z };
}

// Given viewport bounds, enumerate all tiles needed
function getViewportTiles(bounds, zoom) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const topLeft  = lngLatToTile(minLng, maxLat, zoom);
  const botRight = lngLatToTile(maxLng, minLat, zoom);
  const tiles = [];
  for (let x = topLeft.x; x <= botRight.x; x++) {
    for (let y = topLeft.y; y <= botRight.y; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  return tiles;
}
```

#### 2. Generation tokens — preventing stale tiles from painting

A fast zoom sequence issues requests for zoom levels 10, 11, 12, 13 in quick succession. Without a generation token, a slow response for zoom 10 could paint on top of zoom 13 tiles.

```js
let currentGeneration = 0;

async function fetchTile(x, y, z) {
  const gen = ++currentGeneration; // capture generation at request time
  const url = `/tiles/${z}/${x}/${y}.png`;
  const response = await fetch(url, { signal: abortControllers.get(`${z}/${x}/${y}`)?.signal });
  // By the time response arrives, has the camera moved to a new zoom?
  if (gen !== currentGeneration) return; // discard: stale response
  paintTile(x, y, z, await response.blob());
}

// Cancel all in-flight tile requests when zoom changes
function cancelStaleFetches() {
  for (const [key, controller] of abortControllers) {
    controller.abort();
  }
  abortControllers.clear();
  currentGeneration++;
}
```

#### 3. Tile scheduling — center-first priority

Always fetch the tile under the crosshair first, then the ring around it, then the outer rings. Fetching in spiral order from center means the user sees meaningful content before the edges fill in.

```js
function scheduleTiles(visibleTiles, cameraCenter) {
  // Sort by distance from camera center tile
  const centerTile = lngLatToTile(cameraCenter.lng, cameraCenter.lat, zoom);
  return visibleTiles.sort((a, b) => {
    const distA = Math.hypot(a.x - centerTile.x, a.y - centerTile.y);
    const distB = Math.hypot(b.x - centerTile.x, b.y - centerTile.y);
    return distA - distB;
  });
}

// Parent tile as placeholder while child loads
function showParentPlaceholder(x, y, z) {
  // Parent tile covers 4x the area at z-1
  const parentX = Math.floor(x / 2);
  const parentY = Math.floor(y / 2);
  // Scale and crop parent tile image to fill child tile region
  drawScaledTile(parentX, parentY, z - 1, { x, y, z });
}
```

#### 4. Web Worker for marker clustering

With 10 000+ markers, clustering on the main thread blocks the UI. Offload to a worker. Grid-based clustering: divide the viewport into a grid of cells; all markers in one cell become a cluster.

```js
// main.js
const clusterWorker = new Worker('/cluster-worker.js');

function requestClusters(markers, viewport, zoom) {
  clusterWorker.postMessage({ markers, viewport, zoom, reqId: Date.now() });
}

clusterWorker.onmessage = ({ data }) => {
  const { clusters, reqId } = data;
  if (reqId < latestReqId) return; // stale result — camera has moved
  renderClusters(clusters);
};
```

```js
// cluster-worker.js — grid clustering
self.onmessage = ({ data }) => {
  const { markers, viewport, zoom, reqId } = data;
  const cellSizePx = 60; // pixels per cluster cell
  const grid = new Map();

  for (const marker of markers) {
    const screenPos = projectToScreen(marker.lat, marker.lng, viewport, zoom);
    if (!inViewport(screenPos, viewport)) continue;

    const cellX = Math.floor(screenPos.x / cellSizePx);
    const cellY = Math.floor(screenPos.y / cellSizePx);
    const key = `${cellX}:${cellY}`;

    if (!grid.has(key)) grid.set(key, { count: 0, lat: 0, lng: 0 });
    const cell = grid.get(key);
    cell.count++;
    cell.lat += marker.lat;   // accumulate for centroid
    cell.lng += marker.lng;
  }

  const clusters = Array.from(grid.values()).map(c => ({
    count: c.count,
    lat: c.lat / c.count,     // centroid
    lng: c.lng / c.count,
  }));

  self.postMessage({ clusters, reqId });
};
```

#### 5. IntersectionObserver for off-screen tile cleanup

DOM-based tile layers must remove tiles that scroll off the viewport to prevent unbounded DOM growth.

```js
const tileObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) {
      // Off-screen tile: detach but keep in LRU cache for fast re-entry
      entry.target.dataset.detached = 'true';
      entry.target.style.display = 'none';
    } else {
      entry.target.style.display = 'block';
    }
  }
}, { rootMargin: '200px' }); // 200 px buffer so tiles pre-load before they're visible

document.querySelectorAll('.tile').forEach(t => tileObserver.observe(t));
```

#### 6. Marker deduplication and pooling on zoom change

When zoom changes, clusters split into sub-clusters or individual markers. DOM nodes should be **reused** (pooled) rather than destroyed and recreated.

```js
const markerPool = [];

function getMarkerElement() {
  return markerPool.pop() || document.createElement('div'); // reuse or create
}

function releaseMarkerElement(el) {
  el.style.display = 'none';
  markerPool.push(el); // return to pool
}

// On zoom change: release all current markers, then re-render new clusters
function onZoomChange(newZoom) {
  document.querySelectorAll('.marker').forEach(releaseMarkerElement);
  renderClusters(computedClusters[newZoom]);
}
```

---

### Trade-offs

| Decision | Canvas/WebGL | DOM markers | Recommendation |
|---|---|---|---|
| **Rendering approach** | GPU-accelerated, handles 100k+ markers | Each marker is a styled `<div>`, easy CSS/events | DOM for < 500 markers; Canvas/WebGL beyond that |
| **Clustering location** | Client-side (Web Worker) | Server-side aggregation | Client for interactive zoom-based clustering; server for static pre-aggregated views |
| **Tile format** | Raster PNG/WebP | Vector tiles (MVT) + WebGL | Vector for smooth fractional zoom and rotation; raster for simpler CDN setup |
| **Gesture handling** | Custom pointer/wheel events with `passive: false` only where needed | Library (Leaflet, Mapbox GL) | Library for production; understand `passive: false` cost for interview |
| **Zoom debounce** | Debounce network calls (50 ms) | Never debounce the visual render | Render every frame, debounce only the tile fetch and cluster recompute |

---

### Failure modes & degradation

| Failure | Degradation strategy |
|---|---|
| Tile server returns 5xx | Show parent tile (blurry placeholder), retry with backoff |
| CDN tile miss (uncached) | Increased latency; show skeleton tile with spinner |
| WebGL context lost | Listen for `webglcontextlost` event; attempt restore; fall back to Canvas 2D |
| Cluster worker crashes | Catch `worker.onerror`; fall back to synchronous main-thread clustering (only viable for small datasets) |
| 10k+ DOM markers | Cap at ~200 visible DOM markers; use canvas or hide distant ones via distance threshold |

---

### Accessibility checklist

- Visible zoom in/out buttons (not just scroll wheel) with `aria-label`
- Keyboard: arrow keys pan the map; `+`/`-` keys zoom
- `aria-live` region summarizes the current viewport ("Showing 14 restaurants in downtown San Francisco")
- Cluster buttons are focusable with `role="button"` and count announced to screen readers
- `prefers-reduced-motion`: disable smooth pan animation, snap to target position instantly

---

### What to draw (whiteboard)

```
Tile grid at zoom 13 — viewport (solid box) + one-ring buffer (dashed)
 ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
   ┌───┬───┬───┬───┬───┐
 │ │   │   │   │   │   │ ← buffer  │
   ├───┼───┼───┼───┼───┤
 │ │   │ ▓ │ ▓ │   │   │           │
   ├───┼───┼───┼───┼───┤
 │ │   │ ▓ │ ▓ │   │   │  ▓=viewport│
   ├───┼───┼───┼───┼───┤
 │ │   │   │   │   │   │           │
   └───┴───┴───┴───┴───┘
 └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
  Fetch ▓ tiles first, then buffer ring
  Cancel all if zoom changes (generation token)
```

```
Cluster zoom levels
 Zoom 10: [●●●] one cluster (100 points)
 Zoom 12: [●●] [●]  two clusters on split
 Zoom 14: ● ● ● ● ● individual markers
```

---

### Suggested time boxes (60-minute round)

| Block | Minutes | Focus |
|---|---:|---|
| Clarify + requirements | 8–12 | Raster vs vector, point counts, embed vs app, offline |
| High-level architecture | 12–18 | Camera → scheduler → caches → renderer; marker layer |
| Deep dive 1 | 12–18 | Tiles: priority, cancel, placeholder upscale |
| Deep dive 2 | 12–18 | Clustering / workers, or gestures (wheel/pinch, passive) |
| Trade-offs, failure, metrics | 8–12 | WebGL loss, memory, a11y |

---

### Deep dives — pick 2

**A. Tile scheduling** — Center-first fetch order; abort controllers keyed to tile coordinates; parent placeholder scaled up while child loads (blurry → sharp); decode throttling with `createImageBitmap`; cap concurrent requests to 6 (browser HTTP/1.1 limit per origin).

**B. Clustering** — Grid bucketing vs supercluster (R-tree backed); Web Worker keeps math off main thread; debounce recompute by 50 ms on zoom; hit testing for click: project cluster centroid back to screen coords, check pointer distance.

**C. Gestures** — Zoom to cursor (translate origin to cursor position, scale, translate back); pinch gesture via two-pointer distance delta; `passive: false` only on `touchmove` where you need to `preventDefault`; reduced-motion path snaps instead of easing.

**D. Memory** — LRU tile cache with size cap (e.g., 256 tiles); evict oldest on overflow; texture atlas for WebGL to reduce draw calls; DOM marker cap via pooling.

---

### Common follow-ups

- **"10k markers?"** — No 10 000 DOM pins. Use grid clustering in a Web Worker. Beyond 100k, use server-side aggregation (return pre-computed clusters per tile/zoom). For density visualization, use a heatmap layer rendered to Canvas.
- **"Moving markers?"** — Interpolate positions with `requestAnimationFrame`. Batch all position updates in a single RAF callback. Store last and target position; lerp by delta-time for smooth animation.
- **"SEO?"** — Static server-rendered text listing (place names, addresses) for crawlers. The interactive map is a progressive enhancement that loads client-side. Do not rely on crawlers executing WebGL.

---

### What you'd measure

**Interaction**
- Frame time during pan/zoom (target < 16.7 ms for 60 fps)
- Input latency: pointer down to visible camera movement

**Network**
- Tile cache hit rate (CDN + in-memory)
- Wasted bytes from in-flight tiles cancelled mid-zoom

**Stability**
- WebGL context loss frequency
- Memory usage over a long session (tile eviction working correctly)
- Cluster worker crash rate

---

### Minute summary (closing)

"A performant maps UI is fundamentally a problem of camera-driven work scheduling: the moment the camera moves, I cancel stale tile fetches using generation tokens and abort controllers, schedule new tiles center-first, and show scaled parent tiles as placeholders so the user never sees a blank viewport. For large marker sets I move all clustering math into a Web Worker using grid bucketing, post results back only when the camera has settled, and render to Canvas or WebGL rather than the DOM to keep frame time under 16 ms regardless of point count. The whole system is designed so that the renderer never blocks on network and the network never wastes bytes on tiles the user has already scrolled past."
