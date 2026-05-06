# Principal Engineer Q&A — the app

Deep-dive questions and answers grounded in this codebase. The questions are
the kind a Principal Engineer interview, design review, or onboarding deep-dive
would ask: focused on **why**, **tradeoffs**, **failure modes**, and **what
would you change**, not on rote facts.

Each answer cites real files so claims are verifiable.

---

## Section A — Architecture & Boundaries

### Q1. Is this a true micro-frontend, or just a multi-bundle React app? What's the real boundary?

It's a true micro-frontend, but at the **widget granularity**, not the app
granularity.

The boundary is enforced by three things:

1. **Manifest-driven mounting.** Each widget has a
   [widget.yaml](../../multi-entity-ui/src/js/widgets/multi-entity-allocation/widget.yaml) with a
   globally unique `id`, a semver `version`, and a `dependencies.widgets` list.
   The host shell — not webpack — decides what to load.

2. **Runtime contract via `BaseWidget`.** Every widget extends
   `host-shell-core/widgets/BaseWidget` and gets a `sandbox` prop. The host can
   mount/unmount/replace any widget without touching the others.

3. **Cross-widget loading is asynchronous and ID-based.** See
   [src/js/components/multi-entity-dashboard/index.tsx:738](../../multi-entity-ui/src/js/components/multi-entity-dashboard/index.tsx#L738):
   `sandbox.widgets.getWidget(widgetId)` returns a Promise. Two widgets cannot
   `import` each other directly — they must go through the host.

**What gives away that it's "real" MFE:** the widgets in `dependencies.widgets`
are from *other plugins* (`<vendor-feedback-plugin>/feedback@1.0.0`,
`<vendor-help-system>/pap-widget@1.0.0`). They're versioned, they ship
independently, and they're loaded at runtime.

**Where the boundary leaks:** inside `src/js`, every widget can `import` shared
code (`src/js/services/*`, `src/js/utils/*`). So it's *runtime-isolated* (each
widget mounts independently and has its own state) but *build-time-coupled*
(shared modules are bundled together). That's a deliberate cost/complexity
tradeoff — see Q3.

---

### Q2. What's the cost model of this MFE design? Where does it pay off, where does it hurt?

**Pays off when:**
- Multiple teams own multiple plugins. Versioned widget IDs mean the
  Allocation team can ship without coordinating with the Hub team.
- The host (the host SaaS application) needs to compose third-party widgets it doesn't own
  (`uservoice`, `help-system`).
- You want to A/B test by routing to different widget versions without a full
  shell deploy.

**Hurts:**
- **Bundle duplication.** Each plugin ships its own React (this repo pins
  `react@17.0.2`), its own `lodash-es`, its own `@apollo/client`. The host
  shell can dedupe via shared modules, but only if the versions match.
- **Type safety stops at the widget boundary.** A widget loaded via
  `sandbox.widgets.getWidget(id)` returns `any`. No compile-time guarantees on
  its props.
- **Debugging is harder.** A bug in `IdentityService` reproduces only when
  you're inside the host shell, with the right sandbox, with the right
  feature flags.

**The unspoken cost in this repo:** because the *widgets* are MFEs but the
*services* are not, the `src/js/services/` layer is shared by ~40 widgets in
this plugin. A breaking change to `IdentityService` breaks every widget here.
That's not an MFE benefit — it's a monorepo cost we're paying *and* an MFE cost
we're paying.

---

### Q3. Why are services (e.g. `IdentityService`) shared inside the plugin instead of being their own widgets?

Look at how a service is used in
[src/js/services/IdentityService.ts](../../multi-entity-ui/src/js/services/IdentityService.ts):

```ts
export const getBusinessInfoForCompany = async (
  companyId: string,
  sandbox: ISandbox,
  headers?: Record<string, any>,
) => { /* ... */ };
```

It's a **stateless function** that takes a sandbox and returns data. Promoting
it to its own widget would mean:
- A YAML manifest, async loading, an extra network round-trip per call.
- A serializable IPC boundary (sandbox isn't trivially serializable across
  widget boundaries).

The pragmatic answer: services are shared *because they're not stateful UI*.
The MFE boundary exists to isolate UI lifecycle, not to isolate every function
call. **If a service ever held cross-widget state**, that's the moment to
promote it — and at that point it should probably move to a sandbox extension
(see Q15) rather than another widget.

---

## Section B — Data, State, and Caching

### Q4. The repo has a Redux-like store, `zustand`, and Apollo. Why three? What's the right rule for picking one?

Real usage in this repo:

- **Hand-rolled Redux** (`createStore`/`Provider`/`Connect` in
  [src/js/allocation/store/](../../multi-entity-ui/src/js/allocation/store/)) — used for the
  Allocation widget's complex multi-step UI state (table rows, totals,
  validation, mode = create/edit).
- **`zustand`** (in `package.json`, used in newer widgets) — lighter, no
  boilerplate, no provider needed.
- **Apollo** ([src/js/providers/GQLProvider.tsx](../../multi-entity-ui/src/js/providers/GQLProvider.tsx))
  — currently a stub. The actual data fetching uses raw
  `UIDataLayer.GraphqlClient` (see Q5).

**The right rule:**
- **Apollo** when you want a normalized cache that survives across components
  and dedupes refetches (none of this repo does, today — see Q5).
- **`zustand`** for cross-component state in a single widget when no derived
  selectors / middleware are needed.
- **Redux-style** only when you need the full discipline of action types +
  reducers (auditable state transitions, time-travel debugging,
  centrally-tested reducer).
- **`useState`** by default.

**What's wrong here:** the Allocation reducer in
[allocation/store/allocation/reducer.ts](../../multi-entity-ui/src/js/allocation/store/allocation/reducer.ts)
imports table-mutation utilities directly. The reducer is no longer a pure
function of `(state, action)` — it's a complex orchestrator. That's a smell.
Either embrace a state-machine library (XState) for the modes, or pull the
table mutations into actions and keep the reducer dumb.

---

### Q5. The `GQLProvider` is essentially a no-op. Why? What would you do?

📄 [src/js/providers/GQLProvider.tsx](../../multi-entity-ui/src/js/providers/GQLProvider.tsx)

```tsx
let client: ApolloClient<unknown>;

const GQLProvider = ({ children }) => {
  // TODO: once we have client details we need uncomment below 2 lines
  // const configWithLinks = getConfigWithLinks(sandbox);
  // client = client || getApolloClient(sandbox, configWithLinks);
  client = client || {};
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
```

This is dead code. The plugin uses raw `getGQLClient` from
[src/restClient.ts](../../multi-entity-ui/src/restClient.ts), which returns a fresh
`UIDataLayer.GraphqlClient` per call — **no cache, no dedupe, no normalized
store**.

**Consequences:**
- Two components asking the same query at the same time issue two HTTP
  requests.
- After a mutation, every consumer must refetch manually — there's no `evict`
  or `refetchQueries` story.
- The `noRetry: true` default in `getGQLClient` means transient 5xx will fail
  the user-visible flow, no exponential backoff.

**What I'd do:**
1. Either delete `GQLProvider.tsx` (it's misleading), or
2. Wire it up properly with an Apollo cache keyed by `(endpoint, companyId)`,
   plus an `apollo-link-retry` for idempotent reads, and replace `getGQLClient`
   with `useQuery` hooks so caching becomes free.

---

### Q6. How does state cross widget boundaries? What does that imply for users?

It doesn't, directly. The patterns are:
- **Parent → child via React props** (when a parent widget loads a child via
  `sandbox.widgets.getWidget`).
- **Backend round-trip** (both widgets requery the same GraphQL endpoint).
- **URL/route info** (the host's router is the shared "channel").

The user-visible consequence: if the user updates an entity in the Hierarchy
widget and switches to the Hub widget, the Hub will *not* see the update unless
it refetches. There's no cross-widget cache invalidation.

**Mitigations in the repo today:**
- `prefetchWidgets` in
  [sandboxUtil.ts](../../multi-entity-ui/src/js/utils/common/sandboxUtil.ts#L58) warms bundles,
  not data.
- Some flows force a refetch on mount.

**A better design:** a sandbox-level event bus (`sandbox.events.emit/on`) for
domain events like `entity.updated`, `allocation.saved`. That lets widgets
decoupled-ly react without cross-importing each other.

---

### Q7. The store provider stores the sandbox in context. Is that safe? What if the sandbox changes?

📄 [src/js/allocation/store/provider.tsx](../../multi-entity-ui/src/js/allocation/store/provider.tsx)

```tsx
return (
  <Context.Provider value={{ state, dispatch, id, sandbox }}>
    {children}
  </Context.Provider>
);
```

The sandbox is passed by reference into a context value object that's recreated
on every render. **Every state change re-renders every consumer of this
context** (because the value identity changes), regardless of whether they
care about the sandbox or not.

This is the classic React Context perf footgun. It's not buggy, just wasteful.

**Fixes:**
- Split into two contexts: a stable `SandboxContext` (memoized once) and a
  `StoreContext` that updates on dispatch.
- Or use `zustand`/`use-context-selector` to subscribe to a slice.

If the sandbox object identity ever *changed* mid-session (e.g. company
switch), it would correctly propagate — but in practice the host gives us one
sandbox per mount.

---

## Section C — Auth, Authorization, Multi-Tenancy

### Q8. Walk through authentication end-to-end. Where could this go wrong?

📄 [src/restClient.ts:36-50](../../multi-entity-ui/src/restClient.ts)

```ts
return {
  sandbox,
  apiKey: pluginApiKey[environment],
  authType: 'browser_auth',
  credentials: 'include',
  generateIntuitTid: true,
};
```

Flow: user logged into the host SaaS application → browser holds a session cookie for
`*.example.com` → every API call sends the cookie via `credentials: 'include'`
→ backend reads cookie → identifies user. The plugin **never sees a token**.

**Failure modes I'd probe:**
1. **Cookie expires mid-session.** Calls start returning 401. Today,
   `noRetry: true` means user sees a hard error. There's no cookie-refresh
   logic in this repo — that lives in the host. We rely on the host to redirect
   to login. Worth verifying with the host team that 401 cascades correctly.

2. **CSRF.** Cookie auth + `credentials: 'include'` is a CSRF surface. The
   `apiKey` provides some defense (an attacker would need to guess it), but
   the real defense should be SameSite=Strict on the session cookie + an
   anti-CSRF header. The `generateIntuitTid: true` is a trace ID, not a CSRF
   token.

3. **Multi-tab with different companies.** Two tabs, two different
   `companyId`s — the cookie is shared. The
   [getDefaultGQLClientConfig](../../multi-entity-ui/src/restClient.ts#L27) explicitly passes
   `companyId` per-call, which is the right call. But any code path that
   forgets to pass companyId will silently use `getCompanyInfo().id` from
   sandbox — and that could disagree with what the user thinks they're on.

4. **Cross-origin.** The endpoints are on different subdomains. CORS must be
   configured for each. If the host moves to a new domain, every endpoint's
   CORS allowlist needs updating.

---

### Q9. Authorization is split between `sandbox.authorization` and explicit `hasPermission` checks. What's the model?

📄 [src/js/utils/common/sandboxUtil.ts:125](../../multi-entity-ui/src/js/utils/common/sandboxUtil.ts#L125)

```ts
export const hasPermission = async (sandbox, resource, action) => {
  const { authorization } = sandbox;
  if (!authorization?.isAuthorizedBatch) return false;
  const decisions = await authorization.isAuthorizedBatch({
    batchRequest: [{ resource: { id: resource }, action: { id: action } }],
  });
  return decisions?.[0]?.isAuthorized ?? false;
};
```

The model is **PDP/PEP**: the sandbox is the Policy Enforcement Point; the company's
AuthZ service is the Policy Decision Point. The widget says "can user do X on
Y" and gets a yes/no.

**Three things to push on:**

1. **Fail-closed default is correct here** (`return false` on missing
   authorization) but the **retry-once-on-error** (lines 156-178) silently
   converts a transient AuthZ outage into a "permission denied" UX. Better:
   surface a "couldn't verify permissions, try again" state so the user knows
   to retry, rather than thinking they're locked out.

2. **No client-side caching** of decisions. If the same page asks "can edit?"
   ten times, that's ten AuthZ calls. `isAuthorizedBatch` exists for batching,
   but I don't see a memoization layer wrapping it.

3. **Authorization happens only on the read path.** A malicious client could
   skip the UI check and call the mutation directly — the *backend* must
   authorize too. The PEP at the client is for UX, not security. Worth
   verifying the backend services enforce the same policy IDs.

---

### Q10. The `apiKey` is read from `sandbox.pluginConfig.extendedProperties.multiEntityOrchs.apiKey`. What threat model does this fit?

📄 [src/restClient.ts:56-60](../../multi-entity-ui/src/restClient.ts#L56)

```ts
const pluginApiKey = get(
  sandbox,
  'pluginConfig.extendedProperties.multiEntityOrchs.apiKey',
  '',
);
```

This is a **per-plugin identifier**, not a secret. It ends up in the browser
bundle (or in a sandbox object readable by all widget code). Anyone who opens
DevTools can read it.

Its purpose is identification, rate-limiting, and per-plugin telemetry on the
backend — not authentication. The user's identity comes from the cookie, not
from this key. So the threat model is fine *as long as*:
- Backend services don't make trust decisions based solely on `apiKey`.
- Rate limits on the key are tuned for legitimate plugin traffic.

A real authentication secret should never live here.

---

### Q11. Accountant users vs company users — how is multi-tenancy modeled?

📄 [src/js/services/IdentityService.ts:118-122](../../multi-entity-ui/src/js/services/IdentityService.ts)

```ts
const isAccountant = isAccountantUser(sandbox);
let principalAccountId: string | undefined = companyId;
if (isAccountant) {
  principalAccountId = getFirmId(sandbox);
}
```

The accountant case is interesting: the user's *principal* is their firm
(`companyIdOfManagingFirm`), not the company they're viewing. So
`switchCompany` operates as the firm acting on behalf of the company.

**Implications:**
- AuthZ policies must distinguish "firm member acting for company" from
  "company admin acting on own company". The `principalAccountId` carries that
  signal.
- Logs must include both IDs, otherwise an audit trail can't reconstruct who
  did what (a firm employee acting for company A vs B looks identical in logs
  if you only capture `userId`).
- Switch logic must clear all per-company caches/state — otherwise a stale
  company's data leaks into the new context. This is the most likely place
  for a security incident in an MFE app: state isolation between tenants.

---

## Section D — Reliability & Performance

### Q12. The repo defaults `noRetry: true` for GraphQL. What's the implication?

📄 [src/restClient.ts:69](../../multi-entity-ui/src/restClient.ts#L69) and
[src/restClient.ts:147](../../multi-entity-ui/src/restClient.ts#L147)

```ts
noRetry: options && options.noRetry !== undefined ? options.noRetry : true,
```

Every call must opt into retries. The default is "fail loudly on the first
network blip."

**Why this might be deliberate:**
- Mutations are not idempotent (creating an allocation twice = double-charge
  scenario in finance code). Defaulting to no-retry is *safe by default*.
- Reads that fail can be retried by the user — explicit beats implicit.

**Why it's a problem:**
- **Reads** absolutely should retry on 5xx/timeout. Most calls in
  `IdentityService` are idempotent reads.
- The pattern requires every caller to remember to opt in. Most don't. So
  reads silently lack resilience.

**The fix:** flip the default for reads. The signal isn't `noRetry` — it's
"this is a read, it's safe to retry." Better to expose two helpers
(`getQueryClient`, `getMutationClient`) where retry semantics are baked in.

---

### Q13. `sandbox.logger.info(...)` is called liberally. What about PII?

📄 [src/js/utils/common/loggerUtil.ts:14-34](../../multi-entity-ui/src/js/utils/common/loggerUtil.ts)

```ts
const enumeratedError = error
  ? JSON.stringify(error, Object.getOwnPropertyNames(error))
  : {};
// ...
return {
  ...enumeratedErrorObj,
  logData: fields,
  region: companyL10nInfo?.region ?? DEFAULT_REGION,
};
```

The logger serializes the *entire* error object including non-enumerable
properties. If an error includes a request body (it often does in
`fetch`-style errors), that body lands in logs.

**What I'd audit:**
- Are any GraphQL inputs PII (email, SSN, account numbers)? Searching the
  queries — `IDENTITY_ASSOCIATED`, `GET_COMPANY_INFO` — they take
  `companyId`/`accountId`, which are tenant identifiers, not PII. But
  `getCustomDimensionValues`-style queries could carry user-entered strings.
- The `region` field is included for routing logs to the correct region for
  data residency — good. But are the *log destinations* themselves
  region-pinned? If a US user's logs end up in an EU bucket because of a
  developer test, that's a residency violation.
- The `error` object stringification grabs `Object.getOwnPropertyNames(error)`
  including stack traces. Stack traces from minified bundles include source
  paths, often with internal URLs in async error messages.

**Action items:** add an allowlist filter at the logger boundary and a CI
check that scans serialized log payloads for PII patterns.

---

### Q14. Performance: a typical Allocation page makes how many backend calls? How would you reduce them?

Look at
[src/js/allocation/utils/common/fetchUtils.ts](../../multi-entity-ui/src/js/allocation/utils/common/fetchUtils.ts)
— the imports alone reveal the scope: `getUniversalDimensions`,
`getCustomDimensionValues`, `getSourceTxnData`, `getDASLedgerAccount`,
`getAllocation`, `getSuggestedAllocationData`,
`getSalesAndExpensesDataFromMultiEntityAgent`, plus identity + authz checks.

That's easily **8–12 round trips** to **5+ different GraphQL endpoints** on a
single page mount. Each goes to a different subdomain, so DNS + TLS handshake
costs multiply.

**Reductions:**
1. **One BFF per page**, not many. The `<BIZ_ORCHESTRATOR>` and `<MultiEntityOrchestrator>`
   endpoints look like they're trying to be that — but the page still hits
   `IDENTITY`, `ACCOUNT`, `COA`, `ETS`, etc. directly. Pull all
   page-bootstrap data into a single the multi-entity orchestrator (BFF) query.
2. **HTTP/2 or HTTP/3 connection coalescing** across `*.api.example.com`
   subdomains via origin trial / coalescing hints — won't help if the
   subdomains have different IPs and certs.
3. **Apollo with `@defer`/`@stream`** so the table renders before the
   suggestions arrive.
4. **Prefetch on `mouseenter`** of the "Allocate" CTA, not on widget mount.

The page's TTI is almost certainly limited by the slowest of the parallel
calls; reducing fan-out is more impactful than tuning any single endpoint.

---

### Q15. Should anything in this plugin be a sandbox extension instead of a widget or service?

A sandbox extension (see
`sandbox.extensions.getExtension(ME_SANDBOX_EXTENSION_ID, { version: '1.0.0' })`
in [sandboxUtil.ts:108](../../multi-entity-ui/src/js/utils/common/sandboxUtil.ts#L108)) is a
*headless contract* the host loads once and exposes to all widgets.

Candidates from this repo:
- **Multi-entity hierarchy state.** Today it's loaded redundantly by Hub,
  Hierarchy, Allocation, etc. If it were a sandbox extension, it could be a
  single in-memory cache with subscription, populated once per session.
- **Permission cache.** A sandbox extension wrapping `isAuthorizedBatch` with
  request coalescing + memoization would cut AuthZ calls dramatically.
- **Domain event bus** (Q6) — needs to live above widgets.

The pattern is: *if multiple widgets need the same data and want to react to
the same updates, that's an extension's job, not a service's.*

---

## Section E — Code Health & Evolution

### Q16. The Redux-like store in `allocation/store` is hand-rolled. Why? Should it be replaced?

It exists because the team wanted Redux semantics (action types, reducers,
HOC connect) without adding `redux` + `react-redux` to the bundle. Each plugin
duplicates these libs — the cost matters.

**Should it be replaced?** Yes, but not with Redux. Two paths:

1. **`zustand` (already in deps).** Replace `createStore` with
   `createStore(set => ...)`, replace `connect` with `useStore`. Less code,
   no re-render footgun (Q7), no ceremony.

2. **A state machine for the mode field.** Look at the modes in
   [allocation/store/allocation/types.ts](../../multi-entity-ui/src/js/allocation/store/allocation/types.ts):
   `CREATE | EDIT | VIEW | TRANSACTIONAL | DYNAMIC`. The dispatched actions in
   [AllocationWrapper.tsx](../../multi-entity-ui/src/js/allocation/components/AllocationWrapper.tsx)
   (`SET_ALLOCATION_TYPE`, `SET_ALLOCATION_MODE`,
   `SET_ERROR_BOUNDARY_SCENARIO`) are state transitions. XState here would
   make illegal states unrepresentable and produce a state diagram for free.

The current code mixes both: imperative dispatches that *should* be guarded
transitions, and stale-mode bugs are a class of risk a state machine
eliminates.

---

### Q17. Where's the test pyramid? What's actually tested?

`package.json` has Jest, Cypress, and Playwright. `cypress/` and `test/` exist.
But: I haven't read them. As a PE I'd ask:

- **Reducer tests.** The reducer is the one place where logic concentrates —
  it should have exhaustive table-driven tests. Look in
  `src/js/allocation/store/allocation/__tests__/` (if it exists).
- **Service tests.** Mocked `UIDataLayer.GraphqlClient`, assert headers,
  payload, error mapping. Do error branches in
  [common.ts](../../multi-entity-ui/src/js/services/common.ts) `handleGraphQLResponse` actually
  reject when `errors` is present?
- **AuthZ negative tests.** Easy to forget: assert that `false` flows through
  every fail-closed path, including the AuthZ-down case.
- **Cross-widget contract tests.** The `widget.yaml` `dependencies.widgets`
  list is a contract. If `<vendor-feedback-plugin>/feedback@1.0.0` ships a v2 with
  breaking props, this plugin breaks. Is there a CI step that mounts the
  plugin in a test shell and verifies?

That last one is the unique-to-MFE risk. Versioned dependencies need
contract tests, not just unit tests.

---

### Q18. The PR queue and the `?? .claude/` untracked dir suggest active flux. What's the riskiest in-flight area?

From `git status` the working changes are in:
- `src/js/allocation/components/dynamic-allocation/DynamicAllocation.tsx`
- `src/js/allocation/services/types.ts`
- `src/js/allocation/utils/common/fetchUtils.ts`

Plus a recent merge (`bc7a6daf Merge pull request #1739 from a0007/caching-eh`)
about caching, and recent commits on hierarchy edits (`feat: disable deleting
root node`).

**Riskiest:**
- **`fetchUtils.ts`** is the bootstrap fan-out for the Allocation page. Any
  regression here affects every allocation flow.
- **Caching changes** to entity hierarchy (`caching-eh`) — caches in
  multi-tenant code are where data leaks happen. Worth a fresh review of the
  cache key: must include `companyId`, `userId`, and `principalAccountId`
  (the firm context from Q11).

A PE on this team should be drawing a fault tree from those three files
outward and asking "what tests would catch a regression in each?"

---

## Section F — System-Design-Level Questions

### Q19. The plugin talks to ~13 GraphQL endpoints. What's the consistency model? What happens during a partial outage?

Endpoints (from [common.ts](../../multi-entity-ui/src/js/utils/common/common.ts)):
Identity, Account, Account Manager, Switch Company, Settings Façade, COA,
ETS, the business unit Orchestrator, Bookkeeping, CES, CERES, the orchestrator, <Agent Service>.

There is **no transactional consistency** across them. Each is its own
read/write surface. Implications:

- **An "allocation save"** likely writes to the orchestrator, but reads to validate came
  from COA + Identity + Settings. If the multi-entity orchestrator (BFF) write succeeds but the user's COA
  data was stale (account got deleted between read and write), the write
  succeeds with stale references. The backend must either lock or
  conflict-detect.
- **A switch-company flow** mutates `accounts.example.com` but the plugin's UI
  reads from the orchestrator/Identity/COA. Eventual consistency means a UI refresh is
  needed; the code does this implicitly via remount.
- **Partial outage of one endpoint** — say COA is down — must degrade the page,
  not crash it. The current `noRetry: true` + per-call try/catch makes
  degradation possible but not pretty. A skeleton-state design with explicit
  "couldn't load chart of accounts, here's what we have" would be better than
  silent fallthrough.

---

### Q20. If you were given a quarter to improve this codebase, what are the top 3 changes you'd land?

1. **Replace `getGQLClient` per-call with a properly configured Apollo client
   per endpoint** (Q5). One cache per endpoint, dedupe in flight, retries on
   reads only, normalized store. This unlocks Q6 (cross-widget consistency),
   Q12 (resilience), and Q14 (perf).

2. **Sandbox extensions for hierarchy + permissions** (Q15). Cuts the
   bootstrap fan-out, makes cross-widget reactivity possible without an event
   bus per consumer.

3. **State machine for Allocation modes** (Q16). The mode/scenario dispatches
   in `AllocationWrapper` are a class of bug-prone code that XState
   eliminates. This is a small, contained refactor with high downside-risk
   reduction in finance code.

I would *not* rewrite the per-widget store with Redux Toolkit, change the
build system, or restructure folders. Those are visible but low-leverage.

---

## Appendix — Quick-fire facts (for warm-up)

| Q | A |
|---|---|
| Plugin platform? | plugin-platform plugin |
| Host shell? | the host SaaS application |
| React version? | 17.0.2 |
| Per-widget state? | Custom Redux + zustand |
| Cross-widget state? | None (props/URL/backend) |
| Auth mechanism? | Session cookie via `credentials: 'include'` |
| AuthZ? | `sandbox.authorization.isAuthorized` → the central AuthZ |
| API key purpose? | Plugin identification, not authentication |
| GraphQL client? | `UIDataLayer.GraphqlClient` (Apollo wired but unused) |
| Default retry policy? | `noRetry: true` (opt-in retries) |
| Logger? | `sandbox.logger` → central <Company> observability |
| Inter-widget loading? | `sandbox.widgets.getWidget(id)` (Promise) |
