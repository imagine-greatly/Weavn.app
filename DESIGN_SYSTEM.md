# WebDoc Clinical Futurism Design System

> This file is the master aesthetic reference for webdoc.ai. Every component should align with these rules for color, motion, typography, and interaction.

---

## Master Aesthetic Prompt (Reference)

Before we build any pages, set up the complete visual identity and atmosphere for webdoc.ai. This governs every single component we build after this.

The core visual concept: **Intelligence flowing through a system.** Like a circuit board lighting up, or neural pathways firing. Mostly dark, with moments of electric intensity. The darkness is what makes the energy mean something.

### Background & Depth

- **Base background**: `#050810` — deep navy-black, not pure black. Slightly blue-tinted so that cyan elements feel native to the environment, not imposed on it.
- Every page has layered depth:
  - **Layer 1 — Base**: solid `#050810`.
  - **Layer 2 — Circuit trace texture**:
    - SVG/CSS background of horizontal and vertical lines:
      - color: `rgba(0,180,255,0.03)`, thickness: `1px`, spacing: `60px`.
    - Small 3px filled circles at random intersections in `rgba(0,180,255,0.06)`.
    - Barely visible, only noticeable on close inspection.
  - **Layer 3 — Atmospheric bloom (hero only)**:
    - `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,180,255,0.06) 0%, transparent 65%)`
    - Simulates a faint blue light source above the hero.
  - **Layer 4 — Grain**:
    - Noise texture overlay at `opacity: 0.035` (SVG filter or PNG).
    - This separates “expensive” from “cheap” in dark UIs.

### Glow System

There are exactly **three tiers of glow** used throughout the product. Never deviate from these:

- **Tier 1 — Ambient glow (always-on, subtle)**
  - `box-shadow: 0 0 40px rgba(0,180,255,0.06);`
  - Used on: main URL input bar, score ring container, key diagnostic panels.

- **Tier 2 — Active glow (on focus, on hover)**
  - `box-shadow: 0 0 0 1px rgba(0,200,255,0.4), 0 0 20px rgba(0,200,255,0.2), 0 0 60px rgba(0,200,255,0.08);`
  - Used on: input on focus, cards on hover, active nav items, buttons on hover.

- **Tier 3 — Intensity glow (critical moments only)**
  - `box-shadow: 0 0 0 1px rgba(0,220,255,0.6), 0 0 30px rgba(0,220,255,0.35), 0 0 80px rgba(0,220,255,0.15);`
  - Used on: final score moment, top critical finding card, pulsing status dot in navbar.
  - Max 2–3 uses per page.

### Pulse Animation

Any element that communicates “live” or “active” uses:

```css
@keyframes livePulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(0,220,255,0.8); }
  50% { opacity: 0.5; box-shadow: 0 0 2px rgba(0,220,255,0.3); }
}

.live-pulse {
  animation: livePulse 2.5s ease-in-out infinite;
}
```

Used on: navbar status dot, scan-active indicator, live score ring while counting.

### Scan Line Animation (Hero Only)

Hero background uses a subtle scan-line:

```css
@keyframes scanLine {
  0% { top: -2px; opacity: 0; }
  5% { opacity: 1; }
  95% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,200,255,0.15), transparent);
  animation: scanLine 6s linear infinite;
}
```

This communicates that the system is always reading.

### Critical Finding Card — Energy Crack

For CRITICAL findings:

```css
.critical-fracture {
  border-left: 2px solid #FF2D2D;
  box-shadow:
    inset 3px 0 12px rgba(255,45,45,0.15),
    -2px 0 12px rgba(255,45,45,0.3);
}

.critical-fracture:hover {
  box-shadow:
    inset 3px 0 20px rgba(255,45,45,0.1),
    -2px 0 20px rgba(255,45,45,0.2),
    0 8px 40px rgba(0,0,0,0.6);
}
```

This makes the card feel like it’s cracked and red energy is bleeding through.

### Score Ring — “Brain Lighting Up”

The score ring on the report page is the visual climax:

- Ring starts at 0 with a dim stroke (`#1C1C2E`).
- Over **1.4s**, the arc sweeps to the score using:
  - `cubic-bezier(0.34, 1.1, 0.64, 1)` (slight overshoot, then settle).
- The score number counts up from 0 in sync with the arc using JavaScript.
- When the arc reaches its value:
  - Trigger a one-off Tier 3 glow flash (~600ms):
    - `0 0 60px rgba(0,220,255,0.4)` blooming then fading.
- After settling, the ring uses a very slow Tier 1 ambient glow pulse.

This sequence should feel like a brain activating.

### Loading Screen — Neural Pathway Background

Behind the loading “terminal” block:

- Preferred: animated canvas/SVG of slowly drifting bezier curves:
  - `stroke: rgba(0,180,255,0.12)`, `stroke-width: 1px`.
  - Control points move slowly over time (organic motion).
  - Sits at `z-index: 0`; terminal at `z-index: 1`.
- Fallback:
  - Three large blurred ellipses:
    - `background: rgba(0,150,255,0.04)`, `filter: blur(60px)`.
    - Slowly drifting via a 12s transform keyframe.

The motion should be barely perceptible.

### Typography Rules

- **Instrument Serif** (display / italic):
  - Reserved for:
    - Hero headline.
    - AI-generated output (e.g. rewritten copy sections).
  - When users see italic serif, they know: **this is the intelligence speaking**.
- **JetBrains Mono / Geist Mono**:
  - All data: scores, percentages, labels, tags, statuses.
  - When users see mono, they know: **this is measurement**.
- **Geist**:
  - Everything else: body copy, controls, UI text.

Never mix these roles. Typefaces are a language, not decoration.

### Interaction — Electric Principle

Every interactive element should feel like completing a circuit:

- On hover:
  - Add **Tier 2 glow**.
  - Shift border color to `rgba(0,200,255,0.4)`.
  - Transition in: `150ms ease`.
- On mouse leave:
  - Transition out: `300ms ease`.

This asymmetric timing makes energy feel like it dissipates rather than shuts off.

---

## Implementation Notes

- Core colors, glow tiers, and keyframes are defined as CSS variables and utilities in `app/globals.css`.
- Use Tailwind for layout/spacing, and prefer:
  - `font-display` for headings,
  - `font-sans` (Geist) for UI,
  - `font-mono` for data.
- For any new component, start by:
  - Placing it on the **Layer 1–4 background stack**.
  - Applying the appropriate **glow tier** for its state (ambient/active/intense).
  - Using **Geist Mono** for all numerical data and diagnostics.

