🔹 ERROR BOUNDARIES: CATCHING RENDER-TIME FAILURES

Error Boundaries catch JavaScript errors in component trees, preventing the entire
app from crashing. Understanding how to implement and use them is crucial for
building resilient React applications.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT ARE ERROR BOUNDARIES?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error Boundaries are React components that catch JavaScript errors anywhere in their
child component tree, log those errors, and display a fallback UI.

Key Points:
• Class components only (or use library)
• Catch errors in render, lifecycle, constructors
• Do NOT catch errors in event handlers, async code, or during SSR
• Prevent entire app from crashing

Basic Example:
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    
    return this.props.children;
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ WHAT ERRORS DO THEY CATCH?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Error Boundaries Catch:
• Errors during render
• Errors in lifecycle methods
• Errors in constructors
• Errors in child components

❌ Error Boundaries DON'T Catch:
• Errors in event handlers
• Errors in async code (setTimeout, promises)
• Errors during server-side rendering
• Errors in the error boundary itself

Example: What Gets Caught
```javascript
class BuggyComponent extends React.Component {
  render() {
    // ✅ Caught by Error Boundary
    throw new Error('Render error');
  }
}

function Component() {
  function handleClick() {
    // ❌ NOT caught by Error Boundary
    throw new Error('Event handler error');
  }
  
  useEffect(() => {
    // ❌ NOT caught by Error Boundary
    throw new Error('Effect error');
  }, []);
  
  return <button onClick={handleClick}>Click</button>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ IMPLEMENTING ERROR BOUNDARIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Two Required Methods:

**1. getDerivedStateFromError:**
```javascript
static getDerivedStateFromError(error) {
  // Update state to show fallback UI
  return { hasError: true };
}
```

**2. componentDidCatch:**
```javascript
componentDidCatch(error, errorInfo) {
  // Log error to error reporting service
  console.error('Error:', error);
  console.error('Error info:', errorInfo);
  // errorInfo.componentStack shows component stack
}
```

Complete Implementation:
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log to error reporting service
    logErrorToService(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong.</h2>
          <details>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ USING ERROR BOUNDARIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wrap components that might error:

```javascript
function App() {
  return (
    <ErrorBoundary>
      <Header />
      <MainContent />
      <Footer />
    </ErrorBoundary>
  );
}
```

Granular Error Boundaries:
```javascript
function App() {
  return (
    <div>
      <ErrorBoundary>
        <Header />  {/* Isolated: Header error doesn't crash app */}
      </ErrorBoundary>
      
      <ErrorBoundary>
        <MainContent />  {/* Isolated: Main error doesn't crash app */}
      </ErrorBoundary>
      
      <ErrorBoundary>
        <Footer />  {/* Isolated: Footer error doesn't crash app */}
      </ErrorBoundary>
    </div>
  );
}
```

Nested Error Boundaries:
```javascript
function App() {
  return (
    <ErrorBoundary fallback={<AppError />}>
      <Header />
      <ErrorBoundary fallback={<ContentError />}>
        <MainContent />
      </ErrorBoundary>
      <Footer />
    </ErrorBoundary>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ CUSTOM FALLBACK UI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Provide custom fallback UI via props:

```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      // Use custom fallback or default
      return this.props.fallback || <h1>Something went wrong.</h1>;
    }
    
    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<CustomErrorPage />}>
  <Component />
</ErrorBoundary>
```

Reset Error Boundary:
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  handleReset = () => {
    this.setState({ hasError: false });
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong.</h2>
          <button onClick={this.handleReset}>Try again</button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ ERROR BOUNDARIES FOR FUNCTION COMPONENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error Boundaries must be class components. For function components, use a library:

**react-error-boundary:**
```javascript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        console.error('Error:', error, info);
      }}
      onReset={() => {
        // Reset app state
      }}
    >
      <Component />
    </ErrorBoundary>
  );
}
```

Custom Hook (Limited):
```javascript
// Note: This doesn't work for render errors
// Only for errors in event handlers/effects
function useErrorHandler() {
  const [error, setError] = useState(null);
  
  if (error) throw error;
  
  return setError;
}

function Component() {
  const handleError = useErrorHandler();
  
  useEffect(() => {
    fetch('/api')
      .catch(err => handleError(err));
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ ERROR REPORTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Log errors to error reporting services:

```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to error reporting service
    logErrorToService(error, errorInfo);
    
    // Examples:
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
    // Bugsnag.notify(error, { metaData: errorInfo });
    // LogRocket.captureException(error, { extra: errorInfo });
  }
}
```

With Context:
```javascript
const ErrorContext = createContext();

class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    this.context.reportError?.(error, errorInfo);
  }
}

ErrorBoundary.contextType = ErrorContext;
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ HANDLING ASYNC ERRORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error Boundaries don't catch async errors. Handle them separately:

```javascript
function Component() {
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch('/api')
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => {
        // ❌ Error Boundary won't catch this
        // ✅ Handle explicitly
        setError(err);
      });
  }, []);
  
  if (error) {
    return <ErrorDisplay error={error} />;
  }
  
  return <div>Content</div>;
}
```

With Error Boundary Pattern:
```javascript
function Component() {
  const [error, setError] = useState(null);
  
  // Throw in render to trigger Error Boundary
  if (error) {
    throw error;  // Now Error Boundary can catch it
  }
  
  useEffect(() => {
    fetch('/api')
      .catch(err => setError(err));
  }, []);
  
  return <div>Content</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ BEST PRACTICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. Place Strategically:**
```javascript
// Top level: Catch all errors
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Feature level: Isolate features
<ErrorBoundary>
  <Feature />
</ErrorBoundary>

// Component level: Protect critical components
<ErrorBoundary>
  <CriticalComponent />
</ErrorBoundary>
```

**2. Provide Useful Fallbacks:**
```javascript
// ✅ Good: Helpful fallback
<ErrorBoundary fallback={
  <div>
    <h2>Failed to load content</h2>
    <button onClick={retry}>Retry</button>
  </div>
}>
  <Component />
</ErrorBoundary>

// ❌ Bad: Generic error
<ErrorBoundary>
  <Component />
</ErrorBoundary>
```

**3. Log Errors:**
```javascript
componentDidCatch(error, errorInfo) {
  // Always log errors
  logErrorToService(error, errorInfo);
}
```

**4. Reset State:**
```javascript
// Allow users to recover
handleReset = () => {
  this.setState({ hasError: false });
};
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Error Boundaries catch errors in component trees
2. Must be class components (or use library)
3. Catch errors in render, lifecycle, constructors
4. Don't catch errors in event handlers or async code
5. Two methods: getDerivedStateFromError, componentDidCatch
6. Place strategically: top level, feature level, component level
7. Provide useful fallback UI
8. Log errors to reporting services
9. Allow users to recover (reset)
10. Handle async errors separately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Error Boundaries catch all errors"
✅ Only catch errors in render/lifecycle, not event handlers or async

❌ "I can use function components for Error Boundaries"
✅ Must be class components (or use react-error-boundary library)

❌ "One Error Boundary is enough"
✅ Use multiple for granular error handling

❌ "Error Boundaries catch async errors"
✅ Handle async errors explicitly

❌ "I don't need to log errors"
✅ Always log to error reporting service

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What are Error Boundaries?":

✅ DO Explain:
• "React components that catch JavaScript errors in child trees"
• "Must be class components (or use library)"
• "Catch errors in render, lifecycle, constructors"
• "Don't catch errors in event handlers or async code"
• "Display fallback UI instead of crashing"

When asked "How do you implement Error Boundaries?":

✅ DO Explain:
• "Two methods: getDerivedStateFromError and componentDidCatch"
• "getDerivedStateFromError: Update state to show fallback"
• "componentDidCatch: Log errors to reporting service"
• "Place strategically at different levels"
• "Provide useful fallback UI with recovery options"

Advanced Answer:
"Error Boundaries are React class components that catch JavaScript errors in their child
component tree. They require two methods: getDerivedStateFromError to update state and
show fallback UI, and componentDidCatch to log errors. They catch errors during render,
in lifecycle methods, and in constructors, but not in event handlers or async code.
Place them strategically at different levels (app, feature, component) to isolate errors
and prevent the entire app from crashing. Always log errors to reporting services and
provide recovery options in the fallback UI."
