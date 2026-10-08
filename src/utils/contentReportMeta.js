// Shared labels and helpers for the content report list and review pages.

export const REPORT_STATUS = {
  pending: { label: 'Under review', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  reviewed: { label: 'Reviewed', cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  action_taken: { label: 'Action taken', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  rejected: { label: 'Dismissed', cls: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
};

export const CONTENT_TYPE = {
  post: { label: 'Moment', plural: 'Moments', path: (id) => `/posts/${id}` },
  reel: { label: 'bSpark', plural: 'bSparks', path: (id) => `/reels/${id}` },
  tweet: { label: 'Buzz post', plural: 'Buzz', path: (id) => `/tweets/${id}` },
  ad: { label: 'Spotlight ad', plural: 'Spotlights', path: (id) => `/ads/${id}` },
  promote_reel: { label: 'Campaign', plural: 'Campaigns', path: (id) => `/promote/${id}` },
  story: { label: 'Story', plural: 'Stories', path: null },
  comment: { label: 'Comment', plural: 'Comments', path: null },
};

// The backend's fixed reason list, ranked by how urgently each needs a human.
export const SEVERITY = {
  critical: { label: 'P0 · Critical', cls: 'bg-[#E8194E] text-white', soft: 'bg-rose-100 text-rose-700', dot: 'bg-[#E8194E]', rank: 0 },
  high: { label: 'P1 · High', cls: 'bg-orange-500 text-white', soft: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500', rank: 1 },
  medium: { label: 'P2 · Medium', cls: 'bg-purple-500 text-white', soft: 'bg-purple-100 text-[#8E35B5]', dot: 'bg-[#8E35B5]', rank: 2 },
  low: { label: 'P3 · Low', cls: 'bg-sky-500 text-white', soft: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500', rank: 3 },
};
export const REASON_SEVERITY = {
  'Illegal Content': 'critical',
  Nudity: 'critical',
  Violence: 'critical',
  'Hate Speech': 'high',
  Harassment: 'high',
  'Scam/Fraud': 'high',
  'Copyright Violation': 'medium',
  'Fake Information': 'medium',
  Spam: 'low',
  Other: 'low',
};
export const severityOf = (reason) => REASON_SEVERITY[reason] || 'low';

export const ACTIONS = {
  none: { label: 'No action', hint: 'Record a review without penalising anyone' },
  warning_issued: { label: 'Issue a warning', hint: 'Owner gets a warning notification' },
  content_removed: { label: 'Remove the content', hint: 'Content is taken down for everyone' },
  temporary_suspension: { label: 'Suspend account (30 days)', hint: 'Owner is banned for 30 days' },
  permanent_ban: { label: 'Ban account permanently', hint: 'Owner loses access for good' },
};

export const reportId = (r) => String(r?._id || r?.id || '');
export const reportRef = (r) => `REP-${reportId(r).slice(-5).toUpperCase()}`;
export const refOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '');
export const contentKey = (r) => `${r?.content_type}:${refOf(r?.content_id)}`;
export const isOpenReport = (r) => r?.status === 'pending';
