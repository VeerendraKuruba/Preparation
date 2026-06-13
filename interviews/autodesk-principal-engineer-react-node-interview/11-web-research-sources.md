# Web Research — Sources & Gaps (Honest Audit)

> **Did we search the "complete web"?** No. Prep is built from **targeted searches + candidate reports**, not an exhaustive crawl of Glassdoor, Blind, LinkedIn, Reddit, YouTube, etc.

---

## What Was Searched (Initial + Follow-Up)

| Source | What we used |
|--------|----------------|
| [LeetCode Discuss — Bengaluru Nov 2025](https://leetcode.com/discuss/interview-experience/7386726/) | 3-round loop: filesystem/tree, AWS design, HM behavioral |
| [Dataford Autodesk SE Guide 2026](https://dataford.io/interview-guides/autodesk/software-engineer) | Process, resume deep dive, room booking / login design |
| [Jointaro — Principal SE experiences](https://www.jointaro.com/interviews/companies/autodesk/experiences/) | WhatsApp design, OAuth, Kafka; 7-round Principal loop (US) |
| [Montreal SE experience — Jointaro](https://www.jointaro.com/interviews/companies/autodesk/experiences/software-engineer-montreal-qc-september-22-2025-accepted-offer-positive-3aee7344/) | Secret Santa, movie ticketing (Cineplex) |
| [APS — Build on AWS](https://aps.autodesk.com/blog/how-build-your-forge-application-aws) | Deployment context for React/Node apps |
| [APS Viewer React sample](https://github.com/autodesk-platform-services/aps-viewer-react) | BFF + Viewer integration pattern |
| General Principal / AI leadership articles | Round 5 framing |

## Follow-Up Search (After "Did you search complete web?")

| Source | New findings for **frontend-heavy** role |
|--------|------------------------------------------|
| [LinkedIn — Soubhik Ghosh, Autodesk FE interview](https://www.linkedin.com/posts/soubhik285_autodesk-frontenddevelopment-softwareengineering-activity-7188239070915919874-2UOr) | OA: 3 LC easy-medium; JS: event bubbling/capturing/delegation, coercion, storage; React: useMemo, useRef, prop drilling; JS snippet output questions |
| [LinkedIn — Same author, rejection post](https://www.linkedin.com/posts/soubhik285_autodesk-interviewexperience-paidpartnership-activity-7321848474394574848-V5y9) | OA: sliding window + binary search; JS polyfills, callback hell, memoization, GC; React reconciliation, useReducer, custom hooks; Redux vs Context; **rejected for explanation style after passing rounds** |
| [Crackr — 31 reported Autodesk problems](https://crackr.dev/companies/autodesk) | 71% array, string-matching / rolling-hash over-indexed vs industry |
| [Glassdoor — Autodesk interviews](https://www.glassdoor.com/Interview/Autodesk-Interview-Questions-E1155.htm) | CoderPad, step-by-step, no external libraries; ~31 day avg process |
| [InterviewQuery — Autodesk SE guide](https://www.interviewquery.com/interview-guides/autodesk-software-engineer) | React, Node, REST, AWS, MongoDB mentioned for SE roles |
| [Blind — ex-Autodesk Principal (L5) comment](https://www.teamblind.com/post/how-to-prepare-for-google-frontend-interview-7sgcbbcx) | Frontend prep advice from someone who was Principal at Autodesk |
| [APS — React Viewer wrapper blog](https://aps.autodesk.com/blog/building-simple-react-wrapper-viewer) | No official React wrapper; custom component + useEffect lifecycle |

---

## What Was NOT Fully Covered

These may still appear in your loop — prep separately if time allows:

- **Glassdoor / Blind thread-by-thread** — hundreds of fragmented reports; not scraped exhaustively
- **Your exact team/location** — Principal React FE in one org ≠ Principal in desktop C++ team
- **Online Assessment (OA)** — some candidates get OA *before* live rounds (3 LC or 2 DSA) — not in your 5-round email but may happen earlier
- **Presentation round** — US Principal report included a **presentation** panel (Jointaro)
- **Angular questions** — one FE candidate asked about adapting to Angular in HM round (Autodesk still has Angular codebases)
- **Proprietary Autodesk-internal question banks** — not public

---

## High-Value Additions — Frontend Q&A (From Web, Not in Round 1 Yet)

### JS — Event bubbling, capturing, delegation

**Q: Explain event propagation and delegation.**

**Answer:**
> "Click goes **capture** (window → target) then **bubble** (target → window). `stopPropagation()` stops further propagation; `preventDefault()` stops default browser action (not propagation).
>
> **Delegation:** attach one listener on parent; use `event.target` (with `closest()`) to handle children. Fewer listeners, works for dynamic lists — standard for large tables/grids in Autodesk UIs."

```js
document.getElementById('seat-grid').addEventListener('click', (e) => {
  const seat = e.target.closest('[data-seat-id]');
  if (!seat) return;
  toggleSeat(seat.dataset.seatId);
});
```

---

### JS — Coercion & snippet questions

**Practice snippets (common in FE loops):**
```js
console.log([] + []);        // "" 
console.log([] + {});        // "[object Object]"
console.log(true + true);    // 2
console.log(typeof null);    // "object"
console.log(0.1 + 0.2 === 0.3); // false
```

---

### JS — Storage options

| | Cookies | localStorage | sessionStorage |
|---|---------|--------------|----------------|
| Sent to server | Yes (httpOnly option) | No | No |
| Capacity | ~4KB | ~5MB | ~5MB |
| Scope | Configurable domain/path | Per origin, persistent | Per tab session |
| FE use | Session id (httpOnly via server) | Theme, panel prefs | Form draft |

> "Never store APS tokens in localStorage — XSS risk. Prefer httpOnly cookies set by BFF."

---

### JS — Polyfills (reported)

**Q: Implement `Promise.all` or `Array.prototype.map` polyfill.**

```js
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const results = [];
    let remaining = 0;
    let index = 0;

    for (const item of iterable) {
      const i = index++;
      remaining++;
      Promise.resolve(item).then(
        val => { results[i] = val; if (--remaining === 0) resolve(results); },
        reject
      );
    }
    if (remaining === 0) resolve(results);
  });
}
```

Also prep: `debounce`, `throttle`, `memoize`, `flatten` — reported in same candidate thread.

---

### React — Redux vs Context vs Zustand (reported)

**Q: When Redux vs Context?**

| | Redux | Context |
|---|-------|---------|
| **Best for** | Large app, middleware, time-travel devtools, many subscribers | Theme, locale, auth shell — low-frequency updates |
| **Avoid when** | Small app — boilerplate overhead | High-frequency updates — re-renders all consumers |
| **Principal take** | "I'd default to React Query for server state + Context/Zustand for UI chrome; Redux when multiple teams need strict action contracts and DevTools."

---

### React — useReducer (reported)

**Q: When `useReducer` over `useState`?**

> "Complex state transitions with related fields — wizard steps, form with interdependent validation, reducer-testable logic. Todo app with filters is the classic interview vehicle."

---

### React — Reconciliation & Virtual DOM (reported)

**Answer:**
> "Render creates a React element tree. Reconciler diffs new vs previous Fiber tree — same type → update props; different type → unmount/remount; keys stabilize list identity. Batching merges setState in event handlers (React 18 batches more)."

---

### OA — Reported problems (may happen before your Round 1)

| Problem type | Reported similar LC |
|--------------|---------------------|
| Sliding window | Pick Toys / max toys in truck |
| Binary search | Koko Eating Bananas |
| General OA | 3 problems easy–medium (non-referral FE candidate) |

---

### APS Viewer — React integration (domain-specific)

**Q: How embed APS Viewer in React?**

> "No official React wrapper. Custom component: `useRef` for container div, `useEffect` runs `Autodesk.Viewing.Initializer` once, instantiate `GuiViewer3D`, cleanup on unmount. Token from **Node BFF** — never `forge-apis` in browser (Node modules break webpack)."

Ref: [APS React wrapper blog](https://aps.autodesk.com/blog/building-simple-react-wrapper-viewer)

---

## Ex-Autodesk Principal Advice (Blind)

From an L5 Principal who left Autodesk — reposted in a frontend prep thread:

1. Algo with **frontend twist** — nested comment list, tree from provided data
2. **Todo list** — surprisingly covers many React interview patterns
3. Separation of concerns, perf (cache, defer, virtualize), test cases out loud
4. System design: **frontend layer first**; backend as black box unless time
5. Client state: Redux, reselect, Context — discuss tradeoffs
6. **Explain while coding** — Autodesk rejected a candidate who passed rounds but explanation was weak

---

## Confidence Level of Prep Pack

| Area | Confidence | Why |
|------|------------|-----|
| Round structure (your email) | **High** | Direct from recruiter |
| Frontend JS/React/CSS topics | **High** | Multiple FE candidate reports align |
| DSA patterns | **Medium–High** | Bengaluru + Crackr + OA reports |
| System design | **Medium** | Mixed backend/frontend reports; we reframed FE-first |
| Leadership / AI Round 5 | **Medium** | Less public data; inferred from role level + industry |
| Exact questions for your team | **Low** | Team-specific; resume-driven |

---

## If You Want to Go Deeper Yourself

Search these directly (live results change):

1. `site:leetcode.com/discuss Autodesk frontend`
2. `site:glassdoor.com Autodesk front end developer interview`
3. `site:teamblind.com Autodesk interview`
4. `Autodesk Software Engineer Frontend interview experience`
5. Ask your recruiter: **Is there an OA? CoderPad? Presentation round?**
