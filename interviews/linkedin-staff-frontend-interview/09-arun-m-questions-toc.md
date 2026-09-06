# Arun M — One Stop Frontend Interview Problems (55 Q TOC)

> Reconstructed from [Arun M’s public lists](https://www.linkedin.com/posts/arunm-engineer_most-asked-frontend-interview-questions-activity-7260867598081273856-OcAr/) and [pattern breakdowns](https://www.linkedin.com/posts/arunm-engineer_6-patterns-and-30-interview-questions-i-activity-7431191301703913472-Mc9u). Full paid ebook: [topmate.io/arunm/787157](https://topmate.io/arunm/787157).

**Q&A files (this folder):**

| File | Questions | Count |
|------|-----------|-------|
| [arun-m-qna/01-promises.md](./arun-m-qna/01-promises.md) | Custom Promise + all / any / race / allSettled / finally | Q01–Q06 |
| [arun-m-qna/02-this-call-apply-bind.md](./arun-m-qna/02-this-call-apply-bind.md) | call, apply, bind | Q07–Q09 |
| [arun-m-qna/03-async-tasks.md](./arun-m-qna/03-async-tasks.md) | Series / parallel / race, setTimeout/Interval, promisify, pipe, curry | Q10–Q18 |
| [arun-m-qna/04-object-array.md](./arun-m-qna/04-object-array.md) | Flatten, deep equal/clone, Object.assign/is, JSON, typeof | Q19–Q30 |
| [arun-m-qna/05-api-request.md](./arun-m-qna/05-api-request.md) | Retry, batch throttle, debounce/throttle, memoize APIs | Q31–Q36 |
| [arun-m-qna/06-lodash-misc.md](./arun-m-qna/06-lodash-misc.md) | Lodash utils, EventEmitter, VDOM, classnames, Immer, Proxy | Q37–Q55 |

---

## Full Table of Contents (55)

### A. Promise-based (Q01–Q06)

| # | Question | LinkedIn R1 |
|---|----------|-------------|
| 01 | Implement custom JavaScript `Promise` | P2 |
| 02 | Polyfill `Promise.all` | **P0** |
| 03 | Polyfill `Promise.any` | P1 |
| 04 | Polyfill `Promise.race` | P1 |
| 05 | Polyfill `Promise.allSettled` | P1 |
| 06 | Polyfill `Promise.finally` | P2 |

### B. `this` keyword (Q07–Q09)

| # | Question | LinkedIn R1 |
|---|----------|-------------|
| 07 | Polyfill `Function.prototype.call` | **P0** |
| 08 | Polyfill `Function.prototype.apply` | **P0** |
| 09 | Polyfill `Function.prototype.bind` | **P0** |

### C. Async tasks & FP (Q10–Q18)

| # | Question | LinkedIn R1 |
|---|----------|-------------|
| 10 | Execute N async tasks in **series** | **P0** |
| 11 | Execute N async tasks in **parallel** | **P0** |
| 12 | Execute N async tasks in **race** | P1 |
| 13 | Custom `setTimeout` | P2 |
| 14 | Custom `setInterval` | P2 |
| 15 | Promisify (error-first callback → Promise) | P1 |
| 16 | `pipe` — chain N functions | P1 |
| 17 | Curry with **placeholder** support | P1 |
| 18 | Cancellable / delayed promise | P2 |

### D. Object / Array (Q19–Q30)

| # | Question | LinkedIn R1 |
|---|----------|-------------|
| 19 | Deep Flatten I (1 level) | P1 |
| 20 | Deep Flatten II (to depth n) | **P0** |
| 21 | Deep Flatten III (object values) | P1 |
| 22 | Deep Flatten IV (generator / iterator) | P2 |
| 23 | Deep Equal | **P0** |
| 24 | Deep Clone (circular refs) | **P0** |
| 25 | `Object.assign` polyfill | P1 |
| 26 | `Object.is` polyfill | P2 |
| 27 | `JSON.stringify` polyfill | P1 |
| 28 | `JSON.parse` polyfill | P2 |
| 29 | Correct `typeof` polyfill | P1 |
| 30 | Array `map` / `filter` / `reduce` polyfills | P1 |

### E. API request patterns (Q31–Q36)

| # | Question | LinkedIn R1 |
|---|----------|-------------|
| 31 | Auto-retry on failure | **P0** |
| 32 | Throttle API calls by **batching** (mapLimit) | **P0** |
| 33 | Debounce (with `cancel`) | **P0** |
| 34 | Throttle (with `cancel`) | **P0** |
| 35 | Memoize / cache identical API requests | **P0** |
| 36 | Memoize (single-arg / Lodash style) | **P0** |

### F. Lodash & misc libraries (Q37–Q55)

| # | Question | LinkedIn R1 |
|---|----------|-------------|
| 37 | `_.get` | P1 |
| 38 | `_.set` | P2 |
| 39 | `_.omit` | P2 |
| 40 | `_.partial` | P2 |
| 41 | `_.chunk` | P1 |
| 42 | `_.once` | P1 |
| 43 | EventEmitter / PubSub | **P0** |
| 44 | Virtual DOM I — serialize | P2 |
| 45 | Virtual DOM II — deserialize | P2 |
| 46 | `classnames` utility | P2 |
| 47 | Mini Immer (`produce`) | P2 |
| 48 | Negative array indexing via `Proxy` | P2 |
| 49 | String tokenizer | P2 |
| 50 | Compose (right-to-left) | P1 |
| 51 | Clear all timeouts | P1 |
| 52 | Compare two trees / objects (VDOM diff lite) | P1 |
| 53 | Custom `useState` (vanilla) | P2 |
| 54 | Rate limiter (token / sliding window) | P1 |
| 55 | `mapLimit` concurrency pool | **P0** |

---

## LinkedIn Staff Phone Screen — Study Priority

From LinkedIn’s official brief (vanilla JS, functional style, state, testing):

| Priority | Focus questions | Why |
|----------|-----------------|-----|
| **P0** | 02, 07–09, 10–11, 20, 23–24, 31–36, 43, 55 | Highest phone-screen hit rate |
| **P1** | 03–05, 12, 15–17, 19, 25, 27, 29–30, 37, 41–42, 50–52, 54 | Strong follow-ups |
| **P2** | Rest | Nice-to-have / onsite depth |

### Repo cross-links

| Topic | Existing file |
|-------|---------------|
| Debounce / throttle | [javascript-machine-coding/01-debounce-throttle.js](../../javascript-machine-coding/01-debounce-throttle.js) |
| EventEmitter | [javascript-machine-coding/02-event-emitter.js](../../javascript-machine-coding/02-event-emitter.js) |
| Promise.all | [javascript-machine-coding/03-promise-all.js](../../javascript-machine-coding/03-promise-all.js) |
| Deep clone | [javascript-machine-coding/04-deep-clone.js](../../javascript-machine-coding/04-deep-clone.js) |
| Retry API | [javascript-machine-coding/05-retry-api.js](../../javascript-machine-coding/05-retry-api.js) |
| Pub/sub | [javascript-machine-coding/06-pub-sub.js](../../javascript-machine-coding/06-pub-sub.js) |
| Task concurrency | [javascript-machine-coding/08-task-scheduler-concurrency.js](../../javascript-machine-coding/08-task-scheduler-concurrency.js) |
| mapLimit | [javascript-machine-coding/11-map-limit.js](../../javascript-machine-coding/11-map-limit.js) |
| Memoize | [practice/memoize.js](./practice/memoize.js) |

---

## How to Use

1. Drill **P0** until you can implement from memory in CoderPad (no autocomplete).
2. For each Q: read **Approach → Solution → Edge cases → Follow-ups**.
3. Say test cases aloud before coding (LinkedIn explicitly grades this).
4. Timed mock: pick 2 P0 problems in 45 min after the 15-min behavioral block.
