// Console preferences saved in this browser only (Settings → Console Preferences).

const KEY = 'bsmart_console_prefs';

export const START_PAGES = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/reports/content', label: 'Content Reports' },
  { value: '/reports/bugs', label: 'Bug Reports' },
  { value: '/marketplace/orders', label: 'Marketplace Orders' },
  { value: '/customer-queries', label: 'Customer Queries' },
  { value: '/gift-card-orders', label: 'Gift Card Orders' },
  { value: '/notifications', label: 'Notification Center' },
];

export const DEFAULT_PREFS = { rows: 10, startPage: '/dashboard', sound: false, desktop: false };

export const getPrefs = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULT_PREFS, ...saved };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

export const savePrefs = (prefs) => {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); return true; } catch { return false; }
};

// Default page size for list pages; `fallback` is used when nothing valid is saved.
export const prefRows = (fallback = 10) => {
  const n = Number(getPrefs().rows);
  return [10, 25, 50].includes(n) ? n : fallback;
};

export const startPage = () => {
  const p = getPrefs().startPage;
  return START_PAGES.some((s) => s.value === p) ? p : '/dashboard';
};

let audioCtx = null;
export const playChime = () => {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.28);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  } catch { /* audio not available */ }
};

// Called for each live notification that arrives over the socket.
export const alertForNotification = (n) => {
  const prefs = getPrefs();
  if (prefs.sound) playChime();
  if (prefs.desktop && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
    try { new Notification('B-smart Admin', { body: n?.message || 'New notification', tag: n?._id }); } catch { /* ignore */ }
  }
};
