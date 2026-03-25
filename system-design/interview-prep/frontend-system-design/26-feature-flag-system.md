# 26. Design a feature flag system

## Pieces

- **Flag service** (eval rules: user %, tenant, region, time window).
- **SDK** in app: fetch snapshot at boot + **poll** or **SSE** for updates; cache in memory with TTL.
- **Bootstrap**: embed minimal flags in HTML or config endpoint to avoid FOUC for gated routes.

## Frontend usage

Wrap routes/components; **code-split** behind dynamic import so dead features don’t bloat bundle when off.

## Safety / ops

Kill switches for bad deploys; audit exposure; avoid leaking sensitive experiments to clients (only gate booleans/variants needed).

## Trade-off

Client flags are **visible** — never rely on flags alone for **authorization**; server must enforce.
