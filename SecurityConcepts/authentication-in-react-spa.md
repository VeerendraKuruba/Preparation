# Authentication in React SPA — Interview Reference

## Table of Contents
1. [Core Concepts](#1-core-concepts)
2. [Token Types](#2-token-types)
3. [Token Storage Options](#3-token-storage-options)
4. [Authentication Flows](#4-authentication-flows)
5. [Implementation — Auth Context](#5-implementation--auth-context)
6. [Axios Interceptors](#6-axios-interceptors)
7. [Protected Routes](#7-protected-routes)
8. [Silent Refresh on Page Reload](#8-silent-refresh-on-page-reload)
9. [Role-Based Access Control (RBAC)](#9-role-based-access-control-rbac)
10. [OAuth2 / OIDC / Social Login](#10-oauth2--oidc--social-login)
11. [Session vs Token Auth](#11-session-vs-token-auth)
12. [Security Best Practices](#12-security-best-practices)
13. [Common Interview Questions](#13-common-interview-questions)
14. [Third-Party Libraries](#14-third-party-libraries)

---

## 1. Core Concepts

Authentication = **Who are you?** (identity)
Authorization = **What can you do?** (permissions)

In a React SPA:
- The browser (client) handles UI state (is user logged in?)
- The server is the source of truth — validates every request
- Never trust the client alone for access decisions

---

## 2. Token Types

### Access Token
- Short-lived (5–15 minutes)
- Sent with every API request in `Authorization: Bearer <token>` header
- Contains user identity + claims (roles, email, etc.)
- Stored in **memory** (JS variable) — safest option

### Refresh Token
- Long-lived (7–30 days)
- Used only to get a new access token
- Stored in **HttpOnly cookie** — not accessible to JS
- Must be rotated (single-use) and revokable server-side

### ID Token (OIDC only)
- JWT containing user profile info (name, email, picture)
- Not used to call APIs — only to display user info in the UI

---

## 3. Token Storage Options

| Storage | XSS Attack | CSRF Attack | Survives Refresh | Notes |
|---------|-----------|-------------|-----------------|-------|
| `localStorage` | Vulnerable | Safe | Yes | Avoid for tokens |
| `sessionStorage` | Vulnerable | Safe | No | Avoid for tokens |
| JS Memory (useRef/variable) | Safe | Safe | No | Best for access token |
| HttpOnly Cookie | Safe | Vulnerable | Yes | Best for refresh token; add CSRF protection |
| Non-HttpOnly Cookie | Vulnerable | Vulnerable | Yes | Worst option |

**XSS (Cross-Site Scripting):** Attacker injects JS into your page → reads localStorage → steals token.
**CSRF (Cross-Site Request Forgery):** Attacker tricks browser into making request using your cookie.

**Solution:** Access token in memory + Refresh token in HttpOnly cookie with `SameSite=Strict`.

---

## 4. Authentication Flows

### 4.1 Standard JWT Flow
```
1. User submits login form
2. POST /auth/login { email, password }
3. Server validates credentials
4. Server returns { accessToken } + sets HttpOnly cookie (refreshToken)
5. Client stores accessToken in memory
6. Every API call: Authorization: Bearer <accessToken>
7. On 401: POST /auth/refresh (cookie sent automatically)
8. Server validates refresh token, returns new accessToken (rotates refresh token)
9. Repeat from step 5
```

### 4.2 OAuth2 Authorization Code + PKCE Flow (recommended for SPAs)
```
1. User clicks "Login with Google"
2. Client generates code_verifier (random string) + code_challenge (SHA256 hash)
3. Redirect to: https://accounts.google.com/o/oauth2/auth
        ?client_id=xxx
        &redirect_uri=https://yourapp.com/callback
        &response_type=code
        &code_challenge=xxx
        &code_challenge_method=S256
4. User authenticates with Google
5. Google redirects back: https://yourapp.com/callback?code=AUTH_CODE
6. Client POSTs: { code, code_verifier } to token endpoint
7. Server exchanges for tokens (no client_secret needed — PKCE replaces it)
8. Tokens returned → store same as JWT flow
```

**Why PKCE?** SPAs can't keep secrets (no server). PKCE proves the entity that got the code is the same one that started the flow.

### 4.3 Implicit Flow (deprecated — do not use)
- Access token returned directly in URL fragment
- Vulnerable to token leakage in browser history/referrer headers

---

## 5. Implementation — Auth Context

```jsx
// contexts/AuthContext.jsx
import { createContext, useContext, useState, useRef, useEffect } from 'react';
import api from '../api/axiosInstance';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking session
  const accessTokenRef = useRef(null);

  // On app load: attempt silent refresh using HttpOnly cookie
  useEffect(() => {
    (async () => {
      try {
        const { accessToken, user } = await api.post('/auth/refresh');
        accessTokenRef.current = accessToken;
        setUser(user);
      } catch {
        // No valid session — user must log in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    accessTokenRef.current = data.accessToken;
    setUser(data.user);
  };

  const logout = async () => {
    await api.post('/auth/logout'); // server clears HttpOnly cookie
    accessTokenRef.current = null;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, accessTokenRef }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

---

## 6. Axios Interceptors

```js
// api/axiosInstance.js
import axios from 'axios';

let accessTokenRef = { current: null };

// Called from AuthProvider to share the ref
export function setTokenRef(ref) {
  accessTokenRef = ref;
}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // sends HttpOnly cookies cross-origin
});

// REQUEST: Attach access token to every request
api.interceptors.request.use((config) => {
  const token = accessTokenRef.current;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE: Handle 401 → try token refresh
let isRefreshing = false;
let failedQueue = []; // queue requests that failed during refresh

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh'); // uses HttpOnly cookie
        accessTokenRef.current = data.accessToken;
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed → force logout
        accessTokenRef.current = null;
        window.location.href = '/login';
        return Promise.reject(refreshError);
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

## 7. Protected Routes

### Basic Protection
```jsx
// components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>; // wait for silent refresh

  if (!user) {
    // Save attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
```

### Role-Based Route Protection
```jsx
function RoleRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles.includes(requiredRole)) return <Navigate to="/unauthorized" replace />;

  return children;
}
```

### App Router Setup
```jsx
// App.jsx
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />

        <Route path="/admin" element={
          <RoleRoute requiredRole="admin"><AdminPanel /></RoleRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}
```

### Redirect After Login
```jsx
// LoginPage.jsx
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
    const destination = location.state?.from?.pathname || '/dashboard';
    navigate(destination, { replace: true });
  };
}
```

---

## 8. Silent Refresh on Page Reload

Problem: Access token lives in memory → lost on refresh.

Solutions:

### Option A: Refresh on mount (already shown in AuthProvider)
- App shows loading state briefly on every page load
- Cleanest approach

### Option B: Silent iframe (legacy, not recommended for modern apps)
- Load a hidden iframe pointing to `/silent-refresh`
- Iframe exchanges cookie for new token, posts message to parent
- Complex and has SameSite cookie issues

### Option C: Service Worker
- Intercepts all fetch requests
- Handles token storage + refresh in service worker scope
- More secure (even memory is isolated from page JS)
- Complex to implement

---

## 9. Role-Based Access Control (RBAC)

### Custom Hook
```jsx
// hooks/usePermission.js
export function usePermission(requiredRole) {
  const { user } = useAuth();
  return user?.roles?.includes(requiredRole) ?? false;
}

export function useAnyPermission(roles) {
  const { user } = useAuth();
  return roles.some((role) => user?.roles?.includes(role)) ?? false;
}
```

### Component-Level Guard
```jsx
function PermissionGate({ role, fallback = null, children }) {
  const hasPermission = usePermission(role);
  return hasPermission ? children : fallback;
}

// Usage
<PermissionGate role="editor" fallback={<ReadOnlyView />}>
  <EditForm />
</PermissionGate>
```

### Decode JWT Claims Client-Side (for UI only — never for security)
```js
function parseJWT(token) {
  const base64 = token.split('.')[1];
  return JSON.parse(atob(base64));
}

// { sub: "user123", roles: ["admin"], exp: 1234567890 }
const claims = parseJWT(accessToken);
```

> Important: JWT parsing on client is only for **displaying** info (e.g. user name, role). The server must validate the token on every request — never rely on client-side JWT parsing for access decisions.

---

## 10. OAuth2 / OIDC / Social Login

### Flow Summary
```
Your App → Redirect to Provider (Google/GitHub/Auth0)
            ↓
         User logs in at provider
            ↓
         Provider redirects back with ?code=AUTH_CODE
            ↓
Your App → Exchange code + code_verifier for tokens
            ↓
         Store tokens same as standard JWT flow
```

### Key Terms
| Term | Meaning |
|------|---------|
| **Client ID** | Public identifier of your app |
| **Client Secret** | Only for server-side apps (never in SPA) |
| **Scope** | Permissions requested: `openid profile email` |
| **State** | Random value to prevent CSRF on redirect |
| **Nonce** | Prevents ID token replay attacks |
| **PKCE** | Code challenge/verifier — replaces client secret for SPAs |
| **Well-known endpoint** | `/.well-known/openid-configuration` — discovery doc |

### Using Auth0 React SDK
```jsx
// index.jsx
import { Auth0Provider } from '@auth0/auth0-react';

<Auth0Provider
  domain="your-domain.auth0.com"
  clientId="your-client-id"
  authorizationParams={{ redirect_uri: window.location.origin }}
>
  <App />
</Auth0Provider>

// Usage in component
const { loginWithRedirect, logout, user, isAuthenticated, getAccessTokenSilently } = useAuth0();

const callApi = async () => {
  const token = await getAccessTokenSilently(); // handles refresh automatically
  const response = await fetch('/api/data', {
    headers: { Authorization: `Bearer ${token}` }
  });
};
```

---

## 11. Session vs Token Auth

| | Session-Based | Token-Based (JWT) |
|--|--------------|------------------|
| **State** | Server stores session in DB/Redis | Stateless — server only validates signature |
| **Scalability** | Needs sticky sessions or shared store | Easily scales horizontally |
| **Revocation** | Instant (delete session) | Hard — must wait for expiry or use a denylist |
| **Storage** | SessionID in cookie | Token in memory/cookie |
| **Mobile** | Awkward | Natural |
| **Best for** | Traditional web apps | SPAs, microservices, APIs |

**Hybrid approach (recommended):** JWT access tokens (stateless, short-lived) + refresh token stored in DB (can be revoked instantly).

---

## 12. Security Best Practices

### Token Security
- Access tokens: short TTL (5–15 min)
- Refresh tokens: rotate on every use (single-use)
- Refresh tokens: maintain a server-side denylist for logout/revocation
- Never put sensitive data in JWT payload (it's base64, not encrypted)
- Use `alg: RS256` (asymmetric) not `HS256` (symmetric shared secret) in production

### Cookie Security
```
Set-Cookie: refreshToken=xxx;
  HttpOnly;          // Not accessible via JS
  Secure;            // HTTPS only
  SameSite=Strict;   // No cross-site requests (or Lax for OAuth redirects)
  Path=/auth;        // Only sent to /auth/* endpoints
  Max-Age=604800     // 7 days
```

### CSRF Protection
- `SameSite=Strict` cookies largely prevent CSRF
- If you need cross-origin: use CSRF tokens (Double Submit Cookie pattern)
- Never use `SameSite=None` without `Secure`

### General
- Always validate tokens server-side — never trust client-side checks
- Use HTTPS everywhere
- Implement rate limiting on login/refresh endpoints
- Log failed auth attempts; alert on brute force
- Never log access tokens or passwords
- Re-authenticate before sensitive actions (payment, password change)
- Implement logout everywhere: clear memory + invalidate server-side

---

## 13. Common Interview Questions

**Q: Why not store JWT in localStorage?**
> localStorage is accessible to any JS on the page. An XSS attack can steal the token and impersonate the user from another machine. HttpOnly cookies are not readable by JS, so XSS cannot exfiltrate them.

**Q: If HttpOnly cookies have CSRF risk, why use them?**
> CSRF is mitigated by `SameSite=Strict` cookie attribute and CSRF tokens. XSS is harder to fully prevent — it's a bigger attack surface. So HttpOnly + SameSite gives the best defense-in-depth.

**Q: How do you handle token expiry on page refresh?**
> Store the refresh token in an HttpOnly cookie. On app load, silently call `/auth/refresh` — the browser sends the cookie automatically. If it succeeds, store the new access token in memory. If it fails, redirect to login.

**Q: How do you handle multiple simultaneous 401 errors?**
> Use a request queue. Set a `isRefreshing` flag. Queue subsequent failed requests while refreshing. When refresh completes, replay all queued requests with the new token. (Shown in Axios interceptor above.)

**Q: What is PKCE and why is it needed for SPAs?**
> PKCE (Proof Key for Code Exchange) solves the problem that SPAs can't store a client secret (it would be visible in source). Instead, the client generates a random `code_verifier`, hashes it to `code_challenge`, and sends the challenge with the auth request. When exchanging the code for tokens, it sends the original `code_verifier` — proving it's the same client that started the flow.

**Q: How do you implement logout properly?**
> (1) Clear access token from memory. (2) Call server `/auth/logout` which clears the HttpOnly cookie and invalidates the refresh token in the database. (3) Redirect to login. Without the server-side step, the refresh token remains valid and an attacker could still get new access tokens.

**Q: What is token rotation?**
> Each time a refresh token is used, the server invalidates the old one and issues a new one. If an attacker steals a refresh token and uses it, the legitimate user's next request will fail (their token was already used), alerting the system to a potential compromise. The server can then invalidate the entire token family.

**Q: How do you handle authentication in a micro-frontend architecture?**
> Share a single AuthProvider at the shell level. Pass the `getAccessToken` function down to micro-frontends (or via a shared module). Each MFE uses it to get the current token — they never store tokens themselves.

**Q: Difference between `authentication` and `authorization`?**
> Authentication = proving who you are (login). Authorization = what you're allowed to do (access control). AuthN happens first; AuthZ uses the result. In JWT terms: authentication issues the token, authorization reads its claims on each request.

**Q: What is the difference between `access_token` and `id_token` in OIDC?**
> `access_token` is an opaque or JWT credential used to call APIs — the resource server validates it. `id_token` is always a JWT, issued by the identity provider, meant only for the client to learn about the authenticated user (name, email, etc.). Never send `id_token` to your API as credentials.

---

## 14. Third-Party Libraries

| Library | Use Case | Notes |
|---------|----------|-------|
| **Auth0 React SDK** | Full managed auth (OAuth, OIDC, MFA) | Best for production apps |
| **Clerk** | Drop-in auth UI + session management | Very fast to implement |
| **NextAuth.js / Auth.js** | Next.js / server-side rendering | Handles sessions natively |
| **Keycloak JS** | Self-hosted identity provider | Enterprise/on-prem use |
| **oidc-client-ts** | Low-level OIDC in SPAs | When you need full control |
| **React Query** | Pairs with auth for token-aware caching | Not auth-specific but common |

---

## Quick Reference: Architecture Decision

```
Simple app, own backend?
  → JWT in memory + Refresh token in HttpOnly cookie

Need social login / SSO?
  → OAuth2 PKCE flow (use Auth0/Clerk for speed)

Enterprise / self-hosted?
  → Keycloak or OIDC with oidc-client-ts

Next.js?
  → Auth.js (NextAuth)

Need instant token revocation?
  → Add refresh token denylist in Redis
```
