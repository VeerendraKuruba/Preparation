# API Design Fundamentals — Postman

> Postman is an API platform — you're building tools FOR API developers. You're expected to have strong opinions on REST design, authentication, versioning, rate limiting, and error formats. These topics come up in all rounds.

---

## 1. REST API Design Principles

**Q: What makes a good RESTful API?**

**Verbal answer:**
> "A good REST API is consistent, predictable, and treats resources as nouns not verbs. The key principles:
>
> Resources are things, not actions — `/collections` not `/getCollections`. HTTP methods express the action: GET to read, POST to create, PUT/PATCH to update, DELETE to remove.
>
> Versioning is essential — once you ship an API, clients depend on it. Put the version in the URL (`/v1/collections`) rather than a header; headers make it harder to test in a browser.
>
> Status codes communicate meaning — don't return 200 with `{ success: false }` in the body. That defeats the purpose.
>
> Error responses are consistent — always return the same shape regardless of which error occurred."

---

### Resource Design

```
Collections resource:
GET    /v1/collections              → list all collections
POST   /v1/collections              → create collection
GET    /v1/collections/:id          → get one
PATCH  /v1/collections/:id          → update (partial)
DELETE /v1/collections/:id          → delete

Nested resources (requests belong to collections):
GET    /v1/collections/:id/requests → list requests in collection
POST   /v1/collections/:id/requests → add request to collection

Actions that don't fit CRUD (use sub-resource or POST):
POST   /v1/collections/:id/fork     → fork the collection
POST   /v1/collections/:id/run      → run the collection
POST   /v1/collections/:id/publish  → publish to public API network
```

---

### Request/Response Design

```typescript
// Consistent list response
interface ListResponse<T> {
  data: T[];
  meta: {
    total: number;
    cursor: string | null;   // next page cursor (null if last page)
    limit: number;
  };
}

// Consistent single resource response
interface ResourceResponse<T> {
  data: T;
}

// Consistent error response
interface ErrorResponse {
  error: {
    code: string;        // machine-readable: 'COLLECTION_NOT_FOUND'
    message: string;     // human-readable: 'Collection with id "abc" does not exist'
    details?: unknown;   // optional validation errors, nested info
    requestId: string;   // for support/debugging correlation
  };
}

// Example error responses
// 404:
{
  "error": {
    "code": "COLLECTION_NOT_FOUND",
    "message": "Collection with id 'abc123' was not found",
    "requestId": "req_a1b2c3d4"
  }
}

// 422 (validation error):
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "name", "message": "Name is required" },
      { "field": "url", "message": "Must be a valid URL" }
    ],
    "requestId": "req_a1b2c3d4"
  }
}
```

---

## 2. Authentication Patterns

### Bearer Token (JWT)

**Q: How does JWT authentication work?**

```
Flow:
1. User logs in → server validates credentials → issues JWT (signed with secret)
2. Client stores JWT (localStorage or httpOnly cookie)
3. Client sends JWT in header: Authorization: Bearer <token>
4. Server verifies signature — no DB lookup needed (stateless)
5. JWT expires (exp claim) → client refreshes with refresh token

JWT structure: header.payload.signature
Header: { alg: "HS256", typ: "JWT" }
Payload: { sub: "user123", iat: 1699000000, exp: 1699003600, roles: ["admin"] }
Signature: HMAC-SHA256(base64(header) + "." + base64(payload), secret)
```

```javascript
// Server — verify JWT
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'MISSING_AUTH', message: 'Authorization header required' } });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' } });
    }
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token is invalid' } });
  }
}
```

---

### API Keys (Postman's Primary Auth Model)

> "Postman issues API keys that developers embed in their apps. API keys are simpler than OAuth for server-to-server. Key design decisions:
>
> Store a hash of the key, not the plaintext (same reason you don't store passwords). Look up by the prefix (first 8 chars, not secret) to find the right hash, then verify. Return the full key ONCE at creation time — never again.
>
> Prefix the key with a string so it's identifiable in code searches: `pm_live_abc123...` vs a random string."

```typescript
// API key generation
async function createApiKey(userId: string, name: string) {
  const rawKey = `pm_${generateSecureRandom(32)}`; // pm_ prefix for grep-ability
  const hash = await bcrypt.hash(rawKey, 12);
  const prefix = rawKey.slice(0, 8); // used for lookup, not secret

  await db.apiKeys.create({
    userId,
    name,
    prefix,
    hash,
    createdAt: new Date(),
    lastUsedAt: null,
  });

  return rawKey; // return ONCE, never stored in plaintext
}

// Verification
async function verifyApiKey(rawKey: string) {
  const prefix = rawKey.slice(0, 8);
  const keys = await db.apiKeys.findAll({ where: { prefix } });

  for (const key of keys) {
    if (await bcrypt.compare(rawKey, key.hash)) {
      await db.apiKeys.update({ lastUsedAt: new Date() }, { where: { id: key.id } });
      return key;
    }
  }
  return null;
}
```

---

### OAuth 2.0 (for integrations)

```
Flows:
1. Authorization Code (web apps) — most secure, server-side code exchange
   User → Auth Server → code → your server → token → API

2. Client Credentials (server-to-server) — no user involved
   Service → Auth Server → token → API

3. PKCE (mobile/SPA) — Authorization Code without client secret
   Code Verifier (random) → Code Challenge (SHA256 hash) sent to auth server
   Exchange code + verifier for token (prevents auth code interception)

Postman's OAuth testing:
- Postman can manage the OAuth flow for you (built-in OAuth 2.0 helper)
- Stores tokens, auto-refreshes before expiry
- Supports all 4 grant types
```

---

## 3. Pagination

**Q: What's the difference between offset/limit and cursor-based pagination?**

```typescript
// Offset/limit — simple but has problems with large datasets
GET /collections?offset=100&limit=20

// Problem 1: Slow for large offsets — DB must scan all 100 rows to skip them
// Problem 2: If items are inserted/deleted while paginating, items can shift (skips or duplicates)

// Cursor-based — better for large datasets and live data
GET /collections?cursor=eyJpZCI6IjEyMyJ9&limit=20
// cursor = opaque token encoding the last item's position

// Implementation:
async function listCollections(workspaceId: string, cursor?: string, limit = 20) {
  let cursorCondition = {};
  if (cursor) {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
    // Get items created BEFORE this cursor (sorted desc)
    cursorCondition = { created_at: { $lt: decoded.createdAt }, id: { $ne: decoded.id } };
  }

  const items = await db.collections.find({
    workspace_id: workspaceId,
    ...cursorCondition,
  })
  .sort({ created_at: -1, id: -1 })
  .limit(limit + 1); // fetch one extra to check if there's a next page

  const hasNextPage = items.length > limit;
  if (hasNextPage) items.pop();

  const nextCursor = hasNextPage
    ? Buffer.from(JSON.stringify({
        createdAt: items[items.length - 1].created_at,
        id: items[items.length - 1].id,
      })).toString('base64')
    : null;

  return { data: items, meta: { cursor: nextCursor, limit } };
}
```

---

## 4. Rate Limiting

**Q: How would you implement rate limiting for Postman's public API?**

```
Algorithms:
1. Fixed Window: count requests in a time bucket (e.g., per minute)
   Problem: burst at window boundary (99 requests end of minute 1 + 100 requests start of minute 2 = 199 in 2 seconds)

2. Sliding Window: count requests in a rolling time window
   Better: use Redis sorted set with timestamp as score

3. Token Bucket: bucket refills at rate R; request costs 1 token
   Allows bursts up to bucket size, but sustained rate is R

4. Leaky Bucket: requests drain from bucket at constant rate
   Smooths out bursts entirely
```

```javascript
// Redis sliding window rate limiter
async function isRateLimited(key, limit, windowSeconds) {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, '-inf', windowStart); // remove old entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`); // add current request
  pipeline.zcard(key);                                 // count in window
  pipeline.expire(key, windowSeconds);                 // auto-expire key

  const results = await pipeline.exec();
  const requestCount = results[2][1];

  if (requestCount > limit) {
    return {
      limited: true,
      retryAfter: Math.ceil(windowSeconds - (now - windowStart) / 1000),
    };
  }
  return { limited: false };
}

// Express middleware
app.use(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  const { limited, retryAfter } = await isRateLimited(
    `rate:${apiKey}`,
    1000,  // 1000 requests
    60     // per 60 seconds
  );

  res.setHeader('X-RateLimit-Limit', 1000);
  // X-RateLimit-Remaining could be added too

  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: { code: 'RATE_LIMIT_EXCEEDED', message: `Rate limit exceeded. Retry after ${retryAfter}s` }
    });
  }
  next();
});
```

---

## 5. API Versioning

**Q: How would you version Postman's public API?**

**Verbal answer:**
> "There are three approaches: URL path versioning, header versioning, and query parameter versioning. I prefer URL path versioning (`/v1/`, `/v2/`) for public APIs because it's explicit, cacheable, and easy to test in a browser or Postman itself. You can't accidentally not see which version you're calling.
>
> The key principle: once published, a version is stable. Breaking changes go in a new version. Non-breaking additions (new optional fields, new endpoints) can go in the current version without bumping.
>
> For deprecation: set a sunset date, add a `Deprecation` header, and notify API consumers 6+ months in advance. Keep old versions running until traffic drops to near zero."

```
Breaking changes (require new version):
- Removing a field from response
- Renaming a field
- Changing a field's data type
- Removing an endpoint
- Changing the meaning of a status code

Non-breaking (can add to current version):
- Adding new optional request fields
- Adding new response fields
- Adding new endpoints
- Adding new query parameters

Versioning in URL:
GET /v1/collections  → stable, maintained
GET /v2/collections  → new version with breaking changes
```

---

## 6. Idempotency

**Q: What is idempotency? Why does it matter for APIs?**

> "An operation is idempotent if running it multiple times produces the same result as running it once. GET is naturally idempotent. DELETE is idempotent — deleting the same resource twice should succeed (or 404 on second call). PUT is idempotent. POST is NOT idempotent by default — POSTing twice creates two resources.
>
> For Postman's public API: when a client retries a POST (e.g., network timeout), it might not know if the first request succeeded. If we don't handle idempotency, we create duplicate collections. The solution: client sends an idempotency key (UUID) in the header. Server checks if it's seen that key, and if so, returns the same response as the first call."

```javascript
// Idempotency key middleware
app.post('/v1/collections', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];

  if (idempotencyKey) {
    // Check if we've seen this key before
    const cached = await redis.get(`idempotency:${idempotencyKey}`);
    if (cached) {
      const result = JSON.parse(cached);
      return res.status(result.status).json(result.body);
    }
  }

  // Process the request
  const collection = await createCollection(req.body);
  const responseBody = { data: collection };

  if (idempotencyKey) {
    // Cache the response for 24 hours
    await redis.setex(
      `idempotency:${idempotencyKey}`,
      86400,
      JSON.stringify({ status: 201, body: responseBody })
    );
  }

  res.status(201).json(responseBody);
});
```

---

## Quick-Fire API Questions

| Question | Answer |
|----------|--------|
| What headers should a 201 response include? | `Location: /v1/collections/new-id` pointing to the created resource |
| When to use 204 vs 200? | 204 for successful DELETE or PATCH with no response body. 200 when returning the updated resource. |
| What is HATEOAS? | Hypermedia as the Engine of Application State — responses include links to related actions. `"links": { "self": "/collections/123", "run": "/collections/123/run" }`. Rarely implemented fully. |
| Difference between authentication and authorization? | Authentication = who are you? (JWT, API key). Authorization = what can you do? (RBAC, scopes). |
| What is a webhook? | HTTP callback — your server calls the client's URL when an event happens. Client registers a URL; server POSTs to it. Postman uses webhooks for monitor results, payment events. |
| REST vs GraphQL trade-offs? | REST: simple, cacheable, widely understood. GraphQL: flexible querying, reduces over-fetching, but harder to cache, requires more client complexity. Postman's public API is REST; GraphQL is useful for client-driven dashboards. |
