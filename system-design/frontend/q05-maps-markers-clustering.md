# Q5. Maps-heavy UI (markers, clustering, gestures)

**Prompt variants:** Web map with **many markers**, **clustering**, smooth **zoom/pan**.

 [← Question index](./README.md)

**Deep dive:** [Google Maps zoom (frontend)](../google-maps-zoom-frontend.md)

---

### One-line mental model

The viewport drives **tile + marker work scheduling**: compute visible work, **cancel stale** requests, **reuse** GPU/DOM resources—same pyramid story as raster/vector maps.

### Clarify scope in the interview

Raster vs vector? How many points? Embedded iframe? Offline?

### Goals & requirements

- **Functional:** gestures, controls, pick/selection, detail panel.
- **Non-functional:** smooth interaction, bounded memory, **race-safe** network.

### High-level frontend architecture

Input → **camera state** → **tile scheduler** + **marker/cluster layer** → renderer (**WebGL** / Canvas / DOM) → tile **CDN**.

### What the client does (core mechanics)

Full detail: [Google Maps zoom (frontend)](../google-maps-zoom-frontend.md). Interview glue: **viewport debouncing**, **cluster in worker** at 10k+ points, **marker pooling**, prefetch pan direction, **generation tokens** so old tile responses don’t paint on new zoom.

### Trade-offs

See maps doc (WebGL vs Canvas vs DOM tiles).

### Failure modes & degradation

Show parent tiles blurry→sharp; backoff tile storm; handle **WebGL context loss**.

### Accessibility checklist

See maps doc (visible zoom controls, keyboard, screen reader region summary).

### Minute summary (closing)

“Maps are **camera + tile pyramid + scheduler**; we **prioritize visible work**, **cancel stale fetches**, and **reuse caches** so pinch/wheel stays smooth—markers/cluster sit above the same pipeline.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Raster vs vector, point counts, embed vs app, offline |
| High-level architecture | 12–18 | Camera → scheduler → caches → renderer; marker layer |
| Deep dive 1 | 12–18 | **Tiles:** priority, cancel, placeholder upscale |
| Deep dive 2 | 12–18 | **Clustering/workers** or **gestures** (wheel/pinch, passive) |
| Trade-offs, failure, metrics | 8–12 | WebGL loss, memory, a11y |

### What to draw (whiteboard)

- Viewport **tile grid** + one-ring **buffer**; CDN arrow.
- **Camera** state: center, zoom (bearing if 3D).
- **Cluster pipeline:** raw points → buckets → draw.
- **Generation / version** on fetches so stale tiles don’t paint after fast zoom.

### Deep dives — pick 2

**A. Tile scheduling** — Center-first; cancel off-screen; parent placeholder **blur→sharp**; decode throttling; concurrent request limits.

**B. Clustering** — Grid/supercluster ideas; **Web Worker** for heavy math; debounce recompute on zoom; pick/hover hit testing.

**C. Gestures** — Zoom-to-cursor; pinch; `passive: false` only when necessary; reduced motion path.

**D. Memory** — Evict distant zoom layers; texture pools; DOM marker caps vs GL instancing (conceptual).

### Common follow-ups

- **“10k markers?”** — No 10k DOM pins; cluster, heatmap, or LOD by zoom.
- **“Moving markers?”** — Interpolate; batch updates in `requestAnimationFrame`.
- **“SEO?”** — Static text for place/bbox; map interactive client-side; don’t pretend crawlers execute full GL story.

### What you’d measure

- **Interaction:** frame time pan/zoom; dropped frames.
- **Network:** tile cache hit rate; wasted bytes from uncanceled fetches.
- **Stability:** WebGL context loss frequency.

**Merge with:** [Google Maps zoom (frontend)](../google-maps-zoom-frontend.md) for gesture and tile depth during the interview.

