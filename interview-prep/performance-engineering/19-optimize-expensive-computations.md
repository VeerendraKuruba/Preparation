# 19. Optimize expensive computations in UI

## First moves

1. **Measure** — is CPU or network the bottleneck?
2. **Don’t do O(n²) in render** — pre-index, sort once, binary search, etc.
3. **`useMemo`** when a derive is costly **and** inputs change rarely — dependency array must be correct.
4. **Web Worker** for heavy transforms (large JSON parse, CSV, image bitmap ops) — return transferable buffers when possible.
5. **`startTransition` (React 18+)** — keep input responsive while deferring non-urgent updates.

## Interview example

Filtering 50k rows: maintain **debounced query** + **precomputed index** (e.g. lowercase tokens) instead of scanning naively on every keystroke; or **server-side** search for huge corpora.

## Caveat

`useMemo` does not run fewer times unless child work is actually skipped; pair with **`memo`** on consumers when useful.
