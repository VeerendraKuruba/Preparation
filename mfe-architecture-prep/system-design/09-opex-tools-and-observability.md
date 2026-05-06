# 09 — Operational Excellence (OpEx), Observability & Tooling

What runs *around* the code: CI/CD, logging, performance monitoring, alerting,
incident response, release management. Grounded in the **actual tools this
repo uses** so you can talk about them with specifics in interviews.

---

## 1. The five pillars of operational excellence

```
                ┌─────────────────────────┐
                │   1. Build & Release    │  CI/CD, versioning, deploys
                ├─────────────────────────┤
                │   2. Observability      │  Logs, metrics, traces, RUM
                ├─────────────────────────┤
                │   3. Alerting & On-call │  PagerDuty, Slack, runbooks
                ├─────────────────────────┤
                │   4. Incident Response  │  Triage, mitigation, postmortem
                ├─────────────────────────┤
                │   5. Continuous Improve │  Error budgets, SLO tracking, debt
                └─────────────────────────┘
```

A senior engineer is expected to operate the system, not just build it.
Interviews probe all five.

---

## 2. The actual stack used by `the-app`

### Build & Release

| Tool | Purpose | Where |
|---|---|---|
| **Jenkins (`build.example.com`)** | CI pipeline runner | [Jenkinsfile](../../../multi-entity-ui/Jenkinsfile) |
| **`uxPluginCLI`** | <Company> shared Jenkins library — standardized plugin pipeline | Jenkinsfile L56 |
| **`@internal-platform/plugin-cli`** | Build/lint/test wrapper | `plugin-cli.config.js` |
| **`tool-manager`** | Tooling version manager (like nvm but for the company's tools) | `package.json:awm:bootstrap` |
| **semantic-release** | Auto-versioning + changelog from commits | Badge in README |
| **commitlint + husky** | Conventional commits enforced via pre-commit hook | `commitlint.config.js` |
| **Renovate** | Automated dep update PRs | `renovate.json` |
| **Codecov** (`codecov.tools.a.example.com`) | Test coverage tracking | Badge in README |
| **DevPortal asset** | Plugin registry + deploy config | README |

### Observability

| Tool | Purpose |
|---|---|
| **the centralized log platform** (`ip.e2e.scheduled.splunk.example.com`) | Log search + dashboards. Pre-prod is auto-configured; prod requires Web App registration. |
| **`web_shell_log_monitoring` Splunk app** | Where logger output lands |
| **`web_shell_ui_performance_monitoring` Splunk app** | Where perf telemetry lands |
| **the centralized RUM platform** | Real-user monitoring via `sandbox.performance.getCustomerInteraction(id)` |
| **Intuit TID (`generateIntuitTid: true`)** | Distributed trace ID, propagated across backends |
| **`@app-foundations/mmreadiness-perf-framewrk`** | Plugin perf-readiness measurement framework |

### Testing

| Tool | Purpose |
|---|---|
| **Jest** | Unit tests (`yarn test:jest`) |
| **Cypress** | Component / integration tests (`yarn test:cypress`) |
| **Playwright** | E2E tests across envs — `e2e`, `prf`, `prod` (`test:playwright:*` scripts) |
| **Lighthouse** | Web vitals / perf budget gate (`yarn test:lighthouse`) |

### Alerting

| Tool | Purpose |
|---|---|
| **Slack** (`#team-alerts`) | Build failures on master → message ([Jenkinsfile:76](../../../multi-entity-ui/Jenkinsfile#L76)) |
| **Slack** (`#team-support`) | Customer/user-facing support channel |

### Local dev

| Tool | Purpose |
|---|---|
| **Gitpod** | Pre-configured cloud workspace |
| **Plugin-CLI dev server** | `yarn start` for local iteration |
| **`yarn serve`** | Serve the plugin into a remote the plugin platform shell for end-to-end test |

---

## 3. Logging — the deep dive

### How the plugin logs

📄 [src/js/utils/common/loggerUtil.ts](../../../multi-entity-ui/src/js/utils/common/loggerUtil.ts)

```ts
const log = (type, sandbox, message, fields) => {
  const extendedFields = getExtendedLogData(sandbox, fields);
  sandbox.logger[type](message, extendedFields);  // ← host-provided logger
};
```

The plugin **doesn't talk to Splunk directly**. It calls `sandbox.logger`,
and the host pipes that into AppFabric's logging infrastructure, which
fans out to Splunk (and optionally other sinks).

```
Widget code
   │ logMultiEntityInfo(sandbox, msg, {fields, error})
   ▼
sandbox.logger.info(msg, extendedFields)
   │ (host-provided)
   ▼
the plugin platform log pipeline
   │ - adds user/realm/region/env tags
   │ - region-pinned routing (data residency)
   ▼
Splunk indexes
   │ - web_shell_log_monitoring (pre-prod)
   │ - production indexes (per Web App config)
   ▼
Engineers query via Splunk SPL
```

### What gets logged

Every log entry includes (from `getExtendedLogData`):
- `logData` — the caller-supplied fields
- `region` — for log routing
- `errorDetails` — if an error was passed, fully serialized incl. stack

Plus host-injected:
- `userId`, `companyId`, `realmId`
- `trace_id` — trace ID
- environment, platform, plugin version

### Log levels

| Level | When |
|---|---|
| `info` | Normal flow milestones (interaction started, successful fetch) |
| `warn` | Recoverable issues (retry succeeded, fallback path) |
| `error` | Unrecoverable for that flow (request failed, AuthZ denied unexpectedly) |
| `logException` | Used in the catch-of-catch (logger itself failed) |

**Beginner mistake:** logging at `info` for everything → noise drowns signal.
**Senior practice:** budget log volume per flow; be deliberate.

### Anti-patterns to avoid

- Logging PII (email, SSN, account numbers in body)
- Logging full request bodies — they may contain sensitive form data
- Logging stack traces with internal URLs that leak architecture
- Console.log in production code (no central pipeline)

---

## 4. Performance monitoring — RUM with `CustomerInteraction`

### The pattern

This is **Real User Monitoring (RUM)** at the user-flow level, not the
synthetic perf level. Each named flow gets timed end-to-end on the user's
actual browser.

📄 [src/js/utils/common/interactionUtils.ts](../../../multi-entity-ui/src/js/utils/common/interactionUtils.ts)

```ts
import { CustomerInteraction } from '@internal-platform/sandbox-spec';

export const startInteraction = (sandbox, interactionId, metadata) => {
  const { performance } = sandbox;
  const interaction = performance.startCustomerInteraction(interactionId, metadata);
  // …
};

export const completeInteractionWithSuccess = (sandbox, interactionId, logData) => {
  const interaction = performance.getCustomerInteraction(interactionId);
  interaction.addMetadata(logData);
  interaction.success();   // ← stops timer, marks success
};

export const completeInteraction = (sandbox, interactionId, logData) => {
  // ← marks failure
};
```

Real example:

📄 [src/js/services/IdentityService.ts:153-217](../../../multi-entity-ui/src/js/services/IdentityService.ts)

```ts
const interactionId = INTERACTION_IDS.FETCH_ASSOCIATED_COMPANIES;

logMultiEntityInfo(sandbox, 'Fetching associated companies started', {
  companyId, userId,
});
startInteraction(sandbox, interactionId, { companyId, userId });

return new Promise((resolve, reject) => {
  getGQLClient(sandbox, {}, GQL_QUERY_TYPES.ASSOCIATED_COMPANIES)
    .query(GET_ASSOCIATED_COMPANIES, { /* ... */ })
    .then(/* ... */)
    .then((response) => {
      handleGraphQLResponse(response, resolve, reject);
      logMultiEntityInfo(sandbox, 'Successfully fetched associated companies', { companyId });
      completeInteractionWithSuccess(sandbox, interactionId, { companyId });
    })
    .catch((error) => {
      logMultiEntityError(sandbox, 'Error fetching associated companies', { companyId, error });
      completeInteraction(sandbox, interactionId, { companyId, error });   // ← failure path
      reject(error);
    });
});
```

### What this gives you

```
Splunk dashboard, web_shell_ui_performance_monitoring
  ┌───────────────────────────────────────────────────────────┐
  │ FETCH_ASSOCIATED_COMPANIES                                │
  │   P50: 320ms   P75: 540ms   P95: 1.4s   P99: 3.2s         │
  │   Success rate: 99.4%                                     │
  │   Top failures: AuthZ denied (0.3%), 5xx (0.2%)           │
  │   Slowest tenants: [firm IDs]                             │
  └───────────────────────────────────────────────────────────┘
```

You can slice by region, company size, plugin version, browser.

### Naming convention

`INTERACTION_IDS` are flow-level names (`FETCH_ASSOCIATED_COMPANIES`,
`FETCH_IDENTITY_ASSOCIATED`, `FETCH_SKU_LIST`, etc. — see
[src/js/constants/interaction.ts](../../../multi-entity-ui/src/js/constants/interaction.ts)).
**Stable IDs are the contract** with the dashboard. Renaming an interaction
without updating dashboards/alerts = silent observability loss.

---

## 5. Synthetic monitoring — Lighthouse & perf framework

| Type | What | When |
|---|---|---|
| **Synthetic** | Automated browser, controlled environment | CI gate, scheduled checks |
| **RUM** | Real users, real conditions | Always-on production |

This repo runs both:
- **Lighthouse** in CI (`yarn test:lighthouse` — perf, a11y, SEO scores).
- **`mmreadiness-perf-framewrk`** is the company's plugin-readiness perf check.
- **Playwright with `@ME_IES_PRF_P0` grep** runs perf-tagged E2E tests against
  the `prf` environment (see `test:playwright:prf` in package.json).

**Why both:** synthetic catches regressions deterministically (no
network/device noise); RUM catches what real users experience (slow networks,
old phones, cold caches).

---

## 6. Distributed tracing

### Trace ID propagation

```
Browser request
   │ generateIntuitTid: true → adds trace_id header
   ▼
Edge / WAF                 logs trace_id
   │
   ▼
Service A                  logs trace_id, calls B with same header
   │
   ▼
Service B                  logs trace_id, calls C with same header
   ▼
Service C                  logs trace_id
```

Aggregating by `trace_id` in Splunk reconstructs the full call graph for
one user request. That's distributed tracing without a separate tracer.

For "why was this user's request slow?" — Splunk query:

```
trace_id="abc-123-def-456"
  | stats min(_time) as start, max(_time) as end by service
  | eval duration=end-start
  | sort -duration
```

You'd see which service took the longest.

### Why this matters in MFE

A page load can hit 10 services. Without trace IDs, you can't tell which one
caused a slow render. **The `trace_id` ties them together.**

---

## 7. CI/CD pipeline (the actual one)

```
PR opened on github.example.com
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Jenkins triggered (uxPluginCLI shared library)          │
│                                                         │
│ 1. lint        (yarn plugin-cli lint)                   │
│ 2. test:jest   (unit tests + coverage → Codecov)        │
│ 3. test:cypress (component/integration)                 │
│ 4. build       (yarn plugin-cli build)                  │
│ 5. testUIRemote (Playwright @ME_IES_P0 grep, in cluster)│
│ 6. align/version (semantic-release computes next ver)   │
└─────────────────────────────────────────────────────────┘
       │
       ▼
PR merged to master
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Master pipeline (uxPluginCLI)                           │
│                                                         │
│ - same as PR, plus:                                     │
│ - publish plugin bundle to the company's plugin registry     │
│ - tag release (semantic-release)                        │
│ - if failure: Slack #team-alerts             │
└─────────────────────────────────────────────────────────┘
       │
       ▼
DevPortal: deploy to e2e → perf → prod via Web App config
```

### Deployment promotion model

The plugin bundle is published once. The **Web App** config (in DevPortal)
decides which version of which plugin is loaded for which environment. So
"deploy to prod" is a config flip, not a re-build.

This is **artifact promotion** — the same bundle goes through every env. It's
the gold standard because what you tested in pre-prod is byte-for-byte what
runs in prod.

---

## 8. Release management

| Practice | Tool | Purpose |
|---|---|---|
| **Conventional commits** | commitlint | Each commit declares `feat:`, `fix:`, `chore:` |
| **Auto-versioning** | semantic-release | `feat` → minor, `fix` → patch, `BREAKING CHANGE` → major |
| **Changelog** | semantic-release + `CHANGELOG.md` | Generated from commits |
| **Tag** | git tag per release | Cuts versioned bundle |

The implication: **commit messages are the source of truth for release
notes.** A bad message = wrong release type.

---

## 9. Alerting & on-call

### What's alerted today

```
Build fails on master
   ▼
Slack #team-alerts          (Jenkinsfile L75-77)
```

That's the only repo-managed alert.

### What should also be alerted (and probably is, in dashboards)

```
SLO violation                          → page on-call
   - Page TTI P95 > 3s for 10 min
   - Allocation save error rate > 1% for 5 min
   - AuthZ denial rate spikes 3x baseline

Anomalies
   - Sudden drop in interaction volume (deploy broke a flow silently)
   - Geographic skew (one region's error rate up)

Capacity
   - Backend rate-limit 429s rising

Security
   - Spike in 401s (auth issue)
   - Unusual cross-tenant access patterns
```

### Alert hygiene

- **Every alert needs a runbook.** "Allocation save P95 > 5s" → linked doc:
  "check dashboard X, recent deploys, tenant skew, escalate to the multi-entity orchestrator (BFF) team."
- **Alert fatigue is real.** Every false alarm trains people to ignore the
  channel. Tune ruthlessly.
- **Page only on user-impacting issues.** Internal blips that auto-recover
  don't deserve a 3am wake-up.

---

## 10. SLOs, SLIs, error budgets

| Term | Meaning |
|---|---|
| **SLI** (Service Level Indicator) | The metric — e.g. "% of allocation saves under 2s" |
| **SLO** (Service Level Objective) | The target — e.g. "99% of saves under 2s, monthly" |
| **SLA** (Agreement) | Contractual commitment to a customer (legal) |
| **Error budget** | 1 − SLO. If SLO is 99%, you have a 1% error budget |

**Error budget as a tool:**
- Budget intact → ship features.
- Budget exhausted → freeze features, fix reliability.

This makes the reliability/velocity tradeoff a *number*, not an argument.

**For interviews:** know how to define an SLI. Bad SLI: "uptime." Good SLI:
"% of `allocation_save` interactions returning success within 2s, sampled
over 30 days." Specific, measurable, user-meaningful.

---

## 11. Incident response

### The shape of an incident

```
Detection      (alert / customer report)
   ▼
Triage         (severity? blast radius?)
   ▼
Mitigation     (rollback? feature flag off? scale up?)
   ▼
Recovery       (verify metrics back to baseline)
   ▼
Postmortem     (write-up, action items, no blame)
```

### Mitigations available in this app

- **Rollback the plugin** — flip Web App config to previous version.
- **Kill the feature flag** — `sandbox.featureFlags` gates new code paths;
  toggle off in seconds without a deploy.
- **Reduce traffic** — backend can rate-limit by apiKey to shed load.
- **Switch endpoints** — config swap in DevPortal.

The fact that **rollback is a config flip** (not a re-deploy) is one of the
biggest reliability wins of the the plugin platform plugin model.

### Postmortem essentials

- Timeline (with Slack timestamps).
- User impact (how many, how long, what symptoms).
- Root cause (5 whys, not 1).
- What detected it (alert? customer? engineer?). If customer-detected, add
  an alert.
- Action items with owners and due dates.
- **Blameless.** The system failed; people made reasonable choices.

---

## 12. Cost — the often-forgotten OpEx dimension

For a frontend plugin:

| Cost | Driver |
|---|---|
| **CDN egress** | Bundle size × users × page loads |
| **Backend compute** | Number of API calls × duration |
| **Log storage** | Volume × retention |
| **RUM ingestion** | Interaction events × users |

**Rule of thumb:** every log line is a future bill. Every interaction event
is a future bill. The marginal cost is small per event but multiplied by
millions of users it adds up.

Senior engineers think about cost as a non-functional requirement, same as
latency. "Logging every render" might be debug-time gold and prod-time
expensive.

---

## 13. Feature flags as an OpEx tool

Feature flags aren't just for product experimentation. They're the
**fastest mitigation** in your toolkit.

```
Bug shipped             → flag off → resolved in seconds
Slow new query path     → flag off → fall back to legacy
Capacity issue          → flag off advanced features → reduce load
Tenant-specific bug     → flag off for that tenant only
```

Used in this app via `sandbox.featureFlags.isFeatureEnabled(id)`. Best
practice:
- **Wrap risky changes** in flags by default.
- **Sunset flags** — they accumulate as tech debt. Have an expiration policy.
- **Flag evaluation should be idempotent** within a session — flicker is bad
  UX.

---

## 14. Dashboards — the senior engineer's TV

Useful dashboards for `the-app`:

1. **Page health** — TTI P50/P95/P99, error rate, by route + version.
2. **Per-flow health** — each `INTERACTION_ID` with success rate and latency.
3. **Backend dependency map** — error rate + latency for each of the 13
   GraphQL endpoints.
4. **Tenant skew** — top 20 tenants by traffic volume; alert on hot tenant.
5. **Auth/AuthZ funnel** — 401 rate, AuthZ deny rate, retry rate.
6. **Build/deploy** — last deploy time + version per env.
7. **Bundle size trend** — KB shipped, week over week.
8. **Cost** — log volume, RUM event volume.

You don't build all 8 yourself; you should know which exist and where to
look.

---

## 15. Things to learn for the OpEx interview round

Topics:
- **CI/CD pipeline design** — how to structure stages, gates, artifact
  promotion.
- **Deployment strategies** — blue/green, canary, rolling, feature-flag
  rollouts.
- **Monitoring vs observability** — monitoring asks known questions
  (dashboards); observability lets you ask new questions (high-cardinality
  data).
- **The three pillars of observability:** logs, metrics, traces.
- **SLI/SLO/SLA + error budgets** — Google SRE book is the canonical source.
- **Incident response basics** — IMOC roles, postmortem culture.
- **PagerDuty / on-call rotations.**
- **Chaos engineering** — Netflix's Chaos Monkey philosophy.
- **OpenTelemetry** — vendor-neutral observability standard.

Resources:
- *Site Reliability Engineering* (Google) — Chapters on monitoring,
  alerting, postmortems, error budgets. Free online.
- *The Site Reliability Workbook* (Google) — practical exercises.
- Charity Majors' blog on observability (especially "Observability for
  Frontend Developers").
- Honeycomb's observability docs — the most thoughtful vendor content.
- *Accelerate* (Forsgren et al.) — DORA metrics: deploy frequency, lead
  time, MTTR, change failure rate.

---

## 16. Interview-ready Q&A

### Q. How do you know your code works in production?

> "Three layers: synthetic perf checks in CI (Lighthouse) catch regressions
> deterministically. RUM via `sandbox.performance.startCustomerInteraction`
> measures real-user latency for every named flow — we see P50/P95/P99 per
> tenant, region, version in Splunk. And structured logs with
> `trace_id` propagation let me trace any single user's request across all
> backends. If a customer reports an issue, the trace ID gets me to the
> failing service in minutes."

### Q. Walk me through a P0 incident response.

> "First, severity assessment — how many users, what's broken, are writes
> safe? If allocation saves are double-creating, I want a write freeze
> immediately. Mitigation before root cause: feature-flag the new code path
> off, or rollback to the previous plugin version (config flip in DevPortal,
> not a redeploy). Then triage — Splunk dashboard for the failing
> interaction, slice by version/tenant/region. Once mitigated, postmortem:
> timeline, root cause via 5 whys, action items — and crucially, an alert
> for whatever didn't catch it this time. Blameless."

### Q. How do you avoid alert fatigue?

> "Three principles. One: page only on user-impact, not on internal blips
> that auto-recover. Two: every alert links to a runbook — if it doesn't,
> it's not actionable. Three: review alert noise weekly. Any alert that
> fired more than 3x without action gets tuned or deleted. We measure
> on-call health: pages per shift, false-positive rate. Sustained noise
> means we redesign the SLO, not desensitize the engineer."

### Q. How would you design observability for a brand new feature?

> "Start with the SLI question: what does success mean for this feature
> from the user's perspective? Pick one or two metrics (e.g. 'save success
> rate', 'time-to-first-result'). Wire RUM interactions for those. Add
> structured logs at the boundaries (entry, success, failure, with trace
> ID). Build a dashboard before launch. Set an SLO and an alert. Day one
> post-launch, watch the dashboard live — observability you don't watch
> early is observability you don't trust later."

---

## 17. The hierarchy of OpEx maturity

Where teams typically sit:

| Level | Behavior |
|---|---|
| **0. Reactive** | Customers report bugs; engineers find out via Slack |
| **1. Logged** | Logs exist somewhere; nobody reads them proactively |
| **2. Monitored** | Dashboards exist; on-call watches them |
| **3. Alerted** | Pages fire on user-impact metrics |
| **4. SLO-driven** | Error budgets gate feature work |
| **5. Predictive** | Anomaly detection catches issues before SLOs trip |

Most teams live at 2-3. Senior interviewers want to hear how you'd push
toward 4-5 — error budgets, SLO conversations, postmortem culture.

This codebase is well-tooled for level 3 (Splunk, RUM, Slack alerts). The
gap to 4 is **explicit SLOs and error budgets**, not more tools.
