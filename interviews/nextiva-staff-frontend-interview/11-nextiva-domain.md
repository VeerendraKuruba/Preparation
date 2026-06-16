# Nextiva Domain & Company Context

---

## Company Overview

| Fact | Detail |
|------|--------|
| Founded | 2008, Scottsdale, Arizona |
| Category | Unified Communications + Customer Experience (UCaaS / CXM) |
| Product | **NextOS** — voice, video, chat, SMS, email, social in one platform |
| AI | **XBert** — agentic AI for calls, texts, chat, email; routing, transcription |
| Funding | $200M Goldman Sachs (2021) — AI innovation, global expansion |
| Customers | Businesses of all sizes — SMB to enterprise |
| Engineering culture | Agile, collaborative, customer-obsessed, production accountability |

---

## Product Surfaces (Frontend-Relevant)

| Surface | UX challenges |
|---------|---------------|
| **Agent desktop** | Real-time inbox, call controls, presence, CRM sidebar |
| **Admin portal** | User management, IVR config, analytics dashboards |
| **Video meetings** | WebRTC UI, screen share, participant grid |
| **Live chat widget** | Embeddable, low bundle weight, cross-origin |
| **Mobile apps** | React Native (preferred qual) — shared patterns with web |
| **Integrations UI** | Salesforce, HubSpot, Zendesk connection flows |

---

## Technical Context (Full Stack Awareness)

You won't own backend, but Staff FE should understand the system:

```
┌─────────────┐     REST/GraphQL      ┌──────────────────┐
│  React SPA  │ ◄──────────────────► │  Java/Spring API  │
│  (this role)│                       │  Microservices   │
└──────┬──────┘                       └────────┬─────────┘
       │ WebSocket                              │
       ▼                                        ▼
┌─────────────┐                       ┌──────────────────┐
│  Real-time  │                       │ MongoDB, Redis   │
│  Gateway    │                       │ AWS / GCP, K8s   │
└─────────────┘                       └──────────────────┘
```

- **Backend:** Java 17+, Spring Boot, WebFlux (reactive), MongoDB, Redis
- **Real-time:** WebSocket for messaging; SIP/WebRTC for voice/video
- **DevOps:** Kubernetes, Docker, CI/CD, Datadog observability
- **Workflow:** Jira, Confluence, Bitbucket (Atlassian stack)

---

## Why Nextiva? — Sample Answers

### Version A (Product mission)

> "Nextiva sits at the intersection of real-time communications and AI-driven customer experience — exactly where I want to apply my frontend expertise. Building agent-facing UIs where latency, reliability, and clarity directly impact how businesses serve customers is high-leverage work. The Staff role's focus on modernization, design systems, and platform architecture aligns with what I've been driving at [your company]."

### Version B (Technical fit)

> "The JD reads like problems I've solved — monorepo tooling, TanStack for server state, headless design system primitives, WebSocket-driven inbox UIs. I'm excited to help evolve a unified platform where web, and potentially extension/mobile, share the same component foundation. Nextiva's scale in unified communications is a domain where frontend architecture decisions really matter."

### Version C (Growth + AI)

> "The Goldman Sachs investment and XBert AI push signal Nextiva is investing heavily in the next generation of the platform — not maintaining legacy. I want to be part of modernizing the frontend stack while the company is actively transforming, where Staff engineers can shape patterns that last."

---

## Domain Vocabulary to Know

| Term | Meaning |
|------|---------|
| **UCaaS** | Unified Communications as a Service |
| **CXM** | Customer Experience Management |
| **VoIP** | Voice over IP — cloud phone |
| **IVR** | Interactive Voice Response — phone menu trees |
| **ACD** | Automatic Call Distribution — queue routing |
| **WebRTC** | Browser real-time audio/video |
| **Presence** | Online/away/on-call status |
| **Omnichannel** | Single inbox across voice, chat, SMS, email |

---

## Frontend Challenges Specific to Communications

1. **Real-time at scale** — thousands of events/minute per agent
2. **Multi-modal UI** — switch between chat and active call without losing context
3. **Low latency perception** — optimistic UI for messages; instant call state feedback
4. **Reliability** — reconnect, offline queue, graceful degradation
5. **Accessibility** — agents may rely on keyboard/screen reader during calls
6. **Integrations** — CRM data alongside conversation (Salesforce embed patterns)
7. **White-label / multi-tenant** — theming per customer org
8. **Browser extension** — click-to-call, screen pop (preferred qual)

---

## Competitive Landscape (Light Awareness)

| Company | Overlap |
|---------|---------|
| RingCentral | UCaaS competitor |
| Zoom Phone | Video + phone |
| Five9 / Genesys | Contact center |
| Intercom / Zendesk | Messaging support |
| Dialpad | AI + communications |

**Differentiator to mention:** Nextiva's unified NextOS platform + XBert AI across channels.

---

## What "Modernization" Likely Means

Based on JD language ("drive evolution," "modernization of web applications"):

- Legacy UI → React + TypeScript strict
- Ad-hoc components → shared design system (Radix + Tailwind + Storybook)
- Scattered state → TanStack Query + clear client/server split
- Monolith frontend → monorepo with Turborepo/pnpm
- Improved CI/CD — affected builds, preview deploys
- Real-time architecture standardization

**Interview tip:** Ask "What does modernization mean for your team right now?" — shows you've read the JD.

---

## Integration Points to Discuss

- **CRM:** Salesforce, HubSpot — contact sync, screen pop on incoming call
- **Helpdesk:** Zendesk, ServiceNow — ticket creation from conversation
- **Productivity:** Microsoft Teams, Google Workspace
- **REST APIs** for custom integrations

**Frontend angle:** OAuth connection flows, iframe embeds, webhook status UI, error handling per integration.

---

## Security & Compliance Awareness

- **SOC 2** common in communications SaaS
- Call recording consent UI
- PII handling in logs and error reports (Sentry scrubbing)
- CSP for embeddable chat widget
- XSS prevention in message rendering (sanitize HTML)

---

## Role-Specific Success Metrics (Ask Them)

- Design system adoption rate
- Core Web Vitals on agent desktop
- Build/deploy frequency and lead time
- Frontend incident rate / MTTR
- Developer satisfaction (DX surveys)
