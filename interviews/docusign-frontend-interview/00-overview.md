# DocuSign Frontend Interview Prep

## Interview Structure
| Round | Focus |
|-------|-------|
| Round 1 | Coding — React, TypeScript, Frontend |
| Round 2 | Problem Solving — JS Array/String manipulations (no graphs/trees) |
| Round 3 | System Design — Tech fit + Design |
| Round 4 | HM round — Culture & team fit |

## Special Focus Areas (per DocuSign brief)
1. **Authentication & Authorization** (client-side) → `01-authentication-authorization.md`
2. **Server-Side Rendering (SSR)** → `02-ssr-rendering-strategies.md`
3. **Web Performance** → `03-web-performance.md`
4. **CMS-Driven Experiences** → `04-cms-driven-experiences.md`
5. **Campaigns, Experimentation & A/B Testing** → `05-experimentation-ab-testing.md`

## Quick Reference Cheat Sheet

### Auth
- JWT → httpOnly cookies (not localStorage) for XSS safety
- PKCE flow for SPAs (replaces implicit grant)
- Axios interceptors for silent token refresh
- RBAC = permissions from token claims, enforced on server too

### SSR/Rendering
- App Router: Server Components by default, `'use client'` only for interactivity
- SSG + on-demand revalidation via webhook = best of static + freshness
- Streaming SSR via `<Suspense>` avoids blocking on slow data
- Middleware for auth redirect before HTML is sent (no flash)

### Performance
- LCP < 2.5s: preload hero, use `priority` on hero image
- INP < 200ms: break long tasks, avoid blocking main thread
- CLS < 0.1: always set image dimensions, reserve ad slot space
- Bundle: tree shake, dynamic imports, replace heavy deps (moment → date-fns)

### CMS
- Headless CMS = content API + any frontend framework
- On-demand ISR via CMS webhook = instant revalidation on publish
- Structured content (JSON doc) not raw HTML from CMS
- Draft Mode for preview of unpublished content

### A/B Testing
- Edge middleware for assignment = no FOOC flicker
- Track exposure only when variant is actually seen
- Mutex groups to prevent experiment conflicts
- Feature flags = gradual rollout + kill switch + A/B in one

## Other files to review
- `../react-interview/` — React concepts
- `../Typescript/` — TypeScript patterns
- `../system-design/` — System design patterns
