# Behavioral Questions — Adobe STAR Stories

> Adobe Values: **Genuine** (honest, inclusive), **Exceptional** (raise the bar), **Innovative** (bold ideas), **Involved** (community, sustainability).
> Senior behavioral focus: ownership, collaboration with design/PM, raising quality bar, working across ambiguity.

---

## Opening — "Tell Me About Yourself"

*"I'm a Senior Frontend Engineer with [X] years building complex React applications. I specialize in the intersection of performance, accessibility, and developer experience — making UIs that are fast for users and maintainable for engineers.*

*Most recently, I [specific accomplishment: e.g., 'built a real-time asset collaboration tool used by 200k designers, optimizing canvas rendering from 8fps to 60fps using WebGL and virtual DOM offloading']*

*I'm particularly excited about Adobe because of the caliber of UI challenges here — tools that have to work for professional creatives, which means you can't compromise on performance, accessibility, or the depth of the interaction model. That's where I do my best work."*

---

## Q1: Technical Ownership — Raising Quality

**"Tell me about a time you significantly raised the quality bar of a product or codebase."**

**STAR Answer:**
> **Situation:** I joined a team where the main web app had no automated accessibility testing, no performance budget, and a bundle size of 2.3MB gzipped. Our primary user base included senior designers at agencies — many of whom had accessibility needs themselves and were vocal about the app being hard to use.
>
> **Task:** There was no formal mandate to fix this. I identified it as a risk and chose to own it.
>
> **Action:** I started with data, not opinion. I ran an axe-core audit and found 47 WCAG violations. I ran Lighthouse and documented: LCP at 7.2 seconds, bundle at 2.3MB, 0 accessible color contrast. I put this in a one-page doc with business impact framing ("a competitor launched an accessible version last quarter — here's the risk of inaction").
>
> Over the next quarter I ran three parallel workstreams:
> - **Tooling:** Added axe-core to our jest test suite (any new a11y violation breaks the build). Added Lighthouse CI with a bundle budget gate (>500KB added = PR blocked).
> - **Quick wins:** Fixed all 47 violations in 2 weeks (mostly missing labels, contrast, focus indicators — no UX changes required).
> - **Performance:** Code-split the 3 largest routes, replaced moment.js with date-fns (saved 67KB), lazy-loaded all chart libraries.
>
> **Result:** LCP improved from 7.2s to 2.1s. Bundle from 2.3MB to 680KB. a11y violations from 47 to 0. More importantly — we now catch regressions automatically. My team adopted the culture. A PM from another team saw the dashboard and asked us to help them apply the same process.

---

## Q2: Collaboration with Designers

**"Tell me about a time you worked closely with a designer to ship something better than either could have alone."**

**STAR Answer:**
> **Situation:** We were building a new timeline component for a video editing web tool. The designer handed over beautiful mockups — smooth scrubbing, frame-by-frame seeking, waveform visualizations. My first reaction was that several interactions would be nearly impossible to implement at 60fps in the browser.
>
> **Task:** I needed to either find a way to implement the vision faithfully, or have an honest conversation about constraints — without crushing creative ambition.
>
> **Action:** Instead of going back with "this is too hard," I built a quick prototype in 2 days focused specifically on the performance-critical parts: canvas rendering for the waveform, pointer events for scrubbing. I discovered that the waveform was fine at 60fps using Canvas 2D, but the hover-to-preview thumbnails at every frame were the bottleneck.
>
> I scheduled a working session with the designer — not an email, a live session — and showed both the prototype and the performance data. Together we explored alternatives: what if thumbnails only appeared after 500ms hover, not instantly? What if we showed thumbnails at 5-second intervals rather than every frame? She came up with the idea of a zoomed-in preview "lens" that only rendered the hovered section — fewer thumbnails needed.
>
> That was her idea, not mine. My job was to create the conditions where she could make informed creative decisions.
>
> **Result:** The shipped timeline rendered at 60fps, the designer considered it a faithful implementation of her intent, and we documented the "show the prototype early" pattern for our team. We now do prototype-first for all performance-sensitive interactions.

---

## Q3: Handling Ambiguity / No Clear Requirements

**"Tell me about a time you had to make progress without clear direction."**

**STAR Answer:**
> **Situation:** Our company had just acquired a startup. I was assigned to "integrate their design tool into our platform" with a 3-month deadline. There were no product requirements, no design specs, and both teams had different tech stacks.
>
> **Task:** Scope it, plan it, and start making progress with almost no information.
>
> **Action:** My first move was to talk to the actual users of the acquired product — not the stakeholders, the users. I spent the first week doing 6 user interviews. What they cared about: their existing shortcuts worked, their files opened, and the undo history survived the transition. Those became my three non-negotiable requirements.
>
> I then spent a day with the acquired team's engineers to understand their architecture. Identified three integration points: authentication (shared SSO), file storage (unified API), and keyboard shortcut system (conflict-heavy).
>
> I wrote a 1-page scoping doc: "Here's what I believe success looks like at 3 months, here's what I'm deferring, here's my confidence level in each assumption." I sent it to our PM and the acquired team's PM and asked: "Is this right? What am I missing?" Got alignment in 48 hours.
>
> Then I just started building the SSO layer while the other two workstreams were being designed — delivering something concrete, unblocking the team, and creating a forcing function for the conversations we needed.
>
> **Result:** Integration shipped in 11 weeks (2 weeks early). The undo-history preservation turned out to be the hardest technical problem — solved it by building a bridge adapter that translated their proprietary undo format into our event-sourced model. That adapter became its own internal package used by two other integrations.

---

## Q4: Disagreement with a Technical Approach

**"Tell me about a time you pushed back on a technical decision."**

**STAR Answer:**
> **Situation:** My team was planning to build a custom drag-and-drop library from scratch for our asset manager. The reasoning: "We need full control over the interaction model." The estimated timeline was 8 weeks.
>
> **Task:** I believed this was the wrong call — not because the goal was wrong, but because we were solving the wrong version of the problem.
>
> **Action:** I did 2 days of research before responding. I evaluated `@dnd-kit`, the leading React drag-and-drop library: it supported our exact interaction model (sortable, cross-list, virtualized), had 6k GitHub stars, 2M weekly npm downloads, and crucially — it had an accessibility model built in (keyboard drag-and-drop using ARIA announcements is notoriously hard).
>
> I didn't just say "use this library." I built a proof-of-concept with @dnd-kit that matched our exact requirements in 3 days. I brought it to the team with the PoC, the a11y support comparison, and a timeline comparison: 3 days vs 8 weeks.
>
> The only counterargument left was "what if we need to customize it later?" I addressed that with the library's extension API — showed 2 places where our custom requirements could be implemented without forking.
>
> **Result:** Team adopted @dnd-kit. We shipped the feature in 2 weeks instead of 8. The a11y support was something we wouldn't have built ourselves. The engineer who proposed the custom library acknowledged it was the right call and actually became the team's expert on @dnd-kit — the buy-in was genuine.

---

## Q5: Cross-Functional Impact (PM/Design/Engineering)

**"Tell me about a time you had significant impact beyond your immediate engineering role."**

**STAR Answer:**
> **Situation:** Our mobile web experience was losing users at the upload step — 45% drop-off in our funnel analytics. PM and design had different theories about why. The PM thought it was the upload UX. The designer thought it was the visual hierarchy. My hypothesis: it was performance — the upload component loaded a full PDF.js library even for users who never uploaded a PDF.
>
> **Task:** The problem had no owner — it sat in the gap between PM, design, and engineering. I decided to own the investigation even though it wasn't on my roadmap.
>
> **Action:** I set up Lighthouse on the upload flow and found: 1.2MB JS bundle just for the upload component, 6-second Time to Interactive on mid-range Android. Users were abandoning before the page was even interactive — not because of UX, but because it never loaded.
>
> I ran a 3-hour session with PM and design showing the data: funnel drop-off correlated exactly with low-end device users. I proposed a solution: lazy-load the uploader, code-split PDF.js, show a skeleton while loading. Estimated: 2 days of engineering work.
>
> PM reprioritized it immediately. We shipped in 2 days.
>
> **Result:** Upload funnel completion rate improved by 31% over the next 2 weeks. That's the highest-impact 2 days I've spent. It also changed how our team thinks about performance — we now run Lighthouse on every new component before shipping to mobile.

---

## Q6: Mentorship at Adobe Context

**"Tell me about a time you helped a colleague grow."**

> **Situation:** A junior engineer on my team was excited but wrote React code with significant anti-patterns: deeply nested state, prop drilling 6 levels, and useEffect with missing dependencies causing infinite loops.
>
> **Task:** Help them learn without discouraging them or making code review feel punitive.
>
> **Action:** Instead of leaving long correction comments, I asked for 30 minutes of pairing on their next PR. We didn't review the old code — we wrote the next feature together. I let them drive and asked questions: "What happens if this prop changes? Which components need to re-render if this state changes? Can we move this decision up or down the tree?"
>
> After pairing, the code quality difference was immediate and visible. More importantly, they asked to pair again the next week. I then pointed them to specific resources: Kent C. Dodds' blog on state management, the React docs on "thinking in React," and suggested one open-source PR on our design system to build confidence with code reviews.
>
> **Result:** 3 months later their PRs required almost no structural feedback — only minor style suggestions. They started answering junior questions in our team Slack with the same reasoning patterns I had modeled.

---

## Adobe Values — How to Signal Them

| Value | How to Show in Answers |
|-------|----------------------|
| **Genuine** | "I told the designer honestly that the spec would cause 60fps issues instead of quietly building something slower" |
| **Exceptional** | Reference specific metrics you improved; show you set higher standards than required |
| **Innovative** | Describe a solution you invented, not just a pattern you followed |
| **Involved** | Mention open-source contributions, a11y advocacy, mentorship as genuine priorities |

---

## Questions to Ask Adobe Interviewers

1. "What product area would this role be working on — Creative Cloud, Experience Cloud, Document Cloud, or GenStudio?"
2. "How does the frontend team interact with Adobe Spectrum — do you consume it, contribute to it, or both?"
3. "What's the accessibility maturity like on this team — is there a dedicated a11y engineer, or is it shared ownership?"
4. "What does 'senior' mean for scope here — is there system design ownership or is that the staff level?"
5. "What does the typical sprint look like — what's the ratio of feature work vs platform/quality work?"
6. "How does the team use AI tools internally? Are engineers using GenAI for coding or is it more product-focused?"
