# Splash Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a premium animated splash loader to bsmart-dashboard that shows on every fresh app load and fades out after ~1.3 seconds.

**Architecture:** A pure-presentational `SplashLoader` component renders a fixed full-screen white overlay with a rotating SVG gradient arc, a pulsing brand-gradient logo pill, brand text, and bouncing dots. `App.jsx` owns the timing state (`showSplash`, `fading`) via two `setTimeout` calls in a `useEffect`, passes `fading` as a prop to control the CSS opacity transition, then unmounts the component entirely.

**Tech Stack:** React 18, Tailwind CSS, Lucide-react (already installed), inline SVG, CSS `@keyframes` in `index.css`.

---

### Task 1: Add splash keyframes to index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Open `src/index.css` and append the three keyframes below at the end of the file**

```css
@keyframes splash-spin {
  to { transform: rotate(360deg); }
}

@keyframes splash-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40%           { transform: translateY(-7px); opacity: 1; }
}

@keyframes splash-pill-pulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(225, 48, 108, 0.35), 0 0 0 3px #fff; }
  50%      { box-shadow: 0 6px 28px rgba(131, 58, 180, 0.45), 0 0 0 3px #fff; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "style: add splash-loader keyframes to index.css"
```

---

### Task 2: Create SplashLoader component

**Files:**
- Create: `src/components/SplashLoader.jsx`

- [ ] **Step 1: Create the file with this exact content**

```jsx
import React from 'react';
import { Instagram } from 'lucide-react';

const SplashLoader = ({ fading }) => {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      style={{
        opacity: fading ? 0 : 1,
        transition: 'opacity 400ms ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* Spinner + logo pill */}
      <div className="relative w-24 h-24">
        <svg
          className="w-24 h-24"
          viewBox="0 0 96 96"
          style={{ animation: 'splash-spin 1.4s linear infinite' }}
        >
          {/* Track ring */}
          <circle cx="48" cy="48" r="42" fill="none" stroke="#F3F4F6" strokeWidth="4" />
          {/* Gradient arc */}
          <circle
            cx="48" cy="48" r="42"
            fill="none"
            stroke="url(#splashGrad)"
            strokeWidth="4"
            strokeDasharray="72 192"
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
          />
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E1306C" />
              <stop offset="100%" stopColor="#833AB4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Logo pill — centered inside spinner */}
        <div
          className="absolute inset-[13px] rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #E1306C 0%, #833AB4 100%)',
            animation: 'splash-pill-pulse 2.5s ease-in-out infinite',
          }}
        >
          <Instagram className="w-[26px] h-[26px] text-white" />
        </div>
      </div>

      {/* Brand text */}
      <p className="mt-5 text-[18px] font-bold text-neutral-800 tracking-tight">
        B-smart
      </p>
      <p className="mt-0.5 text-[11px] font-medium tracking-[0.18em] uppercase text-neutral-400">
        Admin Dashboard
      </p>

      {/* Bouncing dots */}
      <div className="flex gap-[7px] mt-[22px]">
        {[0, 0.15, 0.3].map((delay, i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #E1306C, #833AB4)',
              animation: `splash-bounce 1.2s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashLoader;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SplashLoader.jsx
git commit -m "feat: add SplashLoader component"
```

---

### Task 3: Wire SplashLoader into App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace the entire contents of `src/App.jsx` with the following**

```jsx
import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index.jsx';
import { Provider } from 'react-redux';
import store from './store/index.js';
import SplashLoader from './components/SplashLoader.jsx';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fading, setFading]       = useState(false);

  useEffect(() => {
    const hold = setTimeout(() => setFading(true),      900);
    const hide = setTimeout(() => setShowSplash(false), 1300);
    return () => { clearTimeout(hold); clearTimeout(hide); };
  }, []);

  return (
    <>
      {showSplash && <SplashLoader fading={fading} />}
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </>
  );
}

export default App;
```

> **Why above `<Provider>`:** `SplashLoader` is purely presentational — it reads no Redux state — so it doesn't need the store context. Placing it above `<Provider>` keeps the component dependency-free and avoids any store-initialization delay affecting the splash.

- [ ] **Step 2: Start the dev server and verify visually**

```bash
cd "c:/Asynk clients/B-smart/bsmart-dashboard"
npm run dev
```

Open `http://localhost:5173` (or whichever port Vite reports) in the browser and confirm:

1. The white splash screen appears immediately on load.
2. The gradient arc spins, the logo pill pulses, and the three dots bounce.
3. After ~900 ms the overlay fades out smoothly over ~400 ms.
4. The dashboard or login page appears underneath with no layout flash.
5. Hard-refresh (`Ctrl+Shift+R`) repeats the splash correctly.

- [ ] **Step 3: Stop the dev server (`Ctrl+C`), then commit**

```bash
git add src/App.jsx
git commit -m "feat: wire SplashLoader into App — shows on initial page load"
```

---

## Done

The splash loader is complete. Three commits, two modified files, one new component.
