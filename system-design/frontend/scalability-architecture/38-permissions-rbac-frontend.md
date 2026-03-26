# 38. Permissions and RBAC on the Frontend

## The Non-Negotiable Principle

**The server enforces authorization. The UI reflects it.**

Client-side permission checks are purely UX — they hide or disable elements to give users a better experience. A determined user can always open DevTools and modify the DOM or make API calls directly. Security must live on the server. If the server doesn't check, the frontend check means nothing.

This means two things in practice:
1. Every API endpoint checks the caller's permissions independently of what the UI shows
2. The frontend handles 403 responses gracefully even when the UI "should have" hidden the action

---

## Permission Model

Design permissions as **capability strings** rather than role names. Role names leak business logic into components; capability strings stay stable.

```
Role → Permissions[]

"viewer"     → ["invoice:read", "report:read"]
"editor"     → ["invoice:read", "invoice:write", "invoice:delete"]
"admin"      → ["invoice:read", "invoice:write", "invoice:delete",
                 "user:read", "user:write", "user:admin",
                 "billing:read", "billing:write"]
"super_admin" → ["*"]  // or explicit full list
```

**Why capability strings beat role checks in components:**

```typescript
// BAD: role-based check in a component — now "editor" and "manager" both need this?
// You must update every component that has this check.
if (user.role === 'admin') { ... }

// GOOD: capability check — backend controls which roles get which permissions
if (permissions.includes('invoice:write')) { ... }
// When "manager" role gets invoice:write, nothing in the UI changes.
```

---

## Bootstrap: Loading Permissions at App Start

On login, call `/me` and store the result. This is the single source of truth for the session.

```typescript
// api/authApi.ts
interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    orgId: string;
  };
  permissions: string[];    // ["invoice:read", "invoice:write", ...]
  roles: string[];          // for display only, not for checks
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch('/api/me', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load session');
  return res.json();
}
```

```typescript
// providers/AuthProvider.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { fetchMe } from '../api/authApi';

interface AuthContextValue {
  user: User | null;
  permissions: string[];
  isLoading: boolean;
  refresh: () => Promise<void>;   // call after org switch or role change
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  const load = async () => {
    try {
      const data = await fetchMe();
      setUser(data.user);
      setPermissions(data.permissions);
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AuthContext.Provider value={{ user, permissions, isLoading, refresh: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## usePermission Hook

The single place where permission checks live. All components call this — never check `permissions.includes(...)` inline.

```typescript
// hooks/usePermission.ts
import { useAuth } from '../providers/AuthProvider';

export function usePermission(permission: string): boolean {
  const { permissions } = useAuth();

  // Super admin shortcut
  if (permissions.includes('*')) return true;

  return permissions.includes(permission);
}

// Multi-permission variant
export function usePermissions(required: string[], mode: 'all' | 'any' = 'all'): boolean {
  const { permissions } = useAuth();
  if (permissions.includes('*')) return true;

  return mode === 'all'
    ? required.every(p => permissions.includes(p))
    : required.some(p => permissions.includes(p));
}

// Usage
function DeleteButton({ invoiceId }: { invoiceId: string }) {
  const canDelete = usePermission('invoice:delete');
  if (!canDelete) return null;
  return <button onClick={() => deleteInvoice(invoiceId)}>Delete</button>;
}
```

---

## PermissionGuard Component: Hide vs Disable

The decision between **hiding** and **disabling** is a UX question:

- **Hide**: the feature doesn't exist for this role at all. Showing it would be confusing.
- **Disable with tooltip**: the user has context that this action exists, but they currently lack access. Common in trial/upgrade flows.

```typescript
// components/PermissionGuard.tsx
interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  // 'hide'    → render nothing (default — clean, no confusion)
  // 'disable' → render children wrapped in disabled state + tooltip
  fallback?: 'hide' | 'disable' | React.ReactNode;
  disabledTooltip?: string;
}

export function PermissionGuard({
  permission,
  children,
  fallback = 'hide',
  disabledTooltip = "You don't have permission to perform this action.",
}: PermissionGuardProps) {
  const canAccess = usePermission(permission);

  if (canAccess) return <>{children}</>;

  if (fallback === 'hide') return null;

  if (fallback === 'disable') {
    return (
      <Tooltip content={disabledTooltip}>
        {/* Wrap with span so tooltip works on disabled button */}
        <span style={{ cursor: 'not-allowed', display: 'inline-block' }}>
          <span style={{ pointerEvents: 'none', opacity: 0.5 }}>
            {children}
          </span>
        </span>
      </Tooltip>
    );
  }

  // Custom fallback (e.g., upgrade prompt)
  return <>{fallback}</>;
}

// Usage examples
function InvoiceActions({ invoice }: { invoice: Invoice }) {
  return (
    <div>
      {/* Hide edit entirely for viewers */}
      <PermissionGuard permission="invoice:write">
        <EditButton invoice={invoice} />
      </PermissionGuard>

      {/* Show delete as disabled for editors who lack delete, with tooltip */}
      <PermissionGuard
        permission="invoice:delete"
        fallback="disable"
        disabledTooltip="Contact an admin to delete invoices."
      >
        <DeleteButton invoiceId={invoice.id} />
      </PermissionGuard>

      {/* Show upgrade prompt for paid feature */}
      <PermissionGuard
        permission="invoice:export"
        fallback={<UpgradeBadge feature="CSV Export" />}
      >
        <ExportButton invoiceId={invoice.id} />
      </PermissionGuard>
    </div>
  );
}
```

---

## Route Guard

Protect entire routes so users can't navigate to pages they lack access to, even via direct URL entry.

```typescript
// components/RouteGuard.tsx
import { Navigate, useLocation } from 'react-router-dom';

interface RouteGuardProps {
  permission: string;
  children: React.ReactNode;
  redirectTo?: string;
}

export function RouteGuard({
  permission,
  children,
  redirectTo = '/403',
}: RouteGuardProps) {
  const canAccess  = usePermission(permission);
  const { isLoading } = useAuth();
  const location   = useLocation();

  // Don't redirect before permissions have loaded
  if (isLoading) return <PageSkeleton />;

  if (!canAccess) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// app/router.tsx
{
  path: 'admin/users',
  element: (
    <RouteGuard permission="user:admin">
      <UsersAdminPage />
    </RouteGuard>
  ),
},
{
  path: 'billing',
  element: (
    <RouteGuard permission="billing:read" redirectTo="/upgrade">
      <BillingPage />
    </RouteGuard>
  ),
},
```

---

## Handling 403 on API Calls

Even when the UI hides an action, a 403 can still occur (permissions changed server-side after load). Handle it explicitly.

```typescript
// api/apiClient.ts
import { useAuthStore } from '../stores/authStore';

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...options });

  if (res.status === 403) {
    // Permissions may have changed since bootstrap — re-fetch /me
    // This updates the UI to reflect the current server state
    await useAuthStore.getState().refresh();

    throw new PermissionError('You no longer have permission for this action.');
  }

  if (res.status === 401) {
    // Session expired — redirect to login
    window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
    throw new AuthError('Session expired.');
  }

  if (!res.ok) {
    throw new ApiError(res.status, await res.json());
  }

  return res.json();
}
```

In the component, handle the mutation error:

```typescript
function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const { mutate, isError, error } = useDeleteInvoice();
  const notify = useNotifications();

  const handleDelete = () => {
    mutate(invoiceId, {
      onError: (err) => {
        if (err instanceof PermissionError) {
          notify.error('Your permissions have changed. Please refresh the page.');
        } else {
          notify.error('Failed to delete invoice. Please try again.');
        }
      },
    });
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

---

## Multi-Tenant: Org Switch Invalidates Permission Cache

In multi-tenant apps, a user switching organizations must get a fresh permission set. Stale permissions from org A must not bleed into org B.

```typescript
// hooks/useOrgSwitch.ts
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../providers/AuthProvider';

export function useOrgSwitch() {
  const queryClient = useQueryClient();
  const { refresh }  = useAuth();

  const switchOrg = async (orgId: string) => {
    // 1. Tell the server to switch the session's active org
    await fetch('/api/switch-org', {
      method: 'POST',
      body: JSON.stringify({ orgId }),
    });

    // 2. Invalidate ALL cached data — it belongs to the old org
    queryClient.clear();

    // 3. Re-bootstrap auth — new org = new permissions
    await refresh();

    // 4. Navigate to org home
    window.location.href = '/dashboard';
  };

  return { switchOrg };
}
```

---

## What NOT to Do

**1. Don't use permissions for feature flags** — they're different concerns. Feature flags control rollout; permissions control authorization. Mix them and you create confusion about why a user can't see something.

```typescript
// BAD: using permissions as feature flags
if (permissions.includes('new-dashboard-beta')) { ... }

// GOOD: use a proper feature flag system (LaunchDarkly, Flagsmith, etc.)
if (flags['new-dashboard-beta']) { ... }
```

**2. Don't hide sensitive data only on the client**

```typescript
// BAD: fetch all invoice data including restricted fields, hide in UI
const data = useQuery({ queryKey: ['invoice', id], queryFn: fetchFullInvoice });
// Then conditionally render: {canViewCost && <span>{data.cost}</span>}
// The cost is in the network response — any user can see it in DevTools.

// GOOD: the API returns only the fields the user is allowed to see.
// The UI renders whatever it receives.
```

**3. Don't scatter role string literals across components**

```typescript
// BAD: role strings hardcoded everywhere
if (user.role === 'admin' || user.role === 'super_admin') { ... }

// GOOD: central permission definition
// All role-to-permission mapping lives on the server or in a single constants file.
// Components check capabilities, not role names.
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Browser                           │
│                                                     │
│   App Start → GET /me → { user, permissions[] }    │
│                  ↓                                  │
│            AuthContext                              │
│          (permissions[])                            │
│                  ↓                                  │
│   ┌──────────────────────────────────────────┐      │
│   │         usePermission(perm)              │      │
│   │    checks permissions[] in context       │      │
│   └──────────────────────────────────────────┘      │
│          ↓                  ↓                       │
│   RouteGuard           PermissionGuard              │
│   (redirect /403)      (hide or disable)            │
│                                                     │
│   API call → 403 → re-fetch /me → update context   │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│              Server (source of truth)               │
│   Every endpoint checks permissions independently.  │
│   /me returns fresh permissions on every call.      │
└─────────────────────────────────────────────────────┘
```

---

## Summary Sound Bite

"The server always enforces — frontend permission checks are purely UX. We bootstrap permissions from `/me` into auth context on app load. A single `usePermission` hook and `PermissionGuard` component are the only places that check capabilities, so role changes on the backend require zero frontend changes. Route guards redirect to `/403` before rendering, and API 403 responses trigger a permission refresh so the UI self-corrects without a page reload. In multi-tenant apps, org switches clear all caches and re-bootstrap. Never use permissions as feature flags — they're separate concerns."
