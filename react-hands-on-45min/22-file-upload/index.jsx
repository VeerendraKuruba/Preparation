import { useState } from 'react';

export function FileUploadWithProgress({
  url,              // Required: endpoint URL to POST the file to
  method = 'POST',  // HTTP method — defaults to POST
  extraHeaders,     // Optional: { [headerName]: value } (e.g. Authorization)
  onDone,           // Callback(Response) — fired when upload completes
  onError,          // Callback(Error) — fired on network failure
}) {
  // busy: true while upload is in-flight — prevents starting a second upload.
  const [busy, setBusy] = useState(false);

  // pct: null = bar hidden, 0-100 = bar visible with percentage.
  // null vs 0 distinction matters: null hides the bar entirely.
  const [pct, setPct] = useState(null);

  // name: filename of the uploading file for display.
  const [name, setName] = useState(null);

  // ── Core upload function ───────────────────────────────────────────────────
  const upload = (file) => {
    // Create a fresh XHR per upload — XHR is stateful and must not be reused.
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    if (extraHeaders) {
      for (const [k, v] of Object.entries(extraHeaders)) xhr.setRequestHeader(k, v);
    }

    // xhr.upload.onprogress fires repeatedly with bytes sent.
    // This is WHY we use XHR not fetch — fetch has no upload progress event.
    xhr.upload.onprogress = (e) => {
      // e.lengthComputable is false when the server omits Content-Length.
      // Without this guard, e.loaded / 0 = NaN, breaking the progress bar.
      if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
    };

    // xhr.onload fires when the server responds (any HTTP status).
    // Check xhr.status inside to distinguish 2xx success from 4xx/5xx errors.
    xhr.onload = () => {
      setBusy(false);
      setPct(null);
      try {
        // Wrap in a standard Response so callers use the familiar fetch-style API.
        const res = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        });
        onDone?.(res);
      } catch (e) {
        onError?.(e);
      }
    };

    // xhr.onerror fires for low-level failures only: no internet, DNS failure,
    // CORS blocked, SSL error. HTTP 4xx/5xx still triggers onload, not onerror.
    xhr.onerror = () => {
      setBusy(false);
      setPct(null);
      onError?.(new Error('Network error'));
    };

    // FormData handles multipart/form-data encoding automatically.
    // DO NOT manually set Content-Type — the browser must set the boundary value.
    const body = new FormData();
    body.append('file', file);

    // Set state before xhr.send() so the UI updates immediately.
    setBusy(true);
    setPct(0);
    setName(file.name);
    xhr.send(body);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <input
        type="file"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />

      {name && <div style={{ marginTop: 8, fontSize: 13 }}>File: {name}</div>}

      {/* pct != null (loose) matches 0 through 100, but not null */}
      {pct != null && (
        <div style={{ marginTop: 8 }}>
          {/*
           * ARIA progressbar pattern:
           *   role="progressbar" + aria-valuenow lets screen readers announce progress
           *   without extra visible text on screen.
           */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            style={{ height: 8, background: '#eee', borderRadius: 4 }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: '#2a6df4',
                borderRadius: 4,
                transition: 'width 120ms linear',
              }}
            />
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>{pct}%</div>
        </div>
      )}
    </div>
  );
}
