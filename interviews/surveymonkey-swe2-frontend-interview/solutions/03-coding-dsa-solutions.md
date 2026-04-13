# Solutions — Coding Tasks + DSA (Tasks 1–7, Q46–Q55)

---

## TASK 1 — Bar Chart (Vanilla JS, no libraries)

> Build a bar chart from an array of `{ label, value }`. Scale proportionally, show value labels, hover tooltip. No chart.js.

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bar Chart</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .chart-container {
      font-family: -apple-system, sans-serif;
      padding: 24px;
      max-width: 700px;
    }

    .chart-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: #111;
    }

    .chart {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      height: 260px;
      border-bottom: 2px solid #e5e7eb;
      border-left: 2px solid #e5e7eb;
      padding: 12px 8px 0;
      position: relative;
    }

    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      min-width: 40px;
      position: relative;
    }

    .bar {
      width: 100%;
      background: #3b82f6;
      border-radius: 4px 4px 0 0;
      transition: background 0.2s ease;
      position: relative;
      cursor: pointer;
    }

    .bar:hover { background: #1d4ed8; }

    .bar-value {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }

    .bar-label {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 6px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .tooltip {
      position: absolute;
      background: #1f2937;
      color: #fff;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      pointer-events: none;
      white-space: nowrap;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 10;
    }

    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: #1f2937;
    }

    .bar-group:hover .tooltip { opacity: 1; }
  </style>
</head>
<body>
  <div id="chart-root"></div>
  <script src="barChart.js"></script>
  <script>
    const data = [
      { label: 'Jan', value: 120 },
      { label: 'Feb', value: 85 },
      { label: 'Mar', value: 200 },
      { label: 'Apr', value: 160 },
      { label: 'May', value: 95 },
      { label: 'Jun', value: 230 },
    ];

    const chart = createBarChart({
      container: document.getElementById('chart-root'),
      data,
      title: 'Monthly Survey Responses',
      color: '#3b82f6',
      maxHeight: 220,
    });
  </script>
</body>
</html>
```

```js
// barChart.js — modular, extensible, no frameworks

/**
 * Creates a bar chart and mounts it into the given container.
 * @param {Object} options
 * @param {HTMLElement} options.container
 * @param {Array<{label: string, value: number}>} options.data
 * @param {string} [options.title]
 * @param {string} [options.color='#3b82f6']
 * @param {number} [options.maxHeight=220]
 */
function createBarChart({ container, data, title = '', color = '#3b82f6', maxHeight = 220 }) {
  if (!data || !data.length) {
    container.innerHTML = '<p class="empty">No data available</p>';
    return;
  }

  const maxValue = Math.max(...data.map(d => d.value));

  // Build DOM
  const wrapper = document.createElement('div');
  wrapper.className = 'chart-container';

  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'chart-title';
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);
  }

  const chart = document.createElement('div');
  chart.className = 'chart';
  chart.style.height = `${maxHeight + 40}px`;

  data.forEach(({ label, value }) => {
    const barHeight = Math.round((value / maxValue) * maxHeight);

    const group = document.createElement('div');
    group.className = 'bar-group';

    const valueLabel = document.createElement('span');
    valueLabel.className = 'bar-value';
    valueLabel.textContent = value;

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${barHeight}px`;
    bar.style.background = color;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = `${label}: ${value}`;
    bar.appendChild(tooltip);

    const labelEl = document.createElement('span');
    labelEl.className = 'bar-label';
    labelEl.textContent = label;

    group.appendChild(valueLabel);
    group.appendChild(bar);
    group.appendChild(labelEl);
    chart.appendChild(group);
  });

  wrapper.appendChild(chart);
  container.appendChild(wrapper);

  // Public API for extensibility
  return {
    update(newData) {
      container.innerHTML = '';
      createBarChart({ container, data: newData, title, color, maxHeight });
    },
    setColor(newColor) {
      container.querySelectorAll('.bar').forEach(b => (b.style.background = newColor));
    },
  };
}
```

---

## TASK 2 — SurveyMonkey skeleton page with mock API (React)

```jsx
// App.jsx — full implementation with loading/error/success states

const MOCK_API = 'https://jsonplaceholder.typicode.com/posts'; // stand-in for mock

function useSurveys() {
  const [surveys, setSurveys] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]   = React.useState(null);

  React.useEffect(() => {
    const controller = new AbortController();

    fetch(MOCK_API, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Map to survey shape
        const mapped = data.slice(0, 10).map(p => ({
          id: p.id,
          title: p.title,
          responses: Math.floor(Math.random() * 500),
          status: p.id % 3 === 0 ? 'Closed' : 'Active',
          createdAt: new Date(Date.now() - p.id * 86400000).toLocaleDateString(),
        }));
        setSurveys(mapped);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { surveys, loading, error };
}

function SurveyRow({ survey }) {
  return (
    <tr>
      <td>{survey.title}</td>
      <td>{survey.responses}</td>
      <td>
        <span className={`badge ${survey.status === 'Active' ? 'active' : 'closed'}`}>
          {survey.status}
        </span>
      </td>
      <td>{survey.createdAt}</td>
      <td>
        <button className="btn-action">View</button>
      </td>
    </tr>
  );
}

function SurveyTable({ surveys }) {
  if (!surveys.length) {
    return <p className="empty-state">No surveys found.</p>;
  }
  return (
    <table className="survey-table">
      <thead>
        <tr>
          <th>Title</th><th>Responses</th><th>Status</th><th>Created</th><th></th>
        </tr>
      </thead>
      <tbody>
        {surveys.map(s => <SurveyRow key={s.id} survey={s} />)}
      </tbody>
    </table>
  );
}

function App() {
  const { surveys, loading, error } = useSurveys();

  return (
    <div className="app">
      <header className="app-header">
        <h1>SurveyMonkey</h1>
        <nav>
          <a href="#">My Surveys</a>
          <a href="#">Templates</a>
        </nav>
        <button className="btn-primary">+ Create Survey</button>
      </header>

      <main className="main-content">
        <h2>My Surveys</h2>

        {loading && (
          <div className="loading-skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        )}

        {error && (
          <div className="error-state" role="alert">
            <p>Failed to load surveys: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!loading && !error && <SurveyTable surveys={surveys} />}
      </main>
    </div>
  );
}
```

---

## TASK 3 — Valid Anagram + async extension

```js
// Core: O(n) time, O(1) space (fixed 26-char alphabet)
function isAnagram(s, t) {
  if (s.length !== t.length) return false;

  const freq = new Array(26).fill(0);
  const a = 'a'.charCodeAt(0);

  for (let i = 0; i < s.length; i++) {
    freq[s.charCodeAt(i) - a]++;
    freq[t.charCodeAt(i) - a]--;
  }

  return freq.every(f => f === 0);
}

// Async extension — React component with loading state
function useAnagramCheck(s, t) {
  const [result, setResult]   = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState(null);

  React.useEffect(() => {
    if (!s || !t) return;

    setLoading(true);
    setError(null);

    // Simulate async API call
    const checkAsync = () =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(isAnagram(s.toLowerCase(), t.toLowerCase()));
          } catch (e) {
            reject(e);
          }
        }, 400);
      });

    checkAsync()
      .then(res => { setResult(res); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [s, t]);

  return { result, loading, error };
}

function AnagramChecker() {
  const [s, setS] = React.useState('');
  const [t, setT] = React.useState('');
  const { result, loading } = useAnagramCheck(s, t);

  return (
    <div>
      <input placeholder="Word 1" value={s} onChange={e => setS(e.target.value)} />
      <input placeholder="Word 2" value={t} onChange={e => setT(e.target.value)} />
      {loading && <span>Checking...</span>}
      {!loading && result !== null && (
        <span>{result ? '✓ Anagram' : '✗ Not an anagram'}</span>
      )}
    </div>
  );
}
```

---

## TASK 4 — localStorage with TTL

```js
const ttlStorage = {
  set(key, value, ttlMs) {
    const item = {
      value,
      expiry: Date.now() + ttlMs,
    };
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      // Storage quota exceeded
      console.warn('localStorage.set failed:', e);
    }
  },

  get(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      const item = JSON.parse(raw);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null; // expired
      }
      return item.value;
    } catch (e) {
      localStorage.removeItem(key); // corrupted data
      return null;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  // Flush all expired keys (call on app init)
  purgeExpired() {
    for (const key of Object.keys(localStorage)) {
      this.get(key); // get() auto-removes expired items
    }
  },
};

// Usage
ttlStorage.set('auth_token', 'abc123', 15 * 60 * 1000); // 15 min TTL
ttlStorage.get('auth_token'); // 'abc123' if not expired, null if expired
```

---

## TASK 5 — Modal Dialog (HTML + CSS + JS, accessible)

```html
<!-- Full accessible modal: backdrop, Escape key, focus trap -->
<button id="open-modal">Open Modal</button>

<div id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"
     class="modal-overlay hidden">
  <div class="modal-content">
    <h2 id="modal-title">Confirm Action</h2>
    <p>Are you sure you want to delete this survey?</p>
    <div class="modal-actions">
      <button id="modal-cancel">Cancel</button>
      <button id="modal-confirm" class="btn-danger">Delete</button>
    </div>
    <button id="modal-close" aria-label="Close modal" class="modal-close">×</button>
  </div>
</div>
```

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}
.modal-overlay.hidden { display: none; }
.modal-content {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  max-width: 480px;
  width: 90%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.modal-close {
  position: absolute;
  top: 12px; right: 12px;
  background: none; border: none;
  font-size: 1.5rem; cursor: pointer;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
```

```js
class Modal {
  constructor(modalEl) {
    this.modal = modalEl;
    this.focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.previousFocus = null;

    // Bind events
    modalEl.querySelector('#modal-close')?.addEventListener('click', () => this.close());
    modalEl.querySelector('#modal-cancel')?.addEventListener('click', () => this.close());
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) this.close(); // backdrop click
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      if (e.key === 'Tab') this.trapFocus(e);
    });
  }

  open() {
    this.previousFocus = document.activeElement;
    this.modal.classList.remove('hidden');
    this.modal.removeAttribute('aria-hidden');

    // Focus first focusable element
    const focusable = this.modal.querySelectorAll(this.focusableSelectors);
    focusable[0]?.focus();
  }

  close() {
    this.modal.classList.add('hidden');
    this.modal.setAttribute('aria-hidden', 'true');
    this.previousFocus?.focus(); // restore focus
  }

  trapFocus(e) {
    const focusable = [...this.modal.querySelectorAll(this.focusableSelectors)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

const modal = new Modal(document.getElementById('modal'));
document.getElementById('open-modal').addEventListener('click', () => modal.open());
```

---

## TASK 6 — Hover info overlay

```html
<div class="image-card">
  <img src="survey-preview.jpg" alt="Survey preview" />
  <div class="overlay" aria-hidden="true">
    <h3>Customer Satisfaction Survey</h3>
    <p>230 responses · Active</p>
    <button>View Results</button>
  </div>
</div>
```

```css
.image-card {
  position: relative;
  display: inline-block;
  border-radius: 8px;
  overflow: hidden;
  width: 320px;
}

.image-card img {
  display: block;
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.8);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.25s ease;
  padding: 16px;
  text-align: center;
}

.image-card:hover img { transform: scale(1.05); }
.image-card:hover .overlay { opacity: 1; }

/* Accessible: show overlay on focus-within too */
.image-card:focus-within .overlay { opacity: 1; }
```

---

## TASK 7 — Center element over image

```html
<div class="image-wrapper">
  <img src="cover.jpg" alt="Survey cover" />
  <div class="centered-badge">LIVE</div>
</div>
```

```css
/* Method 1: position absolute + transform (most robust) */
.image-wrapper {
  position: relative;
  display: inline-block;
}
.centered-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(59, 130, 246, 0.9);
  color: #fff;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  white-space: nowrap;
}

/* Method 2: CSS Grid (cleanest) */
.image-wrapper {
  display: grid;
}
.image-wrapper > * {
  grid-area: 1 / 1; /* all children overlap same cell */
}
.centered-badge {
  place-self: center; /* centers in the grid cell */
}
```

---

## Q46. Two Sum — O(n) with hashmap

```js
function twoSum(nums, target) {
  const seen = new Map(); // value → index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}

// Examples:
twoSum([2, 7, 11, 15], 9);  // [0, 1] — 2 + 7 = 9
twoSum([3, 2, 4], 6);       // [1, 2] — 2 + 4 = 6

// Time: O(n), Space: O(n)
// One pass — for each number, check if its complement was already seen
```

---

## Q47. Valid Parentheses

```js
function isValid(s) {
  const stack = [];
  const pairs = { ')': '(', ']': '[', '}': '{' };

  for (const ch of s) {
    if ('([{'.includes(ch)) {
      stack.push(ch);               // opening → push
    } else {
      if (stack.pop() !== pairs[ch]) return false; // closing → must match top
    }
  }

  return stack.length === 0; // empty stack → all matched
}

isValid('()[]{}');   // true
isValid('([)]');     // false
isValid('{[]}');     // true
isValid('((');       // false — unmatched opens

// Time: O(n), Space: O(n)
```

---

## Q48. Anagram check (covered in Task 3, alternative approaches)

```js
// Approach 1: sort and compare — O(n log n)
function isAnagram(s, t) {
  return s.split('').sort().join('') === t.split('').sort().join('');
}

// Approach 2: frequency map — O(n), O(1) space
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const freq = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  for (const ch of t) {
    if (!freq[ch]) return false;
    freq[ch]--;
  }
  return true;
}
```

---

## Q49. Flatten nested array (without `Array.flat()`)

```js
// Recursive
function flatten(arr) {
  return arr.reduce((acc, item) => {
    return Array.isArray(item)
      ? acc.concat(flatten(item))
      : acc.concat(item);
  }, []);
}

// Iterative with stack (handles deep nesting without stack overflow)
function flattenIterative(arr) {
  const stack = [...arr];
  const result = [];

  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      stack.push(...item); // spread back onto stack
    } else {
      result.unshift(item); // maintain order
    }
  }
  return result;
}

// With depth limit
function flattenDepth(arr, depth = Infinity) {
  if (depth <= 0) return arr.slice();
  return arr.reduce((acc, item) =>
    acc.concat(Array.isArray(item) ? flattenDepth(item, depth - 1) : item),
  []);
}

flatten([1, [2, [3, [4]]]]); // [1, 2, 3, 4]
```

---

## Q50. Remove duplicates — 3 approaches

```js
const arr = [1, 2, 2, 3, 4, 4, 5];

// 1. Set — cleanest, O(n)
const unique1 = [...new Set(arr)];

// 2. filter + indexOf — O(n²), keep first occurrence
const unique2 = arr.filter((item, index) => arr.indexOf(item) === index);

// 3. reduce — explicit accumulator
const unique3 = arr.reduce((acc, item) => {
  if (!acc.includes(item)) acc.push(item);
  return acc;
}, []);

// 4. For objects — deduplicate by property
const surveys = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 1, name: 'A dup' }];
const uniqueSurveys = [...new Map(surveys.map(s => [s.id, s])).values()];
// [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
```

---

## Q51. First non-repeating character

```js
function firstNonRepeating(s) {
  const freq = new Map();

  for (const ch of s) {
    freq.set(ch, (freq.get(ch) || 0) + 1);
  }

  for (const ch of s) {
    if (freq.get(ch) === 1) return ch;
  }

  return null;
}

firstNonRepeating('aabbcde'); // 'c'
firstNonRepeating('aabb');    // null

// Time: O(n), Space: O(1) — at most 26 keys for lowercase letters
```

---

## Q52. Reverse a string (without `.reverse()`)

```js
// Approach 1: spread + reduce
const reverse1 = str => [...str].reduce((acc, ch) => ch + acc, '');

// Approach 2: two-pointer on array
function reverse2(str) {
  const arr = str.split('');
  let left = 0, right = arr.length - 1;
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]]; // swap
    left++; right--;
  }
  return arr.join('');
}

// Approach 3: for loop from end
const reverse3 = str => {
  let result = '';
  for (let i = str.length - 1; i >= 0; i--) result += str[i];
  return result;
};

reverse2('SurveyMonkey'); // 'yeknoMyevruS'
```

---

## Q53. Implement `Array.prototype.map` from scratch

```js
Array.prototype.myMap = function(callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const result = new Array(this.length);

  for (let i = 0; i < this.length; i++) {
    if (i in this) { // handle sparse arrays
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }

  return result;
};

// Test
[1, 2, 3].myMap(x => x * 2);    // [2, 4, 6]
[1, , 3].myMap(x => x * 2);     // [2, empty, 6] — sparse handled
```

---

## Q54. Implement `debounce` from scratch

```js
function debounce(fn, delay) {
  let timer = null;

  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  }

  // Cancel pending call
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  // Flush immediately
  debounced.flush = function(...args) {
    clearTimeout(timer);
    fn.apply(this, args);
    timer = null;
  };

  return debounced;
}

// Usage
const onSearch = debounce((query) => {
  console.log('Searching:', query);
}, 300);

// Only logs 300ms after last keystroke
input.addEventListener('input', e => onSearch(e.target.value));
```

---

## Q55. Implement `Promise.all` from scratch

```js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be an array'));
    }

    if (promises.length === 0) {
      return resolve([]);
    }

    const results = new Array(promises.length);
    let settled = 0;

    promises.forEach((p, i) => {
      // Wrap non-Promise values with Promise.resolve
      Promise.resolve(p)
        .then(value => {
          results[i] = value;
          settled++;
          if (settled === promises.length) resolve(results);
        })
        .catch(reject); // reject immediately on first failure
    });
  });
}

// Test
promiseAll([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3),
]).then(console.log); // [1, 2, 3]

promiseAll([
  Promise.resolve(1),
  Promise.reject('error'),
]).catch(console.log); // 'error' — fail-fast

// Also implement promiseAllSettled for bonus:
function promiseAllSettled(promises) {
  return promiseAll(
    promises.map(p =>
      Promise.resolve(p)
        .then(value => ({ status: 'fulfilled', value }))
        .catch(reason => ({ status: 'rejected', reason }))
    )
  );
}
```
