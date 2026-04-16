/**
 * Q35. font-display and avoiding invisible text during load
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE PROBLEM: FOIT (Flash of Invisible Text)
 * ────────────────────────────────────────────
 * By default (font-display: auto / block), browsers:
 *   1. See a custom font referenced in CSS
 *   2. Begin downloading it
 *   3. HIDE all text that uses that font while downloading
 *   4. Show text once the font loads (up to 3 seconds invisible!)
 *
 * User sees: blank text → text appears → sometimes jumps to a different size
 * This is FOIT — Flash of Invisible Text.
 *
 * FOUT (Flash of Unstyled Text)
 * ──────────────────────────────
 * When a fallback font is shown first, then replaced by the web font.
 * The text is visible the whole time, but may shift/relayout on font swap.
 * Better than FOIT from a UX perspective.
 *
 * THE SOLUTION: font-display PROPERTY
 * ─────────────────────────────────────
 * font-display controls the timeline of font loading behavior.
 * Used inside @font-face rules.
 *
 * THE FONT DISPLAY TIMELINE
 * ──────────────────────────
 * Each web font has three phases:
 *   block period:  font is "invisible" (or hidden) — show blank or block char
 *   swap period:   if font not loaded, use fallback; swap when font arrives
 *   failure period: stop trying; use fallback permanently
 */

// ─────────────────────────────────────────────────────────────────────────────
// font-display VALUES
// ─────────────────────────────────────────────────────────────────────────────
/*
  font-display: auto
    • Browser default — behavior varies by browser
    • Chrome: like "block" initially
    • Generally: same as "block"
    • ❌ Avoid — unpredictable

  font-display: block
    • Block period: 3 seconds (invisible text)
    • Swap period: infinite (always swap when loaded)
    • Use when: font is CRITICAL and invisible text is acceptable
    • Example: icon fonts (showing a box for 3s is bad, but FOUT would show text)

  font-display: swap
    • Block period: ~100ms (very short)
    • Swap period: infinite
    • Behavior: Shows fallback font immediately; swaps to web font when loaded
    • CLS risk: causes layout shift when swap occurs if font metrics differ
    • Use when: text is critical to show immediately; slight shift is acceptable

  font-display: fallback
    • Block period: 100ms
    • Swap period: 3 seconds (if font loads within 3s, swap; else use fallback)
    • If font takes > 3s: fallback forever (no late swap)
    • Best balance of performance and flash prevention
    • Use when: performance matters but you prefer not to skip web font entirely

  font-display: optional
    • Block period: 100ms
    • Swap period: 0 (NO swap)
    • If font doesn't load in 100ms: use fallback forever for this page
    • The font IS cached and used on subsequent pages
    • Zero CLS, zero late font flash
    • Use when: performance is the top priority; web font is nice-to-have
*/

// ─────────────────────────────────────────────────────────────────────────────
// PRACTICAL EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────

/*
  CSS @font-face declarations:

  === Most common choice: swap ===
  @font-face {
    font-family: "Inter";
    src: url("/fonts/inter-regular.woff2") format("woff2");
    font-weight: 400;
    font-style: normal;
    font-display: swap;   ← text visible immediately; swap when font loads
  }

  === Best for performance (no CLS): optional ===
  @font-face {
    font-family: "Inter";
    src: url("/fonts/inter-regular.woff2") format("woff2");
    font-weight: 400;
    font-style: normal;
    font-display: optional;   ← use fallback if not loaded fast enough
  }

  === Icon fonts: use block (font renders as blank character, not text) ===
  @font-face {
    font-family: "MyIcons";
    src: url("/fonts/icons.woff2") format("woff2");
    font-display: block;   ← blank icons > garbled text characters
  }
*/

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE FONTS: ADDING font-display
// ─────────────────────────────────────────────────────────────────────────────
/*
  Google Fonts supports font-display via URL parameter:

  ❌ Without font-display (auto/block behavior):
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700" rel="stylesheet">

  ✅ With swap:
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">

  ✅ With optional (best for performance):
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=optional" rel="stylesheet">
*/

// ─────────────────────────────────────────────────────────────────────────────
// MINIMIZING CLS FROM font-display: swap (size-adjust + metric overrides)
// ─────────────────────────────────────────────────────────────────────────────
/*
  The layout shift from font swap happens because web font metrics
  (size, x-height, ascender/descender) differ from fallback font metrics.
  CSS @font-face descriptors let you adjust the fallback to match:

  @font-face {
    font-family: "Inter Fallback";
    src: local("Arial");           ← fallback is system Arial
    size-adjust: 96.5%;            ← shrink to match Inter's size
    ascent-override: 90.2%;
    descent-override: 22.5%;
    line-gap-override: 0%;
  }

  @font-face {
    font-family: "Inter";
    src: url("/fonts/inter.woff2") format("woff2");
    font-display: swap;
  }

  body {
    font-family: "Inter", "Inter Fallback", sans-serif;
    /       ↑                   ↑
    /  web font         adjusted fallback (matches Inter's metrics)
  }

  Now when Inter loads and replaces "Inter Fallback":
  → Both fonts take up the same space → zero layout shift!

  Tool to generate these values: fontpie (CLI) or Font Style Matcher (web tool)
  fontpie: npx fontpie "Inter" --style normal --weight 400
*/

// ─────────────────────────────────────────────────────────────────────────────
// PRELOADING FONTS (avoid late discovery)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Browsers discover fonts LATE — only after CSS is downloaded and parsed.
  Preloading starts the font download immediately when the page loads.

  ✅ Preload only the fonts actually used above-the-fold:
  <link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/inter-bold.woff2"    as="font" type="font/woff2" crossorigin>

  crossorigin is REQUIRED even for same-origin fonts (CORS credential mode)

  Preload + swap = text visible immediately from fallback, then swaps
  Preload + optional = font likely loads in time (fast connection), no swap needed
*/

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM FONT STACK (zero font download)
// ─────────────────────────────────────────────────────────────────────────────
/*
  The ultimate performance win: don't load web fonts at all.
  Use system fonts that are already on the user's device.

  body {
    font-family:
      -apple-system,         /← San Francisco on Apple devices
      BlinkMacSystemFont,    /← Chrome on macOS
      "Segoe UI",            /← Windows
      Roboto,                /← Android
      Oxygen,                /← KDE Linux
      Ubuntu,                /← Ubuntu Linux
      Cantarell,             /← GNOME Linux
      "Helvetica Neue",
      Arial,
      sans-serif;
  }

  Benefits:
  ✅ Zero network request
  ✅ Zero CLS
  ✅ Zero FOIT/FOUT
  ✅ Matches user's OS UI → feels familiar and native
  ✅ GitHub, Medium, Bootstrap 5 all use system fonts
*/

/**
 * DECISION GUIDE
 * ──────────────
 *  Scenario                                        Recommended
 *  ─────────────────────────────────────────       ─────────────────────────────
 *  Brand-critical web font, CLS is OK              font-display: swap + preload
 *  Performance is top priority, font nice-to-have  font-display: optional + preload
 *  Icon font                                       font-display: block
 *  No brand font needed                            System font stack (best option)
 *  Web font + zero CLS requirement                 font-display: swap + size-adjust
 *
 * KEY TAKEAWAYS
 * ─────────────
 *  1. Never leave font-display unset — default causes FOIT.
 *  2. font-display: swap is the most common choice (text visible, slight shift).
 *  3. font-display: optional is the most performant (no late swap, no CLS).
 *  4. Preload critical fonts to reduce swap delay.
 *  5. Use size-adjust + metric overrides to prevent CLS on swap.
 *  6. Consider system fonts — zero cost, great UX.
 */
