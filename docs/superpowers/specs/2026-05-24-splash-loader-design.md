# Splash Loader — Design Spec

**Date:** 2026-05-24  
**Project:** bsmart-dashboard  
**Status:** Approved

---

## Overview

Add a premium animated splash loader to the bsmart-dashboard that displays on every fresh app load. The loader shows while the React app hydrates and resolves its initial state, then fades out smoothly before the user sees the dashboard UI.

---

## Requirements

- Shows **once per page load**, on app startup only (not on route navigation).
- Minimum visible duration: **900 ms** — ensures the loader feels intentional even on fast connections.
- Exits via a **400 ms opacity fade-out**, then the component unmounts entirely (no layout shift).
- Matches the existing dashboard design system: white background, `bg-gradient-brand` (`#E1306C` → `#833AB4`), neutral typography.
- No external dependencies — pure React + Tailwind + inline SVG.

---

## Visual Design

### Layout (centered, vertical stack)

```
[ Spinner + Logo pill ]
      B-smart
  ADMIN DASHBOARD
    •  •  •
```

### Spinner
- SVG circle, radius 42, rendered at 96×96 px.
- Track ring: `#F3F4F6` (neutral-100), stroke-width 4.
- Arc segment: brand gradient (`#E1306C` → `#833AB4`), `stroke-dasharray="72 192"`, `stroke-linecap="round"`.
- Animation: `rotate(360deg)` in **1.4 s linear infinite**.

### Logo Pill
- Absolutely centered inside the spinner (offset `inset: 13px`).
- Shape: `border-radius: 50%`, `background: linear-gradient(135deg, #E1306C, #833AB4)`.
- Shadow: `0 4px 20px rgba(225,48,108,0.35)` + `0 0 0 3px white` ring separator.
- Content: Lucide `<Instagram>` icon, 26×26, white stroke.
- Animation: subtle `box-shadow` pulse over **2.5 s ease-in-out infinite** (glow shifts from pink-dominant to purple-dominant).

### Text
- `"B-smart"` — `font-size: 18px`, `font-weight: 700`, `color: #1F2937` (neutral-800), `margin-top: 20px`.
- `"Admin Dashboard"` — `font-size: 11px`, `font-weight: 500`, `letter-spacing: 0.18em`, `text-transform: uppercase`, `color: #9CA3AF` (neutral-400), `margin-top: 3px`.

### Dots
- 3 dots, 6×6 px, `border-radius: 50%`, brand gradient fill.
- Animation: `translateY(-7px)` bounce, **1.2 s ease-in-out infinite**, staggered by `0s / 0.15s / 0.30s`.
- `margin-top: 22px` from text block.

---

## State Machine

```
App mounts
  → showSplash = true, fading = false
  → 900 ms timer fires: fading = true   (triggers CSS opacity 0 transition)
  → 400 ms later: showSplash = false    (component unmounts)
  → Normal app content rendered
```

---

## Files Changed

### New: `src/components/SplashLoader.jsx`

Self-contained component. Props: `fading: boolean`.

- Fixed full-screen overlay (`position: fixed; inset: 0; z-index: 9999`).
- White background.
- `opacity` transitions from `1` → `0` when `fading` is true (via Tailwind `transition-opacity duration-400`).
- `pointer-events: none` when fading so no click blocking.
- All animations defined with Tailwind `@keyframes` extensions or inline `style` props.

### Modified: `src/App.jsx`

Add two pieces at the top of `App()`:

1. State:
   ```js
   const [showSplash, setShowSplash] = useState(true)
   const [fading, setFading] = useState(false)
   ```

2. Effect:
   ```js
   useEffect(() => {
     const hold = setTimeout(() => setFading(true), 900)
     const hide = setTimeout(() => setShowSplash(false), 1300)
     return () => { clearTimeout(hold); clearTimeout(hide) }
   }, [])
   ```

3. Render (above `<Provider>`):
   ```jsx
   {showSplash && <SplashLoader fading={fading} />}
   ```

---

## Keyframes to Add to `index.css`

```css
@keyframes splash-spin {
  to { transform: rotate(360deg); }
}
@keyframes splash-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40%           { transform: translateY(-7px); opacity: 1; }
}
@keyframes splash-pill-pulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(225,48,108,0.35), 0 0 0 3px #fff; }
  50%      { box-shadow: 0 6px 28px rgba(131,58,180,0.45), 0 0 0 3px #fff; }
}
```

These are scoped names that won't conflict with existing animations.

---

## Out of Scope

- Route-transition loader (not requested).
- Dark mode variant (dashboard doesn't actively support dark mode in practice).
- Skip/dismiss interaction (loader is brief; no need).
