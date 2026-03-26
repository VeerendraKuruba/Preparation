# Q4. Video watch page / player

**Prompt variants:** **YouTube / Netflix** watch experience (frontend-centric).

[← Question index](./README.md)

---

### One-line mental model

**Decouple** "can play" from "surrounding chrome": the player gets a **manifest/stream** path and manages its own decode pipeline; everything else (comments, recommendations, metadata) is **progressive** and must never block or contend with the first frame.

---

### Clarify scope in the interview

Before drawing anything, nail down:
- **VOD vs Live** — VOD has a seekable manifest; live has a rolling window with a latency target (LL-HLS cuts it to ~2 s).
- **Ads** — Pre-roll, mid-roll, or server-side stitched? Ad logic is a separate team concern but drives UI state machine.
- **DRM** — EME + Widevine/FairPlay/PlayReady? License renewal on long sessions?
- **Mini-player / PiP** — Document PiP API vs custom overlay; mobile browser limits.
- **Autoplay policy** — Browsers block autoplay with sound; muted autoplay is allowed. Needs UX decision.
- **Regional rights** — Entitlement check before manifest? Error screen for geo-blocked content.

---

### Goals & requirements

**Functional**
- Play, pause, seek, volume, mute, quality selector, speed selector
- Closed captions / subtitles toggle
- Fullscreen and Picture-in-Picture
- Related / up-next shelf, comments panel

**Non-functional**
- Time-to-first-frame (TTFF) under 2 s on broadband
- Adaptive bitrate: quality tracks network, not the other way around
- No layout shift around the player (reserved aspect-ratio box)
- Playback survives partial service failures (comments API down, recs API down)
- Battery-aware: cap decode quality on mobile when `navigator.getBattery` reports low charge

---

### High-level frontend architecture

```
Browser Tab
┌─────────────────────────────────────────────────────────────────┐
│  Shell (SSR/Edge-rendered HTML)                                 │
│  ┌──────────────────────────┐  ┌────────────────────────────┐  │
│  │  Player Shell            │  │  Side Panel (lazy)         │  │
│  │  ┌────────────────────┐  │  │  ┌──────────────────────┐  │  │
│  │  │  <video> / MSE     │  │  │  │  Recommendations     │  │  │
│  │  │  HLS.js / Shaka    │◄─┼──┼──┤  (fetched in         │  │  │
│  │  │  (isolated bundle) │  │  │  │   parallel, non-     │  │  │
│  │  └────────────────────┘  │  │  │   blocking)          │  │  │
│  │  ┌────────────────────┐  │  │  └──────────────────────┘  │  │
│  │  │  Custom Controls   │  │  │  ┌──────────────────────┐  │  │
│  │  │  (overlay)         │  │  │  │  Comments (lazy,     │  │  │
│  │  └────────────────────┘  │  │  │   IntersectionObs)   │  │  │
│  └──────────────────────────┘  │  └──────────────────────┘  │  │
│                                └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │ manifest              │ recs API         │ comments API
         ▼                       ▼                   ▼
    CDN / Origin           Recs Service         Comment Service
    (HLS/DASH segments)    (independent)        (independent)
```

**Load order milestones:**
1. SSR HTML lands → poster image as `<img fetchpriority="high">` → **LCP candidate**
2. Player JS bundle evaluated → HLS.js initializes, manifest fetch begins
3. First segment buffered → `video.play()` called → first frame painted
4. Side panels hydrate in parallel → never delay steps 1–3

---

### What the client does (core mechanics)

#### 1. HLS manifest parsing and segment fetch

The master playlist describes available renditions. The player picks a starting rendition and switches based on bandwidth estimate.

```js
// Simplified HLS bootstrap
import Hls from 'hls.js';

function mountPlayer(videoEl, manifestUrl) {
  if (Hls.isSupported()) {
    const hls = new Hls({
      startLevel: -1,           // auto-select starting quality
      capLevelToPlayerSize: true,
      maxBufferLength: 30,      // seconds to buffer ahead
      maxMaxBufferLength: 60,
    });
    hls.loadSource(manifestUrl);
    hls.attachMedia(videoEl);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play().catch(() => {
        // Autoplay blocked — show unmute/play prompt
        showPlayPrompt();
      });
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) handleFatalError(data.type);
    });

    return hls;
  } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari native HLS — no MSE needed
    videoEl.src = manifestUrl;
  }
}
```

#### 2. Adaptive bitrate (ABR) quality switching

ABR works by monitoring the buffer health and estimated bandwidth. When the buffer drains, the player steps down to a lower rendition before rebuffering occurs.

```
Buffer health → ABR decision
─────────────────────────────────────────────────────
 Buffer > 20 s  AND  BW estimate rising  →  step up quality
 Buffer < 8 s   OR   BW estimate falling →  hold / step down
 Buffer < 3 s                            →  drop to lowest rendition
 Buffer = 0                              →  STALLED state, spinner
```

```js
// Manually override quality (e.g., user picks 1080p)
function setQuality(hls, levelIndex) {
  hls.currentLevel = levelIndex;    // lock
  // hls.nextLevel = levelIndex;    // graceful: switch on next segment boundary
}

// Listen for auto-switches
hls.on(Hls.Events.LEVEL_SWITCHED, (_, { level }) => {
  updateQualityBadge(hls.levels[level].height); // e.g., "720p"
});
```

#### 3. Buffer management and prefetch next segment

```js
// Buffer monitor — show spinner before stall, not after
videoEl.addEventListener('progress', () => {
  const buffered = videoEl.buffered;
  if (buffered.length > 0) {
    const ahead = buffered.end(buffered.length - 1) - videoEl.currentTime;
    if (ahead < 5) showBufferingSpinner();
    else hideBufferingSpinner();
  }
});

// Prefetch next episode on idle after 80% completion
videoEl.addEventListener('timeupdate', () => {
  const pct = videoEl.currentTime / videoEl.duration;
  if (pct > 0.8) prefetchNextEpisode();
});

function prefetchNextEpisode() {
  if (prefetchDone) return;
  prefetchDone = true;
  // Use a capped fetch — don't download the whole file
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = nextManifestUrl;
  document.head.appendChild(link);
}
```

#### 4. Fullscreen and Picture-in-Picture API

```js
// Fullscreen
async function toggleFullscreen(container) {
  if (!document.fullscreenElement) {
    await container.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

// Native PiP
async function togglePiP(videoEl) {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
  } else {
    await videoEl.requestPictureInPicture();
  }
}

// PiP is not supported on all mobile browsers — check before showing button
const canPiP = 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
```

#### 5. Keyboard controls

```js
// Player must trap keyboard events when focused
playerContainer.addEventListener('keydown', (e) => {
  switch (e.key) {
    case ' ':
    case 'k':
      e.preventDefault();
      videoEl.paused ? videoEl.play() : videoEl.pause();
      break;
    case 'ArrowRight':
      videoEl.currentTime = Math.min(videoEl.duration, videoEl.currentTime + 10);
      break;
    case 'ArrowLeft':
      videoEl.currentTime = Math.max(0, videoEl.currentTime - 10);
      break;
    case 'ArrowUp':
      videoEl.volume = Math.min(1, videoEl.volume + 0.1);
      break;
    case 'ArrowDown':
      videoEl.volume = Math.max(0, videoEl.volume - 0.1);
      break;
    case 'f':
      toggleFullscreen(playerContainer);
      break;
    case 'm':
      videoEl.muted = !videoEl.muted;
      break;
  }
});
```

#### 6. Player state machine

```
         load()
IDLE ──────────────► BUFFERING
                          │
              enough data │
                          ▼
                       PLAYING ◄─────┐
                          │          │
              network slow│          │ buffer recovers
                          ▼          │
                       STALLED ──────┘
                          │
              max retries │
                          ▼
                        ERROR
```

---

### Trade-offs

| Decision | Choice A | Choice B | Recommendation |
|---|---|---|---|
| Streaming protocol | **HLS** — wider browser support, Safari native | **DASH** — open standard, flexible DRM | Use HLS for consumer; DASH if multi-DRM is required |
| Player engine | **Native `<video>` src** | **MSE + HLS.js/Shaka** | MSE for ABR + DRM control; native for simple VOD on Safari |
| Autoplay | Autoplay with sound | **Muted autoplay** then click-to-unmute | Muted autoplay; browsers enforce this anyway |
| Side panels | **Inline DOM** next to player | Separate iframe/micro-frontend | Inline but **lazy-hydrated**; iframe adds message-passing overhead |
| Quality selector | Expose all renditions | Expose curated labels (Auto, 720p, 1080p) | Labels — reduces cognitive load; always expose "Auto" |
| Seek behavior | Seek to exact byte | **Key-frame aligned seek** | Key-frame seek; HLS.js handles this automatically |
| Analytics beacons | Send per event | **Batch on idle** | Batch with `requestIdleCallback`; never block decode thread |

---

### Failure modes & degradation

| Failure | Degradation strategy |
|---|---|
| Manifest fetch fails | Retry 3x with exponential backoff; show error with retry CTA |
| Segment fetch fails for current rendition | HLS.js auto-retries; after 3 fails, drop to lower rendition |
| Recommendations API down | Play proceeds unaffected; side panel shows skeleton then "unavailable" |
| Captions service down | Player plays without captions; toggle shows "Captions unavailable" |
| DRM license renewal fails | Pause, show "License expired" modal, prompt re-auth |
| WebGL / decode crash | Fall back to lower quality; `video.error` event triggers error UI |

---

### Accessibility checklist

- All controls reachable by keyboard with logical tab order
- Fullscreen focus trap: focus must not escape the player overlay
- `aria-live="polite"` region announces quality changes and buffering state
- Captions toggleable; caption text meets WCAG contrast on all poster backgrounds
- `prefers-reduced-motion`: disable crossfade transitions in player chrome
- Screen reader skip-link to bypass player and go straight to description / comments

---

### What to draw (whiteboard)

```
Timeline milestones
────────────────────────────────────────────────────────
 t=0ms    SSR HTML arrives, poster image starts loading
 t=50ms   LCP: poster image painted (visible above fold)
 t=200ms  Player JS bundle evaluated, manifest fetch starts
 t=400ms  Manifest parsed, first segment fetch starts
 t=800ms  ~500 KB segment buffered, play() called
 t=900ms  FIRST FRAME PAINTED
 t=1500ms Side panels begin hydrating (parallel, non-blocking)
```

---

### Suggested time boxes (60-minute round)

| Block | Minutes | Focus |
|---|---:|---|
| Clarify + requirements | 8–12 | Live vs VOD, ads, DRM, regions, mini-player, autoplay policy |
| High-level architecture | 12–18 | Shell vs player vs side panels; what blocks first frame |
| Deep dive 1 | 12–18 | Playback path: manifest, ABR, buffering, state machine |
| Deep dive 2 | 12–18 | Isolation + prefetch, or a11y / keyboard / fullscreen |
| Trade-offs, failure, metrics | 8–12 | Partial outage UX, QoE metrics |

---

### Deep dives — pick 2

**A. Isolation & resilience** — Each data dependency (manifest, recs, captions, comments) is a separate fetch with its own error boundary. Errors in recs never reach the HLS pipeline. Use a circuit-breaker UI pattern: after N failures, show "unavailable" and stop retrying until user action.

**B. ABR (client perspective)** — Explain buffer health thresholds, rebuffer event tracking, `capLevelToPlayerSize` (no point fetching 4K for a 400 px embed), and `save-data` header detection to cap maximum quality.

**C. Prefetch & continuity** — Next episode: start prefetching manifest at 80% completion. Cancel if user navigates away. PiP handoff: video element moves to PiP; on close, re-attach to main player.

**D. Accessibility** — Full keyboard map, focus trap in fullscreen, `aria-live` for state announcements, WCAG caption contrast, `prefers-reduced-motion` for UI animations.

---

### Common follow-ups

- **"Picture-in-picture?"** — Document PiP API (`video.requestPictureInPicture()`) works on Chrome/Firefox/Safari desktop. iOS Safari supports it natively at OS level, not via JS. Custom overlay PiP is a separate floating component that clones the video element — has sync challenges.
- **"Ads?"** — Acknowledge ad stitching is cross-team. UI states: `AD_PLAYING` vs `CONTENT_PLAYING`. Ad timeout: if ad segment fails to load within N seconds, skip to content so the shell never hangs.
- **"DRM?"** — EME API + CDM (Widevine on Chrome, FairPlay on Safari, PlayReady on Edge). License server is backend-owned. Frontend concern: license renewal on long sessions, and graceful error UI when license is revoked.
- **"Analytics?"** — QoS beacons: join time, first stall time, rebuffer ratio, error codes, quality switches. Batch events every 30 s or on `visibilitychange`. Use `requestIdleCallback` to avoid firing during decode.

---

### What you'd measure

**Quality of Experience (QoE)**
- Join time (manifest request → first frame)
- Rebuffer ratio (stalled time / total play time)
- Abandonment curve (% who quit before 30 s)
- Playback error rate by error code

**Performance**
- Poster LCP (target < 2.5 s)
- Long tasks during quality switches (target < 50 ms)
- Memory usage over a 2-hour session

**Product**
- Completion rate by content type
- Next-up / autoplay acceptance rate
- Quality override frequency (users manually choosing lower quality = ABR not working)

---

### Minute summary (closing)

"I would architect the watch page so that the HLS player is a fully isolated bundle with its own error boundary — manifest parsing, ABR switching, and segment buffering all happen inside that boundary without touching the rest of the page. The shell SSR-renders the poster image as the LCP candidate and reserves the player aspect-ratio box to eliminate layout shift. Side panels for recommendations and comments fetch in parallel but hydrate lazily so a slow recs API never delays the first frame. Quality switching is driven by buffer health thresholds rather than raw bandwidth estimates, and all analytics beacons are batched on idle so they never contend with the decode thread. The result is a playback experience that degrades gracefully: if every auxiliary service is down, the video still plays."
