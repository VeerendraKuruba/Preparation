# 39. Designing reusable component systems

## Layers (typical)

1. **Tokens** — color, space, type, motion (JSON/CSS variables).
2. **Primitives** — Button, Input, Dialog with strict **API surface** and accessibility baked in.
3. **Patterns** — Filter bar, data table shell, empty states — opinionated compositions.
4. **Features** — Product-specific, may wrap primitives but don’t publish as “design system” unless truly shared.

## API design

- **Consistency** — variant + size enums; avoid one-off boolean props that duplicate concerns (`isLarge` vs `size="lg"`).
- **Composition** — `asChild` / render props where appropriate; slots for header/footer in complex widgets.
- **Controlled vs uncontrolled** patterns documented; name events clearly (`onOpenChange`).

## Governance at scale

- **RFC / ADR** for breaking changes; semver for the package.
- **Visual regression** (Chromatic, Percy) and **a11y** checks in CI.
- **Consumption metrics** — deprecate unused exports; avoid kitchen-sink barrels that harm tree-shaking.

## Trade-off

Highly reusable APIs are **more abstract** — balance with “escape hatches” (`className`, `style`, slot overrides) without leaking implementation details.

## Minute summary

“**Tokens → primitives → patterns, strict props and a11y, versioned package, and CI that catches visual and accessibility regressions.**”
