# 29. Design error logging and monitoring

## Client capture

`window.onerror`, `unhandledrejection`, **React error boundaries** (component stack), route transition errors.

## Payload

Fingerprint (release, build id), user id (hashed), breadcrumbs (recent nav clicks, last API), device, sampled for noise.

## Transport

POST to collector; **rate limit** per session; scrub secrets.

## Dashboards

Error rate by release, top fingerprints, **source maps** for readable stacks (protected access).

## Feedback loop

Tie to CI — new error spike after deploy triggers rollback hooks.

## Privacy

Never log full URLs with tokens; avoid raw PII in stack args.
