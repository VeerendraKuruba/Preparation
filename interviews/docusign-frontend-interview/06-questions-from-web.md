# Interview Questions Gathered from Web Research
> Sources: Prepfully (DocuSign-specific), Glassdoor, Medium, GreatFrontend, GeeksforGeeks, InterviewBit, DEV.to

---

## SECTION 1 — DocuSign-Specific Questions (Prepfully / Glassdoor)

> These are questions reported by actual candidates who interviewed at DocuSign.

### Coding / JavaScript
1. Find the intersection of two sorted arrays and return a new array of common elements.
2. Create a tic-tac-toe game that receives input from two players, checks input accuracy, and detects if the game has concluded (grid as 2D array).
3. Implement a JavaScript `localStorage` wrapper that automatically deletes items after a specific time period (TTL cache).
4. Design a modal dialog with HTML, CSS, and JavaScript.
5. Create an HTML/CSS prototype to display information over an image on mouse hover.
6. How would you ensure an element is perfectly centered over an image?

### Data Structures
7. How do you perceive the role and advantages of hash maps in data structures, and what features make them unique?

### Engineering Principles
8. Define and elaborate on the SOLID principles in software engineering.

### Behavioral
9. Describe an experience where you led a team.
10. Tell us about unpleasant feedback you received and how you handled it.

---

## SECTION 2 — React (Hooks, State, Performance)

### Hooks & Lifecycle
11. What is the difference between `useEffect` with `[]`, with dependencies, and with no array? Give real examples.
12. Why shouldn't you call hooks inside conditions or loops?
13. What is `useLayoutEffect` and when would you prefer it over `useEffect`?
14. Explain `useCallback` and `useMemo`. When do they actually help and when are they premature optimization?
15. What does `useRef` do beyond storing DOM references? Give 2 non-DOM use cases.
16. How would you build a custom `useFetch` hook with loading, error, and abort support?
17. What is `useTransition` and how does it improve UX in React 18?
18. What is `useDeferredValue`? How does it differ from `useTransition`?
19. What are the rules of hooks and why do they exist (what would break if you violated them)?
20. Explain the `useReducer` hook. When do you choose it over `useState`?

### Rendering & Performance
21. What is React reconciliation and how does the Fiber architecture improve it?
22. What triggers a re-render in React? List all the ways.
23. Explain React.memo — what it does, when to use it, and when NOT to use it.
24. What is the Virtual DOM and how does React's diffing algorithm work?
25. How do you detect and fix unnecessary re-renders in a React app?
26. What is code splitting in React? How do `React.lazy` and `Suspense` work?
27. What is concurrent rendering in React 18 and how does it change behavior?
28. What is the key prop in React lists? What happens if you use index as key?
29. What is prop drilling? What are the solutions?
30. Explain the Context API — when to use it, its re-render implications, and how to optimize it.

### Patterns
31. What is the compound component pattern? Build a simple `Tabs` component using it.
32. What is the render props pattern and how does it compare to custom hooks?
33. Explain controlled vs uncontrolled components. When do you use each?
34. What is the Flux pattern and how does Redux implement it?
35. How does React Query / TanStack Query work and why use it over plain useEffect for data fetching?

---

## SECTION 3 — JavaScript Core (Round 2 focus: Array/String)

### Arrays & Strings (DocuSign Round 2 focus area)
36. Write a function to flatten a deeply nested array without using `Array.flat()`.
37. Given an array of numbers, find all pairs that sum to a target value. Optimize to O(n).
38. Remove duplicates from an array — using Set, filter, and reduce approaches.
39. Rotate an array to the right by k steps in-place.
40. Find the longest substring without repeating characters (sliding window).
41. Group anagrams from an array of strings.
42. Two-sum problem — return indices of two numbers that add up to target.
43. Implement `Array.prototype.flat`, `Array.prototype.map`, `Array.prototype.filter` from scratch.
44. Merge two sorted arrays into one sorted array.
45. Check if a string is a valid palindrome (ignore non-alphanumeric).

### Closures & Scope
46. What is a closure? Give a real-world use case (e.g., debounce, counter, memoize).
47. Explain the classic `var` loop problem in closures and how to fix it with `let` or IIFE.
48. Implement a `memoize` function using closures.
49. Implement a `once(fn)` function that runs `fn` only the first time it's called.
50. Implement `debounce(fn, delay)` from scratch.
51. Implement `throttle(fn, limit)` from scratch.

### Event Loop & Async
52. What is the JavaScript event loop? Explain the call stack, task queue, and microtask queue.
53. What is the difference between microtasks and macrotasks? Give examples of each.
54. What is the output of this code and why?
    ```js
    console.log('1');
    setTimeout(() => console.log('2'), 0);
    Promise.resolve().then(() => console.log('3'));
    console.log('4');
    // Output: 1, 4, 3, 2 — explain why
    ```
55. What is `Promise.all` vs `Promise.allSettled` vs `Promise.race` vs `Promise.any`?
56. How does `async/await` work under the hood? What does `await` actually do?
57. What happens if you `await` a non-Promise value?
58. How do you handle errors in `async/await`? What are the pitfalls?

### Prototypes & OOP
59. Explain JavaScript's prototype chain with an example.
60. What is the difference between `__proto__` and `prototype`?
61. How does `class` syntax relate to prototypal inheritance under the hood?
62. Implement your own `Object.create()` from scratch.

---

## SECTION 4 — TypeScript

### Basics to Intermediate
63. What is the difference between `interface` and `type`? When do you prefer each?
64. Explain `unknown` vs `any` vs `never`. When do you use each?
65. What is a union type vs intersection type? Give examples.
66. What is type narrowing? Explain type guards (`typeof`, `instanceof`, custom guards).
67. What is the `as const` assertion and when is it useful?
68. Explain `readonly` and `Readonly<T>`. How do they differ?

### Generics & Utility Types
69. What are generics? Write a generic `identity` function and a generic `Stack<T>` class.
70. What does `extends` mean in a generic constraint? `function getLength<T extends { length: number }>(val: T): number`
71. Explain these utility types with examples: `Partial<T>`, `Required<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`, `ReturnType<T>`, `Parameters<T>`.
72. What is a mapped type? Write a mapped type that makes all properties of T optional.
73. What is a conditional type? Write `IsArray<T>` that returns `true` if T is an array.
74. What is `infer` in TypeScript? Write a type that extracts the return type of a function.
75. What is `keyof T` and `typeof`? Write a `getProperty<T, K extends keyof T>(obj: T, key: K)` function.

### Advanced
76. What is declaration merging? When does it happen?
77. Explain `discriminated unions`. Build a type-safe API response type using them.
78. What is the `satisfies` operator (TypeScript 4.9+)?
79. How do you type React props including `children`, `ref`, event handlers?
80. What is `React.FC` vs function component type — why do many prefer the latter?

---

## SECTION 5 — Authentication & Authorization

81. How do you implement authentication in a React SPA? Walk through the full flow.
82. What is the difference between `localStorage`, `sessionStorage`, and `httpOnly cookies` for token storage? Which is safest and why?
83. Explain the OAuth 2.0 PKCE flow for SPAs. Why was implicit grant deprecated?
84. What is CSRF and how do you prevent it? What is the SameSite cookie attribute?
85. How do you implement silent token refresh without the user seeing a logout?
86. What is RBAC vs ABAC? How do you implement role-based UI access control in React?
87. How do you handle auth state on page refresh? What are the strategies?
88. What is OpenID Connect (OIDC) and how does it differ from OAuth 2.0?
89. What is SSO (Single Sign-On)? How does it work across multiple apps?
90. What security headers should a well-configured web app have? (CSP, HSTS, X-Frame-Options)

---

## SECTION 6 — SSR & Rendering Strategies

91. Compare CSR, SSR, SSG, ISR, and PPR. When do you choose each?
92. What is hydration? What causes hydration mismatches?
93. What is the difference between Server Components and Client Components in Next.js App Router?
94. How does streaming SSR with `<Suspense>` improve performance compared to traditional SSR?
95. What is `getServerSideProps` vs `getStaticProps` vs `generateStaticParams`?
96. How do you implement authentication in an SSR context (e.g., Next.js middleware)?
97. What is ISR (Incremental Static Regeneration)? What is on-demand revalidation?
98. What is the `'use client'` directive and when should you avoid it?
99. How do you handle SEO in a React SPA vs SSR app?
100. What are React Server Actions and how do they differ from API routes?

---

## SECTION 7 — Web Performance

101. What are Core Web Vitals? Name the three metrics, their thresholds, and how to improve each.
102. What is LCP? What are the most common causes of poor LCP and how do you fix them?
103. What is INP (Interaction to Next Paint)? How does it differ from FID?
104. What is CLS? List 3 common causes and their fixes.
105. Explain the Critical Rendering Path. What blocks it and how do you optimize it?
106. What is the difference between `defer` and `async` for script loading?
107. What is the difference between `preload`, `prefetch`, `preconnect`, and `dns-prefetch`?
108. How do you reduce JavaScript bundle size? What tools do you use to analyze it?
109. What is tree shaking? What prevents it from working?
110. How does image optimization work in Next.js? What formats should you use and why?
111. What is a service worker? How does caching with a service worker work?
112. What is the difference between HTTP/1.1, HTTP/2, and HTTP/3 from a performance standpoint?
113. How do you implement infinite scroll vs pagination? What are the performance tradeoffs?
114. What is a web worker? When would you offload work to one?
115. How do you measure and monitor web performance in production?

---

## SECTION 8 — CMS & Headless Architecture

116. What is a headless CMS? How does it differ from a traditional coupled CMS?
117. What are the tradeoffs between Contentful, Sanity, and Strapi?
118. How do you build a CMS-driven page with Next.js where pages are defined by content editors?
119. How do you handle rich text/structured content from a CMS (not raw HTML)?
120. What is Draft Mode in Next.js and how do you use it for CMS content preview?
121. How do you handle ISR with CMS webhooks for instant content updates?
122. How do you design a component registry for CMS-driven dynamic sections?
123. What are the challenges of personalization with a headless CMS?

---

## SECTION 9 — Experimentation & A/B Testing

124. What is A/B testing? Walk through how you'd implement it end to end.
125. What is a feature flag? What problems does it solve beyond A/B testing?
126. How do you prevent the "flash of original content" (FOOC) in client-side A/B tests?
127. How do you implement A/B testing at the CDN/edge layer?
128. How do you track experiment exposure correctly? What mistakes cause bad data?
129. What is statistical significance in A/B testing? What is p-value?
130. What are mutex experiment groups and why are they needed?
131. What is a holdout group in experimentation?
132. How do you clean up feature flags? What is flag debt?
133. What tools have you used for feature flags / experimentation? (LaunchDarkly, Optimizely, GrowthBook, Split)

---

## SECTION 10 — Frontend System Design

134. Design a document signing UI (relevant to DocuSign) — component architecture, state, real-time updates.
135. Design a CMS-powered marketing site builder — how do you make it flexible for content editors?
136. Design an analytics dashboard with real-time data updates.
137. Design a global notifications system (toasts, banners) for a large React app.
138. Design a multi-step form with validation, progress saving, and back navigation.
139. Design a file upload component that supports drag-and-drop, progress tracking, and retry.
140. How would you architect a microfrontend system? What are the tradeoffs?
141. Design a design system / component library — how do you ensure accessibility and consistency?
142. How would you handle internationalization (i18n) in a large React app?
143. How do you design a frontend monitoring and error tracking system?

---

## SECTION 11 — Behavioral (Round 4 HM)

144. Tell me about a time you disagreed with a technical decision and what you did.
145. Describe a project where you significantly improved performance — what did you measure and what were the results?
146. How do you approach building a feature when requirements are ambiguous?
147. Tell me about a time you mentored a junior engineer.
148. Describe your process for making a major architectural decision.
149. How do you handle competing deadlines and technical debt simultaneously?
150. What does "good code" mean to you?
151. Tell me about a production incident you were involved in and how you resolved it.
152. How do you stay current with the rapidly evolving frontend ecosystem?
153. What excites you about working at DocuSign specifically?

---

## Quick Practice Priority (High-signal questions for DocuSign)

| Priority | Question # | Topic |
|----------|-----------|-------|
| Must know | 1, 2, 3 | DocuSign-specific coding |
| Must know | 36–51 | Array/String (Round 2) |
| Must know | 52–56 | Event loop / async |
| Must know | 81–89 | Auth — DocuSign focus area |
| Must know | 91–98 | SSR — DocuSign focus area |
| Must know | 101–110 | Web Vitals — DocuSign focus area |
| Must know | 124–131 | A/B testing — DocuSign focus area |
| Practice | 134–143 | System design |
