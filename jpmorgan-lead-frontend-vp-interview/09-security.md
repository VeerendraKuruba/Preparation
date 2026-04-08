# Security — High Priority at JP Morgan

**Priority:** CRITICAL — This is a bank. Security knowledge is non-negotiable.  
**When tested:** Code review round, system design round, behavioral follow-ups

---

## XSS (Cross-Site Scripting)

### Q: What is XSS and how do you prevent it in a React app?

**Types of XSS:**

| Type | How it works |
|---|---|
| **Stored XSS** | Malicious script saved in DB, served to all users |
| **Reflected XSS** | Script in URL parameters, reflected in response |
| **DOM-based XSS** | JS reads attacker-controlled source (URL hash), writes to DOM |

**Prevention in React:**

```jsx
// React auto-escapes JSX content — this is SAFE
function UserBio({ bio }) {
  return <div>{bio}</div>; // bio is escaped; script tags rendered as text
}

// DANGER — dangerouslySetInnerHTML bypasses React's protection
function UserBio({ bio }) {
  return <div dangerouslySetInnerHTML={{ __html: bio }} />; // XSS RISK
}

// SAFE — sanitize before using dangerouslySetInnerHTML
import DOMPurify from 'dompurify';

function UserBio({ bio }) {
  const sanitized = DOMPurify.sanitize(bio, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: [], // no attributes allowed
  });
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// Also dangerous — dynamic script evaluation
eval(userInput);                         // Never
new Function(userInput)();              // Never
element.innerHTML = userInput;          // Avoid; use textContent instead
document.write(userInput);             // Never
```

**Content Security Policy (CSP) header** — defense in depth:
```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-abc123';
  style-src 'self';
  img-src 'self' data: https://cdn.jpmc.com;
  connect-src 'self' https://api.jpmc.com;
  frame-ancestors 'none';
```
- `default-src 'self'` — only load resources from same origin
- `script-src 'nonce-...'` — only scripts with matching nonce execute (no inline scripts)
- `frame-ancestors 'none'` — prevents clickjacking

---

## CSRF (Cross-Site Request Forgery)

### Q: What is CSRF and how do you prevent it?

**Attack:** Attacker tricks authenticated user's browser into sending forged request to your app (e.g., via `<img src="https://bank.com/transfer?to=attacker&amount=1000">`).

**Prevention:**

```javascript
// 1. CSRF Token (classic approach)
// Server generates token, embeds in page, verifies on every state-changing request

// Django-style CSRF token in request
async function transferFunds(amount, toAccount) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
  const response = await fetch('/api/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken, // server validates this
    },
    body: JSON.stringify({ amount, toAccount }),
  });
}

// 2. SameSite Cookie attribute (modern, simpler)
// Server sets:
// Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly
// SameSite=Strict: cookie not sent on cross-site requests at all
// SameSite=Lax: cookie sent for top-level navigation GET, but not for subresource requests

// 3. Double Submit Cookie pattern
// CSRF token set in both cookie AND request header; server compares both
```

---

## CORS (Cross-Origin Resource Sharing)

### Q: What is CORS and how does it work?

**Answer:**

CORS is a browser security mechanism that restricts cross-origin HTTP requests.

```
Browser origin: https://app.jpmc.com
API origin:     https://api.jpmc.com  ← different origin (different subdomain)

Browser adds: Origin: https://app.jpmc.com
Server responds: Access-Control-Allow-Origin: https://app.jpmc.com
```

**Simple vs Preflight requests:**

```javascript
// Simple request — no preflight:
// GET, HEAD, POST with simple content types (text/plain, form, multipart)
fetch('https://api.jpmc.com/public/data'); // no preflight

// Preflighted request — browser sends OPTIONS first:
// Custom headers, PUT/DELETE/PATCH, application/json body
fetch('https://api.jpmc.com/trades', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' },
  body: JSON.stringify(data),
});
// Browser first sends:
// OPTIONS /trades HTTP/1.1
// Origin: https://app.jpmc.com
// Access-Control-Request-Method: POST
// Access-Control-Request-Headers: Content-Type, Authorization

// Server must respond:
// Access-Control-Allow-Origin: https://app.jpmc.com
// Access-Control-Allow-Methods: POST, GET, OPTIONS
// Access-Control-Allow-Headers: Content-Type, Authorization
// Access-Control-Max-Age: 86400 (cache preflight result for 24h)
```

**Common mistake:** Setting `Access-Control-Allow-Origin: *` with credentials — this is rejected by browsers. For credentialed requests, you must specify exact origin.

---

## JWT (JSON Web Tokens)

### Q: How does JWT authentication work? What are the security considerations?

**Answer:**

```
JWT Structure:
header.payload.signature

Header (base64url):  { "alg": "HS256", "typ": "JWT" }
Payload (base64url): { "sub": "user123", "roles": ["trader"], "exp": 1714000000 }
Signature:           HMACSHA256(base64(header) + '.' + base64(payload), secret)
```

```javascript
// Frontend — storing and sending JWT
// NEVER store JWT in localStorage — vulnerable to XSS (any script can read it)
// Store in httpOnly cookie — JS cannot access it, browser sends automatically

// If must use localStorage (SPAs without SSR):
// - Treat the app as XSS-free first (DOMPurify, strict CSP)
// - Use short expiry (15 min access token + 7 day refresh token)
// - Refresh token in httpOnly cookie

// Sending JWT
const response = await fetch('/api/trades', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include', // send cookies (refresh token)
});

// Token refresh flow
async function refreshAccessToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include', // sends httpOnly refresh token cookie
  });
  const { accessToken } = await response.json();
  return accessToken; // store in memory only (not localStorage)
}
```

**JWT Security considerations:**
- Use asymmetric signing (RS256/ES256) for multi-service — public key verification without sharing secret
- Short access token TTL (15 min); longer refresh token (7 days) in httpOnly cookie
- Include `jti` (JWT ID) to allow individual token revocation
- Validate `iss`, `aud`, `exp` on every request server-side
- Never decode and trust on frontend alone — always verify signature server-side

---

## RBAC (Role-Based Access Control) on the Frontend

### Q: How would you implement RBAC in a React application?

```jsx
// Permission check hook
function usePermission(permission) {
  const { user } = useAuth();
  return user?.permissions?.includes(permission) ?? false;
}

// Permission gate component
function Can({ permission, children, fallback = null }) {
  const hasPermission = usePermission(permission);
  return hasPermission ? children : fallback;
}

// Usage
function TradePanel() {
  return (
    <div>
      <PortfolioView /> {/* everyone can see */}
      <Can permission="trade:execute" fallback={<ReadOnlyNotice />}>
        <ExecuteTradeButton />
      </Can>
      <Can permission="trade:history">
        <TradeHistory />
      </Can>
    </div>
  );
}

// Route guard
function ProtectedRoute({ permission, children }) {
  const hasPermission = usePermission(permission);
  if (!hasPermission) return <Navigate to="/unauthorized" replace />;
  return children;
}

// CRITICAL: Always enforce on backend too
// Frontend RBAC is UX — backend RBAC is security
// A user can bypass frontend checks with DevTools or direct API calls
```

---

## Secure Cookie Attributes

### Q: What are secure cookie attributes and when to use them?

| Attribute | Effect |
|---|---|
| `HttpOnly` | JS cannot access cookie — prevents XSS token theft |
| `Secure` | Cookie only sent over HTTPS — prevents MITM |
| `SameSite=Strict` | Cookie never sent cross-site — strongest CSRF protection |
| `SameSite=Lax` | Sent for top-level navigation GET only — balance of usability/security |
| `SameSite=None` | Always sent cross-site — MUST pair with `Secure` |
| `__Host-` prefix | Forces Secure, no Domain attribute, Path=/ — max security |

```http
// Gold standard for session cookie at JP Morgan:
Set-Cookie: __Host-session=abc123; 
  Secure; 
  HttpOnly; 
  SameSite=Strict; 
  Path=/;
  Max-Age=900
```

---

## Subresource Integrity (SRI)

```html
<!-- Verify CDN assets haven't been tampered with -->
<script
  src="https://cdn.example.com/react.min.js"
  integrity="sha384-abc123..."
  crossorigin="anonymous"
></script>
<!-- Browser computes hash; if mismatch, blocks execution -->
```

---

## Security Checklist for a Financial Frontend

- [ ] All user input sanitized with DOMPurify before rendering as HTML
- [ ] `dangerouslySetInnerHTML` used only when absolutely necessary, always sanitized
- [ ] CSP header configured; no `unsafe-inline` for scripts
- [ ] CSRF tokens on all state-changing requests, or SameSite=Strict cookies
- [ ] JWT stored in memory (not localStorage); refresh token in HttpOnly cookie
- [ ] All API calls over HTTPS only
- [ ] RBAC enforced on frontend (UX) AND backend (security)
- [ ] Sensitive data never logged to console in production
- [ ] Dependencies audited with `npm audit` in CI; no known critical vulnerabilities
- [ ] Error messages don't expose internal architecture to end users

---

## Preparation Checklist

- [ ] Explain XSS types and prevention methods without notes
- [ ] Explain CSRF mechanism and prevention (token + SameSite)
- [ ] Explain CORS preflight and when it triggers
- [ ] Know JWT structure, storage best practices, refresh token flow
- [ ] Know all secure cookie attributes and when to use them
- [ ] Implement a permission gate component from memory
- [ ] Explain why frontend RBAC is UX and backend RBAC is security
