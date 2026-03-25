# 20. Reduce bundle size in large applications

## Buckets

1. **Code splitting** — route-based and component-based `import()`; avoid importing whole libraries when you need one function.
2. **Tree-shaking** — ESM, `sideEffects: false` in deps, avoid default-importing giant barrels.
3. **Dependency diet** — replace heavy batteries (moment → dayjs/date-fns/luxon subset), drop duplicate UI kits.
4. **Analyze** — `vite-bundle-visualizer`, `webpack-bundle-analyzer`, Chrome coverage; target chunks >200KB.
5. **Serve modern** — `@vitejs/plugin-legacy` only for needed browsers; otherwise ship ES202x.
6. **Images/fonts** — subset fonts, WOFF2, responsive images; not “JS bundle” but LCP.

## Process answer

“**Measure bundle → find top chunks → split/lazy/dedupe → verify with analyzer and RUM.**”
