# Live Coding Challenges — Round 1 Prep

> **Round 1 focus:** React component design + **practical problems** — not DSA. Practice building these in 35 min each with TypeScript.

---

## Challenge 1: Debounced Contact Search (★★★ HIGH)

**Prompt:** Build a search input that queries contacts after 300ms of no typing. Show loading, results, empty, and error states. Support keyboard navigation.

**Time target:** 30–35 min

**Checklist:**
- [ ] Debounce implementation (hook or lodash)
- [ ] AbortController on new search
- [ ] `aria-autocomplete`, `aria-expanded`, `role="listbox"`
- [ ] Arrow key navigation + Enter to select
- [ ] TypeScript types for Contact
- [ ] Min 2 characters before search

**Repo practice:** [Practice/React/UserSearchAutocomplete/](../../Practice/React/UserSearchAutocomplete/), [Practice/React/Autocomplete/](../../Practice/React/Autocomplete/)

---

## Challenge 2: Infinite Scroll Message List (★★★ HIGH)

**Prompt:** Render a message thread with cursor pagination. Load older messages when scrolling to top. New messages append at bottom.

**Time target:** 35–40 min

**Checklist:**
- [ ] `useInfiniteQuery` or manual cursor state
- [ ] `@tanstack/react-virtual` for windowing
- [ ] Preserve scroll position when prepending
- [ ] "New messages" pill when scrolled up
- [ ] Optimistic send with pending status

**Repo practice:** [system-design/frontend/q11-real-time-dashboard.md](../../system-design/frontend/q11-real-time-dashboard.md)

---

## Challenge 3: Call Duration Timer (★★☆ MEDIUM)

**Prompt:** Display elapsed time for an active call. Format as `MM:SS` or `H:MM:SS`. Handle tab visibility.

```typescript
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

**Follow-ups:** Pause timer on hold; reset on new call.

**Repo practice:** [Practice/React/CountdownTimer/](../../Practice/React/CountdownTimer/)

---

## Challenge 4: Toast Notification System (★★☆ MEDIUM)

**Prompt:** Implement a toast queue — max 3 visible, auto-dismiss after 5s, support priority (error persists).

**Checklist:**
- [ ] Context + reducer or Zustand
- [ ] `aria-live="polite"` for toasts
- [ ] Stack animation
- [ ] Programmatic API: `toast.success('Saved')`

**Repo practice:** [Practice/React/ToastNotification/](../../Practice/React/ToastNotification/), [react-hands-on-45min/05-modal/](../../react-hands-on-45min/05-modal/)

---

## Challenge 5: Multi-Step Onboarding Form (★★☆ MEDIUM)

**Prompt:** 3-step wizard with validation. Back/Next. Summary on final step.

**Checklist:**
- [ ] Form state per step or single state object
- [ ] Validate on Next, not on every keystroke
- [ ] Progress indicator (`aria-current="step"`)
- [ ] TypeScript for form values

**Repo practice:** [react-hands-on-45min/06-multi-step-form/](../../react-hands-on-45min/06-multi-step-form/), [Practice/React/CodeEntryForm/](../../Practice/React/CodeEntryForm/)

---

## Challenge 6: Rate Limiter / API Throttle UI (★☆☆ STAFF BONUS)

**Prompt:** Implement client-side rate limiting — max 10 API calls per minute. Show user feedback when limited.

```typescript
class RateLimiter {
  private timestamps: number[] = [];
  constructor(private maxCalls: number, private windowMs: number) {}

  tryAcquire(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxCalls) return false;
    this.timestamps.push(now);
    return true;
  }
}
```

---

## Challenge 7: JavaScript — Implement from Scratch

| Function | File |
|----------|------|
| Debounce | [javascript-machine-coding/01-debounce-throttle.js](../../javascript-machine-coding/01-debounce-throttle.js) |
| Throttle | Same |
| EventEmitter | [javascript-machine-coding/02-event-emitter.js](../../javascript-machine-coding/02-event-emitter.js) |
| Promise.all | [javascript-machine-coding/](../../javascript-machine-coding/) |
| LRU Cache | [Practice/simple-lru-cache.js](../../Practice/simple-lru-cache.js) |

---

## Challenge 8: Presence Indicator Component (★★☆ DOMAIN-SPECIFIC)

**Prompt:** Render user avatar with online/away/on-call/offline badge. Tooltip on hover.

```tsx
type Presence = 'online' | 'away' | 'on-call' | 'offline';

const presenceColors: Record<Presence, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  'on-call': 'bg-red-500',
  offline: 'bg-gray-400',
};

function PresenceBadge({ presence }: { presence: Presence }) {
  return (
    <span
      className={cn('h-3 w-3 rounded-full ring-2 ring-white', presenceColors[presence])}
      aria-label={`Status: ${presence}`}
    />
  );
}
```

---

## Coding Interview Tips

1. **Clarify requirements** before typing (2–3 min)
2. **Outline component structure** aloud
3. **Type as you go** — no `any`
4. **Handle edge cases** — empty, loading, error
5. **Leave 5 min** for follow-up questions
6. **Test manually** — walk through happy path + one edge case

---

## 30-Minute Mock Schedule

| Min | Activity |
|-----|----------|
| 0–3 | Read prompt, ask clarifying questions |
| 3–5 | Define types + component tree |
| 5–22 | Implement core functionality |
| 22–27 | a11y + error states |
| 27–30 | Walk through test cases |
