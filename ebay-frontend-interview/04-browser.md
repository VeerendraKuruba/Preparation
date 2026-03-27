# Browser Fundamentals — eBay Frontend Interview Q&A

---

## Q1: What happens when you type a URL into the browser? (Confirmed eBay question)

**Answer (tell this as a story with 10 steps):**

### 1. Browser cache check
Browser checks if it has a valid cached response for the URL.

### 2. DNS Resolution
- Browser cache → OS cache → Router cache → ISP DNS resolver
- If not cached: recursive lookup through root → TLD (`.com`) → authoritative nameserver
- Returns IP address (e.g., `66.211.174.155` for eBay)

### 3. TCP Connection (3-way handshake)
```
Client → SYN → Server
Client ← SYN-ACK ← Server
Client → ACK → Server
```

### 4. TLS Handshake (for HTTPS)
- Certificate exchange, cipher negotiation, session keys established
- Adds ~1–2 round trips (TLS 1.3 reduces this to 1)

### 5. HTTP Request
```
GET / HTTP/1.1
Host: www.ebay.com
Accept: text/html
Cookie: ...
```

### 6. Server Response
Server returns HTML with status 200. May involve load balancer → CDN → app server → DB.

### 7. HTML Parsing → DOM
- Parser reads HTML top-to-bottom, builds DOM tree
- Blocks on `<script>` without `defer`/`async`
- Starts downloading subresources (CSS, JS, images) speculatively

### 8. CSS Parsing → CSSOM
- CSS parsed into CSSOM (CSS Object Model)
- Render-blocking — browser won't render until CSSOM is complete

### 9. Render Tree
DOM + CSSOM combined. Only visible nodes included (`display: none` excluded, `visibility: hidden` included).

### 10. Layout → Paint → Composite
- **Layout (Reflow):** Calculate size and position of every element
- **Paint:** Fill pixels — colors, borders, text, shadows
- **Composite:** GPU merges layers, displays on screen

---

## Q2: Critical Rendering Path — how do you optimize it?

**Answer:**
The CRP is the sequence of steps to render the first pixels on screen. Optimization means making each step faster:

**Minimize render-blocking resources:**
```html
<!-- CSS: always render-blocking — put in <head>, keep it small -->
<link rel="stylesheet" href="critical.css">

<!-- JS: use defer or async to avoid blocking HTML parsing -->
<script src="app.js" defer></script>    <!-- runs after HTML parsed, in order -->
<script src="tracker.js" async></script> <!-- runs as soon as downloaded, any order -->
```

**Reduce CRP length:**
- Inline critical CSS (above-the-fold styles) in `<style>` tag
- Reduce JavaScript bundle size (code splitting, tree shaking)
- Use `<link rel="preload">` for fonts and key assets

**CDN + HTTP caching:**
- Serve static assets from CDN (geographically close to user)
- Set `Cache-Control: max-age=31536000, immutable` for hashed assets

---

## Q3: Reflow vs Repaint — what's the difference?

**Answer:**

**Reflow (Layout):**
- Recalculates position and size of elements
- Triggered by: changes to DOM structure, dimensions, fonts, viewport resize
- Expensive — affects the whole document (or a subtree)

**Repaint:**
- Redraws pixels without recalculating layout
- Triggered by: color, background, border-color, outline changes
- Less expensive than reflow, but still costly

**Composite only (fastest):**
- Only affects GPU-composited layers
- Only `transform` and `opacity` changes — no layout or paint step

```js
// Forces reflow — reads layout then writes, causing multiple reflows
for (const el of elements) {
  el.style.width = el.offsetWidth + 10 + 'px'; // read then write in a loop!
}

// Batched — read all, then write all (one reflow)
const widths = elements.map(el => el.offsetWidth);
elements.forEach((el, i) => { el.style.width = widths[i] + 10 + 'px'; });
```

---

## Q4: What is CORS and how does it work?

**Answer:**
CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts cross-origin HTTP requests.

**Same-origin policy:** Browser blocks JS from reading responses from a different origin (protocol + domain + port).

**CORS flow:**
1. Browser adds `Origin: https://ebay.com` to the request
2. Server responds with `Access-Control-Allow-Origin: https://ebay.com`
3. If the header matches, browser allows the JS to read the response

**Preflight (for non-simple requests):**
```
OPTIONS /api/data
Origin: https://ebay.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type
```
Server responds with `Access-Control-Allow-*` headers, then the actual request proceeds.

**Not a server-side protection** — CORS only restricts browser JS. Server-to-server calls are unaffected.

---

## Q5: HTTP/1.1 vs HTTP/2 vs HTTP/3

**Answer:**

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| Protocol | Text | Binary | Binary (QUIC/UDP) |
| Multiplexing | No (6 connections/domain) | Yes — multiple streams on one connection | Yes |
| Head-of-line blocking | Yes | Yes (TCP level) | No (QUIC fixes this) |
| Header compression | No | Yes (HPACK) | Yes (QPACK) |
| Server push | No | Yes | Yes |

**Practical impact for eBay:**
- HTTP/2 eliminates the need to bundle all JS into one file (multiplexing makes many small files fine)
- HTTP/3 helps on unstable mobile connections (QUIC handles packet loss better)

---

## Q6: What are Web Workers?

**Answer:**
Web Workers run JS in a background thread, separate from the main thread (which handles UI rendering).

```js
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ data: largeDataset });
worker.onmessage = (e) => console.log('Result:', e.data);

// worker.js — no access to DOM
self.onmessage = (e) => {
  const result = heavyComputation(e.data.data);
  self.postMessage(result);
};
```

**Use for:** CSV parsing, image processing, search indexing — anything CPU-intensive that would block the UI thread. eBay could use this for client-side product filtering or price calculations on large datasets.

---

## Q7: What is localStorage vs sessionStorage vs cookies?

**Answer:**

| | localStorage | sessionStorage | Cookie |
|--|-------------|----------------|--------|
| Capacity | ~5MB | ~5MB | ~4KB |
| Persists | Until cleared | Until tab closes | Expiry date |
| Sent with requests | No | No | Yes (automatically) |
| Accessible via JS | Yes | Yes | Yes (unless `HttpOnly`) |
| Same-origin only | Yes | Yes | Configurable |

**eBay usage patterns:**
- `localStorage` — saved searches, dark mode preference, guest cart data
- `sessionStorage` — temp checkout data for the current tab session
- Cookies — session token (must be `HttpOnly; Secure; SameSite=Strict` for security)

---

## Q8: What is the `defer` vs `async` attribute on `<script>`?

**Answer:**

```
Normal: HTML parsing --[paused]-- fetch JS --[paused]-- execute → resume HTML
async:  HTML parsing --------     fetch JS (parallel) --[paused]-- execute → resume
defer:  HTML parsing --------     fetch JS (parallel) --------- → execute after HTML done
```

- **`async`:** Download in parallel, execute immediately when ready. Order not guaranteed. Good for analytics, ads.
- **`defer`:** Download in parallel, execute in order after HTML is fully parsed. Good for app scripts.
- **Module scripts** (`type="module"`) are deferred by default.

---

## Q9: How does browser caching work?

**Answer:**

**Cache-Control header** controls caching behavior:
```
Cache-Control: max-age=3600          → cache for 1 hour
Cache-Control: no-cache              → must revalidate with server
Cache-Control: no-store              → never cache (sensitive data)
Cache-Control: max-age=31536000, immutable  → cache forever (for hashed assets)
```

**Validation:**
- `ETag: "abc123"` → If-None-Match header on next request → 304 Not Modified if unchanged
- `Last-Modified` → `If-Modified-Since` → 304 if unchanged

**eBay strategy:**
- Hashed JS/CSS (`app.a3b8c.js`) — `immutable` cache, never expires
- HTML — `no-cache` (always revalidate) so users get fresh content
- API responses — short TTL or conditional requests
