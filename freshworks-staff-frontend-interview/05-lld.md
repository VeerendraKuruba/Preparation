# Low-Level Design (LLD) — Freshworks Staff Frontend Q&A

LLD round tests your ability to design clean, extensible classes and components. Freshworks has confirmed LRU Cache, Store class, rate limiter, and autocomplete as LLD asks.

---

## Q1: LRU Cache — Full OOP Design (CONFIRMED)

Using a doubly linked list + HashMap for true O(1) operations in any language.

```js
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // key → Node

    // Sentinel nodes — avoid null checks
    this.head = new Node(0, 0); // LRU end
    this.tail = new Node(0, 0); // MRU end
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToTail(node) {
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev.next = node;
    this.tail.prev = node;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node);
    this._addToTail(node); // mark as recently used
    return node.value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      this._remove(this.map.get(key));
    }
    const node = new Node(key, value);
    this._addToTail(node);
    this.map.set(key, node);

    if (this.map.size > this.capacity) {
      const lru = this.head.next; // evict from front
      this._remove(lru);
      this.map.delete(lru.key);
    }
  }
}
```

**Explain to interviewer:**
- Sentinel head/tail eliminates edge-case null checks
- HashMap gives O(1) lookup; DLL gives O(1) insert/remove
- Every `get` promotes node to tail (MRU). Eviction always removes head.next (LRU).

---

## Q2: Rate Limiter — Token Bucket (CONFIRMED)

```js
class TokenBucketRateLimiter {
  constructor(capacity, refillRate) {
    this.capacity = capacity;     // max tokens
    this.tokens = capacity;       // current tokens
    this.refillRate = refillRate; // tokens added per ms
    this.lastRefill = Date.now();
  }

  _refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }

  allow(cost = 1) {
    this._refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true; // request allowed
    }
    return false; // rate limited
  }
}

// Usage: 10 requests/second, burst up to 20
const limiter = new TokenBucketRateLimiter(20, 10 / 1000);
limiter.allow(); // true
```

**Sliding Window Rate Limiter (more accurate):**
```js
class SlidingWindowRateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = []; // timestamps
  }

  allow() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove requests outside the window
    this.requests = this.requests.filter(t => t > windowStart);

    if (this.requests.length < this.limit) {
      this.requests.push(now);
      return true;
    }
    return false;
  }
}

// 5 requests per second
const limiter = new SlidingWindowRateLimiter(5, 1000);
```

**When to use each:**
- Token Bucket: bursty traffic OK, simple to implement
- Sliding Window: stricter, more accurate per-window limits

---

## Q3: Event Emitter / Pub-Sub System

```js
class EventEmitter {
  constructor() {
    this._events = new Map(); // event name → Set of listeners
  }

  on(event, listener) {
    if (!this._events.has(event)) this._events.set(event, new Set());
    this._events.get(event).add(listener);
    return this; // chainable
  }

  off(event, listener) {
    this._events.get(event)?.delete(listener);
    return this;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    this._events.get(event)?.forEach(listener => listener(...args));
    return this;
  }

  removeAllListeners(event) {
    if (event) this._events.delete(event);
    else this._events.clear();
    return this;
  }
}

// Usage
const emitter = new EventEmitter();
emitter.on('ticket:created', (ticket) => console.log('New ticket:', ticket.id));
emitter.emit('ticket:created', { id: 123, subject: 'Login issue' });
```

**Freshworks relevance:** Freshworks products communicate across iframes and microfrontends using events. Understanding a robust pub-sub system is directly applicable.

---

## Q4: Autocomplete Widget — Component Design

```js
class Autocomplete {
  constructor({ input, onSearch, onSelect, minChars = 2, debounceMs = 200 }) {
    this.input = input;
    this.onSearch = onSearch;    // async (query) => suggestions[]
    this.onSelect = onSelect;    // (suggestion) => void
    this.minChars = minChars;
    this.debounceMs = debounceMs;

    this._suggestions = [];
    this._activeIndex = -1;
    this._timer = null;
    this._cache = new Map();

    this._dropdown = this._createDropdown();
    this._bindEvents();
  }

  _createDropdown() {
    const el = document.createElement('ul');
    el.setAttribute('role', 'listbox');
    el.style.cssText = 'position:absolute;display:none;list-style:none;margin:0;padding:0;border:1px solid #ddd;background:#fff;z-index:1000';
    this.input.parentElement.style.position = 'relative';
    this.input.parentElement.appendChild(el);
    return el;
  }

  _bindEvents() {
    this.input.addEventListener('input', (e) => this._onInput(e.target.value));
    this.input.addEventListener('keydown', (e) => this._onKeyDown(e));
    this.input.addEventListener('blur', () => setTimeout(() => this._hide(), 150));
  }

  _onInput(query) {
    clearTimeout(this._timer);
    if (query.length < this.minChars) { this._hide(); return; }

    this._timer = setTimeout(async () => {
      const suggestions = this._cache.has(query)
        ? this._cache.get(query)
        : await this.onSearch(query);

      this._cache.set(query, suggestions);
      this._suggestions = suggestions;
      this._activeIndex = -1;
      this._render();
    }, this.debounceMs);
  }

  _onKeyDown(e) {
    if (!this._suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this._activeIndex = Math.min(this._activeIndex + 1, this._suggestions.length - 1); this._render(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); this._activeIndex = Math.max(this._activeIndex - 1, -1); this._render(); }
    if (e.key === 'Enter' && this._activeIndex >= 0) this._select(this._suggestions[this._activeIndex]);
    if (e.key === 'Escape') this._hide();
  }

  _select(suggestion) {
    this.input.value = suggestion;
    this.onSelect(suggestion);
    this._hide();
  }

  _render() {
    this._dropdown.innerHTML = this._suggestions
      .map((s, i) => `<li role="option" aria-selected="${i === this._activeIndex}" data-index="${i}" style="padding:8px;cursor:pointer;background:${i === this._activeIndex ? '#e8f0fe' : 'transparent'}">${s}</li>`)
      .join('');

    this._dropdown.querySelectorAll('li').forEach(li => {
      li.addEventListener('mousedown', () => this._select(this._suggestions[+li.dataset.index]));
    });

    this._dropdown.style.display = this._suggestions.length ? 'block' : 'none';
  }

  _hide() {
    this._dropdown.style.display = 'none';
    this._suggestions = [];
  }

  destroy() {
    this._dropdown.remove();
  }
}
```

---

## Q5: Observable / Reactive Store (State Management Pattern)

```js
class Store {
  constructor(initialState) {
    this._state = initialState;
    this._listeners = new Set();
    this._reducers = {};
  }

  getState() {
    return this._state;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener); // returns unsubscribe fn
  }

  dispatch(action) {
    const reducer = this._reducers[action.type];
    if (!reducer) throw new Error(`No reducer for action: ${action.type}`);
    this._state = reducer(this._state, action);
    this._listeners.forEach(fn => fn(this._state));
  }

  addReducer(actionType, reducer) {
    this._reducers[actionType] = reducer;
    return this;
  }
}

// Usage
const store = new Store({ tickets: [], loading: false });

store
  .addReducer('LOAD_START', (state) => ({ ...state, loading: true }))
  .addReducer('LOAD_SUCCESS', (state, action) => ({
    ...state, loading: false, tickets: action.payload
  }));

const unsubscribe = store.subscribe(state => console.log('State:', state));
store.dispatch({ type: 'LOAD_START' });
```
