🔹 SUSPENSE: AVOIDING JARRING UI FALLBACKS

Suspense lets components "wait" for something before rendering, showing a fallback
UI. Understanding how to use it effectively prevents jarring loading states and
creates smooth user experiences.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS SUSPENSE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Suspense is a React component that lets you declaratively specify loading states
for components that are waiting for data.

Basic Usage:
```javascript
import { Suspense } from 'react';

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ComponentThatFetchesData />
    </Suspense>
  );
}
```

What It Does:
• Shows fallback while component is loading
• Declarative loading states
• Prevents jarring UI changes
• Works with React.lazy, data fetching libraries

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ SUSPENSE WITH REACT.LAZY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Suspense works with React.lazy for code splitting:

```javascript
import { lazy, Suspense } from 'react';

// Lazy load component
const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading component...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

How It Works:
```
1. Component starts loading
2. Suspense shows fallback
3. Component loads
4. Suspense shows component
```

Benefits:
• Code splitting
• Better performance
• Smooth loading states
• No jarring transitions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ SUSPENSE FOR DATA FETCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Suspense works with data fetching libraries (React Query, SWR, Relay):

```javascript
// With React Query
import { useSuspenseQuery } from '@tanstack/react-query';

function UserProfile({ userId }) {
  const { data: user } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  });
  
  return <div>{user.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserProfile userId={1} />
    </Suspense>
  );
}
```

How It Works:
```
1. Component tries to read data
2. Data not ready → Suspense shows fallback
3. Data loads
4. Component renders with data
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ NESTED SUSPENSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can nest Suspense boundaries for granular loading:

```javascript
function App() {
  return (
    <Suspense fallback={<AppSkeleton />}>
      <Header />
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />
      </Suspense>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <Footer />
    </Suspense>
  );
}
```

Benefits:
• Granular loading states
• Show content as it loads
• Better perceived performance
• No blocking on slow parts

Example: Progressive Loading
```javascript
function Page() {
  return (
    <div>
      <Header />  {/* Loads immediately */}
      <Suspense fallback={<ArticleSkeleton />}>
        <Article />  {/* Loads separately */}
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />  {/* Loads separately */}
      </Suspense>
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ AVOIDING JARRING FALLBACKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: Jarring Fallback
```javascript
// ❌ Bad: Abrupt change
function Component() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(setData);
  }, []);
  
  if (!data) return <div>Loading...</div>;  // Abrupt change
  
  return <div>{data.content}</div>;  // Sudden appearance
}
```

Solution: Suspense
```javascript
// ✅ Good: Smooth transition
function Component() {
  const data = useSuspenseQuery(/* ... */);
  return <div>{data.content}</div>;
}

function App() {
  return (
    <Suspense fallback={<Skeleton />}>  {/* Matches layout */}
      <Component />
    </Suspense>
  );
}
```

Skeleton Screens:
```javascript
function UserSkeleton() {
  return (
    <div className="user-skeleton">
      <div className="avatar-skeleton" />
      <div className="name-skeleton" />
      <div className="bio-skeleton" />
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<UserSkeleton />}>
      <UserProfile />
    </Suspense>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ SUSPENSE WITH TRANSITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Combine Suspense with useTransition for smooth navigation:

```javascript
function App() {
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState('home');
  
  function navigate(newPage) {
    startTransition(() => {
      setPage(newPage);
    });
  }
  
  return (
    <div>
      <nav>
        <button onClick={() => navigate('home')}>Home</button>
        <button onClick={() => navigate('about')}>About</button>
      </nav>
      <Suspense fallback={<PageSkeleton />}>
        {isPending && <div>Loading...</div>}
        <PageContent page={page} />
      </Suspense>
    </div>
  );
}
```

Benefits:
• Smooth navigation
• Show previous content while loading
• Better UX
• No blank screens

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ ERROR BOUNDARIES WITH SUSPENSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wrap Suspense with Error Boundaries:

```javascript
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<LoadingPage />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}
```

Why:
• Suspense handles loading
• Error Boundary handles errors
• Both needed for complete solution

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ BEST PRACTICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. Use Skeleton Screens:**
```javascript
// ✅ Good: Matches layout
<Suspense fallback={<UserSkeleton />}>
  <UserProfile />
</Suspense>

// ❌ Bad: Generic loading
<Suspense fallback={<div>Loading...</div>}>
  <UserProfile />
</Suspense>
```

**2. Place Strategically:**
```javascript
// ✅ Good: Granular boundaries
<Suspense fallback={<HeaderSkeleton />}>
  <Header />
</Suspense>
<Suspense fallback={<ContentSkeleton />}>
  <Content />
</Suspense>
```

**3. Combine with Error Boundaries:**
```javascript
// ✅ Good: Handle both loading and errors
<ErrorBoundary>
  <Suspense fallback={<Loading />}>
    <Component />
  </Suspense>
</ErrorBoundary>
```

**4. Use Transitions:**
```javascript
// ✅ Good: Smooth navigation
const [isPending, startTransition] = useTransition();
<Suspense fallback={<Skeleton />}>
  <Component />
</Suspense>
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Suspense: Declarative loading states
2. Works with React.lazy for code splitting
3. Works with data fetching libraries
4. Nested boundaries for granular loading
5. Use skeleton screens to avoid jarring fallbacks
6. Combine with useTransition for smooth navigation
7. Wrap with Error Boundaries for error handling
8. Place strategically for better UX
9. Shows fallback while component/data loads
10. Prevents jarring UI changes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Suspense works with regular fetch"
✅ Needs data fetching libraries or React.lazy

❌ "One Suspense boundary is enough"
✅ Use nested boundaries for granular loading

❌ "Generic fallback is fine"
✅ Use skeleton screens that match layout

❌ "Suspense handles errors"
✅ Need Error Boundaries for errors

❌ "Suspense makes things load faster"
✅ Improves perceived performance, not actual speed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What is Suspense?":

✅ DO Explain:
• "Declarative way to specify loading states"
• "Shows fallback while component/data loads"
• "Works with React.lazy and data fetching libraries"
• "Prevents jarring UI changes"
• "Part of Concurrent React"

When asked "How do you avoid jarring fallbacks?":

✅ DO Explain:
• "Use skeleton screens that match layout"
• "Nested Suspense boundaries for granular loading"
• "Combine with useTransition for smooth navigation"
• "Show content progressively as it loads"
• "Keep previous content visible while loading"

Advanced Answer:
"Suspense is a React component that declaratively specifies loading states, showing
a fallback UI while components or data are loading. It works with React.lazy for code
splitting and data fetching libraries like React Query for data loading. To avoid jarring
fallbacks, use skeleton screens that match the layout, nest Suspense boundaries for
granular loading, and combine with useTransition for smooth navigation. This creates a
smooth user experience where content loads progressively rather than appearing abruptly.
Always wrap Suspense with Error Boundaries to handle errors."
