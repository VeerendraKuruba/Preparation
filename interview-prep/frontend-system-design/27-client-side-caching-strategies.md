# 27. Design client-side caching strategies

## HTTP layer

Cache-Control, ETag, conditional requests; **CDN** friendly GETs.

## Library caches (SWR / React Query)

**Stale-while-revalidate**, background refetch on focus/reconnect, keyed caches per entity, **mutation invalidation** or optimistic updates with rollback.

## Persistence

`localStorage`/IndexedDB for offline shells; **version** the cache schema; encrypt sensitive data cautiously.

## Normalization

Entity map vs denormalized endpoints — pick based on read patterns.

## Invalidation

Time-to-live + explicit invalidation + **event-driven** (WebSocket “resource X changed”).

## Pitfalls

Serving stale auth-sensitive views; unbounded memory — **eviction** (LRU) for large lists.
