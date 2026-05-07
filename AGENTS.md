# Agent Rules — Apoptosis Protocol Site

## Stack

- **Runtime:** Vite 8 + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (`@theme` in `app/globals.css`)
- **Animation:** Framer Motion 12 (`LazyMotion + domAnimation`, use `<m.div>` not `<motion.div>`)
- **Routing:** React Router v7

## Project Layout

```
src/
  App.tsx              # Router + LazyMotion wrapper
  main.tsx             # Entry — imports app/globals.css
  components/
    Navbar.tsx         # Fixed nav with scroll glassmorphism
  pages/
    Home.tsx           # Landing page
    HowItWorks.tsx     # Technical explainer
    PitchDeck.tsx      # Interactive pitch deck (EN/TR, state machine simulator)
app/
  globals.css          # Tailwind @theme tokens + custom animations
```

## Design System (Ciridae)

| Token | Value | Use |
|-------|-------|-----|
| `#000000` | Absolute Black | Primary backgrounds |
| `#0B0B0B` | Deep Charcoal | Card / secondary backgrounds |
| `#272A2A` | Warm Graphite | Borders, tertiary surfaces |
| `#FFFFFF` | Pure White | Primary text |
| `#CECECE` | Ash Gray | Secondary text |
| `#858585` | Steel Gray | Muted text, labels |
| `#CC6437` | Subtle Orange | Accent only — use sparingly |

Font classes: `font-cond` (Open Sans Condensed), `font-mono` (Roboto Mono), `font-body` (Open Sans).

## Rules

- Never introduce new colors. Palette is fixed.
- No box-shadows for elevation — use background color shifts only.
- All buttons and badges use `rounded-full`.
- Shared animation easing: `[0.22, 1, 0.36, 1]` — already defined as `EASE` in each page file.
- Inline `style={{ background: ... }}` is acceptable for dynamic values; static colors prefer Tailwind.
- Do NOT use `<motion.div>` — always use `<m.div>` from `framer-motion` (LazyMotion loaded in App.tsx).
- Footer text is intentionally minimal — do not add year or bounty references to footer.
