# Authentication & Authorization — Client-Side Perspective

## Q1. How do you handle authentication in a React SPA?

**Answer:**
In a React SPA, authentication typically involves:

1. **Token-based auth (JWT):** After login, the server issues a JWT. The client stores it (memory or httpOnly cookie) and attaches it to every API request via `Authorization: Bearer <token>`.
2. **Auth Context / Provider:** Wrap the app in an `AuthContext` to expose `user`, `login()`, `logout()` globally.
3. **Protected Routes:** Implement a `PrivateRoute` component that checks auth state and redirects to `/login` if unauthenticated.
4. **Token refresh:** Use interceptors (axios/fetch wrapper) to silently refresh access tokens using a refresh token before they expire.

```tsx
// AuthContext.tsx
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    // Store token in memory or set httpOnly cookie via server
  };

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// PrivateRoute.tsx
function PrivateRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}
```

**Key insight:** Never store JWTs in `localStorage` if XSS is a concern. Prefer `httpOnly` cookies managed by the server, or in-memory storage that clears on refresh.

---

## Q2. What is the difference between Authentication and Authorization?

**Answer:**
- **Authentication (AuthN):** Verifying *who* you are — "Are you who you claim to be?" (login, tokens, SSO)
- **Authorization (AuthZ):** Determining *what* you can do — "Do you have permission to access this resource?" (roles, permissions, RBAC)

**Client-side flow:**
1. User logs in → receives token (AuthN)
2. Token contains claims/roles (e.g., `role: "admin"`)
3. UI conditionally renders components/routes based on role (AuthZ)

```tsx
// Role-based conditional rendering
function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <UserDashboard />
      {user?.role === 'admin' && <AdminPanel />}
    </div>
  );
}
```

**Important:** Client-side authorization is only UX — always enforce on the server. Never rely solely on hiding UI elements for security.

---

## Q3. What are common authentication flows — OAuth2, OIDC, SSO?

**Answer:**

| Flow | Use Case |
|------|----------|
| **OAuth 2.0** | Delegated authorization (grant third-party access) |
| **OIDC (OpenID Connect)** | Identity layer on top of OAuth2, gives you user profile |
| **PKCE Flow** | Secure OAuth2 for SPAs (replaces implicit flow) |
| **SSO (SAML/OIDC)** | Enterprise single sign-on across multiple apps |

**PKCE Flow for SPAs (best practice):**
1. Generate `code_verifier` (random string) + `code_challenge` (SHA-256 hash)
2. Redirect user to auth server with `code_challenge`
3. Auth server returns `authorization_code`
4. Exchange code + `code_verifier` for tokens
5. No client secret needed — safe for public clients (browsers)

**DocuSign context:** DocuSign uses OAuth 2.0 with PKCE for their integrations. Understanding this is directly relevant.

---

## Q4. How do you implement Role-Based Access Control (RBAC) in React?

**Answer:**

```tsx
// permissions.ts
type Role = 'admin' | 'editor' | 'viewer';
type Permission = 'create' | 'read' | 'update' | 'delete';

const rolePermissions: Record<Role, Permission[]> = {
  admin:  ['create', 'read', 'update', 'delete'],
  editor: ['create', 'read', 'update'],
  viewer: ['read'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

// usePermission hook
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return hasPermission(user?.role as Role, permission);
}

// Usage
function DocumentActions({ docId }: { docId: string }) {
  const canDelete = usePermission('delete');
  return (
    <div>
      <button>View</button>
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

---

## Q5. How do you handle token expiry and silent refresh?

**Answer:**

```tsx
// api.ts — axios interceptor for silent refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests during refresh
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { accessToken } = await authService.refreshToken();
        refreshSubscribers.forEach((cb) => cb(accessToken));
        refreshSubscribers = [];
        return axiosInstance(originalRequest);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

**Key points:**
- Queue concurrent requests during refresh (don't fire multiple refresh calls)
- On refresh failure, clear auth state and redirect to login
- Access tokens: short-lived (15 min); Refresh tokens: long-lived (7 days), stored in httpOnly cookie

---

## Q6. What security threats should you protect against in client-side auth?

**Answer:**

| Threat | Mitigation |
|--------|-----------|
| **XSS** | Sanitize inputs, use httpOnly cookies for tokens, CSP headers |
| **CSRF** | SameSite cookie attribute, CSRF tokens, check Origin header |
| **Token theft** | Short expiry, httpOnly cookies, secure flag |
| **Clickjacking** | `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'` |
| **Open redirect** | Validate redirect URLs against allowlist after login |

**CSP example:**
```html
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; object-src 'none'
```
