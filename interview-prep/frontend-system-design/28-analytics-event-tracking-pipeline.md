# 28. Design an analytics event tracking pipeline

## Client instrumentation

- **Schema** for events (`name`, `props`, `user/session`, `timestamp`, sampling).
- **Batch + beacon** (`sendBeacon` on unload) to reduce requests.
- **PII guardrails** — strip/redact in client; config-driven blocklists.
- **Reliability**: offline queue (IndexedDB), replay with size caps.

## Delivery

Edge ingest → stream processing → warehouse; **real-time** aggregates optional.

## Frontend performance

Sample high-frequency events; defer with `requestIdleCallback`; avoid blocking main thread.

## Consent

Respect opt-out/GDPR — gate initialization and allow deletion hooks.
