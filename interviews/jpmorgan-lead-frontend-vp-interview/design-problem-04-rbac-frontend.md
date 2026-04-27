# Design Problem 4: RBAC System — Frontend Deep Dive

**Prompt:** "Design an RBAC system for a financial portal with 100,000 users and 500 distinct permissions."

**What they test:** How you protect UI routes and components, how you read and trust JWT claims, what you do with stale permissions, and how you prevent security through obscurity.

> The golden rule: **Frontend RBAC is UX. Backend RBAC is security.** Both are required; never rely on only one.

---

## The Frontend Challenges (State These First)

1. **Trust:** JWT claims can be tampered with client-side — the backend must validate every request, always
2. **Staleness:** A trader's role is revoked mid-session — their JWT still shows old permissions for up to 15 minutes
3. **500 permissions:** Checking permissions in JSX scattered across 50 apps creates drift and inconsistency
4. **UX:** Unauthorized routes should redirect cleanly, not throw errors or show white screens
5. **Audit:** JPMC must log every access attempt — frontend actions need to emit audit events
6. **Granularity:** RBAC (role-based) plus ABAC (attribute-based) — "trader can only see their own desk's positions"

---

## Step 1: Requirements Clarification

### Functional
- Route-level protection: unauthorized routes redirect to 403 page or login
- Component-level protection: buttons, tabs, fields hidden or disabled based on permissions
- 100,000 users, 500 permissions, ~20 roles (trader, analyst, risk-officer, compliance, admin...)
- Role change takes effect within one session refresh (< 15 min JWT TTL)
- Admin UI: manage user → role assignments (separate admin portal)
- Audit trail: every access to protected resource logged

### Non-Functional
- Permission check must be synchronous in render (no async flicker)
- JWT payload size must stay small (can't embed all 500 permissions)
- On token expiry, silently refresh — don't interrupt the user mid-trade
- On role revocation, gracefully degrade — don't crash, show clear message

---

## Step 2: JWT Structure Design

### 2.1 What Goes in the Token

```json
{
  "sub": "user-uuid-123",
  "email": "jsmith@jpmorgan.com",
  "roles": ["trader", "portfolio-viewer"],
  "desk": "equities-london",
  "exp": 1714001200,
  "iat": 1713997600,
  "jti": "unique-token-id"
}
```

**Do NOT embed all 500 permissions in the JWT** — the token becomes huge (cookies have a 4KB limit; JWTs in Authorization headers have no hard limit but large tokens add latency to every request).

Instead: embed roles + a few key attributes. The frontend derives UI permissions from roles using a local permission map. The backend always re-checks from its own permission store.

### 2.2 Client-Side Role → Permission Mapping

```ts
// lib/permissions.ts
// This is a frontend-only convenience map — NOT a security boundary
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  trader: [
    'trade:execute',
    'trade:amend',
    'trade:cancel',
    'portfolio:read',
    'watchlist:write',
    'orderbook:read',
  ],
  analyst: [
    'portfolio:read',
    'reports:read',
    'reports:export',
    'watchlist:read',
  ],
  'risk-officer': [
    'portfolio:read',
    'risk:read',
    'risk:override',
    'reports:read',
    'reports:export',
    'limits:read',
    'limits:write',
  ],
  compliance: [
    'audit:read',
    'reports:read',
    'reports:export',
    'trade:read',
  ],
  admin: ['*'], // admin has all permissions — check separately
};

export function getPermissionsForRoles(roles: string[]): Set<string> {
  const perms = new Set<string>();
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role] ?? [];
    for (const p of rolePerms) perms.add(p);
  }
  return perms;
}
```

---

## Step 3: Auth Context — The Permission System

### 3.1 AuthContext

```tsx
// context/AuthContext.tsx
interface AuthContextValue {
  user: User | null;
  roles: string[];
  permissions: Set<string>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: boolean;
  signOut: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useTokenStorage(); // httpOnly cookie via API
  const decoded = useMemo(() => token ? decodeJWT(token) : null, [token]);

  const roles = decoded?.roles ?? [];
  const permissions = useMemo(() => getPermissionsForRoles(roles), [roles]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (permissions.has('*')) return true; // admin shortcut
    return permissions.has(permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((perms: string[]): boolean =>
    perms.some((p) => hasPermission(p)), [hasPermission]);

  const hasAllPermissions = useCallback((perms: string[]): boolean =>
    perms.every((p) => hasPermission(p)), [hasPermission]);

  // Silent token refresh 2 minutes before expiry
  useTokenRefresh(decoded?.exp, refresh);

  return (
    <AuthContext.Provider value={{
      user: decoded,
      roles,
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAdmin: permissions.has('*'),
      signOut,
      refreshToken: refresh,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
```

### 3.2 usePermission Hook

```ts
// hooks/usePermission.ts
export function usePermission(permission: string): boolean {
  return useAuth().hasPermission(permission);
}

export function usePermissions(permissions: string[]): Record<string, boolean> {
  const { hasPermission } = useAuth();
  return useMemo(
    () => Object.fromEntries(permissions.map((p) => [p, hasPermission(p)])),
    [permissions, hasPermission]
  );
}
```

---

## Step 4: Route-Level Protection

### 4.1 ProtectedRoute Component

```tsx
// components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  permission?: string;
  permissions?: string[];     // requires ALL
  anyPermission?: string[];   // requires ANY
  role?: string;
  fallback?: ReactNode;       // default: redirect to /403
  children: ReactNode;
}

export function ProtectedRoute({
  permission,
  permissions,
  anyPermission,
  role,
  fallback,
  children,
}: ProtectedRouteProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, roles, user } = useAuth();
  const location = useLocation();

  // Not authenticated at all
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (role && !roles.includes(role)) {
    return fallback ? <>{fallback}</> : <Navigate to="/403" replace />;
  }

  // Permission checks
  const authorized =
    (!permission || hasPermission(permission)) &&
    (!permissions || hasAllPermissions(permissions)) &&
    (!anyPermission || hasAnyPermission(anyPermission));

  if (!authorized) {
    // Log unauthorized access attempt for audit
    auditLog.record({ event: 'unauthorized_access', path: location.pathname, user: user.sub });
    return fallback ? <>{fallback}</> : <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
```

### 4.2 Route Configuration

```tsx
// routes.tsx
export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* All authenticated routes */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

        {/* Any authenticated user */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />

        {/* Traders only */}
        <Route
          path="/trading"
          element={
            <ProtectedRoute permission="trade:execute">
              <TradingDesk />
            </ProtectedRoute>
          }
        />

        {/* Risk officer or admin */}
        <Route
          path="/risk"
          element={
            <ProtectedRoute anyPermission={['risk:read', '*']}>
              <RiskDashboard />
            </ProtectedRoute>
          }
        />

        {/* Multiple permissions required */}
        <Route
          path="/limits"
          element={
            <ProtectedRoute permissions={['limits:read', 'limits:write']}>
              <LimitsManagement />
            </ProtectedRoute>
          }
        />

        {/* Compliance — separate from trading */}
        <Route
          path="/audit"
          element={
            <ProtectedRoute permission="audit:read">
              <AuditLog />
            </ProtectedRoute>
          }
        />

        {/* Admin portal */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminPortal />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
```

---

## Step 5: Component-Level Permission Checks

### 5.1 PermissionGate Component

```tsx
// components/PermissionGate.tsx
interface PermissionGateProps {
  permission: string;
  fallback?: ReactNode;   // default: null (hidden)
  disabled?: boolean;     // if true, render but disable instead of hiding
  children: ReactNode;
}

export function PermissionGate({
  permission,
  fallback = null,
  disabled = false,
  children,
}: PermissionGateProps) {
  const canAccess = usePermission(permission);

  if (!canAccess && disabled) {
    // Render children but pass disabled prop — shows button grayed out
    return (
      <div
        title="You don't have permission to perform this action"
        aria-disabled="true"
        style={{ pointerEvents: 'none', opacity: 0.4 }}
      >
        {children}
      </div>
    );
  }

  return canAccess ? <>{children}</> : <>{fallback}</>;
}
```

### 5.2 Usage in Components

```tsx
// TradingDesk.tsx
function TradingDesk() {
  return (
    <div>
      <PortfolioView /> {/* anyone with portfolio:read can see this */}

      {/* Buy/Sell buttons — only if can execute trades */}
      <PermissionGate permission="trade:execute" disabled>
        <OrderTicket />
      </PermissionGate>

      {/* Amend order — hidden entirely if no permission */}
      <PermissionGate permission="trade:amend">
        <AmendOrderButton orderId={orderId} />
      </PermissionGate>

      {/* Risk override — only risk officers */}
      <PermissionGate
        permission="risk:override"
        fallback={<p className="hint">Contact risk team to override limits</p>}
      >
        <RiskOverridePanel />
      </PermissionGate>
    </div>
  );
}
```

### 5.3 useConditionalColumns — Permission-Based Table Columns

```ts
// Certain table columns are only visible to certain roles
function usePortfolioColumns(): Column<Position>[] {
  const { hasPermission } = useAuth();

  return useMemo(
    () =>
      [
        { key: 'symbol', header: 'Symbol' },
        { key: 'quantity', header: 'Quantity' },
        { key: 'lastPrice', header: 'Price' },
        { key: 'unrealizedPnL', header: 'Unrealized P&L' },
        hasPermission('risk:read')
          ? { key: 'var', header: 'VaR', align: 'right' }
          : null,
        hasPermission('trade:execute')
          ? { key: 'actions', header: '', render: (_, row) => <TradeActions position={row} /> }
          : null,
      ].filter(Boolean) as Column<Position>[],
    [hasPermission]
  );
}
```

---

## Step 6: Token Lifecycle Management

### 6.1 Silent Refresh

```ts
// hooks/useTokenRefresh.ts
export function useTokenRefresh(expiresAt: number | undefined, onRefresh: () => Promise<void>) {
  useEffect(() => {
    if (!expiresAt) return;

    const msUntilExpiry = expiresAt * 1000 - Date.now();
    const refreshAt = msUntilExpiry - 2 * 60 * 1000; // 2 min before expiry

    if (refreshAt <= 0) {
      onRefresh(); // already expired or nearly — refresh now
      return;
    }

    const timer = setTimeout(onRefresh, refreshAt);
    return () => clearTimeout(timer);
  }, [expiresAt, onRefresh]);
}
```

### 6.2 Handling Expired Tokens Mid-Session

```ts
// lib/apiClient.ts — Axios interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true; // prevent infinite retry loop
      try {
        await refreshToken();  // attempt silent refresh
        return api(original);  // replay the original request
      } catch {
        // Refresh failed (token revoked, session expired)
        clearAuth();
        navigate('/login', { state: { reason: 'session_expired' } });
      }
    }

    if (error.response?.status === 403) {
      // Token is valid but permission was revoked since last refresh
      navigate('/403', { state: { reason: 'permission_revoked' } });
    }

    return Promise.reject(error);
  }
);
```

### 6.3 Permission Change Without Full Re-Login

When an admin changes a user's role, the user shouldn't need to log out. The next JWT refresh (every 15 min) picks up new permissions. For urgent revocations, the backend can return 403 and the frontend handles it:

```tsx
function PermissionRevocationBanner() {
  const [revoked, setRevoked] = useState(false);

  // Listen for 403 events emitted by the API interceptor
  useEffect(() => {
    const handler = () => setRevoked(true);
    eventBus.on('permission:revoked', handler);
    return () => eventBus.off('permission:revoked', handler);
  }, []);

  if (!revoked) return null;

  return (
    <Alert variant="warning" role="alert">
      Your access permissions have changed. Please refresh the page to continue.
      <Button onClick={() => window.location.reload()}>Refresh now</Button>
    </Alert>
  );
}
```

---

## Step 7: ABAC — Attribute-Based Access Control

RBAC alone isn't enough at JPMC. A London equities trader should only see London equities desk positions, not Tokyo's.

```ts
// Beyond roles — the JWT also carries attributes
// { roles: ['trader'], desk: 'equities-london', region: 'EMEA' }

interface ABACContext {
  user: { desk: string; region: string; userId: string };
  resource: { ownerId?: string; desk?: string; region?: string };
}

function canAccess(context: ABACContext, permission: string): boolean {
  const { hasPermission } = useAuth();

  // First check RBAC — if no permission at all, deny
  if (!hasPermission(permission)) return false;

  // Then check ABAC — resource-level attribute checks
  if (permission === 'portfolio:read') {
    // Trader can only read their own desk's portfolio
    return context.user.desk === context.resource.desk;
  }

  if (permission === 'trade:execute') {
    // Trader can only execute trades on their own desk
    return context.user.desk === context.resource.desk;
  }

  // risk-officer can see all desks in their region
  if (permission === 'risk:read') {
    return context.user.region === context.resource.region;
  }

  return true;
}
```

**The key point for interview:** The backend enforces ABAC on every API call. The frontend uses it for UX — don't show a "View positions" button for a desk the user can't access. But the real guard is the backend.

---

## Step 8: Admin Portal — Manage User Roles

```tsx
// AdminPortal/UserRoleManager.tsx
function UserRoleManager({ userId }: { userId: string }) {
  const { data: user } = useQuery(['user', userId], () => fetchUser(userId));
  const { data: allRoles } = useQuery(['roles'], fetchAllRoles);
  const assignRole = useMutation(({ userId, role }: any) => addRoleToUser(userId, role));
  const revokeRole = useMutation(({ userId, role }: any) => removeRoleFromUser(userId, role));

  return (
    <section aria-labelledby="roles-heading">
      <h2 id="roles-heading">Roles for {user?.name}</h2>
      <ul>
        {allRoles?.map((role) => {
          const assigned = user?.roles.includes(role.id);
          return (
            <li key={role.id}>
              <Checkbox
                checked={assigned}
                onChange={(e) => {
                  if (e.target.checked) {
                    assignRole.mutate({ userId, role: role.id });
                  } else {
                    revokeRole.mutate({ userId, role: role.id });
                  }
                }}
              >
                {role.name}
              </Checkbox>
              <p className={styles.hint}>{role.description}</p>
            </li>
          );
        })}
      </ul>
      <AuditNote>Role changes take effect within 15 minutes or on next login.</AuditNote>
    </section>
  );
}
```

---

## Step 9: Accessibility for Permission-Gated UI

When a user can't perform an action, tell them why clearly:

```tsx
// Don't just hide or silently disable — communicate the reason
function TradeButton({ orderId }: { orderId: string }) {
  const canTrade = usePermission('trade:execute');

  if (!canTrade) {
    return (
      <Tooltip content="You have read-only access. Contact your manager to request trading permissions.">
        <button
          disabled
          aria-disabled="true"
          aria-describedby={`trade-${orderId}-reason`}
        >
          Place Order
        </button>
        <span id={`trade-${orderId}-reason`} className="sr-only">
          You do not have permission to execute trades.
        </span>
      </Tooltip>
    );
  }

  return <button onClick={() => openOrderTicket(orderId)}>Place Order</button>;
}
```

**WCAG requirement:** Disabled controls must still convey their purpose and why they're disabled. `aria-describedby` + visually-hidden text achieves this for screen readers.

---

## Step 10: Security Anti-Patterns to Explicitly Avoid

```tsx
// ANTI-PATTERN 1 — Hiding routes via conditional rendering alone
// A user can still navigate directly to /admin — no route protection
function App() {
  return isAdmin ? <AdminLink /> : null; // hiding the link is NOT protection
}

// CORRECT — ProtectedRoute wraps the actual route
<Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />


// ANTI-PATTERN 2 — Storing permissions in localStorage
localStorage.setItem('permissions', JSON.stringify(permissions));
// User can edit this in DevTools and grant themselves any permission

// CORRECT — derive permissions from JWT on every render
const permissions = getPermissionsForRoles(decoded.roles);


// ANTI-PATTERN 3 — Checking roles instead of permissions (too coarse)
if (user.roles.includes('trader')) { /* show button */ }
// Bad: what if the trader role loses execute permission next sprint?

// CORRECT — check the specific permission
if (hasPermission('trade:execute')) { /* show button */ }


// ANTI-PATTERN 4 — Frontend is the only permission check
// The backend must ALWAYS validate: frontend RBAC is UX, not security
fetch('/api/execute-trade', {
  method: 'POST',
  // Backend checks: is this JWT valid? does this user have trade:execute?
  // Even if the frontend button is hidden, the endpoint must refuse unauthorized calls
});
```

---

## Step 11: Testing Strategy

```ts
// Helper — render with specific permissions
function renderWithPermissions(
  ui: ReactElement,
  permissions: string[] = [],
  roles: string[] = []
) {
  const mockAuth: AuthContextValue = {
    user: { sub: 'test-user', email: 'test@jpmc.com' },
    roles,
    permissions: new Set(permissions),
    hasPermission: (p) => permissions.includes(p) || permissions.includes('*'),
    hasAnyPermission: (ps) => ps.some((p) => permissions.includes(p)),
    hasAllPermissions: (ps) => ps.every((p) => permissions.includes(p)),
    isAdmin: permissions.includes('*'),
    signOut: jest.fn(),
    refreshToken: jest.fn(),
  };
  return render(
    <AuthContext.Provider value={mockAuth}>{ui}</AuthContext.Provider>
  );
}

// Route guard test
test('redirects to /403 when user lacks permission', () => {
  renderWithPermissions(
    <MemoryRouter initialEntries={['/trading']}>
      <AppRoutes />
    </MemoryRouter>,
    ['portfolio:read'] // no trade:execute
  );
  expect(screen.getByText(/forbidden/i)).toBeInTheDocument();
});

// Component gate test
test('hides order button without trade:execute permission', () => {
  renderWithPermissions(<TradingDesk />, ['portfolio:read']);
  expect(screen.queryByRole('button', { name: /place order/i })).not.toBeInTheDocument();
});

test('shows order button with trade:execute permission', () => {
  renderWithPermissions(<TradingDesk />, ['portfolio:read', 'trade:execute']);
  expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
});

// Token refresh test
test('silently refreshes token 2 minutes before expiry', async () => {
  const expiry = Math.floor(Date.now() / 1000) + 3 * 60; // expires in 3 min
  jest.useFakeTimers();
  renderWithPermissions(<App />, ['portfolio:read']);

  // Advance to 2 min before expiry (1 min from now)
  jest.advanceTimersByTime(60_000);
  expect(mockRefreshToken).toHaveBeenCalledTimes(1);
});
```

---

## Key Interview Answers

**"What's the difference between frontend RBAC and backend RBAC?"**
Frontend RBAC is pure UX — it hides buttons and redirects routes to give users a clear, clean interface. It's not security. Backend RBAC is security — the API validates the JWT and checks permissions on every single request. If someone bypasses the frontend (curl, DevTools), the backend must still refuse unauthorized operations.

**"What if a user's role is revoked mid-session?"**
The JWT still shows old roles until it expires (15 min TTL). When the backend sees the stale JWT and returns 403, the Axios interceptor catches it, shows a "your permissions changed, please refresh" banner, and navigates to /403 if the user tries to continue. The short JWT TTL (15 min) is the primary defense — stale permissions auto-expire.

**"Why not store permissions in localStorage?"**
Users can edit localStorage in DevTools — they could grant themselves any permission. JWT claims are cryptographically signed — they can't be forged without the private key. Store the JWT in an httpOnly cookie (inaccessible to JS) and derive permissions from it on each render.

**"How do you handle 500 permissions without bloating the JWT?"**
Embed roles in the JWT (5-10 roles max). Map roles → permissions on the client using a static lookup table. The backend has the authoritative permission store — it checks permissions directly. The frontend's role→permission map is a convenience for rendering, not a security boundary.

**"What if 50 teams define their own permission checks inconsistently?"**
All permission checks go through one `usePermission` hook and one `PermissionGate` component from the design system. Teams don't write `if (roles.includes('trader'))` — they use `usePermission('trade:execute')`. This centralizes the logic so a permission rename is a one-line change in the permission map, not a find-replace across 50 codebases.
