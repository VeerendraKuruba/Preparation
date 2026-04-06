# Next.js Learning Topics

---

## 1. Foundations

### What is Next.js and why use it over plain React?
Next.js is a React framework built by Vercel. Plain React is a UI library — it handles rendering but you need to wire up routing, data fetching, SSR, and bundling yourself. Next.js bundles all of this:
- **File-based routing** — no need for React Router
- **SSR / SSG / ISR** — SEO-friendly rendering out of the box
- **API routes** — backend endpoints in the same repo
- **Image/font optimization** — automatic performance wins
- **TypeScript, ESLint, Tailwind** — zero-config setup

Use Next.js when you need SEO, performance, or a full-stack solution. Use plain React (Vite/CRA) for SPAs that don't need SSR.

---

### File-based routing
Next.js maps the file system to URLs automatically:
```
app/
  page.tsx          → /
  about/page.tsx    → /about
  blog/[slug]/page.tsx → /blog/:slug
```
No router config required. Every `page.tsx` is a route. Every `layout.tsx` wraps child routes.

---

### Pages Router vs App Router (Next.js 13+)

| | Pages Router | App Router |
|---|---|---|
| Directory | `pages/` | `app/` |
| Default component type | Client Component | Server Component |
| Data fetching | `getServerSideProps`, `getStaticProps` | `fetch()` directly in components |
| Layouts | `_app.tsx` (one global layout) | Nested `layout.tsx` per route |
| Streaming | Not supported | Full Suspense streaming |
| Server Actions | No | Yes |

App Router is the current standard. Pages Router still works and is not deprecated.

---

### Project structure and conventions
```
my-app/
  app/
    layout.tsx        ← root layout (required)
    page.tsx          ← home route
    globals.css
  public/             ← static assets (images, icons)
  components/         ← shared components
  lib/                ← utilities, DB clients
  .env.local          ← environment variables
  next.config.ts      ← Next.js config
  tailwind.config.ts
```
`app/` is the routing root. Everything outside it is shared code.

---

## 2. Routing (App Router)

### `app/` directory structure
Every folder inside `app/` represents a URL segment. A folder becomes a route only when it contains a `page.tsx`. A `layout.tsx` wraps all routes in that folder and its children.

```
app/
  layout.tsx       ← wraps everything
  page.tsx         → /
  dashboard/
    layout.tsx     ← wraps dashboard routes
    page.tsx       → /dashboard
    settings/
      page.tsx     → /dashboard/settings
```

---

### Nested routes and layouts (`layout.tsx`)
Layouts persist across navigations — they don't re-render when a child route changes. This is ideal for nav bars, sidebars, and shells.

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```
`children` is whatever `page.tsx` is active inside that segment.

---

### Dynamic routes
```
app/blog/[slug]/page.tsx        → /blog/my-post
app/shop/[...slug]/page.tsx     → /shop/a/b/c  (catches all)
app/shop/[[...slug]]/page.tsx   → /shop  AND  /shop/a/b  (optional catch-all)
```
Access params in the component:
```tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <h1>{params.slug}</h1>;
}
```

---

### Route groups `(groupName)`
Parentheses in a folder name create a route group — it organizes files without affecting the URL.

```
app/
  (marketing)/
    layout.tsx    ← marketing layout (no auth)
    page.tsx      → /
    about/page.tsx → /about
  (dashboard)/
    layout.tsx    ← dashboard layout (requires auth)
    settings/page.tsx → /settings
```
`(marketing)` and `(dashboard)` don't appear in the URL.

---

### Parallel routes (`@slot`)
Render multiple pages simultaneously in the same layout. Common for dashboards or modals.

```
app/
  layout.tsx
  @analytics/
    page.tsx
  @team/
    page.tsx
```
```tsx
// layout.tsx receives named slots as props
export default function Layout({ analytics, team }) {
  return (
    <div>
      {analytics}
      {team}
    </div>
  );
}
```

---

### Intercepting routes
Intercept a route so it renders in a modal/overlay while keeping the URL updated. Uses `(.)`, `(..)`, `(...)` conventions (relative path matching).

Example: clicking a photo opens a modal at `/photo/1` while `/feed` stays in the background. Deep-linking to `/photo/1` shows the full page instead.

---

### Loading UI (`loading.tsx`)
Create a `loading.tsx` next to `page.tsx` — Next.js automatically wraps the page in `<Suspense>` using this as the fallback.

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <Skeleton />;
}
```
Shown instantly while async Server Component data is being fetched. No extra code needed.

---

### Error boundaries (`error.tsx`)
`error.tsx` must be a Client Component. It catches errors thrown inside that route segment.

```tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```
`reset()` re-renders the segment. Use `global-error.tsx` for root layout errors.

---

### Not found pages (`not-found.tsx`)
Call `notFound()` from `next/navigation` inside a Server Component to trigger the 404 UI:

```tsx
import { notFound } from 'next/navigation';

const post = await getPost(slug);
if (!post) notFound(); // renders not-found.tsx
```
Place `not-found.tsx` in the relevant segment or at the `app/` root for a global 404.

---

## 3. Rendering Strategies

### Server Components (RSC)
Default in App Router. Run only on the server — never shipped to the browser. Can:
- Access databases, file system, environment secrets directly
- Import heavy server-only libraries without affecting bundle size

Cannot:
- Use hooks (`useState`, `useEffect`)
- Use browser APIs
- Attach event handlers

```tsx
// This runs on the server — no client JS sent
export default async function ProductList() {
  const products = await db.product.findMany(); // direct DB call
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

---

### Client Components (`"use client"`)
Add `"use client"` at the top of the file. The component and all its imports become client-side JS.

```tsx
"use client";
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```
**Key rule:** Push `"use client"` as deep in the tree as possible. A Server Component can import a Client Component, but not vice versa (you can pass Server Components as `children` props though).

---

### Static Site Generation (SSG)
Pages are rendered at build time. Default behavior when no dynamic data is involved.

```tsx
// App Router: just fetch with force-cache (default)
const data = await fetch('https://api.example.com/posts', {
  cache: 'force-cache'
});
```
Result: HTML generated once, served from CDN. Fastest possible delivery.

---

### Server-Side Rendering (SSR)
Page rendered fresh on every request.

```tsx
// App Router: opt out of caching
const data = await fetch('https://api.example.com/user', {
  cache: 'no-store'
});
```
Use when data changes per-request (user-specific data, live prices).

---

### Incremental Static Regeneration (ISR)
Static page that automatically regenerates in the background after a set interval.

```tsx
const data = await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 } // regenerate after 60 seconds
});
```
Stale-while-revalidate: users always get a fast static response; the page updates silently in the background.

---

### Streaming with Suspense
Break a page into chunks that stream to the browser as they resolve. Slow data doesn't block fast data.

```tsx
export default function Page() {
  return (
    <>
      <HeroSection />  {/* renders immediately */}
      <Suspense fallback={<Skeleton />}>
        <SlowProductList />  {/* streams in when ready */}
      </Suspense>
    </>
  );
}
```

---

## 4. Data Fetching

### `fetch()` in Server Components with caching options
```tsx
// Static (cached forever — SSG)
const res = await fetch(url, { cache: 'force-cache' });

// Dynamic (never cached — SSR)
const res = await fetch(url, { cache: 'no-store' });

// ISR — revalidate every 60s
const res = await fetch(url, { next: { revalidate: 60 } });

// Tag-based — invalidate manually
const res = await fetch(url, { next: { tags: ['products'] } });
```

---

### `revalidatePath` and `revalidateTag`
Used for on-demand ISR — invalidate cached data programmatically (e.g., after a CMS update).

```tsx
import { revalidatePath, revalidateTag } from 'next/cache';

// Invalidate a specific path
revalidatePath('/products');

// Invalidate all fetches tagged 'products'
revalidateTag('products');
```
Typically called inside Server Actions or Route Handlers triggered by a webhook.

---

### `use()` hook in Client Components
Pass a promise from a Server Component to a Client Component and unwrap it with `use()`.

```tsx
// Server Component
const dataPromise = fetchData(); // don't await
<ClientComp promise={dataPromise} />

// Client Component
"use client";
import { use } from 'react';
function ClientComp({ promise }) {
  const data = use(promise); // suspends until resolved
  return <div>{data.title}</div>;
}
```

---

### React Query / SWR with Next.js
For client-side data fetching with caching, polling, and optimistic updates:
- **SWR** — lightweight, from Vercel, great for simple cases
- **React Query (TanStack Query)** — more powerful, better devtools

Pattern: prefetch on the server (for initial HTML), hydrate on the client for interactivity.

```tsx
// SWR example
"use client";
import useSWR from 'swr';
const { data, isLoading } = useSWR('/api/user', fetcher);
```

---

## 5. Server Actions

### Defining server actions (`"use server"`)
Server Actions are async functions that run on the server, callable from the client.

```tsx
// Inline in a Server Component
async function createPost(formData: FormData) {
  "use server";
  await db.post.create({ title: formData.get('title') as string });
}

// Or in a dedicated file (actions.ts)
"use server";
export async function deletePost(id: string) {
  await db.post.delete({ where: { id } });
  revalidatePath('/posts');
}
```

---

### Form submissions with server actions
Pass a server action directly to a form's `action` prop — no API route needed.

```tsx
// app/new-post/page.tsx (Server Component)
import { createPost } from './actions';

export default function Page() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Post title" />
      <button type="submit">Create</button>
    </form>
  );
}
```
Works without JavaScript (progressive enhancement).

---

### Mutations and optimistic updates
Use `useOptimistic` to update UI instantly before the server responds:

```tsx
"use client";
import { useOptimistic } from 'react';

export function TodoList({ todos, addTodo }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(todos);

  async function handleAdd(formData) {
    const title = formData.get('title');
    addOptimistic([...optimisticTodos, { title, pending: true }]);
    await addTodo(formData); // server action
  }

  return <form action={handleAdd}>...</form>;
}
```

---

### `useFormState` and `useFormStatus`
```tsx
"use client";
import { useFormStatus, useFormState } from 'react-dom';

// useFormStatus — tracks pending state of parent form
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>;
}

// useFormState — captures server action return value (e.g. errors)
const [state, formAction] = useFormState(createPost, { error: null });
```

---

## 6. API Routes

### Route handlers (`route.ts`) in App Router
Place a `route.ts` in any `app/` folder. It handles HTTP requests to that path.

```ts
// app/api/posts/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const posts = await db.post.findMany();
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const post = await db.post.create({ data: body });
  return NextResponse.json(post, { status: 201 });
}
```
`app/api/posts/route.ts` → `/api/posts`

---

### HTTP methods: GET, POST, PUT, DELETE
Export named functions for each method you want to support. Unimplemented methods return 405 automatically.

```ts
export async function GET(req: Request, { params }: { params: { id: string } }) {}
export async function PUT(req: Request, { params }: { params: { id: string } }) {}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {}
```

---

### Middleware (`middleware.ts`)
Runs before every request, at the Edge. Used for auth guards, redirects, and header injection.

```ts
// middleware.ts (at project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*'], // apply only to these paths
};
```

---

### Edge vs Node.js runtime
```ts
// Force Edge runtime for a route handler
export const runtime = 'edge';

// Default is Node.js runtime
```
| | Edge | Node.js |
|---|---|---|
| Start time | ~0ms (no cold start) | Slower cold start |
| APIs available | Subset (no `fs`, `child_process`) | Full Node.js |
| Location | CDN edge nodes globally | Single region |
| Use case | Auth checks, redirects, geo | DB queries, heavy computation |

---

## 7. Metadata & SEO

### Static metadata
```tsx
// app/about/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn more about our company.',
};
```

---

### Dynamic metadata with `generateMetadata()`
```tsx
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      images: [post.coverImage],
    },
  };
}
```
Runs on the server before rendering. Deduplicates fetch calls automatically if the same URL is fetched in the page component.

---

### Open Graph & Twitter cards
```tsx
export const metadata: Metadata = {
  openGraph: {
    title: 'My Post',
    description: 'Post description',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Post',
  },
};
```

---

### `robots.ts` and `sitemap.ts`
```ts
// app/robots.ts
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin/' },
    sitemap: 'https://example.com/sitemap.xml',
  };
}

// app/sitemap.ts
export default async function sitemap() {
  const posts = await getPosts();
  return posts.map(post => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: post.updatedAt,
  }));
}
```

---

## 8. Images & Fonts

### `next/image`
```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority          // don't lazy load above-the-fold images
  placeholder="blur" // show blurred version while loading
/>
```
What it does automatically:
- Converts to WebP/AVIF
- Resizes to the exact `width`/`height` requested
- Lazy loads (unless `priority`)
- Reserves space to prevent CLS (Cumulative Layout Shift)

For external images, add the domain to `next.config.ts`:
```ts
images: { remotePatterns: [{ hostname: 'images.example.com' }] }
```

---

### `next/font`
Zero layout shift — fonts are inlined as CSS variables at build time.

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```
Self-hosted automatically — no request made to Google at runtime (GDPR-friendly).

---

## 9. Authentication

### NextAuth.js / Auth.js v5
The standard auth library for Next.js. Handles sessions, OAuth, credentials, and JWT/database sessions.

```ts
// auth.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
});

// app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/auth';
```

---

### Session strategies
- **JWT** — session stored in a cookie (stateless, no DB needed, fast)
- **Database** — session stored in DB (can invalidate instantly, more secure)

```ts
NextAuth({
  session: { strategy: 'jwt' }, // or 'database'
})
```

---

### Protecting routes with middleware
```ts
// middleware.ts
import { auth } from '@/auth';

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith('/dashboard')) {
    return Response.redirect(new URL('/login', req.url));
  }
});
```

---

### OAuth providers
```ts
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

NextAuth({ providers: [GitHub, Google] })
```
Set `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` in `.env.local`. Auth.js reads them automatically.

---

## 10. Performance & Optimization

### Code splitting and lazy loading (`next/dynamic`)
Next.js splits code by route automatically. For component-level splitting:

```tsx
import dynamic from 'next/dynamic';

// Lazy load — not included in initial bundle
const HeavyEditor = dynamic(() => import('./Editor'));

// Disable SSR — for browser-only components
const Map = dynamic(() => import('./Map'), { ssr: false });

// With loading state
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <Spinner />,
});
```

---

### Bundle analysis
```bash
npm install @next/bundle-analyzer
```
```ts
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
module.exports = withBundleAnalyzer({});
```
Run `npm run build` — opens a visual treemap of your bundle. Look for unexpectedly large dependencies.

---

### Prefetching with `<Link>`
```tsx
import Link from 'next/link';

<Link href="/dashboard">Dashboard</Link>
```
In production, Next.js prefetches the linked route's JS when the link is visible in the viewport. Navigation feels instant. Disable with `prefetch={false}` if a route is rarely visited.

---

### Script loading strategies (`next/script`)
```tsx
import Script from 'next/script';

// afterInteractive — after page hydrates (analytics, chat widgets)
<Script src="https://analytics.example.com/script.js" strategy="afterInteractive" />

// lazyOnload — during browser idle time
<Script src="..." strategy="lazyOnload" />

// beforeInteractive — blocks hydration (rarely needed)
<Script src="..." strategy="beforeInteractive" />
```

---

### React `cache()` and memoization
Deduplicate identical DB/fetch calls within a single request:

```ts
import { cache } from 'react';

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

// Called in layout.tsx AND page.tsx — only one DB query runs
```

---

## 11. Deployment

### Vercel deployment
The simplest path — Vercel is built by the Next.js team:
1. Push to GitHub
2. Import repo at vercel.com
3. Set environment variables in the dashboard
4. Auto-deploys on every push; preview URLs for every PR

---

### Self-hosting (Node.js server / Docker)
```bash
npm run build    # creates .next/ output
npm run start    # starts Node.js server on port 3000
```
Docker:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
CMD ["npm", "start"]
```

---

### Static export (`output: 'export'`)
```ts
// next.config.ts
export default { output: 'export' }
```
Generates a fully static `out/` directory. Deploy to S3, GitHub Pages, Nginx — no Node.js server needed.

Limitations: no SSR, no API routes, no middleware, no ISR, no image optimization (server-based).

---

### Environment variables
```
.env.local          ← never committed, overrides everything
.env.production     ← production defaults
.env.development    ← dev defaults
```
- `MY_SECRET=abc` → server-only
- `NEXT_PUBLIC_API_URL=https://...` → exposed to the browser

Access: `process.env.MY_SECRET` (server), `process.env.NEXT_PUBLIC_API_URL` (anywhere).

---

## 12. Advanced Topics

### Middleware — auth guards, redirects, A/B testing
```ts
// A/B testing example
export function middleware(req: NextRequest) {
  const bucket = Math.random() < 0.5 ? 'a' : 'b';
  const res = NextResponse.next();
  res.cookies.set('ab-bucket', bucket);
  return res;
}
```
Middleware runs at the Edge before every request. Keep it lightweight — no DB calls.

---

### Edge runtime and Edge API routes
```ts
// Any route handler or page
export const runtime = 'edge';
```
Edge functions run in Cloudflare/Vercel Edge Network nodes globally. They use the Web APIs (`Request`, `Response`, `fetch`) — not Node.js APIs. Ideal for: auth, geo-routing, fast API responses. Not for: filesystem access, native Node modules, long-running tasks.

---

### Internationalization (i18n)
Next.js has built-in i18n routing:
```ts
// next.config.ts
i18n: {
  locales: ['en', 'fr', 'de'],
  defaultLocale: 'en',
}
```
URLs become `/fr/about`, `/de/about`. Access current locale via `useRouter().locale` (Pages Router) or middleware (App Router).

For App Router, the recommended pattern is a `[locale]` dynamic segment:
```
app/[locale]/
  page.tsx
  layout.tsx
```

---

### Monorepo setups with Next.js (Turborepo)
```
apps/
  web/       ← Next.js app
  admin/     ← another Next.js app
packages/
  ui/        ← shared component library
  utils/     ← shared utilities
turbo.json
```
Turborepo caches build outputs and runs tasks in parallel across packages. `turbo build` only rebuilds packages that changed.

---

### Testing

**Unit / Integration — Jest + React Testing Library:**
```tsx
// __tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import Button from '@/components/Button';

test('renders button', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

**E2E — Playwright:**
```ts
// e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible();
});
```

---

### Custom `_document` and `_app` (Pages Router only)
- `_document.tsx` — customize the outer HTML shell (`<html>`, `<head>`, `<body>`). Runs only on the server.
- `_app.tsx` — wraps every page. Used for global styles, providers (Redux, theme), persistent layouts.

```tsx
// pages/_app.tsx
export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
```
In App Router, these are replaced by `app/layout.tsx`.
