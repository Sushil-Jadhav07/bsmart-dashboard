// Shared labels and helpers for the bug report list and detail pages.

export const BUG_STATUS = {
  new: { label: 'New', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', hint: 'Reported, not looked at yet' },
  in_progress: { label: 'Investigating', cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500', hint: 'Someone is working on it' },
  fixed: { label: 'Fixed', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', hint: 'Fix shipped, sets resolved time' },
  closed: { label: 'Closed', cls: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400', hint: "Won't fix, duplicate or not a bug" },
};

// Backend priorities shown with incident-style P-levels.
export const BUG_SEVERITY = {
  critical: { label: 'P0 · Critical', short: 'P0', cls: 'bg-[#E8194E] text-white', soft: 'bg-rose-100 text-rose-700', dot: 'bg-[#E8194E]', rank: 0 },
  high: { label: 'P1 · High', short: 'P1', cls: 'bg-orange-500 text-white', soft: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500', rank: 1 },
  medium: { label: 'P2 · Medium', short: 'P2', cls: 'bg-amber-400 text-amber-950', soft: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400', rank: 2 },
  low: { label: 'P3 · Low', short: 'P3', cls: 'bg-sky-500 text-white', soft: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500', rank: 3 },
};

export const BUG_CATEGORY = {
  app_crash: 'App Crash',
  video_not_playing: 'Video Playback',
  login_issue: 'Login & Auth',
  payment_issue: 'Payments',
  rewards_issue: 'Rewards & Bcoins',
  upload_issue: 'Uploads',
  ui_problem: 'UI Problem',
  other: 'Other',
};

export const OS_LABEL = { android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux', other: 'Other' };
export const OS_COLOR = { android: 'bg-[#E8194E]', ios: 'bg-neutral-400', windows: 'bg-[#8E35B5]', macos: 'bg-indigo-400', linux: 'bg-amber-400', other: 'bg-sky-400', '': 'bg-neutral-300' };
export const NETWORK_LABEL = { wifi: 'Wi-Fi', mobile_data: 'Mobile data', other: 'Other' };

export const bugId = (r) => String(r?._id || r?.id || '');
export const bugRef = (r) => r?.ticket_id || `BUG-${bugId(r).slice(-6).toUpperCase()}`;
export const refOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '');
export const isOpenBug = (r) => r?.status === 'new' || r?.status === 'in_progress';

// First sentence (or line) of the description works as a title.
export const bugTitle = (r) => {
  const text = String(r?.description || '').trim();
  if (!text) return BUG_CATEGORY[r?.category] || 'Bug report';
  const first = text.split(/\n|(?<=[.!?])\s/)[0];
  return first.length > 110 ? `${first.slice(0, 107)}…` : first;
};

export const platformOf = (r) => [OS_LABEL[r?.os_type] || '', r?.os_version].filter(Boolean).join(' ');
