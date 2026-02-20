🔹 RACE CONDITIONS IN DATA FETCHING

Race conditions occur when multiple async operations complete in unexpected order,
causing stale or incorrect data to be displayed. Understanding and preventing them
is crucial for reliable React applications.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS A RACE CONDITION?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A race condition happens when the outcome depends on the timing of async operations.
The last request to complete "wins," even if it's not the most recent one.

Example:
```javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // ❌ Race condition: Multiple requests can overlap
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);  // Last request wins, even if outdated
      });
  }, [userId]);
  
  return <div>{user?.name}</div>;
}
```

The Problem:
```
User clicks: userId = 1 → Request A starts
User clicks: userId = 2 → Request B starts
Request B completes first → Shows user 2 ✅
Request A completes later → Shows user 1 ❌ (wrong!)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ SOLUTION: CANCELLATION FLAG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use a cancellation flag to ignore stale requests:

```javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {  // Only update if not cancelled
          setUser(data);
        }
      });
    
    return () => {
      cancelled = true;  // Cancel on unmount or dependency change
    };
  }, [userId]);
  
  return <div>{user?.name}</div>;
}
```

How It Works:
```
Request A starts: cancelled = false
Request B starts: cancelled = true (for A), cancelled = false (for B)
Request A completes: cancelled = true → Ignored ✅
Request B completes: cancelled = false → Updates ✅
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ SOLUTION: ABORTCONTROLLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AbortController cancels fetch requests:

```javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    fetch(`/api/users/${userId}`, {
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => {
        setUser(data);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          // Handle other errors
          console.error(err);
        }
      });
    
    return () => {
      controller.abort();  // Cancel request
    };
  }, [userId]);
  
  return <div>{user?.name}</div>;
}
```

Benefits:
• Actually cancels network request
• Saves bandwidth
• More efficient than flag
• Standard API

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ SOLUTION: REQUEST ID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Track request IDs to ignore stale responses:

```javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const requestId = userId;  // Use userId as request ID
    
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        // Only update if this is still the current request
        if (requestId === userId) {
          setUser(data);
        }
      });
  }, [userId]);
  
  return <div>{user?.name}</div>;
}
```

Better: Incremental ID
```javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const requestIdRef = useRef(0);
  
  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        // Only update if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setUser(data);
        }
      });
  }, [userId]);
  
  return <div>{user?.name}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ MULTIPLE ASYNC OPERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Handle multiple async operations:

```javascript
function Component({ userId }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    let cancelled = false;
    
    // Multiple requests
    Promise.all([
      fetch(`/api/users/${userId}`).then(r => r.json()),
      fetch(`/api/users/${userId}/posts`).then(r => r.json())
    ])
      .then(([userData, postsData]) => {
        if (!cancelled) {
          setUser(userData);
          setPosts(postsData);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [userId]);
}
```

With AbortController:
```javascript
function Component({ userId }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    const controller = new AbortController();
    
    Promise.all([
      fetch(`/api/users/${userId}`, { signal: controller.signal })
        .then(r => r.json()),
      fetch(`/api/users/${userId}/posts`, { signal: controller.signal })
        .then(r => r.json())
    ])
      .then(([userData, postsData]) => {
        setUser(userData);
        setPosts(postsData);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      });
    
    return () => {
      controller.abort();
    };
  }, [userId]);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ SEARCH INPUT RACE CONDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Search inputs are prone to race conditions:

```javascript
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    // ❌ Race condition: Fast typing causes multiple requests
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => {
        setResults(data);  // Last request wins
      });
  }, [query]);
  
  return <div>{results.length} results</div>;
}
```

Fix: Request ID
```javascript
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  const requestIdRef = useRef(0);
  
  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => {
        if (currentRequestId === requestIdRef.current) {
          setResults(data);
        }
      });
  }, [query]);
  
  return <div>{results.length} results</div>;
}
```

Better: Debounce + AbortController
```javascript
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    if (!query) return;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetch(`/api/search?q=${query}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => setResults(data))
        .catch(err => {
          if (err.name !== 'AbortError') console.error(err);
        });
    }, 300);  // Debounce
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);
  
  return <div>{results.length} results</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ CUSTOM HOOK PATTERN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a reusable hook:

```javascript
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    
    setLoading(true);
    setError(null);
    
    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        if (!cancelled) {
          setData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError' && !cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url]);
  
  return { data, loading, error };
}

// Usage
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{user?.name}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ USING LIBRARIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Libraries handle race conditions automatically:

**React Query:**
```javascript
import { useQuery } from 'react-query';

function UserProfile({ userId }) {
  const { data: user, isLoading } = useQuery(
    ['user', userId],
    () => fetch(`/api/users/${userId}`).then(r => r.json())
  );
  
  // Automatically handles:
  // - Cancellation
  // - Caching
  // - Race conditions
  // - Retries
}
```

**SWR:**
```javascript
import useSWR from 'swr';

function UserProfile({ userId }) {
  const { data: user, error } = useSWR(
    `/api/users/${userId}`,
    fetcher
  );
  
  // Automatically handles race conditions
}
```

Benefits:
• Automatic cancellation
• Caching
• Retries
• Less code
• Better DX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Race conditions: Last request wins, even if outdated
2. Common in data fetching when dependencies change quickly
3. Solutions: Cancellation flag, AbortController, request ID
4. AbortController: Actually cancels requests (best)
5. Cancellation flag: Simple but doesn't cancel network
6. Request ID: Tracks which request is current
7. Always clean up in useEffect return
8. Search inputs need debouncing + cancellation
9. Custom hooks encapsulate cancellation logic
10. Libraries (React Query, SWR) handle this automatically

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Race conditions don't happen in React"
✅ Common in async operations, especially data fetching

❌ "I don't need to cancel requests"
✅ Stale requests can overwrite current data

❌ "Cancellation flag is enough"
✅ AbortController is better (actually cancels network)

❌ "Only one request at a time"
✅ User actions can trigger multiple requests quickly

❌ "Libraries are overkill"
✅ They handle many edge cases automatically

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What is a race condition in React?":

✅ DO Explain:
• "When multiple async operations complete in unexpected order"
• "Last request wins, even if it's outdated"
• "Common in data fetching when dependencies change quickly"
• "Solutions: Cancellation flag, AbortController, request ID"
• "Always clean up in useEffect return"

When asked "How do you prevent race conditions?":

✅ DO Explain:
• "AbortController: Actually cancels requests (best)"
• "Cancellation flag: Simple but doesn't cancel network"
• "Request ID: Track which request is current"
• "Clean up in useEffect return"
• "Consider libraries like React Query or SWR"

Advanced Answer:
"Race conditions occur when multiple async operations complete in unexpected order,
causing stale data to overwrite current data. In React, this commonly happens in
data fetching when dependencies change quickly. Solutions include: AbortController
to actually cancel network requests (best approach), cancellation flags to ignore
stale responses, and request IDs to track which request is current. Always clean up
in useEffect's return function. For complex scenarios, libraries like React Query or
SWR handle race conditions automatically along with caching and retries."
