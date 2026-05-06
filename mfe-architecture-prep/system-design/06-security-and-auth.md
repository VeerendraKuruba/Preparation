# 06 — Security & Auth

The security model of `the-app`, plus the broader concepts you'll be
asked about.

---

## 1. The trust chain

```
User
  │ logs into the host SaaS application (host-app.example.com)
  │ via the IDP Provider (OIDC/SAML behind the scenes)
  ▼
Browser holds: session cookie (Secure, HttpOnly, SameSite)
  │ scoped to *.example.com
  ▼
Host shell loads the-app plugin
  │ provides `sandbox` with user + company context
  ▼
Plugin makes API call with credentials: 'include'
  │ cookie sent automatically
  ▼
Backend service validates cookie → identifies user
  │ runs AuthZ → permits or denies
  ▼
Returns data
```

**Trust assumptions:**
- The cookie is `HttpOnly` — JS can't read it. (No XSS theft of the session.)
- The cookie is `Secure` — only over HTTPS.
- The cookie is `SameSite=Lax` or `Strict` — limits CSRF.
- The plugin code is loaded from a trusted origin under host-app.example.com — same
  origin as the cookie scope.

If any of these break, the trust chain breaks.

---

## 2. AuthN — Authentication (who are you?)

**This plugin does not handle authentication.** The host already authenticated
the user. The plugin rides on the existing session.

**Why this is the right design:**
- No tokens in client storage = no token theft.
- One auth flow company-wide — consistent UX, single point to add MFA, etc.
- Plugins can't accidentally weaken the auth surface.

**The host's job (you should know this exists, even if you don't build it):**
- OIDC/SAML to the company's IDP.
- Session token issued and stored in cookie.
- Refresh on expiry; re-auth when refresh fails.
- Logout clears cookies + invalidates server-side session.

---

## 3. AuthZ — Authorization (what can you do?)

```
                            ┌──────────────────────┐
                            │  Policy Admin Point  │
                            │  (IT defines policy) │
                            └──────────┬───────────┘
                                       │ writes policy
                                       ▼
┌────────────────┐    ask    ┌──────────────────────┐    eval    ┌──────────┐
│  PEP (widget   │──────────►│  PDP (the central AuthZ   │───────────►│  Policy  │
│  via sandbox)  │           │       service)       │            │  store   │
│                │◄──────────│                      │◄───────────│          │
└────────────────┘  permit/  └──────────────────────┘            └──────────┘
                    deny                ▲
                                        │ context
                                  ┌──────────────────┐
                                  │  PIP (Policy     │
                                  │  Information Pt) │
                                  │  user, tenant,   │
                                  │  resource attrs  │
                                  └──────────────────┘
```

This is **ABAC** (attribute-based access control) — the policy considers
user role, tenant, resource type, and action.

**Codepath in this app:**
[`hasPermission`](../../../multi-entity-ui/src/js/utils/common/sandboxUtil.ts#L125):

```ts
const decisions = await authorization.isAuthorizedBatch({
  batchRequest: [{ resource: { id: resource }, action: { id: action } }],
});
return decisions?.[0]?.isAuthorized ?? false;
```

**Backend defense in depth:** the **server** must also call AuthZ on every
mutation. Client AuthZ is for UX (greying out buttons); server AuthZ is for
security.

---

## 4. Multi-tenancy security

The single most important rule:

> **Every request must explicitly identify the tenant. Every cache key must
> include the tenant. Every log must include the tenant.**

Failure modes:
- **IDOR** (Insecure Direct Object Reference): user A asks for `entity/123`,
  server returns it without checking that user A has access to that
  tenant's entity 123. Server must always check `entity.tenantId == user.tenantId`.
- **Cache leak**: cache key omits tenant; user B in tenant Y sees user A's
  data from tenant X.
- **Log leak**: aggregated logs across tenants without tenant tagging make
  audit impossible.

In this repo, every service call passes `companyId` explicitly — see
`getDefaultGQLClientConfig` in
[restClient.ts](../../../multi-entity-ui/src/restClient.ts#L41). That's correct.

---

## 5. Accountant impersonation — a multi-tenancy edge case

[IdentityService.ts:118-122](../../../multi-entity-ui/src/js/services/IdentityService.ts):

```ts
const isAccountant = isAccountantUser(sandbox);
let principalAccountId: string | undefined = companyId;
if (isAccountant) {
  principalAccountId = getFirmId(sandbox);
}
```

The accountant's effective principal is their **firm**, not the company they're
viewing. AuthZ policies must be written against firm-level access:

> "User U from firm F can act on company C if firm F has client-relationship
> with company C and U has role R in firm F."

**Audit logs must record all three** (user, firm, target company). Otherwise
"firm employee did action on client" looks identical to "client admin did
action on own company."

---

## 6. CSRF (Cross-Site Request Forgery)

Cookie auth + `credentials: 'include'` is the classic CSRF surface. Defenses:

| Defense | How |
|---|---|
| **SameSite cookies** | `SameSite=Strict` or `Lax` blocks cross-site cookies on most cases |
| **CSRF tokens** | Server emits a per-session token, client echoes in header |
| **Origin/Referer check** | Server rejects mutations from unexpected origins |
| **Custom headers + CORS** | Browser preflight blocks cross-site if no allowlist match |

The plugin uses an `apiKey` header — that's not a CSRF defense, but it does
trigger CORS preflight, which provides incidental protection.

For finance-grade APIs, **all of the above** plus `SameSite=Strict` is the
floor.

---

## 7. XSS (Cross-Site Scripting)

Defenses, in order of importance:

1. **Output encoding** — React escapes by default. The danger is
   `dangerouslySetInnerHTML`, third-party HTML, or rendering markdown.
2. **Content Security Policy (CSP)** — header that limits where scripts can
   load from.
3. **Input validation** — but defense-in-depth, not primary.
4. **HTTP-only cookies** — even if XSS hits, can't steal the session cookie.

This repo has `@sbg/htmlescaper` in deps. Audit any place that uses it: if
output goes through it, good. If output bypasses React, that's a flag.

---

## 8. Common web vulnerabilities (OWASP Top 10) — what they mean for an FE

| Vuln | FE relevance |
|---|---|
| **Broken Access Control** | Always check AuthZ; rely on server too |
| **Cryptographic Failures** | Don't store secrets/tokens in JS; use HTTPS |
| **Injection** | XSS at the UI; parameterize queries on backend |
| **Insecure Design** | Architectural: trust chain, fail-closed defaults |
| **Security Misconfiguration** | CSP, HSTS, cookie flags, CORS |
| **Vulnerable Components** | Dep audit; this repo has Renovate (`renovate.json`) |
| **Auth Failures** | Session timeout, MFA on the host (not the plugin) |
| **Software & Data Integrity** | SRI for third-party scripts; signed plugin bundles |
| **Logging Failures** | We log a lot; ensure no PII (see 06.8) |
| **SSRF** | Backend concern |

---

## 9. Logging — security-relevant cautions

[loggerUtil.ts](../../../multi-entity-ui/src/js/utils/common/loggerUtil.ts) stringifies the
*entire* error object. That can include:
- Request bodies (could contain PII or secrets)
- Stack traces (reveal internal paths, sometimes URLs with tokens in
  query strings)
- HTTP headers (could include cookies, tokens)

**Mitigations:**
- Sanitize errors before logging — strip `Authorization` headers, query
  strings with `token=…`, body fields named `password|ssn|email`.
- CI scan for known PII patterns in fixture log payloads.
- Region-pin log destinations to satisfy GDPR/data-residency.

---

## 10. Secrets management

Rule: **no secrets in the FE bundle.** Period.

What lives in the FE:
- `apiKey` from sandbox — public identifier, not a secret.
- Endpoint URLs — public.

What must NEVER live in the FE:
- API tokens with privileged scopes.
- Database creds.
- Webhook signing secrets.

If you must call a privileged API, route through the backend.

---

## 11. Content Security Policy (CSP)

A CSP header restricts what the browser allows:

```
Content-Security-Policy: default-src 'self';
  script-src 'self' https://internal.example.com/;
  connect-src 'self' https://*.api.example.com;
  style-src 'self' 'unsafe-inline';
  frame-ancestors 'self';
  upgrade-insecure-requests;
```

For an MFE: **`connect-src` must allow every backend you call**. With 13
endpoints, that's a long allowlist — and any new endpoint requires a
CSP update.

---

## 12. Dependency security

The repo has Renovate for automated dep PRs. Key practices:
- `yarn audit` in CI; fail builds on high-severity.
- Pin versions in production builds (lockfile).
- Subresource Integrity (SRI) for any externally-loaded scripts.
- Vendor third-party widgets cautiously; they run with your AuthN.

---

## 13. Privacy & compliance

Beyond security:
- **GDPR** — right to access, right to delete; data residency.
- **CCPA** — California privacy.
- **SOX** — financial audit trail.
- **PCI** — if you ever touch card data (this app shouldn't).

For a finance app, **audit logs are a feature**: who changed what, when,
from where. The interaction IDs + structured logs in this repo support that.

---

## 14. Threat modeling — STRIDE for an MFE plugin

| Threat | This app |
|---|---|
| **Spoofing** | Cookie-based AuthN; SSO via host. Spoofing requires cookie theft. |
| **Tampering** | Plugin bundles signed/served from trusted CDN. SRI possible. |
| **Repudiation** | Audit logs with user+firm+company on every action. |
| **Information Disclosure** | Multi-tenant cache keys include tenant; logs sanitized. |
| **Denial of Service** | Per-(apiKey, IP) rate limits at edge; client-side queue caps. |
| **Elevation of Privilege** | AuthZ on every action, server-side. |

Walk through STRIDE in an interview when asked "what could go wrong?" —
it's a structured, senior-sounding answer.

---

## 15. The interview-ready "security story"

> "Authentication is delegated to the host — the user's the host SaaS application session
> cookie travels with every request via `credentials: 'include'`. We never
> hold tokens in the plugin, eliminating that theft surface. Authorization
> is centralized: the widget asks `sandbox.authorization.isAuthorized` and
> the host calls the company's PDP. The backend re-checks AuthZ on every
> mutation — client checks are for UX. Multi-tenancy: every request carries
> `companyId`, every cache key is tenant-scoped, every log includes
> `tenantId`. CSRF is mitigated via SameSite cookies plus the cookie's
> HttpOnly flag — XSS can't steal the session. We follow OWASP Top 10 and
> have Renovate for dep updates. The accountant case requires special
> handling because the principal is the firm, not the user — AuthZ policies
> and audit logs both record `(userId, firmId, companyId)`."

That's a 60-second, defendable answer covering AuthN, AuthZ, multi-tenancy,
CSRF/XSS, supply chain, and audit. Memorize the *shape* of it.
