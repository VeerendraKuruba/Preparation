# 17 — Stopwatch + Countdown Timer

## What to Build

Two components in one file:

**Stopwatch** — counts up from zero with Start / Stop / Lap / Reset controls. Each lap records the current elapsed time.

**CountdownTimer** — counts down from a given number of seconds with Start / Pause / Reset controls.

---

## State and Refs

### Stopwatch

| Variable | Kind | Purpose |
|---|---|---|
| `running` | `useState` | Controls whether the rAF loop is active |
| `elapsedMs` | `useState` | Currently displayed time — drives the DOM |
| `laps` | `useState` | Array of lap snapshots — drives the list in the DOM |
| `startRef` | `useRef` | `performance.now()` value when the current session started |
| `baseRef` | `useRef` | Total ms accumulated from all previous sessions |

### CountdownTimer

| Variable | Kind | Purpose |
|---|---|---|
| `running` | `useState` | Controls the rAF loop |
| `remainingMs` | `useState` | Currently displayed remaining time |
| `targetMs` | `useState` | Absolute future `performance.now()` value when countdown ends |

---

## Why NOT `setInterval`

`setInterval` is not guaranteed to fire at the exact interval. If the main thread is busy, callbacks are delayed, and that delay accumulates. After 60 seconds a timer using `setInterval(fn, 10)` may be off by hundreds of milliseconds — visible jitter in the display.

---

## Why `requestAnimationFrame`

`requestAnimationFrame` (rAF) is tied to the browser's actual repaint cycle:
- It never fires more often than the screen's refresh rate
- It receives a high-precision `DOMHighResTimeStamp` argument (identical to `performance.now()`) — sub-millisecond accuracy
- Browsers throttle rAF when the tab is hidden, saving CPU; `setInterval` keeps firing in the background

---

## Key Refs: `startRef` and `baseRef`

```js
const startRef = useRef(null); // performance.now() at start of CURRENT session
const baseRef  = useRef(0);    // total ms from ALL PREVIOUS sessions
```

**Why `useRef` and NOT `useState` for these?**

If they were state:
1. Every write would trigger a re-render — unnecessary work on every frame
2. The rAF loop would need them in its effect's dependency array, causing the loop to restart on every frame write

As refs, writes are synchronous and invisible to React's render cycle. The rAF callback always reads the latest value without the effect needing to re-run.

The rule: if a value is **read by the DOM** → `useState`. If it is a **timer bookmark read only inside a callback** → `useRef`.

---

## Pause / Resume Pattern

```js
// displayed time = previous sessions + current session so far
elapsedMs = baseRef.current + (now - startRef.current)

// On Stop: commit the current session to the accumulator
baseRef.current += performance.now() - startRef.current;
startRef.current = null;

// On Start: bookmark the new session start
startRef.current = performance.now();
// The formula above picks up from where baseRef left off
```

---

## Countdown: Absolute Target

```js
// On Start: compute when the countdown will end
setTargetMs(performance.now() + remainingMs);

// Each frame: how much time is left?
const next = Math.max(0, targetMs - performance.now());
```

Storing an absolute target (not decrementing by one frame each tick) means the countdown is accurate even if the tab is hidden and rAF frames are skipped. When the tab regains focus, the first tick immediately shows the correct remaining time.

---

## Formatting Milliseconds as `MM:SS.f`

```js
function formatMs(ms) {
  const s    = Math.floor(ms / 1000);
  const m    = Math.floor(s / 60);
  const ss   = s % 60;
  const frac = Math.floor((ms % 1000) / 100); // tenths digit only
  return `${m}:${String(ss).padStart(2, '0')}.${frac}`;
}
```

`padStart(2, '0')` ensures seconds are always two digits: `1:05.3` not `1:5.3`.

---

## Interview Questions

**Q: Why `requestAnimationFrame` over `setInterval`?**

A: `setInterval` accumulates drift under CPU load — callbacks fire late and the delay compounds. `requestAnimationFrame` is synced to the browser's repaint cycle, receives a high-precision timestamp, and never fires faster than the screen refresh rate. For long-running visual timers, the difference is noticeable. Additionally, rAF auto-pauses in hidden tabs; `setInterval` keeps firing and wastes CPU.

**Q: Why `useRef` not `useState` for the timer bookmarks?**

A: `startRef` and `baseRef` are written in event handlers and read inside the rAF callback. If they were state, every write would trigger a re-render AND the rAF effect would need to list them as dependencies, causing the loop to restart on every frame. `useRef` stores mutable values that are invisible to React's render cycle — reads and writes are synchronous with no re-render side effect.

**Q: How to format milliseconds as `MM:SS.f`?**

A: Divide by 1000 for seconds, divide by 60 for minutes, use `% 60` to get the remainder seconds, and `% 1000` then divide by 100 for the tenths digit. Use `String(ss).padStart(2, '0')` to always show two-digit seconds. For hours, add another division layer and only render the hours segment when `h > 0`.
