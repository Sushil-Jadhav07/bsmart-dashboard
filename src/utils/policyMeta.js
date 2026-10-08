import { FileText, RefreshCw, Shield } from 'lucide-react';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

// Shared labels and helpers for the Legal Documents list and the Policy Editor.

const CORE = {
  terms: { label: 'Core platform', icon: FileText, bar: 'bg-[#3B6CF6]', tile: 'bg-blue-50 text-blue-600' },
  privacy: { label: 'Data protection', icon: Shield, bar: 'bg-[#8E35B5]', tile: 'bg-purple-100 text-[#8E35B5]' },
  refund: { label: 'Payments & refunds', icon: RefreshCw, bar: 'bg-emerald-500', tile: 'bg-emerald-50 text-emerald-600' },
};
const EXTRA = [
  { bar: 'bg-[#E8194E]', tile: 'bg-pink-100 text-[#C81345]' },
  { bar: 'bg-orange-500', tile: 'bg-orange-50 text-orange-600' },
  { bar: 'bg-cyan-500', tile: 'bg-cyan-50 text-cyan-600' },
  { bar: 'bg-amber-500', tile: 'bg-amber-50 text-amber-600' },
  { bar: 'bg-indigo-500', tile: 'bg-indigo-50 text-indigo-600' },
];

export const CORE_TYPES = Object.keys(CORE);

export const policyVisuals = (type) => {
  if (CORE[type]) return { ...CORE[type], core: true };
  const hash = [...String(type)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return { label: 'Custom policy', icon: FileText, core: false, ...EXTRA[hash % EXTRA.length] };
};

export const AUDIENCE = {
  both: { label: 'Members & Vendors', short: 'Everyone' },
  member: { label: 'Members only', short: 'Members' },
  vendor: { label: 'Vendors only', short: 'Vendors' },
};

export const POLICY_STATUS = {
  published: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  draft: { label: 'Draft', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

export const plainText = (html) => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
};
export const wordCount = (html) => plainText(html).split(' ').filter(Boolean).length;
export const readMinutes = (words) => Math.max(1, Math.round(words / 220));

// Public endpoints the mobile apps use to show a published policy.
export const appEndpoints = (type) => ({
  member: `${API_BASE_WITH_PATH}/policies/app/member?type=${type}`,
  vendor: `${API_BASE_WITH_PATH}/policies/app/vendor?type=${type}`,
});

export const audienceIncludes = (appSource, app) => appSource === 'both' || appSource === app;

export const SLUG_RE = /^[a-z][a-z0-9_-]*$/;
