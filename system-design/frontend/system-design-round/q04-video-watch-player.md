# Q4. Video watch page / player

**Prompt variants:** **YouTube / Netflix** watch experience (frontend-centric).

 [← Question index](./README.md)

---

### One-line mental model

**Decouple** “can play” from “surrounding chrome”: the player gets a **manifest/stream** path; everything else (comments, recs) is **progressive** and must not block first frame.

### Clarify scope in the interview

Live vs VOD? Ads? **Mini-player**? Regional rights?

### Goals & requirements

- **Functional:** play/pause, seek, quality, captions, related shelf.
- **Non-functional:** time-to-first-frame, adaptive bitrate client behavior **in principle**, battery.

### High-level frontend architecture

SSR/edge **metadata + poster** (LCP) → **MSE/HLS/DASH player** isolated bundle → lazy panels for comments/recs → beacons async.

### What the client does (core mechanics)

1. Split endpoints: **manifest**, **engagement**, **recs**—failure-isolated.
2. Prefetch **next** asset on idle with cap.
3. Avoid layout shift around player (reserved box).

### Trade-offs

| Choice upside | Trade-off |
|---------------|-----------|
| Autoplay next | Bandwidth + user trust |
| Rich docked panel | Main thread contention with decode |

### Failure modes & degradation

If recs fail, still play; if captions fail, offer toggle retry; **poster** remains.

### Accessibility checklist

Keyboard shortcuts; **focus** in fullscreen; captions; **prefers-reduced-motion** for transitions.

### Minute summary (closing)

“We **isolate** the streaming path from auxiliary panels, optimize **LCP** with poster + shell, and **load everything else progressively** so playback survives partial outages.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Live vs VOD, ads, DRM, regions, mini-player, autoplay policy |
| High-level architecture | 12–18 | Shell vs player vs side panels; what blocks **first frame** |
| Deep dive 1 | 12–18 | **Playback path** (manifest, ABR, buffering) at client level |
| Deep dive 2 | 12–18 | **Isolation + prefetch** or **a11y/keyboard/fullscreen** |
| Trade-offs, failure, metrics | 8–12 | Partial outage UX, QoE metrics |

### What to draw (whiteboard)

- **SSR/poster** → **Player** ↔ CDN media; **Comments** / **Recs** parallel, non-blocking.
- Milestones: shell → poster LCP → manifest → first frame / play.
- Player state machine: `IDLE | BUFFERING | PLAYING | STALLED | ERROR` (example).

### Deep dives — pick 2

**A. Isolation & resilience** — Separate fetches; errors in recs don’t block decoder; circuit-breaker UI; graceful **stale** metadata with retry.

**B. ABR (client perspective)** — Switch renditions from buffer health; rebuffer events; cap quality under **save-data** / policy (careful: not all APIs available).

**C. Prefetch & continuity** — Next episode: idle prefetch with **byte/session caps**; cancel on navigation; PiP vs in-app mini-player handoff.

**D. Accessibility** — Captions; focus and shortcuts; **prefers-reduced-motion**; fullscreen focus trap discipline.

### Common follow-ups

- **“Picture-in-picture?”** — Document PiP API vs custom overlay; mobile browser limits.
- **“Ads?”** — Acknowledge **stitching** is cross-team; UI states for ad vs content; timeouts so ads don’t hang the shell.
- **“DRM?”** — EME/Widevine/FairPlay naming; license renewal failures; “backend owns keys.”
- **“Analytics?”** — QOS beacons; batch; `requestIdleCallback`; avoid main-thread log storms.

### What you’d measure

- **QoE:** join time, rebuffer ratio, playback errors by code, abandonment curve.
- **Perf:** poster LCP, long tasks during quality switches.
- **Product:** completion, next-up CTR.

