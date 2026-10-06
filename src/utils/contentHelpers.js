import { API_BASE_URL } from '../lib/apiBase.js';

export const toAbsoluteMediaUrl = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/')) return `${API_BASE_URL}${raw}`;
  if (raw.startsWith('uploads/')) return `${API_BASE_URL}/${raw}`;
  if (!raw.includes('/') && raw.includes('.')) return `${API_BASE_URL}/uploads/${raw}`;
  if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
};

export const getThumbnailUrl = (media) => {
  if (!media) return '';
  const candidates = [];
  if (Array.isArray(media.thumbnail)) candidates.push(...media.thumbnail);
  else if (media.thumbnail && typeof media.thumbnail === 'object') candidates.push(media.thumbnail);
  if (Array.isArray(media.thumbnails)) candidates.push(...media.thumbnails);
  for (const item of candidates) {
    const resolved = toAbsoluteMediaUrl(item?.fileUrl || item?.url || item?.fileName);
    if (resolved) return resolved;
  }
  return toAbsoluteMediaUrl(media.fileUrl || media.url || media.fileName);
};

export const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Page numbers with ellipses: 1 2 3 … 12,045 (and the current page's neighbours).
export const pageList = (current, total) => {
  const pages = new Set([1, 2, 3, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return sorted.reduce((acc, p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) acc.push('…');
    acc.push(p);
    return acc;
  }, []);
};

export const DAY_MS = 24 * 60 * 60 * 1000;

// Last 30 days vs the 30 before; null when there's nothing to compare against.
export const growthOf = (items, readTime, readValue = () => 1) => {
  const now = Date.now();
  let recent = 0;
  let prior = 0;
  items.forEach((item) => {
    const time = new Date(readTime(item)).getTime();
    if (Number.isNaN(time)) return;
    if (time > now - 30 * DAY_MS) recent += readValue(item);
    else if (time > now - 60 * DAY_MS) prior += readValue(item);
  });
  return prior ? ((recent - prior) / prior) * 100 : null;
};
