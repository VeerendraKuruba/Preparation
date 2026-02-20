🔹 EFFECT CLEANUPS: PREVENTING MEMORY LEAKS

Effect cleanups are essential for preventing memory leaks, canceling ongoing
operations, and ensuring proper resource management. Understanding when and how
to clean up effects is crucial for writing robust React applications.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS EFFECT CLEANUP?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cleanup functions run when:
1. Component unmounts
2. Effect re-runs (before new effect runs)
3. Dependencies change

Basic Syntax:
```javascript
useEffect(() => {
  // Effect setup
  
  return () => {
    // Cleanup function
    // Runs before effect re-runs or on unmount
  };
}, [dependencies]);
```

Example:
```javascript
function Component() {
  useEffect(() => {
    console.log('Effect runs');
    
    return () => {
      console.log('Cleanup runs');
    };
  }, []);
  
  // On mount: "Effect runs"
  // On unmount: "Cleanup runs"
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ WHEN CLEANUP RUNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cleanup runs in these scenarios:

**Scenario 1: Component Unmounts**
```javascript
function Component() {
  useEffect(() => {
    return () => {
      console.log('Unmounting');
    };
  }, []);
  
  // When component is removed from DOM:
  // Cleanup runs
}
```

**Scenario 2: Effect Re-runs (Dependencies Change)**
```javascript
function Component({ userId }) {
  useEffect(() => {
    console.log('Effect runs for:', userId);
    
    return () => {
      console.log('Cleanup for:', userId);
    };
  }, [userId]);
  
  // userId = 1: Effect runs
  // userId = 2: Cleanup runs (for 1), then Effect runs (for 2)
}
```

**Scenario 3: Before New Effect**
```javascript
function Component() {
  useEffect(() => {
    const timer = setInterval(() => {}, 1000);
    
    return () => {
      clearInterval(timer);  // Cleanup runs before new effect
    };
  }, [count]);  // Re-runs when count changes
  
  // count = 1: Effect runs, timer created
  // count = 2: Cleanup runs (clears timer), new effect runs (new timer)
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ CLEANING UP SUBSCRIPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always unsubscribe to prevent memory leaks:

```javascript
function Component() {
  useEffect(() => {
    // ❌ Memory leak: subscription never cleaned up
    const subscription = store.subscribe(() => {
      // Handle update
    });
    
    // Component unmounts → subscription still active → memory leak!
  }, []);
  
  // ✅ Cleanup: unsubscribe
  useEffect(() => {
    const subscription = store.subscribe(() => {
      // Handle update
    });
    
    return () => {
      subscription.unsubscribe();  // Cleanup on unmount
    };
  }, []);
}
```

Event Listeners:
```javascript
function Component() {
  useEffect(() => {
    // ❌ Memory leak: listener never removed
    window.addEventListener('resize', handleResize);
    
    // ✅ Cleanup: remove listener
    function handleResize() {
      console.log('Resized');
    }
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
}
```

WebSocket Connections:
```javascript
function Component() {
  useEffect(() => {
    const ws = new WebSocket('ws://example.com');
    
    ws.onmessage = (event) => {
      // Handle message
    };
    
    // ✅ Cleanup: close connection
    return () => {
      ws.close();
    };
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ CLEANING UP TIMERS AND INTERVALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always clear timers to prevent them from running after unmount:

```javascript
function Component() {
  useEffect(() => {
    // ❌ Timer continues after unmount
    setTimeout(() => {
      setState(newValue);  // Error: Can't setState on unmounted component
    }, 1000);
  }, []);
  
  // ✅ Cleanup: clear timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setState(newValue);
    }, 1000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
}
```

Intervals:
```javascript
function Component() {
  useEffect(() => {
    // ❌ Interval continues after unmount
    const interval = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
    
    // ✅ Cleanup: clear interval
    return () => {
      clearInterval(interval);
    };
  }, []);
}
```

Multiple Timers:
```javascript
function Component() {
  useEffect(() => {
    const timeout1 = setTimeout(() => {}, 1000);
    const timeout2 = setTimeout(() => {}, 2000);
    const interval = setInterval(() => {}, 1000);
    
    // ✅ Cleanup all
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearInterval(interval);
    };
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ CLEANING UP ASYNC OPERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cancel async operations to prevent state updates on unmounted components:

```javascript
function Component({ userId }) {
  useEffect(() => {
    // ❌ State update after unmount
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setData(data);  // Error if component unmounted
      });
  }, [userId]);
  
  // ✅ Cleanup: cancel operation
  useEffect(() => {
    let cancelled = false;
    
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setData(data);  // Only update if not cancelled
        }
      });
    
    return () => {
      cancelled = true;  // Cancel on unmount or dependency change
    };
  }, [userId]);
}
```

AbortController (Modern Approach):
```javascript
function Component({ userId }) {
  useEffect(() => {
    const controller = new AbortController();
    
    fetch(`/api/users/${userId}`, {
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => {
        setData(data);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          // Handle other errors
        }
      });
    
    // ✅ Cleanup: abort request
    return () => {
      controller.abort();
    };
  }, [userId]);
}
```

Multiple Async Operations:
```javascript
function Component() {
  useEffect(() => {
    let cancelled = false;
    
    async function loadData() {
      try {
        const data1 = await fetch('/api/1').then(r => r.json());
        if (cancelled) return;
        
        const data2 = await fetch('/api/2').then(r => r.json());
        if (cancelled) return;
        
        setData({ data1, data2 });
      } catch (error) {
        if (!cancelled) {
          setError(error);
        }
      }
    }
    
    loadData();
    
    return () => {
      cancelled = true;
    };
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ CLEANUP ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cleanup runs in reverse order of effect registration:

```javascript
function Component() {
  useEffect(() => {
    console.log('Effect 1');
    return () => console.log('Cleanup 1');
  });
  
  useEffect(() => {
    console.log('Effect 2');
    return () => console.log('Cleanup 2');
  });
  
  useEffect(() => {
    console.log('Effect 3');
    return () => console.log('Cleanup 3');
  });
  
  // On mount: Effect 1, Effect 2, Effect 3
  // On unmount: Cleanup 3, Cleanup 2, Cleanup 1 (reverse order)
}
```

Why Reverse Order:
• Ensures dependencies are cleaned up in correct order
• Prevents issues with interdependent resources
• Matches natural dependency hierarchy

Example:
```javascript
function Component() {
  useEffect(() => {
    const connection = connect();
    return () => connection.disconnect();  // Cleanup 2
  });
  
  useEffect(() => {
    const subscription = connection.subscribe();
    return () => subscription.unsubscribe();  // Cleanup 1 (runs first)
  });
  
  // Cleanup order: unsubscribe, then disconnect (correct!)
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ CONDITIONAL CLEANUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sometimes cleanup is conditional:

```javascript
function Component({ enabled }) {
  useEffect(() => {
    if (!enabled) return;  // Early return: no cleanup needed
    
    const subscription = subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [enabled]);
}
```

Cleanup Always Runs:
```javascript
function Component() {
  useEffect(() => {
    const timer = setTimeout(() => {
      // This might not run if component unmounts
    }, 1000);
    
    // Cleanup always runs, even if effect didn't complete
    return () => {
      clearTimeout(timer);  // Always runs
    };
  }, []);
}
```

Early Returns:
```javascript
function Component({ userId }) {
  useEffect(() => {
    if (!userId) return;  // Early return
    
    const subscription = subscribe(userId);
    
    // Cleanup still runs even with early return!
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ CLEANUP WITH DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When dependencies change, cleanup runs before new effect:

```javascript
function Component({ userId }) {
  useEffect(() => {
    console.log('Fetching user:', userId);
    
    let cancelled = false;
    fetchUser(userId).then(data => {
      if (!cancelled) {
        setData(data);
      }
    });
    
    return () => {
      console.log('Cleaning up for:', userId);
      cancelled = true;  // Cancel previous request
    };
  }, [userId]);
  
  // userId = 1: Fetching user 1
  // userId = 2: Cleaning up for 1, then Fetching user 2
}
```

Why This Matters:
```javascript
function Component({ userId }) {
  useEffect(() => {
    // Request 1 starts
    fetch(`/api/users/${userId}`).then(setData);
    
    // ❌ Problem: If userId changes quickly:
    // Request 1 might complete after Request 2
    // Data from Request 1 overwrites Request 2 (wrong!)
  }, [userId]);
  
  // ✅ Fix: Cancel previous request
  useEffect(() => {
    let cancelled = false;
    
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setData(data);
        }
      });
    
    return () => {
      cancelled = true;  // Cancel when userId changes
    };
  }, [userId]);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ COMMON CLEANUP PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pattern 1: Subscription
```javascript
useEffect(() => {
  const unsubscribe = store.subscribe(handler);
  return () => unsubscribe();
}, []);
```

Pattern 2: Event Listener
```javascript
useEffect(() => {
  const handler = () => {};
  window.addEventListener('event', handler);
  return () => window.removeEventListener('event', handler);
}, []);
```

Pattern 3: Timer
```javascript
useEffect(() => {
  const id = setTimeout(() => {}, 1000);
  return () => clearTimeout(id);
}, []);
```

Pattern 4: Interval
```javascript
useEffect(() => {
  const id = setInterval(() => {}, 1000);
  return () => clearInterval(id);
}, []);
```

Pattern 5: Async with Cancellation
```javascript
useEffect(() => {
  let cancelled = false;
  asyncOperation().then(result => {
    if (!cancelled) {
      setResult(result);
    }
  });
  return () => { cancelled = true; };
}, []);
```

Pattern 6: AbortController
```javascript
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal });
  return () => controller.abort();
}, []);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Cleanup functions prevent memory leaks
2. Cleanup runs on unmount and before effect re-runs
3. Always clean up subscriptions, timers, and event listeners
4. Cancel async operations to prevent state updates on unmounted components
5. Use AbortController for fetch requests
6. Use cancellation flags for async operations
7. Cleanup runs in reverse order of effect registration
8. Cleanup always runs, even with early returns
9. When dependencies change, cleanup runs before new effect
10. Missing cleanup causes memory leaks and bugs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Cleanup only runs on unmount"
✅ Cleanup also runs before effect re-runs

❌ "I don't need cleanup for simple effects"
✅ Always clean up subscriptions, timers, and async operations

❌ "Early return means no cleanup needed"
✅ Cleanup still runs even with early return

❌ "setState in cleanup is fine"
✅ Avoid setState in cleanup (component might be unmounting)

❌ "Cleanup order doesn't matter"
✅ Cleanup runs in reverse order (important for dependencies)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "When does cleanup run?":

✅ DO Explain:
• "On component unmount"
• "Before effect re-runs when dependencies change"
• "In reverse order of effect registration"
• "Always runs, even with early returns"
• "Prevents memory leaks and race conditions"

When asked "What should you clean up?":

✅ DO Explain:
• "Subscriptions (store, events)"
• "Timers and intervals"
• "Async operations (fetch, promises)"
• "Event listeners"
• "WebSocket connections"
• "Any resource that needs explicit cleanup"

Advanced Answer:
"Effect cleanup functions run when the component unmounts or before the effect
re-runs due to dependency changes. They're essential for preventing memory leaks
by unsubscribing from subscriptions, clearing timers, removing event listeners,
and canceling async operations. Cleanup runs in reverse order of effect registration,
ensuring dependencies are cleaned up correctly. Always return a cleanup function
for effects that create resources, subscriptions, or start async operations."
