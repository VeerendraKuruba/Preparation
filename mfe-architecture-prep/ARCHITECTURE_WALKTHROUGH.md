# the-app — Architecture Walkthrough

A beginner-friendly tour of how this app is wired together, told through **one
concrete example**: *what happens when the user opens the Allocation page.*

We'll trace it from the very first browser request all the way down to the
backend, with real code snippets from the repo at every step.

---

## Big picture

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser                                                           │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  HOST SHELL  (the host SaaS application — built on AppFabric)        │  │
│  │  - User is already logged in (session cookie in browser)     │  │
│  │  - Reads route → "needs widget multi-entity-allocation"      │  │
│  │                                                              │  │
│  │   ┌────────────────────────────────────────────────────┐     │  │
│  │   │  PLUGIN: the-app  (THIS REPO)              │     │  │
│  │   │  Many widgets:                                     │     │  │
│  │   │  ┌──────┐ ┌────────────┐ ┌───────────┐ ┌────────┐  │     │  │
│  │   │  │ Hub  │ │ Allocation │ │ Hierarchy │ │  ...   │  │     │  │
│  │   │  └──────┘ └────────────┘ └───────────┘ └────────┘  │     │  │
│  │   └────────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────────┘
                              │ HTTPS (cookie + apiKey)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  <Company> backend                                                    │
│  - identity.api.example.com    (who is this user?)                  │
│  - core-orchestrator.api.example.com (multi-entity data)             │
│  - accountmanagergraphql.api.example.com                            │
│  - …several more GraphQL endpoints                                 │
└────────────────────────────────────────────────────────────────────┘
```

**Key idea:** This repo is a *plugin*, not a standalone app. It's loaded by a
host (the host SaaS application). Each folder under `src/js/widgets/` is a small, independently
mountable widget — that's the **micro-frontend** boundary.

---

## The example we'll trace

> *The user clicks "Allocate" on a transaction. The Allocation widget mounts,
> figures out the company, fetches that company's info from the Identity
> service, and shows it on screen.*

We'll follow it through **6 stages**.

---

## Stage 1 — The widget manifest (how the host knows we exist)

Every widget has a `widget.yaml`. The host shell reads this to know what's
available.

📄 [src/js/widgets/multi-entity-allocation/widget.yaml](../../multi-entity-ui/src/js/widgets/multi-entity-allocation/widget.yaml)

```yaml
id: 'the-app/allocation-widget'
classification: public
version: 1.0.0
interface:
  description: |
    Multi Entity Allocation Page
main: './index.jsx'
dependencies:
  widgets:
    - <vendor-feedback-plugin>/feedback@1.0.0
```

What this says:
- **id**: globally unique widget name (the host uses this to load us).
- **main**: the entry file to mount.
- **dependencies.widgets**: other widgets we want to use — declared, not
  imported. The host loads them at runtime.

---

## Stage 2 — The widget entry point (`BaseWidget` + `sandbox`)

When the host decides to mount us, it calls our entry file and passes a
**`sandbox`** prop. The sandbox is the toolbox the host gives us.

📄 [src/js/widgets/multi-entity-allocation/index.jsx](../../multi-entity-ui/src/js/widgets/multi-entity-allocation/index.jsx)

```jsx
import React from 'react';
import BaseWidget from 'host-shell-core/widgets/BaseWidget';
import { SandboxContextProvider } from '@internal-platform/providers';
import AllocationWrapper from 'src/js/allocation/components/AllocationWrapper';

class MultiEntityAllocation extends BaseWidget {
  componentDidMount() {
    logAllocationInfo(this.props.sandbox, 'MultiEntityAllocation mounted');
  }

  render() {
    return (
      <SandboxContextProvider sandbox={this.props.sandbox}>
        <AllocationWrapper {...this.props} />
      </SandboxContextProvider>
    );
  }
}

export default MultiEntityAllocation;
```

Three things to notice:
1. We extend `BaseWidget` (from the host's library) — this makes us a valid
   widget the shell can mount.
2. `this.props.sandbox` is **handed to us by the host**. We never create it.
3. We wrap children in `SandboxContextProvider` so any descendant component can
   read the sandbox via React context.

### What's inside `sandbox`?

```
sandbox
├── appContext.getEnvironment()          → "prod" | "e2e" | "perf"
├── extensions.host-app.context
│     ├── getCompanyInfo()  →  { id: "9341...", … }   (realmId)
│     ├── getUserInfo()     →  { agentId: "..." }
│     └── getAuthInfo()     →  { isAdmin, isAccountantUser }
├── authorization.isAuthorized({...})    → permission check
├── logger.info / error                  → central logging
├── widgets.getWidget(id)                → load another widget at runtime
├── featureFlags.isFeatureEnabled(id)
└── pluginConfig.extendedProperties.multiEntityOrchs.apiKey
```

Helpers that read from sandbox live in
📄 [src/js/utils/common/sandboxUtil.ts](../../multi-entity-ui/src/js/utils/common/sandboxUtil.ts):

```ts
export const getRealmId = (sandbox: ISandbox): string => {
  return sandbox?.extensions?.qbo?.context?.getCompanyInfo()?.id;
};

export const isAdmin = (sandbox: ISandbox): boolean => {
  return sandbox?.extensions?.qbo?.context?.getAuthInfo()?.isAdmin;
};

export const isFeatureEnabled = (sandbox: ISandbox, featureFlagId: string) => {
  return sandbox?.featureFlags?.isFeatureEnabled(featureFlagId);
};
```

---

## Stage 3 — Per-widget state (a mini-Redux on top of React context)

Inside the Allocation widget, many components need to share state (selected
rows, totals, mode = create/edit, etc.). The repo uses a hand-rolled Redux
pattern with `useReducer` + React Context.

📄 [src/js/allocation/components/AllocationWrapper.tsx](../../multi-entity-ui/src/js/allocation/components/AllocationWrapper.tsx)

```tsx
import { Provider } from '../store/provider';
import { createStore } from '../store/createStore';
import reducer from '../store/allocation/reducer';
import { initialState } from '../store/allocation/initialState';
import { ALLOCATION_STORE, REDUCER_ACTION } from '../constants/store';

// Create the store ONCE, outside the component
const store = createStore<IAllocationState, IReducerPayload>(
  ALLOCATION_STORE,
  reducer,
  initialState,
);

const AllocationWrapper = (props) => {
  const { sandbox, sourceTransaction } = props;
  const dispatchRef = useRef();

  useEffect(() => {
    if (sourceTransaction) {
      dispatchRef.current.dispatchAction({
        action: REDUCER_ACTION.SET_ALLOCATION_TYPE,
        data: ALLOCATION_TYPE.TRANSACTIONAL,
      });
    }
  }, [sourceTransaction]);

  return (
    <Provider store={store} sandbox={sandbox} ref={dispatchRef}>
      <ErrorBoundary sandbox={sandbox}>
        <AllocationCoreWidget />
      </ErrorBoundary>
    </Provider>
  );
};
```

How the Provider works under the hood:

📄 [src/js/allocation/store/provider.tsx](../../multi-entity-ui/src/js/allocation/store/provider.tsx)

```tsx
export const Provider = React.forwardRef(({ store, children, sandbox }, ref) => {
  const { id, reducer, initialState } = store;
  const [state, dispatch] = useReducer(reducer, initialState);
  const Context = MultiContextStore[store.id];

  useEffect(() => {
    ref.current = { dispatchAction: dispatch };
  }, [ref]);

  return (
    <Context.Provider value={{ state, dispatch, id, sandbox }}>
      {children}
    </Context.Provider>
  );
});
```

And how a child component reads it via `Connect`:

📄 [src/js/allocation/store/connect.tsx](../../multi-entity-ui/src/js/allocation/store/connect.tsx)

```tsx
export const Connect = (
  ChildComponent,
  storeId,
  mapStateToProps = () => ({}),
  mapActionToProps = () => ({}),
) => {
  const MemoizedChild = memo(ChildComponent);

  return (props) => {
    const [state, dispatch, sandbox] = useStore(storeId);
    const dependentStateProps = useMemo(
      () => mapStateToProps(state, props),
      [state, props],
    );
    const actions = useMemo(() => mapActionToProps(dispatch), [dispatch]);

    return (
      <MemoizedChild
        sandbox={sandbox}
        {...dependentStateProps}
        {...actions}
        {...props}
      />
    );
  };
};
```

If you've ever used `react-redux`'s `connect()`, this is the same idea — just
hand-rolled and scoped to one widget.

> **Important:** This store is *private to the Allocation widget*. The Hub
> widget cannot read it. Cross-widget sharing happens through props, the URL,
> or the backend (Stage 6).

---

## Stage 4 — Calling a backend (authentication happens here)

Now a component inside Allocation needs the company's business info. It calls a
service function:

📄 [src/js/services/IdentityService.ts](../../multi-entity-ui/src/js/services/IdentityService.ts)

```ts
export const getBusinessInfoForCompany = async (
  companyId: string,
  sandbox: ISandbox,
  headers?: Record<string, any>,
) => {
  try {
    const response = await getGQLClient(
      sandbox,
      {},
      GQL_QUERY_TYPES.IDENTITY,        // ← which backend?
    ).query(
      GET_COMPANY_INFO,                // ← GraphQL query
      {
        input: { id: companyId },
        filterBy: {
          relationshipFilter: {
            relationship: 'FIRM',
            includeProvisional: true,
            includeHidden: true,
          },
        },
      },
      headers,
    );
    return response.json();
  } catch (error) {
    logMultiEntityError(sandbox, 'Error fetching business info', { error });
    return null;
  }
};
```

The interesting part is `getGQLClient`. It builds an authenticated client.

📄 [src/restClient.ts](../../multi-entity-ui/src/restClient.ts)

```ts
const getDefaultGQLClientConfig = (sandbox, pluginApiKey, companyId) => {
  const environment = sandbox.appContext.getEnvironment();   // "prod"
  const defaultCompanyId =
    sandbox?.extensions?.qbo?.context?.getCompanyInfo()?.id;

  return {
    sandbox,
    mode: 'cors',
    apiKey: pluginApiKey[environment],   // ← from sandbox.pluginConfig
    authType: 'browser_auth',            // ← use browser session
    companyId: companyId || defaultCompanyId,
    fetchOptions: {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
      },
    },
    credentials: 'include',              // ← send cookies
    generateIntuitTid: true,             // ← trace id for logs
  };
};

const getGQLClient = (sandbox, options, type) => {
  const environment = sandbox.appContext.getEnvironment();
  const pluginApiKey = get(
    sandbox,
    'pluginConfig.extendedProperties.multiEntityOrchs.apiKey',
    '',
  );
  const defaultGQLConfig = getDefaultGQLClientConfig(
    sandbox,
    pluginApiKey,
    options.companyId,
  );

  let graphqlEndpoint = '';
  switch (type) {
    case GQL_QUERY_TYPES.IDENTITY:
      graphqlEndpoint = IDENTITY_URL[environment];
      break;
    case GQL_QUERY_TYPES.ORCHESTRATOR:
      graphqlEndpoint = MEOS_URL[environment];
      break;
    // …more endpoints
  }
  return new UIDataLayer.util.GraphqlClient(graphqlEndpoint, {
    ...defaultGQLConfig,
    noRetry: options.noRetry ?? true,
  });
};
```

### How auth works (no login code in this repo!)

```
┌──────────────────────────────────────────────────────────────┐
│  Browser already has <Company> session cookie                   │
│  (set when user logged into the host SaaS application)                      │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              │ widget calls getGQLClient(...)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  GraphqlClient                                               │
│   authType:    'browser_auth'  ──► use browser session       │
│   credentials: 'include'       ──► attach cookies            │
│   apiKey:      <from sandbox>  ──► identifies the plugin     │
└─────────────────────────────┬────────────────────────────────┘
                              │ HTTPS POST
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  https://internal.example.com/                  │
│  Reads cookie ──► knows the user                             │
│  Reads apiKey ──► knows the calling plugin                   │
│  Returns data                                                │
└──────────────────────────────────────────────────────────────┘
```

**Authentication = "who are you?"** → done via the cookie the host already
holds. The plugin never sees a password or token.

**Authorization = "are you allowed?"** → handled separately:

📄 [src/js/services/AuthzDecisionService.ts](../../multi-entity-ui/src/js/services/AuthzDecisionService.ts)

```ts
export async function hasTxnAccess(txnType, action, sandbox) {
  const irn = ADSResource[txnType];
  const { authorization } = sandbox;
  if (!authorization) return false;

  const { isAuthorized } = await authorization.isAuthorized(
    { id: irn },
    { id: action },
  );
  return isAuthorized;
}
```

The widget asks the **sandbox** "can this user do action X on resource Y?" The
sandbox forwards the question to the company's central AuthZ service.

---

## Stage 5 — The full data flow (one picture)

```
 ┌────────────────────────────────────────────────────────────────┐
 │ 1. Host mounts <MultiEntityAllocation sandbox={...} />         │
 └─────────────────────────┬──────────────────────────────────────┘
                           ▼
 ┌────────────────────────────────────────────────────────────────┐
 │ 2. AllocationWrapper                                           │
 │    - creates store (createStore)                               │
 │    - wraps tree in <Provider store sandbox>                    │
 └─────────────────────────┬──────────────────────────────────────┘
                           ▼
 ┌────────────────────────────────────────────────────────────────┐
 │ 3. <AllocationCoreWidget> renders                              │
 │    Some child component needs company info, calls:             │
 │       getBusinessInfoForCompany(companyId, sandbox)            │
 └─────────────────────────┬──────────────────────────────────────┘
                           ▼
 ┌────────────────────────────────────────────────────────────────┐
 │ 4. IdentityService → getGQLClient(sandbox, {}, IDENTITY)       │
 │    builds an authenticated client:                             │
 │      url    = identity.api.example.com/v2/graphql               │
 │      cookie = <from browser>                                   │
 │      apiKey = <from sandbox.pluginConfig>                      │
 └─────────────────────────┬──────────────────────────────────────┘
                           ▼
 ┌────────────────────────────────────────────────────────────────┐
 │ 5. HTTPS POST to backend                                       │
 │    Backend reads cookie, returns company data                  │
 └─────────────────────────┬──────────────────────────────────────┘
                           ▼
 ┌────────────────────────────────────────────────────────────────┐
 │ 6. Component dispatches into the per-widget store:             │
 │       dispatch({                                               │
 │         action: REDUCER_ACTION.SET_BUSINESS_INFO,              │
 │         data: response                                         │
 │       })                                                       │
 └─────────────────────────┬──────────────────────────────────────┘
                           ▼
 ┌────────────────────────────────────────────────────────────────┐
 │ 7. Reducer updates state → React re-renders → UI shows data    │
 └─────────────────────────┬──────────────────────────────────────┘
                           ▼
 ┌────────────────────────────────────────────────────────────────┐
 │ 8. logger.info(...) writes a structured log entry              │
 │    via sandbox.logger (central observability)                  │
 └────────────────────────────────────────────────────────────────┘
```

---

## Stage 6 — Sharing across widgets (cross micro-frontend)

By design, two different widgets **do not share JavaScript state**. They
communicate in three ways:

### a) Parent loads child via `sandbox.widgets.getWidget`

📄 [src/js/components/multi-entity-dashboard/index.tsx](../../multi-entity-ui/src/js/components/multi-entity-dashboard/index.tsx)

```tsx
<HOCWidget
  getWidgetAsConsumer={(widgetId: string) => {
    return sandbox.widgets.getWidget(widgetId);
  }}
  // …
/>
```

The dashboard asks the host: "give me the widget with this ID." The host loads
its bundle, mounts it, and the parent passes data to it via React props.

### b) Prefetching a known dependency

📄 [src/js/widgets/multi-entity-hub/index.jsx](../../multi-entity-ui/src/js/widgets/multi-entity-hub/index.jsx)

```jsx
componentDidMount() {
  prefetchWidgets(sandbox, [WIDGET_IDS.ICJE]);
}
```

📄 [src/js/utils/common/sandboxUtil.ts](../../multi-entity-ui/src/js/utils/common/sandboxUtil.ts)

```ts
export const prefetchWidgets = (sandbox, widgets) => {
  widgets.forEach((widget) => {
    sandbox.widgets.getWidget(widget).catch((error) => { /* log */ });
  });
};
```

This warms up another widget's bundle so it renders instantly when needed.

### c) Re-fetching from the same backend

The simplest pattern: both widgets call the same GraphQL endpoint. The backend
is the source of truth, so they stay consistent.

---

## The four layers of data, summarized

| Layer | Where it lives | Scope |
|-------|----------------|-------|
| **1. Component state** | `useState`, `useReducer` in a single component | One component |
| **2. Per-widget store** | [src/js/allocation/store/](../../multi-entity-ui/src/js/allocation/store/) (Redux-like) and `zustand` stores | One widget's React tree |
| **3. Service layer** | [src/js/services/](../../multi-entity-ui/src/js/services/) — `IdentityService`, `MultiEntityService`, etc. | Functions called by any widget |
| **4. Backend** | GraphQL endpoints (Identity, the orchestrator, Account Manager, …) | Shared source of truth |

---

## Cheat sheet — where things live

| You want to … | Look in … |
|---|---|
| See all widgets this plugin exposes | [src/js/widgets/](../../multi-entity-ui/src/js/widgets/) |
| Find a widget's entry / manifest | `src/js/widgets/<name>/index.jsx` + `widget.yaml` |
| Find a service that calls a backend | [src/js/services/](../../multi-entity-ui/src/js/services/) |
| Read sandbox helper functions | [src/js/utils/common/sandboxUtil.ts](../../multi-entity-ui/src/js/utils/common/sandboxUtil.ts) |
| Configure a new GraphQL endpoint | [src/js/utils/common/common.ts](../../multi-entity-ui/src/js/utils/common/common.ts) and [src/restClient.ts](../../multi-entity-ui/src/restClient.ts) |
| Understand the per-widget store pattern | [src/js/allocation/store/](../../multi-entity-ui/src/js/allocation/store/) (`createStore`, `provider`, `connect`) |
| Check user permissions | `sandbox.authorization.isAuthorized(...)` — see [AuthzDecisionService.ts](../../multi-entity-ui/src/js/services/AuthzDecisionService.ts) |
| Add a feature-flag gate | `isFeatureEnabled(sandbox, FLAG_ID)` |
| Log something | `sandbox.logger.info/error(...)` via [loggerUtil.ts](../../multi-entity-ui/src/js/utils/common/loggerUtil.ts) |

---

## TL;DR

1. **This is a micro-frontend plugin.** Each folder under `src/js/widgets/` is
   a separately versioned widget the host shell can mount.
2. **The host hands every widget a `sandbox`.** That object is your one-stop
   API for environment, user, company, permissions, logging, feature flags, and
   loading other widgets.
3. **Auth is free.** The user logged into the host SaaS application. Calls use
   `credentials: 'include'` so the cookie tags along. The plugin never handles
   login.
4. **Permissions** flow through `sandbox.authorization.isAuthorized(...)`.
5. **Inside a widget**, state is shared via a Redux-like context store
   ([src/js/allocation/store/](../../multi-entity-ui/src/js/allocation/store/)) and `zustand`.
6. **Across widgets**, state is *not* shared — communicate via props (parent
   mounting child), the URL, or the backend.
