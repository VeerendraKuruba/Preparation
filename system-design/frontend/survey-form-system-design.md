# Design: Survey Form System — Frontend System Design

> **Interview framing:** "Design a survey/form builder and response system like Google Forms or Typeform — users can create surveys, share them, and respondents fill them out. Handle conditional logic, multi-step flows, offline draft saving, and analytics."

**Mental model:** This is a **schema-driven dynamic form** — the server describes what to render, the client renders it, validates it, persists drafts, and submits responses. Two distinct user types: **form builder** (creator) and **respondent** (filler).

---

## 1. Clarify Scope (2–3 min)

> "Let me clarify a few things before I start designing."

**Functional questions to ask:**
- Two products in one: form builder + form responder — should I cover both or focus on one?
- What field types? *(text, radio, checkbox, dropdown, rating, file upload, date)*
- Conditional logic? *(show field B only if field A = "Yes")*
- Multi-step / paginated form, or single long scroll?
- Draft auto-save for respondents?
- Real-time collaboration on the builder? *(like Google Docs — multiple editors)*
- Anonymous or authenticated responses?
- Can respondents edit a submitted response?
- Analytics for form owner? *(response rate, drop-off per question)*

**Non-functional questions:**
- Scale: how many concurrent respondents per form? *(viral form → millions)*
- Response submission SLA? *(must not lose a submitted response)*
- Offline: respondent fills form on flaky network — save draft?
- a11y: WCAG 2.1 AA required?
- Embed in third-party sites?

> **Stated assumptions:** Both builder and responder surfaces. Field types: text, radio, checkbox, rating, file upload. Conditional logic supported. Multi-step form. Draft auto-save. No real-time builder collaboration (v1). Authenticated + anonymous responses. WCAG 2.1 AA. Up to 100k concurrent respondents per form.

---

## 2. Functional & Non-Functional Requirements

### Functional
- **Builder:** Create/edit form with drag-and-drop fields, add conditional logic, publish, share link
- **Responder:** Fill multi-step form, see conditional fields, auto-save draft, submit response
- **Owner analytics:** View response count, completion rate, per-question drop-off, answer distributions
- Field validation (required, min/max length, regex, file type/size)
- Embed via `<iframe>` or JS snippet on third-party sites

### Non-Functional

| Requirement | Target |
|---|---|
| Form load time (responder) | LCP < 1.5s |
| Auto-save latency | Draft saved within 2s of last keystroke |
| Submission durability | Zero response loss (at-least-once delivery) |
| Concurrent respondents | 100k per popular form |
| Offline | Respondent can fill and submit when reconnected |
| Accessibility | WCAG 2.1 AA |
| Embed support | Works in third-party iframe with `sandbox` policy |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌─────────────────────┐    ┌──────────────────────────────┐│
│  │   Form Builder UI   │    │      Form Responder UI       ││
│  │  (drag & drop)      │    │  (schema-driven renderer)    ││
│  │  - Field editor     │    │  - Dynamic field components  ││
│  │  - Condition editor │    │  - Conditional logic engine  ││
│  │  - Preview          │    │  - Step navigator            ││
│  └────────┬────────────┘    └─────────────┬────────────────┘│
│           │                               │                  │
│           ▼                               ▼                  │
│   Form Schema Store               Response State Store       │
│   (builder's source of truth)     (in-memory + IndexedDB)   │
└───────────────────────────────────────────────────────────────┘
          │                                   │
          ▼                                   ▼
   Form API (CRUD)                    Response API
   GET /forms/:id                     POST /responses
   PUT /forms/:id                     PATCH /responses/:draftId
          │
          ▼
   CDN (published form schema)
   - Static JSON after publish
   - Cache-Control: max-age=60
```

**Key insight:** After a form is published, its schema is essentially a static JSON blob. Serve it from CDN — no origin hit per respondent.

---

## 4. Form Schema Design (Core)

> Everything in this system flows from the schema. Get this right first.

```json
{
  "formId": "f_abc123",
  "version": 3,
  "title": "Customer Satisfaction Survey",
  "settings": {
    "multiStep": true,
    "allowAnonymous": true,
    "allowEdit": false,
    "progressBar": true
  },
  "pages": [
    {
      "pageId": "p1",
      "title": "About You",
      "fields": [
        {
          "fieldId": "f1",
          "type": "text",
          "label": "Your name",
          "required": false,
          "validation": { "maxLength": 100 }
        },
        {
          "fieldId": "f2",
          "type": "radio",
          "label": "How did you hear about us?",
          "required": true,
          "options": [
            { "value": "social", "label": "Social media" },
            { "value": "friend", "label": "Friend/colleague" },
            { "value": "search", "label": "Search engine" }
          ]
        }
      ]
    },
    {
      "pageId": "p2",
      "title": "Your Experience",
      "fields": [
        {
          "fieldId": "f3",
          "type": "rating",
          "label": "Overall satisfaction (1–5)",
          "required": true,
          "scale": 5
        },
        {
          "fieldId": "f4",
          "type": "textarea",
          "label": "What could we improve?",
          "required": false,
          "condition": {
            "fieldId": "f3",
            "operator": "lte",
            "value": 3
          }
        }
      ]
    }
  ]
}
```

**Why version field?** If a form owner edits a published form, existing draft responses may reference old field IDs. Server validates response against the schema version it was started on.

---

## 5. Form Builder (Creator Surface)

### Architecture
```
Builder UI
  ├── Canvas (drag-and-drop field list per page)
  ├── Field Editor Panel (right sidebar — edit selected field)
  ├── Condition Editor (visual if/then rules)
  ├── Preview Mode (renders responder UI inline)
  └── Publish button → POST /forms/:id/publish
```

### State management in the builder
```
Local state (React + Immer):
  formSchema: { pages: [...] }     ← single source of truth
  selectedFieldId: "f2"            ← UI selection state
  isDirty: true                    ← unsaved changes flag

Auto-save to server:
  Debounce 1s after last change → PATCH /forms/:id (full schema or JSON patch)
  On success: isDirty = false, version++
  On failure: show "Save failed" banner, retry
```

### Drag-and-drop
- Use `@dnd-kit/core` (accessible, keyboard-navigable drag-and-drop)
- Fields within a page: sortable list
- Moving fields across pages: drag to page tab or use "Move to page" dropdown
- Never mutate schema directly — use Immer `produce()` for immutable updates

### Conditional logic editor
```
Visual rule builder (no code):
  IF [field: "Overall satisfaction"] [is less than or equal to] [3]
  THEN SHOW [field: "What could we improve?"]

Stored in schema as:
  condition: { fieldId: "f3", operator: "lte", value: 3 }

Evaluated client-side during response (pure function — no server round-trip):
  function isFieldVisible(field, answers) {
    if (!field.condition) return true;
    const { fieldId, operator, value } = field.condition;
    const answer = answers[fieldId];
    if (operator === "eq")  return answer === value;
    if (operator === "lte") return Number(answer) <= Number(value);
    if (operator === "gte") return Number(answer) >= Number(value);
    if (operator === "contains") return String(answer).includes(value);
    return true;
  }
```

---

## 6. Form Responder (Filler Surface)

### Rendering flow
```
1. GET /forms/:formId → fetch published schema (from CDN)
2. Load existing draft? → GET /drafts/:formId (authenticated) or IndexedDB (anonymous)
3. Merge draft answers into local state
4. Render current page's visible fields (run condition engine)
5. On field change → update local state + debounced auto-save
6. On page "Next" → validate current page → advance step
7. On final page "Submit" → POST /responses → show thank-you page
```

### Response state machine
```
IDLE
  ↓ form loaded
FILLING
  ↓ auto-save (every 2s after change)
DRAFT_SAVED
  ↓ "Next" on last page
SUBMITTING
  ↓ success
SUBMITTED
  ↓ (or on network error during submit)
SUBMIT_FAILED → retry button
```

### Multi-step navigation
```js
// Current page index in URL: /forms/f_abc123?page=2
// Why URL? — browser back button works, shareable link to specific page

function FormNavigator({ schema, answers }) {
  const [page, setPage] = useQueryParam("page", 0);
  const visiblePages = schema.pages.filter(p =>
    p.fields.some(f => isFieldVisible(f, answers))
  );

  function handleNext() {
    const errors = validatePage(visiblePages[page], answers);
    if (errors.length) { showErrors(errors); return; }
    if (page < visiblePages.length - 1) setPage(page + 1);
    else handleSubmit();
  }

  return (
    <>
      <ProgressBar current={page + 1} total={visiblePages.length} />
      <FormPage page={visiblePages[page]} answers={answers} />
      <NavigationButtons onNext={handleNext} onBack={() => setPage(page - 1)} />
    </>
  );
}
```

---

## 7. Auto-Save & Draft Persistence

> "A respondent should never lose progress — network drop, tab close, or refresh."

### Two-layer draft persistence

```
Layer 1 — IndexedDB (immediate, local):
  On every field change → write to IndexedDB (< 5ms, synchronous feel)
  Key: formId + userId (or anonymous session ID)

Layer 2 — Server draft API (background sync):
  Debounce 2s → PATCH /drafts/:formId { answers, currentPage, schemaVersion }
  On reconnect → flush pending IndexedDB writes to server

On form load:
  1. Try GET /drafts/:formId from server (authenticated users)
  2. If offline or anonymous → read from IndexedDB
  3. Merge with empty answers if no draft found
```

### Draft conflict: two tabs open
```
Tab A saves draft at T=10s
Tab B saves draft at T=12s (overwrites A)
Tab A tries to save at T=15s → server returns 409 with latest version

Resolution: "Another tab has newer progress. Use that version?" → user chooses
(Simple last-write-wins is also acceptable — mention both options)
```

### Offline-first submit (outbox pattern)
```js
async function submitResponse(formId, answers) {
  try {
    await fetch("/api/responses", { method: "POST", body: JSON.stringify({ formId, answers }) });
    clearDraft(formId);
  } catch {
    // offline or network error
    await addToOutbox({ formId, answers, attemptedAt: Date.now() });
    showBanner("Saved locally — will submit when you're back online");
  }
}

// Service Worker background sync
self.addEventListener("sync", (event) => {
  if (event.tag === "submit-response") {
    event.waitUntil(flushOutbox());
  }
});
```

---

## 8. Validation Strategy

### Two-layer validation (client + server)

| Layer | When | What |
|---|---|---|
| Client (field-level) | On blur + on "Next" | Required, maxLength, regex, file type/size |
| Client (page-level) | On "Next" button | All visible required fields on current page |
| Server (on submit) | POST /responses | Full schema validation, re-check conditions, idempotency |

### Why validate on server too?
- Client JS can be bypassed
- Schema may have changed since form was loaded (version mismatch)
- File upload virus scan happens server-side

### Client validation sketch
```js
function validateField(field, value) {
  const errors = [];
  if (field.required && !value) errors.push(`${field.label} is required`);
  if (field.validation?.maxLength && value?.length > field.validation.maxLength)
    errors.push(`Max ${field.validation.maxLength} characters`);
  if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value))
    errors.push(field.validation.patternMessage || "Invalid format");
  return errors;
}
```

---

## 9. File Upload Fields

File uploads need special handling — don't POST them with the form JSON.

### Flow
```
1. User selects file → validate client-side (type, size limit)
2. Request pre-signed upload URL: POST /uploads/presign
   → server returns: { uploadUrl, fileKey }
3. PUT file directly to S3/GCS using presigned URL (bypasses your server)
4. Store fileKey in answers state: { fieldId: "f5", value: "uploads/abc.pdf" }
5. Submit form JSON with fileKey (not the file binary)
6. Server validates fileKey exists + belongs to this session before accepting

Progress UI:
  - Show upload % using XMLHttpRequest onprogress
  - Allow cancel (abort XHR)
  - Show error with retry if upload fails
```

**Why presigned URL?** Your API server doesn't handle binary streams — scales better, cheaper egress.

---

## 10. Performance

### Responder load (most critical — faces end users)

| Asset | Strategy | Size target |
|---|---|---|
| Responder shell | SSR HTML + CSS (above the fold renders instantly) | < 20kb CSS |
| Form schema JSON | CDN-cached, served as static asset after publish | < 50kb |
| Field components | Code-split per field type — only load types used in this form | < 10kb per type |
| File upload widget | Lazy-loaded only when form has file field | ~30kb |

```
T=0ms     SSR HTML arrives — form title + first field visible
T=100ms   Schema JSON fetched from CDN (cached after first hit)
T=200ms   Field components for this form's types loaded
T=300ms   Form fully interactive — respondent can start typing
```

### Builder load (internal users — less latency sensitive)
- CSR is fine for builder — authenticated, internal tool
- Drag-and-drop library lazy loaded after auth
- Schema editing: only send JSON patch diff on auto-save (not full schema)

### Large forms (50+ questions)
- Paginated — never render all fields at once
- Virtualize field list in builder canvas if > 100 fields
- Condition engine: memoize visible fields — only recompute when dependency fields change

---

## 11. Analytics (Form Owner Dashboard)

```
Events captured on responder client:
  - form_started      { formId, schemaVersion, timestamp }
  - page_viewed       { formId, pageIndex, timestamp }
  - field_focused     { formId, fieldId, timestamp }
  - field_completed   { formId, fieldId, timeSpentMs }
  - page_abandoned    { formId, pageIndex, lastFieldId }
  - form_submitted    { formId, durationMs }

Transport: batched beacon (navigator.sendBeacon on page unload)
PII rule: never send field VALUES in analytics events — only fieldId + timing
```

### Metrics form owner sees
```
Response funnel:
  Opened: 10,000
  Started page 1: 8,500  (85%)
  Completed page 1: 7,000  (70%)
  Completed page 2: 5,200  (52%)
  Submitted: 4,800  (48%)

Per-question drop-off:
  Q3 "What is your budget?" → 30% of respondents skip or abandon here
  → suggests question is too personal or unclear
```

---

## 12. Accessibility (WCAG 2.1 AA)

Survey forms are a core a11y concern — must work for all users.

```html
<!-- Field rendered with proper semantics -->
<fieldset>
  <legend>How did you hear about us? <span aria-label="required">*</span></legend>
  <label>
    <input type="radio" name="f2" value="social" required />
    Social media
  </label>
  <label>
    <input type="radio" name="f2" value="friend" />
    Friend/colleague
  </label>
</fieldset>

<!-- Error announced immediately -->
<div role="alert" aria-live="assertive">
  This field is required.
</div>

<!-- Progress bar -->
<div role="progressbar" aria-valuenow="2" aria-valuemin="1" aria-valuemax="4"
     aria-label="Step 2 of 4">
```

- All fields reachable by keyboard (Tab/Arrow keys)
- Error messages linked to fields via `aria-describedby`
- Focus moves to first error on failed "Next" attempt
- Rating scale: arrow keys change value, visible focus ring
- File upload: keyboard-accessible, announces file name + size after selection
- `prefers-reduced-motion`: disable page transition animations

---

## 13. Security

| Risk | Mitigation |
|---|---|
| XSS via form labels/options | Sanitize all schema text on server before storing; escape on render (React does this by default) |
| CSRF on response submission | CSRF token in POST body for authenticated users |
| File upload malware | Server-side virus scan before marking file as accepted; never serve uploaded files from main domain (use separate `uploads.domain.com`) |
| Anonymous response spam | Rate limiting by IP + device fingerprint; optional CAPTCHA on high-spam forms |
| Schema tampering (client sends modified schema) | Server validates response against stored schema version, not client-submitted schema |
| PII in analytics | Never log field values in analytics events — only field IDs and timing |

---

## 14. Embed Support

```html
<!-- Third-party site embeds form -->
<iframe
  src="https://forms.example.com/embed/f_abc123"
  width="100%"
  height="600"
  sandbox="allow-scripts allow-forms allow-same-origin"
  title="Customer Satisfaction Survey"
></iframe>
```

**Iframe height auto-resize:**
```js
// Inside iframe (form page)
window.parent.postMessage({ type: "resize", height: document.body.scrollHeight }, "*");

// On host page
window.addEventListener("message", (e) => {
  if (e.data.type === "resize") iframe.style.height = e.data.height + "px";
});
```

**JS embed alternative (for trusted partners):**
```js
// Inlines form directly in host page DOM — no iframe boundary
<script src="https://forms.example.com/embed.js" data-form="f_abc123"></script>
```
Trade-off: JS embed has full DOM access (faster UX, parent page styling), but security risk — only for trusted enterprise customers.

---

## 15. Trade-offs — Raise These Unprompted

| Decision | Trade-off |
|---|---|
| Schema-driven rendering | One renderer for all form types, easy to add new field types. BUT complex conditional logic is hard to represent in JSON — deeply nested conditions become unreadable. |
| Page-by-page validation | Respondent catches errors early per page. BUT respondent can't see later required fields — may abandon when they discover them. Alternative: show all fields, scroll to errors. |
| CDN-cached schema after publish | Very fast load for respondents. BUT form edits after publish don't propagate for up to `max-age` seconds — must use short TTL or cache invalidation on publish. |
| Presigned URL for file uploads | Scales without server bottleneck. BUT requires extra round-trip for presign; file key must be validated server-side to prevent referencing other users' files. |
| IndexedDB + outbox for offline submit | Zero response loss. BUT Background Sync API not supported in all browsers — Safari requires polling fallback. |
| Client-side condition evaluation | No server round-trip per field change — instant show/hide. BUT if condition logic changes after response started, the client has stale logic. Mitigate with schema version check on submit. |

---

## 16. What I'd Monitor

| Signal | Alert on |
|---|---|
| Form load time (p95 LCP) | > 2s — CDN cache miss spike |
| Auto-save failure rate | > 1% — draft loss risk |
| Response submission failure rate | > 0.1% — must be near-zero |
| Outbox queue depth | Growing over time — background sync broken |
| File upload failure rate | > 2% — presign API or S3 issue |
| Form abandonment spike | Sudden drop in completion rate — broken field or condition bug |
| Builder auto-save conflicts | > 0.5% — concurrent edit collision |

---

## 17. Minute Summary (closing statement)

> "To summarize — I've designed a two-surface system: a **drag-and-drop form builder** that edits a **versioned JSON schema** with a 1s debounce auto-save, and a **schema-driven responder** that fetches the schema from CDN, evaluates **conditional logic client-side**, and persists drafts in both **IndexedDB and a server draft API** for zero progress loss. Responses are submitted with **at-least-once durability** via an outbox pattern backed by Service Worker Background Sync. File uploads use **presigned URLs** to bypass the API server. The key trade-offs are: **CDN caching for responder speed** at the cost of needing cache invalidation on publish, and **client-side condition evaluation** for instant UX at the cost of stale logic if the form changes mid-session — mitigated by schema version checks on submit."

---

## Deep Dive Prompts (if interviewer steers here)

| Prompt | Answer direction |
|---|---|
| "How do you handle a viral form with 1M submissions in an hour?" | Schema from CDN (no origin hit), response API behind queue (SQS/Kafka) for durability — POST returns 202 Accepted, async write to DB; rate limit per device |
| "What if the form owner edits a published form?" | Bump schema version; existing draft responses locked to old version; responder detects version mismatch on next auto-save → prompt "Form updated — refresh to see latest" |
| "How would you support branching logic (go to page 3 if answer = X)?" | Add `pageCondition` to page object in schema; condition engine evaluates visible page sequence dynamically; URL `?page=` tracks logical index not physical |
| "How would you make the builder collaborative (two editors simultaneously)?" | OT or CRDT on the schema JSON (similar to Q8 collaborative editor); operational transforms on field-level patches; presence cursors showing who's editing which field |
| "How do you prevent duplicate submissions (double-click submit)?" | Idempotency key = `formId + respondentId + schemaVersion`; disable submit button + show spinner on first click; server deduplicates on idempotency key |
| "How would you support offline form filling on a mobile native app?" | Same pattern — SQLite instead of IndexedDB; Background Fetch API or native background task for outbox flush; conflict: if form updated while offline, show diff of changed questions |
