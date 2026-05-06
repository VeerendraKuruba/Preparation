# Machine Coding — Build UI Components

> Adobe heavily tests machine coding: build a working component from scratch in 30–45 min. Expect to use vanilla JS or React. Interviewers look for: clean code, edge case handling, accessibility, and good component API design.

---

## How to Approach Machine Coding

```
1. Clarify requirements (3 min)
   - "Should this be a controlled or uncontrolled component?"
   - "Does it need to work without JavaScript? (progressive enhancement)"
   - "What accessibility requirements? Keyboard? Screen reader?"
   - "Any performance constraints? Max items?"

2. Plan the component API (2 min)
   - Props interface
   - State shape
   - Key event handlers

3. Build skeleton first, then fill in (5 min)
   - HTML structure / JSX
   - State management
   - Event handlers
   - Accessibility

4. Test with edge cases (5 min)
   - Empty state, loading state, error state
   - Keyboard navigation
   - Accessibility attributes
```

---

## 1. Star Rating Component

**Requirements:** Clickable star rating (1–5), hover preview, accessible, controlled + uncontrolled.

```tsx
interface StarRatingProps {
  value?: number;                      // controlled
  defaultValue?: number;               // uncontrolled
  max?: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  label?: string;
}

function StarRating({
  value,
  defaultValue = 0,
  max = 5,
  onChange,
  readOnly = false,
  label = 'Rating',
}: StarRatingProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [hovered, setHovered] = useState(0);

  const currentValue = isControlled ? value : internalValue;
  const displayValue = hovered || currentValue;

  const handleClick = (rating: number) => {
    if (readOnly) return;
    if (!isControlled) setInternalValue(rating);
    onChange?.(rating);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-readonly={readOnly}
      className="star-rating"
      onMouseLeave={() => setHovered(0)}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === currentValue}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          tabIndex={readOnly ? -1 : 0}
          className={`star ${star <= displayValue ? 'star--filled' : 'star--empty'}`}
          disabled={readOnly}
        >
          ★
        </button>
      ))}
      <span className="sr-only">
        {currentValue ? `${currentValue} out of ${max} stars` : 'Not rated'}
      </span>
    </div>
  );
}

// Keyboard support — left/right arrows to change rating
// Add to the radiogroup container
function handleKeyDown(e: React.KeyboardEvent, currentValue: number, max: number) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault();
    handleClick(Math.min(currentValue + 1, max));
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault();
    handleClick(Math.max(currentValue - 1, 1));
  }
}
```

---

## 2. Autocomplete / Type-ahead Search

**Requirements:** Async search, debounce, keyboard navigation, accessible combobox pattern.

```tsx
interface AutocompleteProps<T> {
  placeholder?: string;
  fetchSuggestions: (query: string) => Promise<T[]>;
  getLabel: (item: T) => string;
  getValue: (item: T) => string;
  onSelect: (item: T) => void;
  debounceMs?: number;
}

function Autocomplete<T>({
  placeholder,
  fetchSuggestions,
  getLabel,
  getValue,
  onSelect,
  debounceMs = 300,
}: AutocompleteProps<T>) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedFetch = useRef(debounce(async (query: string) => {
    if (!query.trim()) { setSuggestions([]); setIsOpen(false); return; }
    setIsLoading(true);
    try {
      const results = await fetchSuggestions(query);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setActiveIndex(-1);
    } finally {
      setIsLoading(false);
    }
  }, debounceMs));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    debouncedFetch.current(e.target.value);
  };

  const handleSelect = (item: T) => {
    setInputValue(getLabel(item));
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    onSelect(item);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) handleSelect(suggestions[activeIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div className="autocomplete" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
      <input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
      />
      {isLoading && <span aria-live="polite">Loading...</span>}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="suggestions-list"
        >
          {suggestions.map((item, index) => (
            <li
              key={getValue(item)}
              id={`option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleSelect(item)}
              className={index === activeIndex ? 'active' : ''}
            >
              {getLabel(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 3. Tabs Component

**Requirements:** Accessible keyboard navigation, supports controlled & uncontrolled, lazy content rendering.

```tsx
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultActiveTab?: string;
  activeTab?: string; // controlled
  onChange?: (tabId: string) => void;
  lazy?: boolean; // don't render inactive tab content until first activated
}

function Tabs({ tabs, defaultActiveTab, activeTab, onChange, lazy = true }: TabsProps) {
  const isControlled = activeTab !== undefined;
  const [internalActive, setInternalActive] = useState(defaultActiveTab ?? tabs[0]?.id);
  const [activatedTabs, setActivatedTabs] = useState(new Set([defaultActiveTab ?? tabs[0]?.id]));

  const currentTab = isControlled ? activeTab : internalActive;

  const activateTab = (id: string) => {
    if (!isControlled) setInternalActive(id);
    setActivatedTabs(prev => new Set(prev).add(id));
    onChange?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter(t => !t.disabled);
    const currentIndex = enabledTabs.findIndex(t => t.id === currentTab);

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabledTabs.length;
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = enabledTabs.length - 1;
    else return;

    e.preventDefault();
    activateTab(enabledTabs[nextIndex].id);
    // Move focus to activated tab
    document.getElementById(`tab-${enabledTabs[nextIndex].id}`)?.focus();
  };

  return (
    <div className="tabs">
      {/* Tab list */}
      <div role="tablist" aria-label="Content tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={tab.id === currentTab}
            aria-controls={`panel-${tab.id}`}
            aria-disabled={tab.disabled}
            tabIndex={tab.id === currentTab ? 0 : -1} // roving tabindex
            onClick={() => !tab.disabled && activateTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={tab.id === currentTab ? 'tab tab--active' : 'tab'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tabs.map(tab => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== currentTab}
          tabIndex={0}
        >
          {/* Lazy: only render content after first activation */}
          {(!lazy || activatedTabs.has(tab.id)) && tab.content}
        </div>
      ))}
    </div>
  );
}
```

---

## 4. Infinite Scroll Component

**Requirements:** Load more items as user scrolls, loading state, error state, no layout shift.

```tsx
interface InfiniteScrollProps<T> {
  fetchPage: (page: number) => Promise<{ items: T[]; hasMore: boolean }>;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T) => string;
  pageSize?: number;
}

function InfiniteScroll<T>({ fetchPage, renderItem, getItemKey, pageSize = 20 }: InfiniteScrollProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setError(null);
    try {
      const { items: newItems, hasMore: more } = await fetchPage(page);
      setItems(prev => [...prev, ...newItems]);
      setHasMore(more);
      setPage(p => p + 1);
    } catch (err) {
      setError('Failed to load more items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, page, isLoading, hasMore]);

  // Initial load
  useEffect(() => { loadMore(); }, []);

  // Intersection Observer trigger
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1, rootMargin: '200px' } // pre-load 200px before reaching end
    );

    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [loadMore]);

  return (
    <div className="infinite-scroll">
      <ul role="list" aria-label="Items list">
        {items.map((item, index) => (
          <li key={getItemKey(item)}>{renderItem(item, index)}</li>
        ))}
      </ul>

      {/* Reserve space to prevent layout shift */}
      <div
        ref={sentinelRef}
        style={{ height: 1 }}
        aria-hidden="true"
      />

      {isLoading && (
        <div role="status" aria-live="polite" aria-label="Loading more items">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={loadMore}>Try again</button>
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p role="status">All {items.length} items loaded.</p>
      )}
    </div>
  );
}
```

---

## 5. Modal / Dialog

**Requirements:** Focus trap, scroll lock, keyboard dismiss (Escape), accessible.

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      // Focus the dialog (or first focusable element inside)
      dialogRef.current?.focus();
      // Lock scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll
      document.body.style.overflow = '';
      // Return focus to trigger element
      previousFocus.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Focus trap
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="modal-backdrop"
      onClick={onClose} // click outside to close
      aria-hidden="true"
    >
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal modal--${size}`}
        onClick={e => e.stopPropagation()} // prevent backdrop close
        onKeyDown={handleKeyDown}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="modal__close"
          >
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
```

---

## 6. Drag and Drop List (without external library)

```tsx
function DraggableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: {
  items: T[];
  onReorder: (newOrder: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
}) {
  const [localItems, setLocalItems] = useState(items);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
    // Visual feedback — reorder on drag (not just on drop)
    if (dragItem.current === null || dragItem.current === index) return;

    const newItems = [...localItems];
    const dragged = newItems.splice(dragItem.current, 1)[0];
    newItems.splice(index, 0, dragged);
    dragItem.current = index;
    setLocalItems(newItems);
  };

  const handleDrop = () => {
    onReorder(localItems);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Keyboard alternative to drag (accessibility requirement)
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const newItems = [...localItems];
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
      setLocalItems(newItems);
      onReorder(newItems);
    }
    if (e.key === 'ArrowDown' && index < localItems.length - 1) {
      e.preventDefault();
      const newItems = [...localItems];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      setLocalItems(newItems);
      onReorder(newItems);
    }
  };

  return (
    <ul role="listbox" aria-label="Reorderable list">
      {localItems.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragOver={e => e.preventDefault()} // necessary to allow drop
          onDrop={handleDrop}
          onKeyDown={(e) => handleKeyDown(e, index)}
          tabIndex={0}
          role="option"
          aria-label={`Item ${index + 1} of ${localItems.length}. Use arrow keys to reorder.`}
          className="draggable-item"
          style={{ cursor: 'grab' }}
        >
          <span className="drag-handle" aria-hidden="true">⠿</span>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}
```

---

## 7. Accordion

```tsx
interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

function Accordion({
  items,
  allowMultiple = false,
}: {
  items: AccordionItem[];
  allowMultiple?: boolean;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="accordion">
      {items.map(item => {
        const isOpen = openIds.has(item.id);
        const panelId = `panel-${item.id}`;
        const headingId = `heading-${item.id}`;

        return (
          <div key={item.id} className="accordion-item">
            <h3>
              <button
                id={headingId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="accordion-trigger"
              >
                {item.title}
                <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headingId}
              hidden={!isOpen}
              className="accordion-panel"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 8. Toast Notification System

```tsx
// Context-based toast system
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const ToastContext = createContext<{
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
} | null>(null);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...toast, id }]);

    if (toast.duration !== 0) { // duration=0 means persistent
      setTimeout(() => removeToast(id), toast.duration ?? 4000);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Portal to body so z-index always wins */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return createPortal(
    <div
      className="toast-container"
      aria-live="polite"
      aria-atomic="false"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className={`toast toast--${toast.type}`}
        >
          <span>{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

---

## Common Patterns for All Machine Coding Questions

```tsx
// 1. Always handle: loading, error, empty states
function ComponentWithStates({ data, isLoading, error }) {
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorCard message={error} />;
  if (!data?.length) return <EmptyState />;
  return <DataView data={data} />;
}

// 2. Always add proper aria attributes
<button
  disabled={isLoading}
  aria-busy={isLoading}
  aria-describedby={error ? 'error-msg' : undefined}
>
  Submit
</button>

// 3. Don't forget keyboard navigation in interactive components
// Tab: move between components
// Enter/Space: activate buttons
// Arrow keys: move within component (listbox, menu, tabs, radiogroup)
// Escape: close dialogs/menus

// 4. Use semantic HTML first, ARIA only when semantics run out
<button>Submit</button>            // ✅ always prefer
<div role="button" tabIndex={0}>  // ❌ only if you can't use button
```
