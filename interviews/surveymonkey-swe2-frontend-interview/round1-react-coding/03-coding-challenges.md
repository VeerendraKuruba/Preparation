# Round 1 — Live Coding Challenges

Real candidates built a skeleton SurveyMonkey-like page from scratch that interacts with a mock API. Expect product-relevant UI components.

---

## Challenge Pattern: Build a Feature From Scratch

You are given:
- A Figma/design mockup to work from
- A mock API endpoint
- ~60 minutes

**What they evaluate:**
- Component structure and breakdown
- Data fetching pattern (loading/error/success states)
- CSS correctness (it DOES matter)
- Code cleanliness and readability
- How you communicate while coding

---

## Challenge 1: Survey List Page (Most Likely)

Build a survey dashboard that fetches and displays surveys.

```jsx
// Mock API: GET /api/surveys
// Response: [{ id, title, responseCount, status, createdAt }]

import { useState, useEffect } from 'react';

const STATUS_COLORS = {
  active: '#28a745',
  closed: '#dc3545',
  draft: '#6c757d',
};

function SurveyCard({ title, responseCount, status, createdAt }) {
  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <h3 style={{ margin: '0 0 4px' }}>{title}</h3>
        <span style={{ color: '#666', fontSize: '14px' }}>
          {responseCount} responses · {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>
      <span style={{
        backgroundColor: STATUS_COLORS[status],
        color: '#fff',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        textTransform: 'capitalize',
      }}>
        {status}
      </span>
    </div>
  );
}

function SurveyList() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/surveys', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setSurveys(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  if (loading) return <div className="spinner">Loading surveys...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!surveys.length) return <div>No surveys found.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1>My Surveys</h1>
      {surveys.map(survey => (
        <SurveyCard key={survey.id} {...survey} />
      ))}
    </div>
  );
}

export default SurveyList;
```

---

## Challenge 2: Survey Builder (Question Form)

Build a form to add questions to a survey — a core SurveyMonkey feature.

```jsx
const QUESTION_TYPES = ['multiple_choice', 'text', 'rating', 'checkbox'];

function QuestionBuilder({ onSave }) {
  const [questionText, setQuestionText] = useState('');
  const [type, setType] = useState('multiple_choice');
  const [options, setOptions] = useState(['', '']);
  const [required, setRequired] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => setOptions(prev => [...prev, '']);

  const updateOption = (index, value) => {
    setOptions(prev => prev.map((opt, i) => i === index ? value : opt));
  };

  const removeOption = (index) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setError('Question text is required');
      return;
    }
    if (['multiple_choice', 'checkbox'].includes(type)) {
      const validOptions = options.filter(o => o.trim());
      if (validOptions.length < 2) {
        setError('At least 2 options required');
        return;
      }
    }
    setError('');
    onSave({ questionText, type, options: options.filter(o => o.trim()), required });
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label>Question</label>
        <input
          type="text"
          value={questionText}
          onChange={e => setQuestionText(e.target.value)}
          placeholder="Enter your question"
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label>Type</label>
        <select value={type} onChange={e => setType(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
          {QUESTION_TYPES.map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {['multiple_choice', 'checkbox'].includes(type) && (
        <div style={{ marginBottom: '16px' }}>
          <label>Options</label>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                style={{ flex: 1, padding: '6px' }}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption} style={{ marginTop: '8px' }}>
            + Add Option
          </button>
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <input type="checkbox" checked={required}
          onChange={e => setRequired(e.target.checked)} />
        Required
      </label>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" style={{ padding: '10px 20px', background: '#00BF6F', color: '#fff', border: 'none', borderRadius: '4px' }}>
        Save Question
      </button>
    </form>
  );
}
```

---

## Challenge 3: Infinite Scroll / Pagination

```jsx
function PaginatedSurveys() {
  const [surveys, setSurveys] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const fetchPage = useCallback(async (pageNum) => {
    setLoading(true);
    const res = await fetch(`/api/surveys?page=${pageNum}&limit=10`);
    const { data, totalPages } = await res.json();
    setSurveys(prev => [...prev, ...data]);
    setHasMore(pageNum < totalPages);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(prev => prev + 1);
      }
    });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    if (page > 1) fetchPage(page);
  }, [page, fetchPage]);

  return (
    <div>
      {surveys.map(s => <SurveyCard key={s.id} {...s} />)}
      <div ref={sentinelRef} style={{ height: '20px' }} />
      {loading && <p>Loading more...</p>}
      {!hasMore && <p>All surveys loaded</p>}
    </div>
  );
}
```

---

## Challenge 4: Search + Filter (with Debounce)

```jsx
function SearchableSurveys() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query && filter === 'all') {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ q: query, status: filter });
      const res = await fetch(`/api/surveys/search?${params}`);
      const data = await res.json();
      setResults(data);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filter]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          type="search"
          placeholder="Search surveys..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, padding: '8px' }}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      {loading ? <p>Searching...</p> : results.map(s => <SurveyCard key={s.id} {...s} />)}
    </div>
  );
}
```

---

## Tips for the Coding Round

1. **Talk through your thinking** — "I'll break this into 3 components: container, list, card"
2. **Handle all states** — loading, error, empty, success
3. **CSS matters** — even inline styles, make it look intentional
4. **Ask about API shape** — don't assume, ask "what does the response look like?"
5. **Start simple, enhance** — get it working, then add edge cases
6. **Clean up effects** — always return cleanup from useEffect with fetch/timers
