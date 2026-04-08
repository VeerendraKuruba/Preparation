# Round 2 — Frontend System Design

The whiteboard round. Candidates report the problem is often under-communicated — ask clarifying questions upfront before designing anything.

## Framework: How to Approach Any Frontend System Design

### Step 1 — Clarify Requirements (5 min)
Ask before you draw anything:
- Who are the users? What's the scale? (1K vs 1M concurrent users)
- What are the core features for this design? What's out of scope?
- What devices? (mobile, desktop, both)
- What are the performance requirements? (load time, interactivity)
- Real-time or polling? Offline support needed?
- Authentication/authorization constraints?

### Step 2 — High Level Architecture (5 min)
- Identify main pages/views
- Draw component tree (top-level breakdown)
- Identify data flows

### Step 3 — Data Modeling & API Design (10 min)
- What entities/models exist?
- REST vs GraphQL?
- API contract: endpoints, request/response shape

### Step 4 — State Management (5 min)
- Server state vs UI state
- Global vs local state
- Caching strategy

### Step 5 — Deep Dive on One Area (15 min)
- Performance, accessibility, real-time, etc.
- Go deep where the interviewer steers you

### Step 6 — Trade-offs (5 min)
- What would you do differently at 10x scale?
- What are the failure modes?

---

## Question 1: Design SurveyMonkey's Survey Builder

**Clarifying Questions to Ask:**
- Does it support real-time collaboration (like Google Docs)?
- How many question types? (MCQ, text, rating, matrix, file upload)
- Does it have branching/skip logic?
- Mobile support?
- Max questions per survey?

### Component Architecture

```
SurveyBuilderPage
├── SurveyHeader (title, settings, save/publish buttons)
├── SurveyCanvas
│   ├── QuestionList (drag-and-drop reorderable)
│   │   └── QuestionCard (renders based on question.type)
│   │       ├── MultipleChoiceQuestion
│   │       ├── TextQuestion
│   │       ├── RatingQuestion
│   │       └── MatrixQuestion
│   └── AddQuestionButton
├── QuestionEditorPanel (right sidebar — edits selected question)
│   ├── QuestionTypeSelector
│   ├── OptionsEditor
│   ├── ValidationRules
│   └── LogicBranching
└── PreviewModal
```

### Data Model

```ts
interface Survey {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'closed';
  questions: Question[];
  settings: SurveySettings;
  createdAt: string;
  updatedAt: string;
}

interface Question {
  id: string;
  type: 'multiple_choice' | 'text' | 'rating' | 'checkbox' | 'matrix';
  text: string;
  required: boolean;
  options?: Option[];
  validation?: ValidationRule;
  skipLogic?: SkipLogicRule[];
  order: number;
}

interface Option {
  id: string;
  text: string;
  value: string;
}

interface SkipLogicRule {
  condition: 'equals' | 'not_equals' | 'contains';
  value: string;
  jumpToQuestionId: string | 'end';
}
```

### State Management

```
Global State (Zustand/Redux)
├── surveyDraft — the in-progress survey object
├── selectedQuestionId — which question is being edited
├── isDirty — unsaved changes indicator
└── undoHistory — for undo/redo (command pattern)

Server State (React Query / SWR)
├── useGetSurvey(id) — fetch existing survey
├── useSaveSurvey() — auto-save mutation
└── usePublishSurvey() — publish mutation
```

### Auto-Save Strategy

```
User types → debounce 1s → optimistic local update → 
POST /api/surveys/:id (PATCH) → server confirms → 
on failure: show "Save failed" banner + retry with exponential backoff
```

### Undo/Redo (Command Pattern)

```ts
interface Command {
  execute(): void;
  undo(): void;
}

class AddQuestionCommand implements Command {
  constructor(private question: Question, private surveyStore: Store) {}
  execute() { this.surveyStore.addQuestion(this.question); }
  undo() { this.surveyStore.removeQuestion(this.question.id); }
}

class CommandHistory {
  private history: Command[] = [];
  private index = -1;

  execute(cmd: Command) {
    cmd.execute();
    this.history = this.history.slice(0, this.index + 1);
    this.history.push(cmd);
    this.index++;
  }
  undo() { if (this.index >= 0) this.history[this.index--].undo(); }
  redo() { if (this.index < this.history.length - 1) this.history[++this.index].execute(); }
}
```

---

## Question 2: Design a Survey Response/Analytics Dashboard

### Requirements (clarify these)
- Real-time updates vs periodic refresh?
- Number of responses (1K vs 1M)?
- Export to CSV/PDF?
- Chart types needed?

### Architecture

```
AnalyticsDashboard
├── SummaryStats (total responses, completion rate, avg time)
├── ResponseTrend (line chart — responses over time)
├── QuestionBreakdown
│   ├── MultipleChoiceChart (pie/bar)
│   ├── WordCloud (for text responses)
│   ├── RatingDistribution (histogram)
│   └── MatrixHeatmap
├── ResponseTable (individual responses, filterable)
└── ExportControls
```

### Real-time Strategy (if required)

```
Option A: WebSocket
- Server pushes new response counts
- Pros: truly real-time, low latency
- Cons: complex, stateful server, scaling challenges

Option B: Server-Sent Events (SSE)
- One-way stream from server
- Pros: simpler, HTTP-based, auto-reconnect
- Cons: one-way only

Option C: Polling (simpler)
- Poll /api/surveys/:id/stats every 30s
- Pros: simplest, stateless server
- Cons: stale data, unnecessary requests
```

**Recommend SSE for this use case** — response counts are server→client only.

### Rendering Performance (large datasets)

- Virtual scrolling for response table (`react-virtual` / `TanStack Virtual`)
- Paginate API: `GET /api/surveys/:id/responses?page=1&limit=50`
- Chart data aggregated server-side — never send raw 1M rows to client
- Memoize chart components with `React.memo`

---

## Question 3: Design a Form/Survey Renderer (Respondent View)

### Key Decisions

```
Client-side routing between pages vs single-page scroll?
→ Multi-page surveys: route per page → prevents large DOM, saves partial progress

State: Where does draft response state live?
→ localStorage for persistence across tabs/refresh
→ Sync to server on each page navigation (progress saving)

Validation: When to validate?
→ On blur (per field) + on "Next" button click
→ Never block typing, validate on exit
```

### Offline Support (Progressive Enhancement)

```
Service Worker intercepts POST /api/responses
If offline:
  → Queue to IndexedDB
  → Show "Response saved locally"
When back online:
  → Background sync API replays queued submissions
  → Show "Response submitted successfully"
```

---

## Common Follow-up Topics

**Q: How would you handle a 10MB survey with 500 questions?**
- Virtualize the question list (only render visible questions)
- Lazy load question types (dynamic import per type)
- Paginate: split into logical sections with route-level code splitting

**Q: How would you support accessibility?**
- ARIA labels on all form controls (`aria-required`, `aria-invalid`, `aria-describedby`)
- Focus management on page transitions (move focus to page title)
- Keyboard navigation for drag-and-drop (fallback keyboard reordering)
- Color contrast AA compliance
- Screen reader testing with VoiceOver/NVDA

**Q: How would you handle surveys in multiple languages?**
- i18n library: `react-i18next` or `FormatJS`
- Survey content: separate translation API endpoint
- RTL support: CSS logical properties + `dir="rtl"` on root
