# Sacred Motion — "Ink and Light"

The animation layer for Bible Editorial AI. Every motif is governed by the
same editorial values as the printed page: **text never moves**, motion is
quiet, and each animation communicates real state.

## Rules (non-negotiable)

1. **Scripture and editorial copy never animates.** Typography is always still.
   Animation lives on containers, ornaments, and status layers *around* the text.
2. **Everything is `aria-hidden` + `pointer-events-none`.** Motifs are decoration.
3. **Nothing essential depends on motion.** Content works with motion disabled.
4. **Reduced motion kills everything.** `base.css` has a global
   `@media (prefers-reduced-motion: reduce)` that zeroes durations site-wide;
   framer-motion runs under `MotionConfig reducedMotion="user"`.
5. **Scarcity.** At most 1–2 ambient motifs + 1 meaningful motif per screen.

## Duration tokens

| Token     | Value  | Use                              |
|-----------|--------|----------------------------------|
| fast      | 0.15s  | micro-interactions (button, hover) |
| standard  | 0.22s  | transitions (fade, slide)        |
| slow      | 0.9s   | one-shot draw (InkLine)          |
| ambient   | 5–22s  | living motifs (Halo, Dawn, Flow) |

## The metaphor world

- **Light** = seeing truth → `HaloGlow`, `PressDawn`
- **Ink** = the craft → `InkLine`, `ReviewFlow`, `CaretBlink`
- **Scroll** = the medium → `Flyleaf` verse deck

## Motifs

### HaloGlow
Breathing amber radial (the lamp at the feet). Ambient, 6s.
Used: `Login.jsx` quote glow, `ContentEditor.jsx` AI-writing lamp.

### PressDawn
Ultra-slow gold "dawn" gradient drift across a hero panel. Ambient, 22s,
opacity 0.045–0.09.
Used: `Login.jsx` navy brand panel.

### InkLine
A gold rule that *draws itself* from left when it scrolls into view. One-shot,
0.9s. Triggered by IntersectionObserver; falls back to visible in jsdom.
Used: `Projects.jsx` under the page head.

### ReviewFlow
A thin ink lane that shimmers (indeterminate) while a check runs, then fills to
the actual `score%` when done — motion that reports real progress.
Used: `QAPanel.jsx`, `ConsistencyPanel.jsx`.

### CaretBlink
A serif I-beam caret blinking via `steps(1)`. Signals "the AI is typing."
Used: `ContentEditor.jsx` write indicator.

### Flyleaf
Auto-advancing verse-of-the-day deck (5s per slide, pauses on hover, animated
progress lane restarts per slide).
Used: `Projects.jsx` empty state.

### ManuscriptShimmer
One-shot gold sweep on an ornamental initial cap (library-only, not yet wired).

## Files

- `src/components/ui/SacredMotif.jsx` — the leaf components
- `src/styles/sacred.css` — the `sm-*` keyframes (plain CSS, always emitted)

## Adding a motif

Mirror Layterms' pattern: define a `sm-*` keyframe in `sacred.css` with a
one-line rationale comment, then export a small leaf component from
`SacredMotif.jsx`. Keep it `aria-hidden`, `pointer-events-none`, and slow.