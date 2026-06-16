# TanStack Ecosystem — Query, Router, Form

> JD: TanStack Query, Router, Form for state/data management

---

## Q1: Server state vs client state — why TanStack Query?

**Server state characteristics:**
- Async, shared across components
- Can become stale
- Needs caching, deduplication, background refresh

**TanStack Query solves:**
- Stale-while-revalidate
- Request deduplication (same key = one network call)
- Cache invalidation on mutations
- Optimistic updates with rollback
- Pagination / infinite queries

**Don't put server data in Redux/Zustand** — you'll reimplement Query badly.

---

## Q2: Query key factory pattern

```typescript
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (filters: ContactFilters) => [...contactKeys.lists(), filters] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
};

// Invalidate all contact lists after create
queryClient.invalidateQueries({ queryKey: contactKeys.lists() });

// Invalidate one contact
queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) });
```

**Staff insight:** Hierarchical keys enable surgical invalidation — avoid `invalidateQueries({ queryKey: ['contacts'] })` nuking everything unless intended.

---

## Q3: Optimistic update — full lifecycle

```typescript
const sendMessage = useMutation({
  mutationFn: postMessage,
  onMutate: async (newMsg) => {
    await queryClient.cancelQueries({ queryKey: messageKeys.thread(convId) });
    const previous = queryClient.getQueryData<Message[]>(messageKeys.thread(convId));
    queryClient.setQueryData(messageKeys.thread(convId), (old = []) => [
      ...old,
      { ...newMsg, id: crypto.randomUUID(), status: 'pending' },
    ]);
    return { previous };
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(messageKeys.thread(convId), context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: messageKeys.thread(convId) });
  },
});
```

**Steps:** cancel in-flight → snapshot → optimistic patch → rollback on error → reconcile on settle.

---

## Q4: `staleTime` vs `gcTime` (formerly `cacheTime`)

| Option | Meaning |
|--------|---------|
| `staleTime` | How long data is "fresh" — no background refetch |
| `gcTime` | How long inactive cache entries stay in memory |

**Contact list:** `staleTime: 30_000` (30s) — agents expect reasonably fresh data
**User profile:** `staleTime: 5 * 60_000` (5min) — changes infrequently

---

## Q5: Infinite queries for message history

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: messageKeys.thread(conversationId),
  queryFn: ({ pageParam }) => fetchMessages(conversationId, pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

**UI:** Intersection Observer on sentinel at top to `fetchNextPage()` — load older messages on scroll up.

---

## Q6: TanStack Router — type-safe routing

```typescript
const conversationRoute = createRoute({
  getParentRoute: () => inboxRoute,
  path: '/inbox/$conversationId',
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData({
      queryKey: messageKeys.thread(params.conversationId),
      queryFn: () => fetchMessages(params.conversationId),
    }),
  component: ConversationView,
});
```

**Benefits:**
- Type-safe params and search strings
- Loader prefetch eliminates waterfalls
- Integration with Query for SSR dehydration

---

## Q7: Search params as state

```typescript
// Filters in URL — shareable, back-button friendly
/inbox?status=open&queue=sales&page=2

const searchSchema = z.object({
  status: z.enum(['open', 'closed', 'all']).default('open'),
  queue: z.string().optional(),
  page: z.coerce.number().default(1),
});
```

**Use URL for:** filters, pagination, selected tab — not ephemeral UI like hover state.

---

## Q8: TanStack Form — performance-first forms

```typescript
const form = useForm({
  defaultValues: { name: '', phone: '' },
  validators: { onChange: contactSchema },
  onSubmit: async ({ value }) => {
    await createContact(value);
  },
});

<form.Field name="phone">
  {(field) => (
    <input
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      aria-invalid={field.state.meta.errors.length > 0}
    />
  )}
</form.Field>
```

**vs React Hook Form:** Both valid; TanStack Form integrates with Query/Router ecosystem.

---

## Q9: Suspense queries

```typescript
const { data } = useSuspenseQuery({
  queryKey: contactKeys.detail(id),
  queryFn: () => fetchContact(id),
});

// No isLoading branch — parent <Suspense fallback={<Skeleton />}> handles it
```

**Trade-off:** Cleaner component; requires Suspense boundary architecture.

---

## Q10: Prefetch on hover (perceived performance)

```typescript
function ConversationRow({ id }: { id: string }) {
  const queryClient = useQueryClient();

  return (
    <div
      onMouseEnter={() => {
        queryClient.prefetchQuery({
          queryKey: messageKeys.thread(id),
          queryFn: () => fetchMessages(id),
          staleTime: 10_000,
        });
      }}
    >
      ...
    </div>
  );
}
```

---

## Q11: Interview decision framework

| Data type | Tool |
|-----------|------|
| REST/GraphQL entity | TanStack Query |
| Pagination in URL | TanStack Router search params |
| Form with validation | TanStack Form |
| Selected conversation (client) | `useState` or Zustand |
| WebSocket events | Patch Query cache via `setQueryData` |
| Auth token | Context or secure cookie (httpOnly) |

---

## Q12: Common mistakes

- Fetching in `useEffect` instead of Query
- No query key hierarchy → over-invalidation
- Optimistic update without cancel + rollback
- Putting WebSocket connection state in Query (use ref/custom hook)
- `refetchOnWindowFocus: true` on high-churn data without tuning
