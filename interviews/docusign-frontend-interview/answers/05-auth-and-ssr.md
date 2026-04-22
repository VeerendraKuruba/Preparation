# Section 5 & 6 — Authentication, Authorization & SSR

---

## Section 5 — Authentication & Authorization

### Q81. How do you implement authentication in a React SPA? Walk through the full flow.

**Full Authentication Flow in a React SPA:**

1. **User submits credentials** via a login form.
2. **SPA sends a POST** to the auth endpoint (your backend or identity provider).
3. **Server validates credentials** and returns an access token (JWT) and optionally a refresh token.
4. **SPA stores tokens** (discussed in Q82) and updates auth state.
5. **All subsequent API calls** attach the access token in the `Authorization: Bearer <token>` header.
6. **On expiry**, the SPA uses the refresh token to get a new access token silently (Q85).
7. **On logout**, tokens are cleared and the user is redirected.

**Key building blocks:**

- **Auth Context** — holds the current user and token.
- **Protected Routes** — redirects unauthenticated users.
- **Axios/Fetch interceptor** — automatically attaches tokens and handles 401 refresh.

```jsx
// auth/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() =>
    sessionStorage.getItem('access_token')
  );

  const user = accessToken ? jwtDecode(accessToken) : null;

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // sends httpOnly refresh token cookie
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const { access_token } = await res.json();
    sessionStorage.setItem('access_token', access_token);
    setAccessToken(access_token);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    sessionStorage.removeItem('access_token');
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

```jsx
// auth/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !user.roles?.includes(requiredRole)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
```

```jsx
// api/client.js — Axios interceptor
import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          failedQueue.push({ resolve, reject })
        ).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        sessionStorage.setItem('access_token', data.access_token);
        failedQueue.forEach((p) => p.resolve(data.access_token));
        failedQueue = [];
        return api(original);
      } catch (e) {
        failedQueue.forEach((p) => p.reject(e));
        failedQueue = [];
        sessionStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### Q82. What is the difference between localStorage, sessionStorage, and httpOnly cookies for token storage? Which is safest and why?

| Feature | localStorage | sessionStorage | httpOnly Cookie |
|---|---|---|---|
| Persistence | Until explicitly cleared | Until tab/browser closes | Controlled by `Max-Age`/`Expires` |
| Accessible via JS | Yes | Yes | **No** |
| Sent automatically | No (must attach manually) | No (must attach manually) | Yes (browser sends on every request) |
| XSS risk | **High** — any JS can read it | **High** | **Mitigated** — JS cannot read it |
| CSRF risk | None | None | **Requires mitigation** (SameSite + CSRF token) |
| Shared across tabs | Yes | No | Yes |
| Cross-origin | No | No | With `Domain` attribute |

**Recommendation: httpOnly cookies for refresh tokens, memory/sessionStorage for short-lived access tokens.**

- **httpOnly + Secure + SameSite=Strict cookies** are not accessible to JavaScript at all, so even if an XSS attack injects malicious script, it **cannot steal the token**.
- Access tokens stored in memory (React state) are XSS-safe too, but lost on page refresh — solved with a silent refresh endpoint (Q85).
- **localStorage is the least safe** because it survives indefinitely and is readable by any script on the page — including third-party scripts.

```
Set-Cookie: refresh_token=<token>;
  HttpOnly;
  Secure;
  SameSite=Strict;
  Path=/api/auth/refresh;
  Max-Age=604800
```

Restricting the cookie `Path` to `/api/auth/refresh` means the browser only sends it to that specific endpoint — minimizing CSRF surface area.

---

### Q83. Explain the OAuth 2.0 PKCE flow for SPAs. Why was implicit grant deprecated?

**Why implicit grant was deprecated:**

The implicit grant returned access tokens directly in the URL fragment (`#access_token=...`). This is dangerous because:
- The token appears in browser history.
- Referrer headers can leak it to third-party servers.
- Tokens cannot be refresh-token-backed (implicit grants return short-lived tokens only).
- No way to verify the client received the token (no client secret in SPAs).

**PKCE (Proof Key for Code Exchange) Flow:**

PKCE adds a cryptographic one-time proof to the Authorization Code flow so that even without a client secret, an attacker who intercepts the authorization code cannot exchange it for a token.

```
1. SPA generates:
   code_verifier  = random high-entropy string (43–128 chars)
   code_challenge = BASE64URL(SHA-256(code_verifier))

2. SPA redirects user to Authorization Server:
   GET /authorize
     ?response_type=code
     &client_id=spa_client
     &redirect_uri=https://app.com/callback
     &scope=openid profile email
     &state=<random>          ← CSRF protection
     &code_challenge=<hash>
     &code_challenge_method=S256

3. User authenticates → Auth Server redirects back:
   https://app.com/callback?code=AUTH_CODE&state=<random>

4. SPA verifies state, then exchanges the code:
   POST /token
     grant_type=authorization_code
     &code=AUTH_CODE
     &redirect_uri=https://app.com/callback
     &client_id=spa_client
     &code_verifier=<original_verifier>  ← Auth server re-hashes and compares

5. Auth Server returns access_token + refresh_token + id_token
```

```js
// Generating PKCE values
async function generatePKCE() {
  const array = crypto.getRandomValues(new Uint8Array(32));
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return { verifier, challenge };
}
```

An attacker who intercepts the code cannot use it without the `code_verifier`, which was never sent over the network.

---

### Q84. What is CSRF and how do you prevent it? What is the SameSite cookie attribute?

**CSRF (Cross-Site Request Forgery):**

A CSRF attack tricks an authenticated user's browser into making an unintended request to a site where they are logged in. Because the browser automatically sends cookies, a malicious page can POST to `bank.com/transfer` using the victim's session.

**Prevention strategies:**

1. **SameSite cookie attribute** (primary defense today):
   - `SameSite=Strict` — cookie is never sent on cross-site requests (even navigations from external links).
   - `SameSite=Lax` — cookie is sent on top-level GET navigations but not cross-site POST/PUT/DELETE.
   - `SameSite=None` — always sent (requires `Secure`). Used for third-party embeds.

2. **CSRF tokens (Synchronizer Token Pattern)**:
   - Server generates a random token, stores it in session, and includes it in every rendered form.
   - Client must include it in the request (`X-CSRF-Token` header or form field).
   - Server validates before processing.

3. **Double Submit Cookie**:
   - Server sets a non-httpOnly cookie with a CSRF token.
   - Client reads it via JS and sends it as a header.
   - Server compares header vs cookie. Attacker cannot read the cookie (same-origin policy).

4. **Origin / Referer header validation** — server rejects requests where the Origin doesn't match the expected domain.

```js
// Express example: CSRF token generation + validation
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: { httpOnly: true, sameSite: 'Strict' } });

app.get('/form', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.post('/api/transfer', csrfProtection, (req, res) => {
  // csurf validates req.body._csrf or X-CSRF-Token header automatically
  processTransfer(req.body);
});
```

**Note:** When using `SameSite=Strict` cookies with no cross-site cookie usage, CSRF protection is effectively built-in for modern browsers. CSRF tokens become a defense-in-depth measure.

---

### Q85. How do you implement silent token refresh without the user seeing a logout?

**Strategy: Proactive refresh before expiry + queued retry on 401.**

There are two complementary approaches:

**1. Proactive Refresh (timer-based):**

Decode the JWT's `exp` claim, set a timer to refresh ~60 seconds before expiry. This prevents any API call from failing due to an expired token.

```js
// useTokenRefresh.js
import { useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';

export function useTokenRefresh(accessToken, onRefresh) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!accessToken) return;

    const { exp } = jwtDecode(accessToken);
    const now = Date.now() / 1000;
    const delay = (exp - now - 60) * 1000; // 60s before expiry

    if (delay <= 0) {
      onRefresh(); // already expired or about to
      return;
    }

    timerRef.current = setTimeout(onRefresh, delay);
    return () => clearTimeout(timerRef.current);
  }, [accessToken, onRefresh]);
}
```

```jsx
// In AuthProvider
const refresh = useCallback(async () => {
  try {
    const { data } = await axios.post(
      '/api/auth/refresh',
      {},
      { withCredentials: true } // sends httpOnly refresh token cookie
    );
    sessionStorage.setItem('access_token', data.access_token);
    setAccessToken(data.access_token);
  } catch {
    logout(); // refresh token expired — must re-login
  }
}, [logout]);

useTokenRefresh(accessToken, refresh);
```

**2. Reactive Refresh (on 401 — covered in Q81 interceptor):**

Queue concurrent requests during refresh and replay them after a new token is obtained. This handles edge cases where the proactive timer fails.

**3. Hidden iframe (for third-party IdPs like Auth0):**

For IdPs using session cookies, a hidden iframe can silently re-authenticate using `prompt=none`:

```js
async function silentAuth() {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `${AUTH_URL}/authorize?prompt=none&response_type=code&...`;
    document.body.appendChild(iframe);

    const handler = (event) => {
      if (event.data?.type === 'auth_success') {
        resolve(event.data.token);
        cleanup();
      }
    };
    window.addEventListener('message', handler);

    const cleanup = () => {
      window.removeEventListener('message', handler);
      document.body.removeChild(iframe);
    };

    setTimeout(() => { reject(new Error('Silent auth timeout')); cleanup(); }, 10000);
  });
}
```

---

### Q86. What is RBAC vs ABAC? How do you implement role-based UI access control in React?

**RBAC (Role-Based Access Control):**
Access decisions are based on the user's assigned roles (e.g., `admin`, `editor`, `viewer`). Simple, easy to reason about, but can lead to role explosion in complex systems.

**ABAC (Attribute-Based Access Control):**
Access decisions are based on attributes of the user, resource, and environment (e.g., `user.department === resource.department && time.hour < 18`). More flexible and powerful but more complex to implement and audit.

| | RBAC | ABAC |
|---|---|---|
| Decision basis | Roles | Attributes (user + resource + context) |
| Granularity | Coarse | Fine-grained |
| Complexity | Low | High |
| Scalability | Role explosion risk | Scales well |
| Example | "Admin can delete posts" | "User can edit post if they are the author and post is in draft" |

**Implementing RBAC in React:**

```jsx
// hooks/usePermissions.js
import { useAuth } from '../auth/AuthContext';

const PERMISSIONS = {
  admin:  ['read', 'write', 'delete', 'manage_users'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission) => {
    if (!user?.roles) return false;
    return user.roles.some(
      (role) => PERMISSIONS[role]?.includes(permission)
    );
  };

  const hasRole = (role) => user?.roles?.includes(role) ?? false;

  return { hasPermission, hasRole };
}
```

```jsx
// components/Can.jsx — declarative permission gating
import { usePermissions } from '../hooks/usePermissions';

export function Can({ permission, role, fallback = null, children }) {
  const { hasPermission, hasRole } = usePermissions();

  const allowed =
    (permission && hasPermission(permission)) ||
    (role && hasRole(role));

  return allowed ? children : fallback;
}
```

```jsx
// Usage in a component
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Can permission="write">
        <button>Create Post</button>
      </Can>

      <Can permission="delete" fallback={<p>You cannot delete posts.</p>}>
        <button className="danger">Delete</button>
      </Can>

      <Can role="admin">
        <AdminPanel />
      </Can>
    </div>
  );
}
```

**ABAC example:**

```jsx
function useCanEdit(resource) {
  const { user } = useAuth();
  return (
    user?.roles?.includes('admin') ||
    (resource?.authorId === user?.id && resource?.status === 'draft')
  );
}
```

**Important:** Always enforce permissions on the **server side**. UI gating is UX — not security. A user could bypass React-level checks with DevTools.

---

### Q87. How do you handle auth state on page refresh? What are the strategies?

On a page refresh, JavaScript memory is wiped. The challenge is restoring auth state without requiring re-login.

**Strategy 1: Read access token from sessionStorage/localStorage on mount**

```jsx
const [accessToken, setAccessToken] = useState(() =>
  sessionStorage.getItem('access_token')
);
```

Risk: If the stored token has expired, subsequent API calls will 401.

**Strategy 2: Silent refresh on mount (recommended)**

Store only the refresh token as an httpOnly cookie (persists through refresh). On app load, always try a silent refresh:

```jsx
// AuthProvider.jsx
const [accessToken, setAccessToken] = useState(null);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const restore = async () => {
    try {
      const { data } = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );
      setAccessToken(data.access_token);
    } catch {
      // No valid refresh token — user needs to log in
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };
  restore();
}, []);

if (isLoading) return <SplashScreen />;
```

This pattern ensures the app always starts with a valid, fresh token (or redirects to login).

**Strategy 3: Check-session endpoint**

Some IdPs expose a `GET /auth/me` endpoint that returns the current session's user. Call it on mount:

```js
const { data: user } = useQuery({
  queryKey: ['me'],
  queryFn: () => api.get('/auth/me').then(r => r.data),
  retry: false,
  staleTime: Infinity,
});
```

**Strategy 4: BroadcastChannel for multi-tab sync**

When a user logs out in one tab, other tabs should also reflect that:

```js
const channel = new BroadcastChannel('auth');

// On logout
channel.postMessage({ type: 'LOGOUT' });

// In AuthProvider
channel.addEventListener('message', (e) => {
  if (e.data?.type === 'LOGOUT') {
    setAccessToken(null);
  }
});
```

---

### Q88. What is OpenID Connect (OIDC) and how does it differ from OAuth 2.0?

**OAuth 2.0** is an **authorization** framework. It answers: "What can this app do on behalf of this user?" It issues **access tokens** to grant API access. It does **not** define who the user is — only what they're allowed to do.

**OpenID Connect (OIDC)** is an **identity layer** built on top of OAuth 2.0. It answers: "Who is this user?" It adds:
- An **ID token** (a signed JWT) containing user identity claims (`sub`, `email`, `name`, `picture`, etc.).
- A `/userinfo` endpoint.
- Standardized scopes: `openid`, `profile`, `email`.
- A `nonce` parameter to prevent replay attacks.

| | OAuth 2.0 | OIDC |
|---|---|---|
| Purpose | Authorization | Authentication + Authorization |
| Token | Access token (opaque or JWT) | Access token + **ID token (JWT)** |
| User info | Not standardized | Standardized (`/userinfo`, ID token claims) |
| `sub` claim | Not required | Required (unique user identifier) |
| Discovery | None | Well-Known configuration endpoint (`/.well-known/openid-configuration`) |

```js
// OIDC ID token claims (decoded)
{
  "iss": "https://accounts.google.com",   // Issuer
  "sub": "1234567890",                    // Subject (unique user ID)
  "aud": "your_client_id",               // Audience
  "exp": 1716239022,                      // Expiry
  "iat": 1716235422,                      // Issued at
  "nonce": "random_nonce",               // Replay protection
  "email": "user@example.com",
  "name": "Jane Doe",
  "picture": "https://..."
}
```

**In practice:** When you "Login with Google," Google implements OIDC. Your app gets an ID token (to know who the user is) and an access token (to call Google APIs on their behalf). Auth0, Okta, Azure AD, and AWS Cognito all implement OIDC.

---

### Q89. What is SSO (Single Sign-On)? How does it work across multiple apps?

**SSO** allows a user to log in once and gain access to multiple applications without re-authenticating. The central **Identity Provider (IdP)** (e.g., Okta, Auth0, Azure AD) manages sessions. Individual apps are **Service Providers (SPs)**.

**How it works (OIDC-based SSO):**

```
1. User visits App A (not authenticated)
2. App A redirects to IdP: /authorize?client_id=app_a&...
3. User logs in at the IdP → IdP creates a session cookie for that domain
4. IdP redirects back to App A with an auth code
5. App A exchanges code for tokens → user is logged in

Later:
6. User visits App B (also not authenticated)
7. App B redirects to IdP: /authorize?client_id=app_b&...
8. IdP detects its existing session cookie → no login prompt needed
9. IdP immediately redirects back to App B with an auth code (prompt=none)
10. App B exchanges code for tokens → user is logged in automatically
```

**SAML-based SSO** (common in enterprise, e.g., DocuSign Enterprise):

```
1. User visits SP (DocuSign)
2. SP generates SAML AuthnRequest → redirects to IdP
3. User authenticates at IdP (if not already)
4. IdP generates signed SAML Assertion → POST to SP's Assertion Consumer Service URL
5. SP validates assertion signature → creates local session
```

**SLO (Single Logout):**

When a user logs out of one app, the IdP propagates logout to all other apps (either via front-channel redirects or back-channel HTTP calls).

```js
// Checking if already logged in (OIDC silent check)
const checkSSO = () => {
  const url = new URL(`${IDP_URL}/authorize`);
  url.searchParams.set('prompt', 'none'); // don't show login UI
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', `${APP_URL}/callback`);
  url.searchParams.set('scope', 'openid profile');
  window.location.href = url.toString();
};
```

---

### Q90. What security headers should a well-configured web app have?

**Essential security headers:**

**1. Content-Security-Policy (CSP)**

Restricts which resources (scripts, styles, images, frames) the browser is allowed to load. The most important XSS mitigation.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.trusted.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.myapp.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**2. Strict-Transport-Security (HSTS)**

Forces HTTPS. Browsers will refuse HTTP connections to this domain.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**3. X-Frame-Options**

Prevents clickjacking by disallowing the page from being embedded in iframes.

```
X-Frame-Options: DENY
```

(Superseded by `Content-Security-Policy: frame-ancestors 'none'` but still useful for older browsers.)

**4. X-Content-Type-Options**

Prevents MIME-sniffing (browser guessing content type from content instead of the declared type).

```
X-Content-Type-Options: nosniff
```

**5. Referrer-Policy**

Controls how much referrer information is included with requests.

```
Referrer-Policy: strict-origin-when-cross-origin
```

**6. Permissions-Policy (Feature-Policy)**

Restricts browser features (geolocation, camera, microphone).

```
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
```

**7. Cross-Origin headers (CORP, COEP, COOP)**

Required for `SharedArrayBuffer` and high-resolution timers. Protects against cross-origin data leaks.

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

**Setting in Next.js:**

```js
// next.config.js
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self'; object-src 'none';",
  },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

---

## Section 6 — SSR & Rendering Strategies

### Q91. Compare CSR, SSR, SSG, ISR, and PPR. When do you choose each?

| Strategy | Full name | When HTML is generated | Data freshness | TTFB | SEO | Use case |
|---|---|---|---|---|---|---|
| **CSR** | Client-Side Rendering | In browser at runtime | Always fresh | Fast | Poor (without workarounds) | Dashboards, authenticated apps |
| **SSR** | Server-Side Rendering | On server per request | Always fresh | Slower | Excellent | Product pages needing fresh data |
| **SSG** | Static Site Generation | At build time | Stale until rebuild | Fastest | Excellent | Marketing pages, docs, blogs |
| **ISR** | Incremental Static Regeneration | At build + on-demand/interval | Eventually consistent | Fast | Excellent | E-commerce, news with moderate update freq |
| **PPR** | Partial Prerendering | Shell at build, dynamic parts streamed | Fresh for dynamic parts | Very fast | Excellent | Mixed static/dynamic pages |

**When to choose:**

- **CSR:** App is behind auth, SEO doesn't matter, data changes per user interaction (dashboards, admin panels, SaaS apps).
- **SSR:** Public pages needing real-time data (stock prices, personalized homepages, A/B tested pages).
- **SSG:** Rarely changing content (marketing, docs, blog). Best performance, simplest caching.
- **ISR:** Content that changes periodically but doesn't need to be real-time (product catalog, news article lists).
- **PPR:** Pages with a static shell (navbar, layout) and dynamic sections (user-specific content, ads). Best of both worlds — Next.js 14+ experimental feature.

```jsx
// Next.js App Router: SSR
// app/products/[id]/page.jsx
export default async function ProductPage({ params }) {
  // Runs on every request — SSR
  const product = await fetch(`/api/products/${params.id}`, {
    cache: 'no-store',
  }).then(r => r.json());

  return <ProductDetail product={product} />;
}

// SSG
export default async function BlogPost({ params }) {
  const post = await fetch(`/api/posts/${params.slug}`, {
    cache: 'force-cache', // default — SSG
  }).then(r => r.json());

  return <Article post={post} />;
}

// ISR — revalidate every 60 seconds
export default async function NewsPage() {
  const articles = await fetch('/api/news', {
    next: { revalidate: 60 },
  }).then(r => r.json());

  return <NewsList articles={articles} />;
}

// PPR — static shell + dynamic content
import { Suspense } from 'react';
export default function Page() {
  return (
    <main>
      <StaticHero />   {/* Prerendered at build */}
      <Suspense fallback={<Skeleton />}>
        <DynamicFeed /> {/* Streamed at request time */}
      </Suspense>
    </main>
  );
}
```

---

### Q92. What is hydration? What causes hydration mismatches?

**Hydration** is the process where React "attaches" itself to server-rendered HTML. The server sends fully-formed HTML (fast First Contentful Paint), and then the browser downloads React + JS bundles. React then walks the existing DOM and matches it to its virtual DOM tree to attach event listeners, without re-rendering from scratch.

**Hydration mismatch** occurs when the HTML produced by the server differs from what React would render on the client. React throws a warning (dev) or silently fixes the DOM (prod), which can cause visual flashes or bugs.

**Common causes:**

1. **Date/time values** — server renders UTC, client renders local timezone.
2. **Random values** — `Math.random()`, `crypto.randomUUID()` produce different values each run.
3. **Browser-only APIs** — checking `window`, `navigator`, `localStorage` on the server throws or returns undefined.
4. **Conditional rendering based on `typeof window`** — server returns one branch, client returns another.
5. **User-agent-based rendering** — different content for mobile vs desktop.
6. **Third-party scripts** modifying the DOM before hydration.
7. **Invalid HTML** — e.g., `<div>` inside `<p>` — browser auto-corrects the HTML structure, causing a mismatch.

```jsx
// BAD — hydration mismatch
function Timestamp() {
  return <span>{new Date().toLocaleTimeString()}</span>; // Different on server vs client
}

// GOOD — suppress mismatch or use client-only rendering
'use client';
import { useState, useEffect } from 'react';

function Timestamp() {
  const [time, setTime] = useState(null);
  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
  }, []);
  if (!time) return <span>--:--:--</span>; // matches server output
  return <span>{time}</span>;
}

// GOOD — suppress with suppressHydrationWarning (use sparingly)
function LastUpdated({ timestamp }) {
  return (
    <time suppressHydrationWarning>
      {new Date(timestamp).toLocaleString()}
    </time>
  );
}
```

```jsx
// BAD — window check causes mismatch
function Nav() {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return <MobileNav />;
  }
  return <DesktopNav />;
}

// GOOD — defer to client
function Nav() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);
  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

---

### Q93. What is the difference between Server Components and Client Components in Next.js App Router?

**React Server Components (RSC)** run exclusively on the server. They can directly access databases, file systems, and server-side secrets. They never ship their own JS to the browser — only the rendered HTML output.

**Client Components** run in the browser (and also during SSR for the initial HTML). They have access to browser APIs, state, effects, and event handlers.

| | Server Components | Client Components |
|---|---|---|
| Runs on | Server only | Server (SSR) + Browser |
| Ships JS? | No | Yes |
| State / hooks | No (`useState`, `useEffect` not allowed) | Yes |
| Browser APIs | No | Yes |
| Access secrets | Yes (env vars, DB, fs) | No |
| Event handlers | No (`onClick` not allowed) | Yes |
| Default in App Router | Yes | No (opt-in with `'use client'`) |
| Can import | Both | Client only |

```jsx
// app/dashboard/page.jsx — Server Component (default)
import { db } from '@/lib/db';
import { ClientChart } from './ClientChart';

export default async function DashboardPage() {
  // Direct DB access — no API route needed
  const metrics = await db.metrics.findMany({ where: { userId: getSession().userId } });

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Pass serializable data to client component */}
      <ClientChart data={metrics} />
    </div>
  );
}
```

```jsx
// app/dashboard/ClientChart.jsx
'use client'; // opt into client rendering

import { useState } from 'react';
import { LineChart } from 'recharts';

export function ClientChart({ data }) {
  const [activeMetric, setActiveMetric] = useState('revenue');

  return (
    <div>
      <button onClick={() => setActiveMetric('revenue')}>Revenue</button>
      <LineChart data={data.filter(d => d.type === activeMetric)} />
    </div>
  );
}
```

**Key rule:** Server Components can render Client Components (passing serializable props), but Client Components **cannot** render Server Components (importing them converts them to Client Components).

**"Passing as children" pattern** — allows Server Component to be composed inside Client Component:

```jsx
// This works — children prop is resolved on server, passed to client
// app/layout.jsx (Server Component)
import { Modal } from './Modal'; // client
export default function Layout({ children }) {
  return <Modal>{children}</Modal>; // children rendered on server
}
```

---

### Q94. How does streaming SSR with Suspense improve performance compared to traditional SSR?

**Traditional SSR (waterfall):**

```
1. Server fetches ALL data (waits for all DB queries, API calls)
2. Server renders the entire HTML page
3. Server sends the complete HTML to the browser
4. Browser displays the page (FCP)
5. Browser downloads JS bundles
6. React hydrates the entire page (TTI)
```

The problem: the browser waits for the slowest data fetch before seeing anything. If one query takes 3s, the user stares at a blank screen for 3s.

**Streaming SSR with Suspense:**

```
1. Server immediately sends the HTML shell (navbar, layout, static content)
2. Browser displays shell instantly (fast FCP)
3. Server streams chunks of HTML as each data dependency resolves
4. React progressively reveals sections as they arrive
5. Hydration happens incrementally per streamed chunk
```

```jsx
// app/page.jsx — Streaming with Suspense
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <main>
      {/* Renders immediately — no data dependency */}
      <Hero />

      {/* Streams as soon as products query resolves */}
      <Suspense fallback={<ProductSkeleton />}>
        <Products />
      </Suspense>

      {/* Streams as soon as recommendations resolve (independent) */}
      <Suspense fallback={<RecommendationSkeleton />}>
        <Recommendations />
      </Suspense>
    </main>
  );
}

// app/components/Products.jsx — async Server Component
async function Products() {
  const products = await db.products.findMany(); // only blocks this section
  return <ProductGrid products={products} />;
}
```

**Performance comparison:**

```
Traditional SSR:
Browser: [blank]--[blank]--[blank]--[Full page appears at t=3s]

Streaming SSR:
Browser: [Shell at t=0.1s]--[Products at t=1.5s]--[Recs at t=2s]
```

**HTTP mechanism:** Next.js uses `Transfer-Encoding: chunked`. The server sends HTML incrementally. Each Suspense boundary becomes a chunk. React on the client has a small runtime that patches the initial HTML as new chunks arrive — no full re-render.

**Selective hydration:** React prioritizes hydrating the component the user is interacting with first (e.g., clicked button), even if other parts haven't fully streamed yet.

---

### Q95. What is getServerSideProps vs getStaticProps vs generateStaticParams?

These are Next.js data-fetching APIs. The first two are **Pages Router** specific; `generateStaticParams` is **App Router**.

**`getStaticProps` (Pages Router) — SSG:**

Runs at build time. Returns props baked into the HTML.

```js
// pages/blog/[slug].jsx
export async function getStaticProps({ params }) {
  const post = await fetchPost(params.slug);
  if (!post) return { notFound: true };

  return {
    props: { post },
    revalidate: 60, // ISR — regenerate every 60s
  };
}

export async function getStaticPaths() {
  const slugs = await fetchAllSlugs();
  return {
    paths: slugs.map(slug => ({ params: { slug } })),
    fallback: 'blocking', // generate unknown paths on-demand
  };
}
```

**`getServerSideProps` (Pages Router) — SSR:**

Runs on every request. Access to request cookies, headers.

```js
// pages/dashboard.jsx
export async function getServerSideProps({ req, res, query }) {
  const session = await getSession(req);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  const data = await fetchUserData(session.userId);
  return { props: { data } };
}
```

**`generateStaticParams` (App Router) — SSG:**

Tells Next.js which dynamic segments to pre-render at build time. Replaces `getStaticPaths`.

```js
// app/blog/[slug]/page.jsx
export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  return posts.map(post => ({ slug: post.slug }));
}

// The page component itself fetches data (no separate props function)
export default async function BlogPost({ params }) {
  const post = await fetch(`/api/posts/${params.slug}`, {
    next: { revalidate: 3600 },
  }).then(r => r.json());

  return <Article post={post} />;
}
```

**Summary:**

| | `getStaticProps` | `getServerSideProps` | `generateStaticParams` |
|---|---|---|---|
| Router | Pages Router | Pages Router | App Router |
| When runs | Build time | Per request | Build time |
| Use for | SSG/ISR | SSR | SSG in App Router |
| Equivalent App Router | `fetch` with `force-cache` | `fetch` with `no-store` | Same name, different API |

---

### Q96. How do you implement authentication in an SSR context (e.g., Next.js middleware)?

In SSR, auth must be validated **before** the page renders — ideally in middleware so protected pages never even begin rendering for unauthenticated users.

**Next.js Middleware approach:**

```ts
// middleware.ts (runs at Edge before any route)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/signup', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/login?next=${pathname}`, request.url));
  }

  try {
    // Verify JWT at the edge (no DB hit)
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch {
    // Token invalid or expired — redirect to refresh endpoint
    return NextResponse.redirect(new URL('/api/auth/refresh', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Reading session in Server Components:**

```ts
// lib/auth.ts
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function getServerSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    return payload as { userId: string; roles: string[] };
  } catch {
    return null;
  }
}
```

```tsx
// app/dashboard/page.tsx — protected Server Component
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const data = await fetchDashboardData(session.userId);
  return <Dashboard data={data} />;
}
```

**Auth in Route Handlers:**

```ts
// app/api/protected/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await fetchData(session.userId);
  return NextResponse.json(data);
}
```

**Key principle:** Defense in depth — validate in middleware (fast, edge), in server components (data-level), and in API routes (API-level). Never rely on client-side auth state for server decisions.

---

### Q97. What is ISR (Incremental Static Regeneration)? What is on-demand revalidation?

**ISR (Incremental Static Regeneration):**

ISR allows statically generated pages to be regenerated in the background on a time interval, without a full rebuild. You get the performance of SSG with reasonably fresh data.

**How it works:**
1. Page is generated at build time (or on first request for `fallback: true` paths).
2. After the `revalidate` interval, the next request triggers a background regeneration.
3. While regeneration runs, users still see the stale page.
4. Once regeneration completes, the new page is served to subsequent users.

```js
// Pages Router
export async function getStaticProps() {
  const products = await db.products.findMany();
  return {
    props: { products },
    revalidate: 300, // regenerate at most every 5 minutes
  };
}

// App Router — ISR via fetch
export default async function ProductsPage() {
  const products = await fetch('https://api.store.com/products', {
    next: { revalidate: 300 },
  }).then(r => r.json());

  return <ProductGrid products={products} />;
}
```

**On-Demand Revalidation:**

Instead of waiting for a time interval, you can trigger revalidation immediately — e.g., when a product is updated in your CMS via a webhook.

```ts
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, slug } = await request.json();

  if (type === 'product') {
    // Revalidate a specific path
    revalidatePath(`/products/${slug}`);
    // Or revalidate all pages tagged with 'products'
    revalidateTag('products');
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

```ts
// Tag your fetches
const products = await fetch('https://api.store.com/products', {
  next: {
    revalidate: 3600,
    tags: ['products'], // tag for on-demand invalidation
  },
}).then(r => r.json());
```

Your CMS sends a POST to `/api/revalidate` when content changes → the relevant cached page is instantly marked stale → next request triggers regeneration.

---

### Q98. What is the 'use client' directive and when should you avoid it?

`'use client'` is a React directive (Next.js App Router) placed at the top of a file to opt that module and all its imports into the **Client Component** boundary. Without it, every component in the App Router is a Server Component by default.

**When you NEED `'use client'`:**
- Using `useState`, `useReducer`, `useEffect`, `useRef`, `useContext`
- Attaching event handlers (`onClick`, `onChange`, etc.)
- Using browser APIs (`window`, `document`, `localStorage`, `navigator`)
- Using third-party libraries that use any of the above (charting libs, drag-and-drop, etc.)

**When to AVOID `'use client'`:**
- When a component only renders UI with no interactivity (keep it as a Server Component to reduce JS bundle)
- When a component fetches data (Server Components fetch directly, no useEffect needed)
- When a component accesses environment variables or server-only modules

**Common mistake — marking a parent `'use client'` unnecessarily:**

```jsx
// BAD — entire tree becomes client-side
'use client';
import Header from './Header'; // Now also client-side
import Footer from './Footer'; // Now also client-side
import UserAvatar from './UserAvatar'; // Needed state, but now pulls Header/Footer too

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div>
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {children}
      <Footer />
    </div>
  );
}
```

```jsx
// GOOD — extract the stateful part to a tiny client component
// app/components/MenuButton.jsx
'use client';
import { useState } from 'react';

export function MenuButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(o => !o)}>Menu</button>
      {open && <MobileMenu />}
    </>
  );
}

// app/layout.jsx — stays as Server Component
import { MenuButton } from './components/MenuButton';
import Header from './Header'; // Server Component
import Footer from './Footer'; // Server Component

export default function Layout({ children }) {
  return (
    <div>
      <Header>
        <MenuButton /> {/* Only this tiny piece is client-side */}
      </Header>
      {children}
      <Footer />
    </div>
  );
}
```

**Rule of thumb:** Push `'use client'` as far down the component tree as possible ("leaf" client components). The further up the boundary is, the larger the client JS bundle.

---

### Q99. How do you handle SEO in a React SPA vs SSR app?

**The Problem with CSR for SEO:**

A CSR React app sends near-empty HTML to the browser:

```html
<!DOCTYPE html>
<html>
  <head><title>App</title></head>
  <body><div id="root"></div></body>
</html>
```

Googlebot can render JavaScript, but: crawl budget is limited, rendering is deferred (takes seconds), and other search engines (Bing, etc.) may not execute JS at all. Social media link previews (Open Graph, Twitter Cards) definitely don't execute JS.

**SPA SEO Strategies:**

1. **Dynamic rendering / Prerendering** — detect crawlers via user-agent, serve pre-rendered HTML from a service like Prerender.io or a custom Puppeteer pipeline.
2. **React Helmet / react-helmet-async** — manage `<head>` tags dynamically.
3. **Sitemap + robots.txt** — even for SPAs, these help crawlers discover pages.

```jsx
// React Helmet in SPA
import { Helmet } from 'react-helmet-async';

function ProductPage({ product }) {
  return (
    <>
      <Helmet>
        <title>{product.name} | MyStore</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.name} />
        <meta property="og:image" content={product.imageUrl} />
        <link rel="canonical" href={`https://mystore.com/products/${product.slug}`} />
      </Helmet>
      <ProductDetail product={product} />
    </>
  );
}
```

**SSR SEO (Next.js App Router):**

Next.js has first-class SEO support via the `metadata` export:

```ts
// app/products/[slug]/page.tsx

// Static metadata
export const metadata = {
  title: 'Products | MyStore',
  description: 'Browse our catalog',
};

// Dynamic metadata — runs on server, data available immediately
export async function generateMetadata({ params }) {
  const product = await fetchProduct(params.slug);

  return {
    title: `${product.name} | MyStore`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.imageUrl, width: 1200, height: 630 }],
      url: `https://mystore.com/products/${product.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      images: [product.imageUrl],
    },
    alternates: {
      canonical: `https://mystore.com/products/${product.slug}`,
    },
  };
}
```

```ts
// app/sitemap.ts — auto-generated sitemap
export default async function sitemap() {
  const products = await fetchAllProducts();

  return [
    { url: 'https://mystore.com', lastModified: new Date() },
    ...products.map(p => ({
      url: `https://mystore.com/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    })),
  ];
}
```

**SSR advantages for SEO:**
- Full HTML with real content in first byte — no JS execution needed for crawlers.
- `generateMetadata` runs server-side with access to real data — perfect Open Graph tags for social sharing.
- Core Web Vitals (LCP, CLS, FID) are better due to reduced TTI — Google uses these as ranking signals.

---

### Q100. What are React Server Actions and how do they differ from API routes?

**Server Actions** are async functions that run on the server but can be called directly from client-side React components — without manually writing an API endpoint. They bridge the gap between client interactions and server-side data mutations.

**Declaring a Server Action:**

```ts
// app/actions/product.ts
'use server'; // marks all exports as server actions

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createProduct(formData: FormData) {
  const name = formData.get('name') as string;
  const price = parseFloat(formData.get('price') as string);

  // Direct DB access — no fetch, no API route
  const product = await db.products.create({ data: { name, price } });

  // Revalidate the page that lists products
  revalidatePath('/products');

  return { success: true, product };
}
```

**Using a Server Action in a Client Component:**

```tsx
// app/products/new/page.tsx
'use client';
import { createProduct } from '../actions/product';
import { useFormState, useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Creating...' : 'Create'}</button>;
}

export default function NewProductPage() {
  const [state, formAction] = useFormState(createProduct, { success: false });

  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="price" type="number" step="0.01" required />
      <SubmitButton />
      {state.success && <p>Product created!</p>}
    </form>
  );
}
```

**Using a Server Action with progressive enhancement (no JS fallback):**

```tsx
// Works even without JavaScript — HTML form submission
// app/products/new/page.tsx (Server Component)
import { createProduct } from '../actions/product';

export default function NewProductPage() {
  return (
    <form action={createProduct}>
      <input name="name" required />
      <input name="price" type="number" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

**Server Actions vs API Routes:**

| | Server Actions | API Routes |
|---|---|---|
| Definition | `'use server'` async function | `app/api/route.ts` with `GET`/`POST` handlers |
| Calling from client | Direct function call or `form action` | `fetch('/api/products', { method: 'POST' })` |
| Boilerplate | Minimal — no HTTP layer | More — must handle request parsing, response formatting |
| Type safety | Full end-to-end TypeScript types (same function) | Manual, or needs tRPC/Zod |
| Revalidation | Can call `revalidatePath`/`revalidateTag` | Same |
| Public API? | No — not externally callable | Yes — can be called by any client, mobile app, third party |
| Progressive enhancement | Yes — works without JS via native form | No |
| Streaming / Response | Can return values, redirect, throw | Full HTTP control (headers, status, streaming) |
| Cache control | Limited | Full — `NextResponse` with custom headers |

**When to use which:**

- **Server Actions:** Form submissions, mutations, operations only your own frontend needs. Cleaner code, better DX, type-safe.
- **API Routes:** Public APIs, webhooks (Stripe, GitHub), third-party integrations, mobile apps, operations needing custom HTTP headers or streaming responses.

**Security note:** Server Actions are POST-only by default and include a CSRF token automatically in Next.js. They are not publicly discoverable via URL (unlike API routes), but you should still validate authentication and authorization inside them:

```ts
'use server';
import { getServerSession } from '@/lib/auth';

export async function deleteProduct(id: string) {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');
  if (!session.roles.includes('admin')) throw new Error('Forbidden');

  await db.products.delete({ where: { id } });
  revalidatePath('/products');
}
```
