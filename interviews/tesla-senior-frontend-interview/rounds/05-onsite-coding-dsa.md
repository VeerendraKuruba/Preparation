# Round 5 — Onsite Coding 1: DSA / Simulation (45–60 min)

| | |
|---|---|
| **Format** | Live coding — LeetCode-style or OOP simulation |
| **Eliminates?** | Yes |
| **Focus** | Card games, data transforms, queues, OOP design |

---

## Reported Questions at Tesla Onsite

| Question type | Example |
|---------------|---------|
| OOP simulation | Card game with deque |
| Data transform | Nested JSON → table rows |
| Caching | LRU for API responses |
| Arrays | Merge intervals, valid parentheses |
| Design | Parking lot, deck + hand logic |

---

## Q1: Card game with deque — complete solution

### Full implementation

```js
class Deck {
  constructor() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    this.cards = [];
    for (const s of suits)
      for (const r of ranks)
        this.cards.push({ suit: s, rank: r, id: `${r}${s}` });
    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw() {
    return this.cards.pop() ?? null;
  }

  get size() {
    return this.cards.length;
  }
}

class CardGame {
  constructor() {
    this.deck = new Deck();
    this.hand = [];
    this.discard = [];
  }

  deal(count = 5) {
    this.hand = [];
    for (let i = 0; i < count; i++) {
      const c = this.deck.draw();
      if (c) this.hand.push(c);
    }
    return [...this.hand];
  }

  discardFromHand(index) {
    if (index < 0 || index >= this.hand.length) return null;
    const [card] = this.hand.splice(index, 1);
    this.discard.push(card);
    return card;
  }

  drawToHand() {
    if (this.deck.size === 0) this.recycleDiscard();
    const card = this.deck.draw();
    if (card) this.hand.push(card);
    return card;
  }

  recycleDiscard() {
    if (this.discard.length <= 1) return;
    const top = this.discard.pop();
    this.deck.cards = this.discard;
    this.discard = top ? [top] : [];
    this.deck.shuffle();
  }

  scoreHand() {
    // Simple: sum rank values for interview extension
    const values = { A: 1, J: 10, Q: 10, K: 10 };
    return this.hand.reduce((sum, c) => {
      const v = values[c.rank] ?? parseInt(c.rank, 10);
      return sum + (v || 0);
    }, 0);
  }
}
```

### What to say in interview

> "I'm modeling deck as a stack with pop for O(1) draw. Discard pile is also a stack. When deck empties, recycle discard except top card — classic card game pattern. Game logic is separate from UI so we can unit test shuffle and deal without React."

### Follow-up answers

**Q: Prove shuffle is fair?**
> Fisher-Yates gives each permutation equal probability — industry standard. Not `sort(() => Math.random() - 0.5)` which is biased.

**Q: Test without running UI?**
```js
test('deal gives n cards', () => {
  const g = new CardGame();
  expect(g.deal(5)).toHaveLength(5);
  expect(g.deck.size).toBe(47);
});
```

---

## Q2: Flatten nested JSON for data table

### Input / output

```json
// Input
{
  "plants": [
    {
      "id": "GF1",
      "name": "Fremont",
      "lines": [
        { "id": "L1", "status": "running", "metrics": { "oee": 0.91, "throughput": 120 } },
        { "id": "L2", "status": "down", "metrics": null }
      ]
    }
  ]
}

// Output rows for <Table />
[
  { plantId: "GF1", plantName: "Fremont", lineId: "L1", status: "running", oee: 0.91, throughput: 120 },
  { plantId: "GF1", plantName: "Fremont", lineId: "L2", status: "down", oee: null, throughput: null }
]
```

### Solution with defensive coding

```js
function flattenPlantLines(data) {
  if (!data?.plants?.length) return [];

  return data.plants.flatMap(plant =>
    (plant.lines ?? []).map(line => ({
      plantId: plant.id,
      plantName: plant.name ?? '',
      lineId: line.id,
      status: line.status ?? 'unknown',
      oee: line.metrics?.oee ?? null,
      throughput: line.metrics?.throughput ?? null,
    }))
  );
}
```

### Senior talking points

- **Pure function** — test with fixture JSON, no DOM
- **Null-safe** — factory data often has missing metrics (see production incident stories)
- **Separate transform from render** — `const rows = flattenPlantLines(apiData); return <Table rows={rows} />`

---

## Q3: LRU cache for API responses

### Why LRU on factory tablet?

> Dashboard fetches 50+ endpoints on load. LRU caps memory — evict least-recently-used cached GET when over capacity. Important on constrained devices Tesla uses on factory floor.

### Full LRU implementation

```js
class LRUCache {
  constructor(capacity) {
    if (capacity <= 0) throw new Error('capacity must be positive');
    this.capacity = capacity;
    this.cache = new Map(); // Map preserves insertion order in ES2015+
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }
    this.cache.set(key, value);
  }
}

// Usage in fetch wrapper
const apiCache = new LRUCache(100);

async function cachedGet(url) {
  const hit = apiCache.get(url);
  if (hit !== undefined) return hit;
  const res = await fetch(url);
  const data = await res.json();
  apiCache.put(url, data);
  return data;
}
```

**Complexity:** get/put amortized O(1) with Map.

**Follow-up:** TTL expiry?
> Layer `{ value, expiresAt }` and check on get — LRU handles size, TTL handles staleness for ops data.

---

## Q4: Merge intervals (common medium)

**Problem:** Given intervals `[[1,3],[2,6],[8,10]]`, merge overlapping → `[[1,6],[8,10]]`.

```js
function merge(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const result = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    const last = result[result.length - 1];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      result.push([start, end]);
    }
  }
  return result;
}
```

**Tesla angle:** Merge downtime windows on a factory line schedule UI.

---

## Q5: Valid parentheses

```js
function isValid(s) {
  const stack = [];
  const pairs = { ')': '(', '}': '{', ']': '[' };

  for (const ch of s) {
    if ('({['.includes(ch)) {
      stack.push(ch);
    } else {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}
```

**Edge cases:** Empty string → true. Only open brackets → false.

---

## Q6: OOP — Parking lot (if asked)

```js
class Vehicle {
  constructor(license, type) {
    this.license = license;
    this.type = type; // 'motorcycle' | 'car' | 'bus'
  }
}

class ParkingSpot {
  constructor(id, size) {
    this.id = id;
    this.size = size; // 1=motorcycle, 2=car, 3=bus
    this.vehicle = null;
  }
  canFit(vehicle) {
    const sizeMap = { motorcycle: 1, car: 2, bus: 3 };
    return !this.vehicle && this.size >= sizeMap[vehicle.type];
  }
  park(vehicle) {
    if (!this.canFit(vehicle)) return false;
    this.vehicle = vehicle;
    return true;
  }
  unpark() {
    const v = this.vehicle;
    this.vehicle = null;
    return v;
  }
}

class ParkingLot {
  constructor(spots) {
    this.spots = spots;
  }
  park(vehicle) {
    const spot = this.spots.find(s => s.canFit(vehicle));
    return spot?.park(vehicle) ? spot.id : null;
  }
  leave(spotId) {
    const spot = this.spots.find(s => s.id === spotId);
    return spot?.unpark() ?? null;
  }
}
```

**Extend verbally:** EV charging spots, reservations, multi-floor — show OOP extensibility without building it all.

---

## Execution Script in the Room

| Minute | Action |
|--------|--------|
| 0–3 | Repeat problem, ask edge cases |
| 3–5 | Sketch classes or algorithm on board |
| 5–35 | Code golden path, narrate |
| 35–42 | Test with example + empty input |
| 42–45 | Discuss complexity / extensions |

---

## Senior Signals

- Pure functions separate from UI
- Ask data scale before optimizing
- Name Big-O while coding
- Mention tests you'd write

---

## Prep Checklist

- [ ] Card game + recycle discard from scratch < 25 min
- [ ] JSON flatten with null safety
- [ ] LRU get/put from memory
- [ ] Merge intervals + valid parentheses once each

**Next round:** [06-onsite-coding-ui.md](./06-onsite-coding-ui.md)
