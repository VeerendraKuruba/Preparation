# Round 2 — Low Level Design (LLD)

LLD focuses on the design of individual components, hooks, and modules — not infrastructure. Think: "how would you implement this feature cleanly?"

---

## LLD 1: Design a Drag-and-Drop Question Reorderer

### Requirements
- Drag questions to reorder them
- Visual feedback during drag
- Accessible keyboard alternative
- Works on touch devices

### Approach

```tsx
// Using native HTML5 Drag and Drop API (no library)

interface QuestionListProps {
  questions: Question[];
  onReorder: (newOrder: Question[]) => void;
}

function DraggableQuestionList({ questions, onReorder }: QuestionListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, id: string) => {
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };

  const handleDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newQuestions = [...questions];
    const fromIndex = newQuestions.findIndex(q => q.id === draggedId);
    const toIndex = newQuestions.findIndex(q => q.id === targetId);

    const [moved] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, moved);

    onReorder(newQuestions);
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <ul role="list" aria-label="Survey questions">
      {questions.map((q, index) => (
        <li
          key={q.id}
          draggable
          role="listitem"
          aria-label={`Question ${index + 1}: ${q.text}`}
          style={{
            opacity: draggedId === q.id ? 0.4 : 1,
            borderTop: dragOverId === q.id ? '2px solid blue' : 'none',
            cursor: 'grab',
          }}
          onDragStart={e => handleDragStart(e, q.id)}
          onDragOver={e => handleDragOver(e, q.id)}
          onDrop={e => handleDrop(e, q.id)}
          onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
        >
          <QuestionCard question={q} />
        </li>
      ))}
    </ul>
  );
}
```

### Keyboard Alternative (Accessibility)

```tsx
function useKeyboardReorder(questions, onReorder) {
  const [focusedIndex, setFocusedIndex] = useState(null);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const next = [...questions];
      [next[index], next[index - 1]] = [next[index - 1], next[index]];
      onReorder(next);
      setFocusedIndex(index - 1);
    }
    if (e.key === 'ArrowDown' && index < questions.length - 1) {
      e.preventDefault();
      const next = [...questions];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onReorder(next);
      setFocusedIndex(index + 1);
    }
  };

  return { handleKeyDown, focusedIndex };
}
```

---

## LLD 2: Design a Multi-Step Survey Form with Progress

### Requirements
- Multiple pages, progress bar
- Validate before moving to next page
- Resume from where you left off (localStorage)
- No data loss on refresh

```tsx
interface SurveyFormState {
  currentPage: number;
  answers: Record<string, Answer>;
  completed: boolean;
}

function useSurveyProgress(surveyId: string, totalPages: number) {
  const storageKey = `survey_progress_${surveyId}`;

  const [state, setState] = useState<SurveyFormState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : { currentPage: 0, answers: {}, completed: false };
    } catch {
      return { currentPage: 0, answers: {}, completed: false };
    }
  });

  const saveAnswer = (questionId: string, answer: Answer) => {
    setState(prev => {
      const next = { ...prev, answers: { ...prev.answers, [questionId]: answer } };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const goToPage = (page: number) => {
    setState(prev => {
      const next = { ...prev, currentPage: page };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const complete = () => {
    localStorage.removeItem(storageKey); // clear on submit
    setState(prev => ({ ...prev, completed: true }));
  };

  return { ...state, saveAnswer, goToPage, complete };
}

// Component
function SurveyRenderer({ survey }: { survey: Survey }) {
  const pages = chunkQuestionsIntoPages(survey.questions);
  const { currentPage, answers, saveAnswer, goToPage, complete } = useSurveyProgress(
    survey.id, pages.length
  );
  const [validationErrors, setValidationErrors] = useState({});

  const validatePage = (questions: Question[]) => {
    const errors: Record<string, string> = {};
    questions.forEach(q => {
      if (q.required && !answers[q.id]) {
        errors[q.id] = 'This question is required';
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validatePage(pages[currentPage])) {
      goToPage(currentPage + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validatePage(pages[currentPage])) return;
    await fetch(`/api/surveys/${survey.id}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    complete();
  };

  const progress = ((currentPage) / pages.length) * 100;

  return (
    <div>
      {/* Progress Bar */}
      <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}
        aria-label="Survey completion progress">
        <div style={{ width: `${progress}%`, height: '4px', background: '#00BF6F' }} />
      </div>
      <p>{currentPage + 1} of {pages.length}</p>

      {/* Questions */}
      {pages[currentPage].map(q => (
        <QuestionRenderer
          key={q.id}
          question={q}
          value={answers[q.id]}
          error={validationErrors[q.id]}
          onChange={answer => saveAnswer(q.id, answer)}
        />
      ))}

      {/* Navigation */}
      <div>
        {currentPage > 0 && (
          <button onClick={() => goToPage(currentPage - 1)}>Back</button>
        )}
        {currentPage < pages.length - 1 ? (
          <button onClick={handleNext}>Next</button>
        ) : (
          <button onClick={handleSubmit}>Submit</button>
        )}
      </div>
    </div>
  );
}
```

---

## LLD 3: Design a Real-Time Response Counter (WebSocket)

```tsx
function useRealtimeResponseCount(surveyId: string, initialCount: number) {
  const [count, setCount] = useState(initialCount);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`wss://api.surveymonkey.com/surveys/${surveyId}/stream`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      if (type === 'RESPONSE_SUBMITTED') {
        setCount(payload.totalResponses);
      }
    };

    ws.onerror = () => {
      // Fallback to polling
      const interval = setInterval(async () => {
        const res = await fetch(`/api/surveys/${surveyId}/stats`);
        const { totalResponses } = await res.json();
        setCount(totalResponses);
      }, 30000);
      return () => clearInterval(interval);
    };

    return () => {
      ws.close();
    };
  }, [surveyId]);

  return count;
}
```

---

## LLD 4: Design a Virtual Scrolling List (10K rows)

```tsx
function VirtualList({ items, itemHeight = 60, containerHeight = 600 }) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              <ResponseRow response={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## LLD 5: Design an Accessible Modal

```tsx
function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Trap focus inside modal
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    modalRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus(); // restore focus on close
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={modalRef} tabIndex={-1} style={{ background: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '100%' }}>
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose} aria-label="Close dialog">×</button>
      </div>
    </div>,
    document.body
  );
}
```
