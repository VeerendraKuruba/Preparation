import { useState } from 'react';

/** XMLHttpRequest upload progress (fetch has no upload progress). */

export function FileUploadWithProgress({
  url,
  method = 'POST',
  extraHeaders,
  onDone,
  onError,
}) {
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(null);
  const [name, setName] = useState(null);

  const upload = (file) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    if (extraHeaders) {
      for (const [k, v] of Object.entries(extraHeaders)) xhr.setRequestHeader(k, v);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setBusy(false);
      setPct(null);
      try {
        const res = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        });
        onDone?.(res);
      } catch (e) {
        onError?.(e);
      }
    };

    xhr.onerror = () => {
      setBusy(false);
      setPct(null);
      onError?.(new Error('Network error'));
    };

    const body = new FormData();
    body.append('file', file);
    setBusy(true);
    setPct(0);
    setName(file.name);
    xhr.send(body);
  };

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
      {pct != null && (
        <div style={{ marginTop: 8 }}>
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
