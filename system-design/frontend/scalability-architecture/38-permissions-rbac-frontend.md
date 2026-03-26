# 38. Handling permissions and RBAC on the frontend

## Non-negotiable

The **server must enforce** authorization. The UI only **reflects** policy for UX (hide/disable) and must tolerate stale or manipulated roles.

## Data model

- **Roles, permissions, or ABAC claims** from a trusted token or `/me` endpoint; refresh on login and role change.
- Prefer **capability checks** (`canEditInvoice`, `permissions.includes('invoice:write')`) over hardcoding role names in random components.

## UI patterns

1. **Gate components** — `<Can permission="…">` / `useCan()` hooks that read from auth context; centralize mapping from backend codes to UI.
2. **Route guards** — redirect or 403 shell when required capability missing; keep in sync with **router loaders** or layout wrappers.
3. **Progressive disclosure** — hide destructive actions; still handle **403** from API if user hits edge case.

## Pitfalls

- **Role string sprawl** across the codebase — consolidate in one module or generated types from OpenAPI.  
- **Sync issues** after admin revokes access — short TTL on permissions, refetch on focus, or real-time policy updates for sensitive apps.

## Sound bite

“**Authoritative checks on the server; client uses a single capability layer for gates and guards, and every mutation still handles 403/404 honestly.**”
