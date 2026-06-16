# TypeScript Deep Dive — Nextiva Staff FE Q&A

> JD emphasis: **strict mode, generics, type guards — no `any`**

---

## Q1: `interface` vs `type` — when to use each?

| Feature | `interface` | `type` |
|---------|-------------|--------|
| Declaration merging | Yes | No |
| Unions / primitives | No | Yes |
| `extends` | Native | Via `&` intersection |
| Mapped / conditional types | No | Yes |

**Team convention:** `interface` for public object contracts; `type` for unions, utilities, mapped types.

---

## Q2: `unknown` vs `any` vs `never`

```typescript
// any — opts out of checking (avoid)
function parse(raw: any) { return raw.foo; }

// unknown — safe top type; must narrow before use
function parseSafe(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null && 'foo' in raw) {
    return String((raw as { foo: unknown }).foo);
  }
  throw new Error('Invalid');
}

// never — unreachable (exhaustive switch)
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${x}`);
}
```

**Migration strategy:** Replace `any` with `unknown` + type guards incrementally.

---

## Q3: Discriminated unions for async UI state

```typescript
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function MessageList({ state }: { state: RequestState<Message[]> }) {
  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <Spinner />;
    case 'error':
      return <ErrorBanner error={state.error} />;
    case 'success':
      return <List items={state.data} />;
    default:
      return assertNever(state);
  }
}
```

**Why not `{ loading: boolean; data?: T; error?: Error }`?** Impossible states (`loading: true` + `error` set) are representable.

---

## Q4: Type guards

```typescript
interface CallEvent { type: 'call'; callId: string }
interface MessageEvent { type: 'message'; body: string }
type SocketEvent = CallEvent | MessageEvent;

function isCallEvent(e: SocketEvent): e is CallEvent {
  return e.type === 'call';
}

function handle(e: SocketEvent) {
  if (isCallEvent(e)) {
    console.log(e.callId); // narrowed
  }
}
```

**Built-in guards:** `typeof`, `instanceof`, `in` operator.

---

## Q5: Generics — typed API client

```typescript
type ApiResponse<T> = { data: T; meta: { page: number } };

async function fetchApi<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(path, init);
  if (!res.ok) throw new ApiError(res.status);
  return res.json() as Promise<ApiResponse<T>>;
}

// Usage
const contacts = await fetchApi<Contact[]>('/api/contacts');
```

---

## Q6: Generic constraints

```typescript
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map(item => item[key]);
}

pluck(contacts, 'name'); // string[]
// pluck(contacts, 'invalid'); // compile error
```

---

## Q7: Utility types you'll use daily

```typescript
type PartialUser = Partial<User>;           // all optional
type ReadonlyConfig = Readonly<Config>;     // immutable
type UserKeys = keyof User;                 // union of keys
type UserPreview = Pick<User, 'id' | 'name'>;
type UserWithoutId = Omit<User, 'id'>;
type Nullable<T> = T | null;
type AsyncReturn<T extends (...args: never[]) => Promise<unknown>> =
  T extends (...args: never[]) => Promise<infer R> ? R : never;
```

---

## Q8: `satisfies` operator

```typescript
const routes = {
  home: '/',
  inbox: '/inbox',
} as const satisfies Record<string, string>;

// routes.inbox is '/inbox' (literal), not string
```

---

## Q9: Strict mode checklist

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true
  }
}
```

**`noUncheckedIndexedAccess`:** `arr[0]` is `T | undefined` — forces null checks.

---

## Q10: Typing React components

```typescript
type ButtonProps = {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
} & React.ComponentPropsWithoutRef<'button'>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size = 'md', children, ...rest }, ref) => (
    <button ref={ref} className={cn(variants({ variant, size }))} {...rest}>
      {children}
    </button>
  )
);
```

---

## Q11: Zod + TypeScript for runtime validation

```typescript
const ContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
});

type Contact = z.infer<typeof ContactSchema>;

function parseContact(raw: unknown): Contact {
  return ContactSchema.parse(raw); // throws ZodError if invalid
}
```

**WebSocket payloads:** Always validate at the boundary — wire format is untrusted.

---

## Q12: Conditional types (Staff-level)

```typescript
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractRouteParams<'/inbox/:conversationId/messages/:messageId'>;
// 'conversationId' | 'messageId'
```

**Practical use:** Type-safe route param extraction with TanStack Router.
