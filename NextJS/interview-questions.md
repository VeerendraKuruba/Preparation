# Next.js Interview Questions

---

## Core Concepts

**Q1. What is Next.js and what problems does it solve over plain React?**
Next.js is a React framework that adds server-side rendering, file-based routing, API routes, and build optimizations out of the box. It solves SEO (React apps are client-rendered by default), performance (SSR/SSG), and routing boilerplate issues.

---

**Q2. What is the difference between the Pages Router and the App Router?**

| | Pages Router | App Router (Next 13+) |
|---|---|---|
| Directory | `pages/` | `app/` |
| Default rendering | Client + SSR via `getServerSideProps` | Server Components by default |
| Layouts | `_app.tsx` (global only) | Nested `layout.tsx` per route |
| Data fetching | `getStaticProps`, `getServerSideProps` | `fetch()` in Server Components |
| Streaming | Limited | Full Suspense streaming support |

---

**Q3. What are React Server Components (RSC)?**
RSCs run only on the server — they can directly access databases, file system, and secrets. They do not ship JavaScript to the client, reducing bundle size. They cannot use hooks, event handlers, or browser APIs. In Next.js App Router, all components are Server Components by default.

---

**Q4. When do you use `"use client"`?**
Add `"use client"` when a component needs:
- React hooks (`useState`, `useEffect`, `useContext`)
- Browser APIs (`window`, `localStorage`)
- Event listeners
- Third-party client-side libraries

Keep `"use client"` boundaries as low in the tree as possible to maximize server rendering.

---

**Q5. Explain the different data fetching / caching options in Next.js.**
```js
// Static — cached forever (SSG equivalent)
fetch(url, { cache: 'force-cache' })

// Dynamic — no cache (SSR equivalent)
fetch(url, { cache: 'no-store' })

// ISR — revalidate every N seconds
fetch(url, { next: { revalidate: 60 } })

// Tag-based revalidation
fetch(url, { next: { tags: ['products'] } })
// Then invalidate on demand:
revalidateTag('products')
```

---

## Rendering

**Q6. What is the difference between SSR, SSG, and ISR?**
- **SSR** — HTML generated per request on the server. Always fresh, slower TTFB.
- **SSG** — HTML generated at build time. Fastest, but stale until rebuild.
- **ISR** — HTML generated at build time but can be revalidated in the background after a set interval. Best of both.

---

**Q7. What is Streaming in Next.js and how do you use it?**
Streaming sends HTML to the browser in chunks as it becomes ready, rather than waiting for all data. Use `<Suspense>` with a `fallback` to wrap slow components. Next.js automatically streams with the App Router.

```jsx
<Suspense fallback={<Spinner />}>
  <SlowDataComponent />
</Suspense>
```

---

**Q8. How does `loading.tsx` work?**
`loading.tsx` placed next to a `page.tsx` automatically wraps that page in a `<Suspense>` boundary. It shows immediately while the page's async data is being fetched — no manual Suspense needed.

---

## Routing

**Q9. What are route groups and why are you use them?**
Route groups use `(folderName)` syntax. They let you organize routes without affecting the URL path, and apply different layouts to different groups of routes.

```
app/
  (marketing)/
    layout.tsx   ← marketing layout
    page.tsx     → /
  (dashboard)/
    layout.tsx   ← dashboard layout
    settings/
      page.tsx   → /settings
```

---

**Q10. What is the difference between `redirect()` and `useRouter().push()` in Next.js?**
- `redirect()` — server-side, used in Server Components or server actions. Throws internally, so call it outside try/catch.
- `useRouter().push()` — client-side, used in Client Components for programmatic navigation.

---

**Q11. What are parallel routes?**
Parallel routes (`@slot`) allow rendering multiple pages in the same layout simultaneously. Common use case: dashboards with multiple panels, or modals that keep the background page visible.

---

## Server Actions

**Q12. What are Server Actions?**
Server Actions are async functions marked with `"use server"` that run on the server. They can be called directly from forms or Client Components, handling mutations without writing a separate API route.

```jsx
// Server Component
async function createUser(formData: FormData) {
  "use server";
  await db.user.create({ name: formData.get('name') });
  revalidatePath('/users');
}

<form action={createUser}>
  <input name="name" />
  <button type="submit">Create</button>
</form>
```

---

**Q13. How do you handle optimistic updates with Server Actions?**
Use the `useOptimistic` hook to show a temporary UI update immediately, then reconcile with the server response.

```jsx
const [optimisticList, addOptimistic] = useOptimistic(list);

async function handleAdd(item) {
  addOptimistic(item); // instant UI update
  await addItemAction(item); // server call
}
```

---

## Performance

**Q14. How does `next/image` optimize images?**
- Automatically serves modern formats (WebP, AVIF)
- Resizes images to the requested size
- Lazy loads by default
- Prevents Cumulative Layout Shift (CLS) via reserved space
- Serves from a CDN if deployed on Vercel

---

**Q15. What is `next/dynamic` and when do you use it?**
`next/dynamic` is like `React.lazy` but with SSR control. Use it to lazy-load heavy Client Components or disable SSR for components that rely on browser APIs.

```jsx
const HeavyChart = dynamic(() => import('./Chart'), { ssr: false });
```

---

**Q16. How does prefetching work with `<Link>`?**
`<Link>` prefetches the linked route's JavaScript chunks when the link enters the viewport (in production). This makes navigation feel instant. You can disable it with `prefetch={false}`.

---

## Middleware & Auth

**Q17. What can you do with `middleware.ts`?**
Middleware runs on every request before the page is rendered (at the Edge). Use it for:
- Auth guards / redirects
- Geo-based routing
- A/B testing
- Rate limiting
- Adding response headers

---

**Q18. How do you protect routes in Next.js?**
Three approaches:
1. **Middleware** — redirect unauthenticated users before the page renders (most efficient)
2. **Server Component** — check session in the component, redirect with `redirect()`
3. **Client Component** — check session and redirect with `useRouter` (flicker risk)

---

## Advanced

**Q19. What is the difference between `generateStaticParams` and `getStaticPaths`?**
`generateStaticParams` is the App Router equivalent of `getStaticPaths`. It returns an array of param objects that Next.js uses to statically generate dynamic routes at build time.

```js
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(p => ({ slug: p.slug }));
}
```

---

**Q20. How do environment variables work in Next.js?**
- Variables in `.env.local` are only available server-side by default.
- Prefix with `NEXT_PUBLIC_` to expose them to the browser bundle.
- Never put secrets in `NEXT_PUBLIC_` variables — they are visible to anyone.

---

**Q21. What is `unstable_cache` / `cache()` in Next.js?**
`cache()` (from React) memoizes a function's result per request — useful for deduplicating DB calls within a single render. `unstable_cache` (Next.js) persists the result across requests with optional revalidation tags, similar to tagged `fetch` caching.

---

**Q22. How would you implement ISR on-demand revalidation?**
Use `revalidateTag` or `revalidatePath` in a Route Handler or Server Action:

```js
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';

export async function POST(req: Request) {
  const { tag } = await req.json();
  revalidateTag(tag);
  return Response.json({ revalidated: true });
}
```

---

**Q23. What are the trade-offs of static export (`output: 'export'`) in Next.js?**
- Generates a fully static site — no server required (deploy to S3, GitHub Pages).
- Loses: SSR, API routes, ISR, middleware, image optimization (server-based), cookies.
- Good for pure content sites with no dynamic server logic.

---

**Q24. How do you handle errors in Next.js App Router?**
- `error.tsx` — catches errors within a route segment, must be a Client Component.
- `global-error.tsx` — catches errors in the root layout.
- `notFound()` + `not-found.tsx` — for 404 scenarios.

---

**Q25. What is the Turbopack and how does it affect Next.js dev experience?**
Turbopack is a Rust-based bundler (successor to Webpack) integrated into Next.js. It dramatically speeds up local development server start and HMR (Hot Module Replacement). As of Next.js 15, it is stable for `next dev`.
