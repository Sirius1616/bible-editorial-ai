# Bible Editorial AI — Design Language

**Identity:** "Parchment & Quill" — a deep indigo/navy ground with a warm gold
accent. The serif `Lora` typeface carries scripture/academic voice; `Inter`
handles UI.

## Core tokens (defined in `base.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--navy-900/800/700` | deep indigo | same | brand/night backdrops (login brand, dark panels) |
| `--gold` | `#e0ae4a` | `#e0ae4a` | signature accent: rules, accent buttons, active tabs |
| `--gold-soft` | gold tint | gold tint | soft gold fills (stat icons, badges) |
| `--gold-line` | translucent gold | translucent gold | verse top-rules, hairline dividers |
| `--gold-text` | `#b1841f` | `#e8c06a` | gold-on-surface text (verse refs, kickers) |
| `--parchment` / `--parchment-ink` | cream / dark ink | dark / light | "paper" reading surfaces (quotations) |

## Patterns

### Scripture accent (`components/ui/Verse.jsx`)
Render a verse as serif italic text over a gold rule, with a gold attribution:
```jsx
<Verse text="Commit thy works unto the LORD…" reference="Proverbs 16:3" />
```
Root: `.verse-accent` • text: `.verse-text` • attribution: `.verse-ref`
Use `VerseFade` variant for an animated entrance (login brand). Always honor
`prefers-reduced-motion` (handled by `MotionConfig`).

### Editorial section rule
Page headings carry a short gold "quill stroke" under the h1:
```jsx
<h1 className="head-rule">Your projects</h1>
```
Implement via a pseudo-element; keep the rule short (≈ 2rem) and never animated.

### Contrast rules
- Primary actions: indigo (`--primary`) + white text (strongest contrast).
- Gold is a *signature*, not a fill: use `--gold` for rules, kickers, active
  accents, and the lowercase `accent` button. Never gold-on-gold fills.
- On the dark navy brand, text uses white with `rgba(255,255,255,0.78)` for
  secondary copy; gold-cast text stays `rgba(217,180,76,0.92)`.

### Motion
- Page-level: fade/slide via `AnimatedRoutes` (`App.jsx`).
- Lists/entrances: `MotionList` / `MotionItem` / `AnimatedNumber` (`ui/motion.jsx`).
- Reduced motion: `MotionConfig reducedMotion="user"` + CSS
  `@media (prefers-reduced-motion: reduce)` kill-switch in `base.css`.

## Where it lives
| File | Role |
|---|---|
| `base.css` | Design tokens + base elements + verse/head-rule patterns |
| `auth.css` | Dark brand "night parchment" statement (login) |
| `editor.css` | Reading/composition surface (serif editor, annotations) |
| `ui/motion.jsx` | Shared motion primitives |
| `ui/Verse.jsx` | Reusable scripture accent |