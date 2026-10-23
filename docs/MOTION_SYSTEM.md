# CampusOS — Motion System & Animation Guidelines

**Governing Directive:** Master Prompt Section 9 & Phase 2 Exit Criteria  
**Status:** Implemented in `src/lib/motion.ts` and Verified  
**Date:** October 2026

---

## 1. Core Philosophy & Performance Standards

Motion in CampusOS is designed to provide spatial context, direct focus, and confirm user intent without introducing perceptible latency or vestibular discomfort.

### Cardinal Rules:
1. **GPU Acceleration Only:** Animations MUST strictly animate `transform` (`translate`, `scale`, `rotate`) and `opacity`. Never animate layout-triggering properties (`width`, `height`, `top`, `left`, `margin`, `padding`).
2. **Deterministic Durations:** Arbitrary transition lengths are banned. All animations must derive from the 5 standardized motion duration tokens.
3. **Deceleration Bias:** Entrances use a fluid deceleration curve (`cubic-bezier(0.16, 1, 0.3, 1)`) so UI elements settle smoothly into place.
4. **Universal Reduced-Motion Support:** When `prefers-reduced-motion: reduce` is enabled, all spatial translations and springs are disabled; transitions instantly snap or reduce to subtle 10ms opacity crossfades.

---

## 2. Motion Duration Tokens (`src/lib/motion.ts`)

| Token | Duration (s) | Milliseconds | Use Cases |
| :--- | :--- | :--- | :--- |
| `instant` | `0.08s` | **80 ms** | Micro-interactions, checkboxes, icon state switches, tooltips |
| `fast` | `0.14s` | **140 ms** | Dropdown menus, status badges, hover feedback, exit animations |
| `base` | `0.22s` | **220 ms** | Standard card appearances, modest dialogs, accordion expands |
| `slow` | `0.32s` | **320 ms** | Slide-over drawers (`Sheet`), large modal dialogs, route transitions |
| `chart` | `0.60s` | **600 ms** | SVG path stroke animations (`ProgressRing`), data viz initial renders |

---

## 3. Physics & Easing Functions

### 3.1 Fluid Deceleration Curve
```typescript
export const MOTION_EASE = [0.16, 1, 0.3, 1] as const;
```
Used for modal overlays, drawer slides, and page element reveals. Quickly accelerates out of the starting position and spends the majority of duration smoothly settling into resting state.

### 3.2 Spring Physics Curve
```typescript
export const SPRING_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 350,
  damping: 25,
  mass: 0.8,
};
```
Used for tactile micro-interactions (e.g. scale feedback on modal presentation, button clicks, and badge pop-ins).

---

## 4. Reduced-Motion Implementation & Accessibility

### 4.1 Global Media Query & CSS Rule
In `src/app/globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

.reduced-motion *, .reduced-motion ::before, .reduced-motion ::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

### 4.2 React Hook: `usePrefersReducedMotion()`
Available in `src/lib/motion.ts`:
```typescript
import { usePrefersReducedMotion } from '@/lib/motion';

function Component() {
  const prefersReduced = usePrefersReducedMotion();
  // Automatically switches between transform animations and zero-motion variants
}
```

### 4.3 Standard Accessible Variant Creators
`src/lib/motion.ts` provides factory functions that accept the `reducedMotion` boolean and automatically zero out positional offsets:
- `createFadeVariants(reducedMotion)`: Crossfade only.
- `createSlideUpVariants(reducedMotion)`: Translates Y by 8px if normal; translates 0px if reduced.
- `createScaleVariants(reducedMotion)`: Scales from 0.96 if normal; starts at 1.0 if reduced.
- `createDrawerVariants(reducedMotion, side)`: Translates from offscreen if normal; fades in-place if reduced.
- `createStaggerContainer(staggerDelay)`: Orchestrates sequential child reveals with minimal stagger delay (20–50ms).

### 4.4 LazyMotion & Bundle Size Optimization
CampusOS utilizes Framer Motion's `LazyMotion` wrapper with `domAnimation` (loaded globally in `src/components/providers.tsx` and exported via `src/lib/motion.ts`). This ensures Framer Motion bundles only the essential DOM animation feature set, avoiding synchronous load of heavy animation engines and ensuring strict compliance with the $\le 200\text{ kB}$ per-route First Load JS budget.

---

## 5. Developer Verification Checklist

Before shipping any animated component, verify:
- [x] Does it animate ONLY `transform` or `opacity`?
- [x] Is the duration matched to one of the 5 tokens (`instant`, `fast`, `base`, `slow`, `chart`)?
- [x] Does the animation settle cleanly with no perpetual looping?
- [x] When tested with `prefers-reduced-motion: reduce` (or toggled via `/design-system`), does the UI remain fully legible and functional without spatial jumps?
- [x] Does the component avoid layout shift (CLS $\le 0.1$)?
