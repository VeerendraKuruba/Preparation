# 22 - File Upload with Progress

## What to Build

A **file input with a live progress bar** showing upload percentage — like a real upload form.

- User picks a file via `<input type="file">`.
- File is uploaded to a URL using `XMLHttpRequest (XHR)`.
- A progress bar fills from 0% to 100% as bytes are sent.
- Input is disabled during upload to prevent double-submission.
- ARIA attributes make the progress bar accessible to screen readers.

---

## The Critical Decision: XHR, Not `fetch`

```
fetch API:
  - Has ReadableStream for DOWNLOAD progress (response body)
  - Has NO upload progress event
  - Cannot show how many bytes have been sent

XMLHttpRequest (XHR):
  - Has xhr.upload.onprogress event
  - Fires repeatedly with e.loaded (bytes sent) and e.total (total bytes)
  - The ONLY standard way to track upload progress in the browser
```

This is the most important thing to say in an interview. Use XHR because `fetch` simply does not expose upload progress.

---

## Core Upload Flow

```
upload(file):
  1. new XMLHttpRequest()          — fresh instance per upload (XHR is stateful)
  2. xhr.open(method, url)         — set method + URL, does NOT send yet
  3. xhr.setRequestHeader(...)     — optional extra headers (auth tokens etc.)
  4. xhr.upload.onprogress = (e)   — progress handler
       if e.lengthComputable:
         pct = Math.round(e.loaded / e.total * 100)
  5. xhr.onload = ()               — fires when server responds (any HTTP status)
       setBusy(false), setPct(null)
       wrap in new Response() → call onDone()
  6. xhr.onerror = ()              — fires for network failures only (not 4xx/5xx)
  7. new FormData(); body.append('file', file)
  8. xhr.send(body)                — send the request
```

---

## Progress Calculation

```js
xhr.upload.onprogress = (e) => {
  if (e.lengthComputable) {
    setPct(Math.round((e.loaded / e.total) * 100));
  }
};
```

- `e.loaded` — bytes sent so far
- `e.total` — total bytes to send
- `e.lengthComputable` — false if server omits `Content-Length`; without the guard, `e.loaded / 0 = NaN` breaks the progress bar

---

## Why FormData, Not a Raw File

```js
const body = new FormData();
body.append('file', file);
xhr.send(body);
```

- `FormData` encodes the file as `multipart/form-data` — the same format as a standard HTML form.
- It automatically generates the correct `Content-Type` header including the **boundary** string that separates fields.
- If you manually set `Content-Type: multipart/form-data`, you omit the boundary and the server cannot parse the body.
- Most server frameworks (Express, Django, Rails) expect `multipart/form-data` for file fields.

---

## State Design

| State | Type | Purpose |
|---|---|---|
| `busy` | boolean | `true` while uploading — disables input |
| `pct` | `null \| 0-100` | `null` = hide bar; `0-100` = show bar with value |
| `name` | `null \| string` | Display the filename being uploaded |

The `null` vs `0` distinction for `pct` matters: `null` hides the progress bar entirely; `0` shows an empty bar (upload just started).

---

## ARIA Accessibility

```jsx
<div
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={pct}
>
```

- `role="progressbar"` — tells assistive technology this element is a progress indicator.
- `aria-valuenow={pct}` — screen readers announce the current progress value when it changes.
- No extra visible text needed — the percentage label below the bar serves sighted users.

---

## Interview Questions

**Q: Why can't we use `fetch` for upload progress?**
A: The `fetch` API provides a `ReadableStream` for the **response** body (download), but there is no equivalent for the **request** body (upload). `XMLHttpRequest` exposes `xhr.upload.onprogress` which fires repeatedly with `e.loaded` and `e.total`. Until the Streams API gains wider upload support, XHR is the standard solution.

**Q: What is `FormData` and why do we use it?**
A: `FormData` encodes file data as `multipart/form-data` — the same encoding that native HTML `<form>` elements use. It automatically sets the correct `Content-Type` header including the boundary string. If you set `Content-Type` manually, you break the boundary and the server cannot parse the upload.

**Q: What does `e.lengthComputable` guard against?**
A: Some servers or proxies don't send a `Content-Length` header on the request. In that case `e.lengthComputable` is `false` and `e.total` is `0`. Without the guard, `e.loaded / 0 = NaN`, which makes the progress bar width `"NaN%"` — rendering nothing and breaking the UI.

**Q: What is the difference between `xhr.onload` and `xhr.onerror`?**
A: `xhr.onload` fires whenever the server sends a response — even for HTTP 4xx or 5xx errors. It means the network round-trip completed. `xhr.onerror` fires only for low-level network failures: no internet, DNS failure, CORS blocked, SSL error. To detect a failed HTTP response, you must check `xhr.status` inside `onload`.
