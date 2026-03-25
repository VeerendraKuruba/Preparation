# 23. Design infinite scroll for millions of items

## Core

You **never** hold millions of rows in browser memory. Use **cursor-based** pagination from the API (stable sort key + opaque cursor), small pages (20–50), **merge** into a client cache with tombstones for deletes if needed.

## Client

- **Virtualized list** so DOM stays small.
- **Deduplicate** by id; guard **duplicate pages** from races.
- **Prefetch** next page near the end; cancel stale requests (`AbortController`).
- **Backpressure** — stop prefetch if memory budget exceeded or tab hidden.

## Server / protocol

Keyset pagination on indexed column; avoid OFFSET for deep pages.

## Integrity

If **healing** after reconnect: optionally reset cursor or reconcile with `updated_at`.
