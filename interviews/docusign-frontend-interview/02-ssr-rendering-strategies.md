# Server-Side Rendering (SSR) & Rendering Strategies

## Q1. What are the different rendering strategies and when do you choose each?

**Answer:**

| Strategy | How it works | Use case |
|----------|-------------|----------|
| **CSR** (Client-Side Rendering) | Empty HTML shell, JS builds the DOM | Dashboards, admin panels (SEO not needed) |
| **SSR** (Server-Side Rendering) | HTML generated per request on server | Dynamic pages needing fresh data + SEO |
| **SSG** (Static Site Generation) | HTML generated at build time | Marketing pages, blogs, docs |
| **ISR** (Incremental Static Regeneration) | SSG + background revalidation on schedule | Content that changes occasionally (e-commerce PDPs) |
| **PPR** (Partial Prerendering) | Static shell + dynamic streaming slots | Next.js 14+ hybrid approach |

**Decision tree:**
- Content changes per request + SEO needed → **SSR**
- Content rarely changes + SEO needed → **SSG/ISR**
- No SEO required + user-specific content → **CSR**
- Mix of static + dynamic → **PPR or ISR**

---

## Q2. Explain how SSR works in Next.js (App Router vs Pages Router)

**Answer:**

**Pages Router (Legacy):**
```tsx
// getServerSideProps — runs on every request
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { params, req, res } = context;
  const data = await fetchData(params.id);

  return { props: { data } };
}

export default function Page({ data }: Props) {
  return <div>{data.title}</div>;
}
```

**App Router (Modern — Next.js 13+):**
```tsx
// Every Server Component renders on the server by default
// app/documents/[id]/page.tsx
async function DocumentPage({ params }: { params: { id: string } }) {
  // This runs on the server — no useEffect, no loading state
  const doc = await fetchDocument(params.id);

  return (
    <div>
      <h1>{doc.title}</h1>
      {/* Client Component for interactivity */}
      <SignButton docId={doc.id} />
    </div>
  );
}

// components/SignButton.tsx
'use client'; // opt-in to client-side JS
function SignButton({ docId }: { docId: string }) {
  return <button onClick={() => handleSign(docId)}>Sign</button>;
}
```

**Key difference:** App Router treats Server Components as the default — they reduce client JS bundle. Client Components are opt-in via `'use client'`.

---

## Q3. What is hydration and what causes hydration errors?

**Answer:**

**Hydration** is the process where React attaches event listeners and makes the server-rendered static HTML interactive on the client. React renders the component tree in the browser and reconciles it with the existing server-rendered HTML.

**Hydration mismatch causes:**
1. Using `typeof window !== 'undefined'` conditionally
2. Random values (Math.random(), Date.now()) in render
3. Browser extensions modifying the DOM
4. `localStorage` or cookies read during SSR vs CSR

```tsx
// BAD — causes hydration mismatch
function Component() {
  return <div>{Math.random()}</div>; // different on server vs client
}

// GOOD — defer client-only content
function Component() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null; // or a skeleton
  return <div>{Math.random()}</div>;
}
```

---

## Q4. How does Streaming SSR work and what are its benefits?

**Answer:**

Traditional SSR: server waits for ALL data before sending HTML — slow TTFB if one data source is slow.

**Streaming SSR** (React 18 + Next.js): send HTML in chunks as data resolves. Use `<Suspense>` to wrap slow parts.

```tsx
// app/page.tsx
export default function Page() {
  return (
    <div>
      {/* Sends immediately — static shell */}
      <Header />

      {/* Streams in when data is ready */}
      <Suspense fallback={<DocumentsSkeleton />}>
        <DocumentsList />  {/* async Server Component */}
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />  {/* slower data source */}
      </Suspense>
    </div>
  );
}
```

**Benefits:**
- First byte arrives faster (shell sent immediately)
- Progressive rendering — user sees content incrementally
- No waterfall blocking on slowest data source

---

## Q5. What is the difference between Server Components and Client Components?

**Answer:**

| | Server Components | Client Components |
|--|---|---|
| **Runs on** | Server only | Server (SSR) + Browser |
| **JS bundle** | Zero client JS | Added to bundle |
| **Can use** | async/await, DB, fs, env secrets | useState, useEffect, browser APIs, event handlers |
| **Cannot use** | Browser APIs, React hooks | Direct DB access, server secrets |

```tsx
// Server Component — fetches data, no bundle cost
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.users.findById(userId); // direct DB call!
  return <div>{user.name}</div>;
}

// Client Component — needs interactivity
'use client';
function ThemeToggle() {
  const [dark, setDark] = useState(false);
  return <button onClick={() => setDark(!dark)}>Toggle</button>;
}
```

**Rule of thumb:** Push as much as possible to Server Components. Only use `'use client'` for interactive leaf nodes.

---

## Q6. How do you handle authentication in SSR context?

**Answer:**

With SSR, you can read auth state on the server before rendering — no flash of unauthenticated content.

```tsx
// Next.js App Router with middleware
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};

// In Server Component — access session server-side
import { getServerSession } from 'next-auth';

async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect('/login');

  const data = await fetchUserData(session.user.id);
  return <Dashboard data={data} />;
}
```
