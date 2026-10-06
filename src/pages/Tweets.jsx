import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Eye,
  Heart,
  ImageIcon,
  Layers,
  ListChecks,
  MessageSquare,
  MessagesSquare,
  MoreHorizontal,
  PenSquare,
  Quote,
  Repeat2,
  Rows3,
  Rows4,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/Modal.jsx';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatCompactNumber, formatNumber, formatRelativeTime } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const PAGE_SIZE = 10;
const FEED_PAGE_LIMIT = 50; // the feed endpoint caps each request at 50
const MAX_FEED_PAGES = 10;
const URGENT_REPORTS = 3;

const TYPE_META = {
  post: { label: 'Post', cls: 'bg-pink-100 text-[#C81345]' },
  media: { label: 'Media', cls: 'bg-blue-100 text-blue-700' },
  repost: { label: 'Repost', cls: 'bg-orange-100 text-orange-700' },
  quote: { label: 'Quote', cls: 'bg-purple-100 text-[#8E35B5]' },
};

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'post', label: 'Posts' },
  { value: 'media', label: 'Media' },
  { value: 'repost', label: 'Reposts' },
  { value: 'quote', label: 'Quotes' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'clean', label: 'Clean' },
  { value: 'reported', label: 'Reported' },
];

const typeOf = (tweet) => {
  if (tweet.repostOf && tweet.quoteContent) return 'quote';
  if (tweet.repostOf) return 'repost';
  if (Array.isArray(tweet.media) && tweet.media.length) return 'media';
  return 'post';
};

const formatUtc = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    time: `${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} (UTC)`,
  };
};

const Select = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 min-w-[130px] items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] font-semibold text-neutral-800 transition hover:border-neutral-300 hover:shadow-sm"
      >
        {selected?.label}
        <ChevronDown className={clsx('h-3.5 w-3.5 text-neutral-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 min-w-full overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={clsx('block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition', o.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50')}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value, valueClass, icon: Icon, iconTone, badge, footLeft, footRight, hoverTone }) => (
  <div className={clsx('group rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1', hoverTone)}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <span className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-1 flex items-baseline gap-2">
      <p className={clsx('font-display text-[26px] font-extrabold leading-none tracking-tight', valueClass || 'text-neutral-900')}>{value}</p>
      {badge}
    </div>
    <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
      <span className="truncate text-neutral-500">{footLeft}</span>
      {footRight && <span className="flex-shrink-0 font-bold text-neutral-800">{footRight}</span>}
    </div>
  </div>
);

const Delta = ({ value, title }) => {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span title={title} className={clsx('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold', up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
      <Icon className="h-3 w-3" />{up ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
};

const Avatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />;
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-[11px] font-bold text-[#8E35B5]">
      {String(name || '?').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
    </span>
  );
};

const RowMenu = ({ onView, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-label="Row actions" className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50">
              <Eye className="h-3.5 w-3.5 text-neutral-400" /> View details
            </button>
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Tweets = () => {
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const [items, setItems] = useState([]);
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [reports, setReports] = useState({ items: [], status: 'idle' });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [compact, setCompact] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null); // array of ids
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError('');
    try {
      const all = [];
      let more = false;
      for (let p = 1; p <= MAX_FEED_PAGES; p += 1) {
        const res = await fetch(`${API_BASE_WITH_PATH}/tweets/feed?page=${p}&limit=${FEED_PAGE_LIMIT}`, { headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Failed to load buzz');
        all.push(...(Array.isArray(data?.tweets) ? data.tweets : []));
        more = !!data?.hasMore;
        if (!more) break;
      }
      setItems(all);
      setHasMoreFeed(more);
      setStatus('succeeded');
    } catch (e) {
      setError(e.message || 'Failed to load buzz');
      setStatus('failed');
    }
  }, [token, headers]);

  const loadReports = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/content-reports/admin?content_type=tweet&status=pending&limit=100`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      setReports({ items: Array.isArray(json?.reports) ? json.reports : [], status: 'succeeded' });
    } catch {
      setReports({ items: [], status: 'failed' });
    }
  }, [token, headers]);

  useEffect(() => { load(); loadReports(); }, [load, loadReports]);

  const reportIndex = useMemo(() => {
    const map = new Map();
    reports.items.forEach((r) => {
      const id = String(r.content_id?._id || r.content_id || '');
      if (!id) return;
      const entry = map.get(id) || { count: 0, oldest: null, reason: r.reason };
      entry.count += 1;
      if (r.createdAt && (!entry.oldest || new Date(r.createdAt) < new Date(entry.oldest))) entry.oldest = r.createdAt;
      map.set(id, entry);
    });
    return map;
  }, [reports.items]);

  const rows = useMemo(() => items.map((tweet) => {
    const id = String(tweet._id || tweet.id || '');
    const author = tweet.author || {};
    const original = tweet.repostOf && typeof tweet.repostOf === 'object' ? tweet.repostOf : null;
    const media = Array.isArray(tweet.media) ? tweet.media : [];
    const report = reportIndex.get(id);
    return {
      id,
      code: `#BUZ-${id.slice(-4).toUpperCase()}`,
      type: typeOf(tweet),
      content: tweet.quoteContent || tweet.content || original?.content || '',
      originalHandle: original?.author?.username || '',
      author: author.full_name || author.username || 'Unknown',
      handle: author.username || '',
      avatar: author.avatar_url ? toAbsoluteMediaUrl(author.avatar_url) : '',
      media: media.map((m) => toAbsoluteMediaUrl(m.url)).filter(Boolean),
      likes: Number(tweet.likesCount ?? tweet.likes_count ?? 0) || 0,
      comments: Number(tweet.commentsTotal ?? tweet.commentsCount ?? 0) || 0,
      reposts: Number(tweet.repostsCount ?? tweet.reposts_count ?? 0) || 0,
      quotes: Number(tweet.quotesCount ?? 0) || 0,
      views: Number(tweet.viewsCount ?? 0) || 0,
      reports: report?.count || 0,
      reportReason: report?.reason || '',
      createdAt: tweet.createdAt || tweet.created_at,
    };
  }), [items, reportIndex]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q && ![r.id, r.code, r.content, r.author, r.handle].some((v) => String(v).toLowerCase().includes(q))) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter === 'clean' && r.reports) return false;
      if (statusFilter === 'reported' && !r.reports) return false;
      return true;
    });
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rows, search, typeFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const now = Date.now();
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const today = rows.filter((r) => new Date(r.createdAt) >= startToday);
    const yesterday = rows.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= startToday.getTime() - DAY_MS && t < startToday.getTime();
    });
    const last7 = rows.filter((r) => new Date(r.createdAt).getTime() > now - 7 * DAY_MS);
    const prev7 = rows.filter((r) => { const t = new Date(r.createdAt).getTime(); return t <= now - 7 * DAY_MS && t > now - 14 * DAY_MS; });
    const hours = today.reduce((acc, r) => { const h = new Date(r.createdAt).getUTCHours(); acc[h] = (acc[h] || 0) + 1; return acc; }, {});
    const peakHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]?.[0];
    const hoursElapsed = Math.max(1, (now - startToday.getTime()) / 3600000);
    const comments = rows.reduce((s, r) => s + r.comments, 0);
    const mostDiscussed = [...rows].sort((a, b) => b.comments - a.comments)[0];
    const reported = rows.filter((r) => r.reports);
    const oldest = [...reportIndex.values()].map((e) => e.oldest).filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0];
    return {
      total: rows.length,
      creators: new Set(rows.map((r) => r.handle || r.author)).size,
      perDay: last7.length / 7,
      weekGrowth: prev7.length ? ((last7.length - prev7.length) / prev7.length) * 100 : null,
      today: today.length,
      todayDelta: yesterday.length ? ((today.length - yesterday.length) / yesterday.length) * 100 : null,
      peakHour,
      perHour: today.length / hoursElapsed,
      comments,
      depth: rows.length ? comments / rows.length : 0,
      mostDiscussed,
      reported: reported.length,
      urgent: reported.filter((r) => r.reports >= URGENT_REPORTS).length,
      reportTotal: reports.items.length,
      oldest,
    };
  }, [rows, reportIndex, reports.items.length]);

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const toggleAllVisible = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allVisibleSelected) visible.forEach((r) => next.delete(r.id));
    else visible.forEach((r) => next.add(r.id));
    return next;
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleDelete = async () => {
    const ids = confirmDelete || [];
    if (!ids.length) return;
    setDeleting(true);
    const results = await Promise.allSettled(ids.map((id) => fetch(`${API_BASE_WITH_PATH}/tweets/${id}`, { method: 'DELETE', headers })
      .then((res) => { if (!res.ok) throw new Error(); return id; })));
    const removed = new Set(results.filter((r) => r.status === 'fulfilled').map((r) => r.value));
    setItems((prev) => prev.filter((item) => !removed.has(String(item._id || item.id))));
    setSelected((prev) => new Set([...prev].filter((id) => !removed.has(id))));
    const failed = ids.length - removed.size;
    showToast(failed ? `Deleted ${removed.size}, ${failed} failed` : `Deleted ${removed.size} buzz ${removed.size === 1 ? 'post' : 'posts'}`);
    setDeleting(false);
    setConfirmDelete(null);
  };

  const handleExport = () => {
    downloadCsv(`buzz-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Code', 'ID', 'Type', 'Author', 'Username', 'Content', 'Likes', 'Comments', 'Reposts', 'Views', 'Pending reports', 'Posted (UTC)'],
      ...filtered.map((r) => [r.code, r.id, TYPE_META[r.type].label, r.author, r.handle, r.content, r.likes, r.comments, r.reposts, r.views, r.reports, r.createdAt]),
    ]);
  };

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-pink-50/90 via-pink-50/30 to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest">
                <span className="rounded-md bg-pink-100 px-1.5 py-0.5 text-[#C81345]">M.</span>
                <span className="text-[#C81345]">Content Management</span>
                <span className="text-neutral-400">•</span>
                <span className="text-neutral-600">Realtime Moderation</span>
              </p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <h1 className="font-display text-[26px] font-bold tracking-tight text-neutral-900">Buzz Stream</h1>
                <span className={clsx('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white', error ? 'bg-neutral-400' : 'bg-[#E8194E]')}>
                  {error ? 'Offline' : 'Live peek'}
                </span>
              </div>
              <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">
                Micro-blogging feed moderation, text discussions, threaded replies, and community discourse sentiment tracking.
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={handleExport}
                disabled={!filtered.length}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E9EBFA] px-4 text-[13.5px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-[#DFE2F7] hover:shadow-[0_8px_18px_-10px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <Download className="h-4 w-4" /> Export Log
              </button>
              <button
                type="button"
                onClick={() => navigate('/reports/content')}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_26px_-8px_rgba(232,25,78,0.7)]"
              >
                <ShieldCheck className="h-4 w-4" /> Report Queue ({stats.reported})
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Buzz Stream"
            value={formatCompactNumber(stats.total)}
            icon={MessagesSquare}
            iconTone="bg-pink-100 text-[#C81345]"
            badge={<Delta value={stats.weekGrowth} title="Last 7 days vs the 7 before" />}
            footLeft={`Across ${formatNumber(stats.creators)} creators`}
            footRight={`${stats.perDay >= 10 ? Math.round(stats.perDay) : stats.perDay.toFixed(1)}/day`}
            hoverTone="hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.45)]"
          />
          <StatCard
            label="Today's Posts"
            value={formatNumber(stats.today)}
            icon={PenSquare}
            iconTone="bg-rose-100 text-rose-600"
            badge={<Delta value={stats.todayDelta} title="vs yesterday" />}
            footLeft={stats.peakHour !== undefined ? `Peak at ${String(stats.peakHour).padStart(2, '0')}:00 UTC` : 'No posts yet today'}
            footRight={`${stats.perHour.toFixed(1)}/hr`}
            hoverTone="hover:border-rose-200 hover:shadow-[0_14px_30px_-14px_rgba(225,29,72,0.4)]"
          />
          <StatCard
            label="Replies Feed"
            value={formatCompactNumber(stats.comments)}
            icon={MessageSquare}
            iconTone="bg-purple-100 text-[#8E35B5]"
            footLeft={`Thread depth: ${stats.depth.toFixed(1)} avg`}
            footRight={stats.mostDiscussed?.comments ? <span className="text-[#8E35B5]">Top: {formatCompactNumber(stats.mostDiscussed.comments)}</span> : null}
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
          />
          <StatCard
            label="Moderation Queue"
            value={reports.status === 'failed' ? '—' : formatNumber(stats.reported)}
            valueClass="text-[#C81345]"
            icon={AlertTriangle}
            iconTone="bg-rose-100 text-rose-600"
            badge={stats.urgent > 0 ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-rose-700">{stats.urgent} Urgent</span> : null}
            footLeft={reports.status === 'failed' ? 'Reports unavailable' : `${formatNumber(stats.reportTotal)} open user reports`}
            footRight={stats.oldest ? <span className="text-[#C81345]">Oldest {formatRelativeTime(stats.oldest).toLowerCase()}</span> : null}
            hoverTone="hover:border-rose-200 hover:shadow-[0_14px_30px_-14px_rgba(225,29,72,0.45)]"
          />
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 bg-[#F4F5FC] p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, content, author or code..."
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-[13px] text-neutral-800 placeholder-neutral-400 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <Select value={typeFilter} options={TYPE_OPTIONS} onChange={setTypeFilter} />
            <Select value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
            <button
              type="button"
              onClick={() => { setBatchMode((v) => !v); setSelected(new Set()); }}
              aria-pressed={batchMode}
              className={clsx(
                'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition',
                batchMode ? 'border-pink-200 bg-pink-50 text-[#C81345]' : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:shadow-sm'
              )}
            >
              <ListChecks className="h-4 w-4" /> Batch Ops
            </button>
            <button
              type="button"
              onClick={() => setCompact((v) => !v)}
              title={compact ? 'Comfortable rows' : 'Compact rows'}
              aria-label="Toggle row density"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition hover:border-neutral-300 hover:shadow-sm"
            >
              {compact ? <Rows3 className="h-4 w-4" /> : <Rows4 className="h-4 w-4" />}
            </button>
          </div>

          {batchMode && (
            <div className="flex items-center justify-between gap-3 border-y border-pink-100 bg-pink-50/60 px-4 py-2">
              <p className="text-[12.5px] font-semibold text-neutral-700">{selected.size} selected</p>
              <div className="flex items-center gap-2">
                {selected.size > 0 && <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] font-semibold text-neutral-600 hover:underline">Clear</button>}
                <button
                  type="button"
                  disabled={!selected.size}
                  onClick={() => setConfirmDelete([...selected])}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#C81345] px-3 text-[12px] font-bold text-white transition hover:bg-[#A50F39] disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete selected
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-neutral-100">
                  {batchMode && (
                    <th className="w-10 py-3 pl-4">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select page" className="h-4 w-4 rounded accent-[#E8194E]" />
                    </th>
                  )}
                  {['Buzz Thread & Author', 'Type', 'Engagement', 'Report Status', 'Timestamp'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>
                  ))}
                  <th className="w-14 px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading buzz…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><Search className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{error ? `Error: ${error}` : 'No buzz matches these filters'}</p></td></tr>
                ) : visible.map((row) => {
                  const ts = formatUtc(row.createdAt);
                  const isSelected = selected.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => (batchMode ? toggleSelect(row.id) : navigate(`/tweets/${row.id}`))}
                      className={clsx(
                        'group cursor-pointer align-top transition-colors hover:bg-[#FDF2F6]',
                        row.reports > 0 && 'bg-rose-50/40',
                        isSelected && 'bg-pink-50'
                      )}
                    >
                      {batchMode && (
                        <td className={clsx('pl-4', compact ? 'py-2.5' : 'py-4')}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(row.id)} onClick={(e) => e.stopPropagation()} aria-label="Select row" className="h-4 w-4 rounded accent-[#E8194E]" />
                        </td>
                      )}
                      <td className={clsx('border-l-2 px-4 transition-colors group-hover:border-[#E8194E]', compact ? 'py-2.5' : 'py-4', row.reports > 0 ? 'border-rose-400' : 'border-transparent')}>
                        <div className="flex gap-3">
                          <Avatar src={row.avatar} name={row.author} />
                          <div className="min-w-0 max-w-[380px]">
                            <div className="flex flex-wrap items-center gap-x-1.5">
                              <p className="text-[13.5px] font-bold text-neutral-900">{row.author}</p>
                              {row.handle && <p className="text-[11.5px] text-neutral-500">@{row.handle}</p>}
                              <span className="rounded bg-[#E9EBFA] px-1.5 font-mono text-[10px] font-bold text-neutral-700">{row.code}</span>
                            </div>
                            {(row.type === 'repost' || row.type === 'quote') && row.originalHandle && (
                              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8E35B5]">
                                {row.type === 'quote' ? <Quote className="h-3 w-3" /> : <Repeat2 className="h-3 w-3" />}
                                {row.type === 'quote' ? 'Quoting' : 'Reposting'} @{row.originalHandle}
                              </p>
                            )}
                            <p className={clsx('mt-0.5 text-[13px] leading-snug text-neutral-700', compact ? 'line-clamp-1' : 'line-clamp-3')}>
                              {row.content || <span className="italic text-neutral-400">No text</span>}
                            </p>
                            {row.reports > 0 && (
                              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-[#C81345]">
                                {row.reports} user report{row.reports === 1 ? '' : 's'}{row.reportReason ? `: ${String(row.reportReason).replace(/_/g, ' ')}` : ''}
                              </p>
                            )}
                            {!compact && row.media.length > 0 && (
                              <div className="mt-2 flex items-center gap-1.5">
                                {row.media.slice(0, 3).map((url) => (
                                  <img key={url} src={url} alt="" className="h-10 w-10 rounded-md object-cover ring-1 ring-neutral-200 transition-transform group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                ))}
                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-blue-700">
                                  <ImageIcon className="h-3 w-3" /> {row.media.length} attached
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={clsx('px-4', compact ? 'py-2.5' : 'py-4')}>
                        <span className={clsx('inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold', TYPE_META[row.type].cls)}>{TYPE_META[row.type].label}</span>
                      </td>
                      <td className={clsx('px-4', compact ? 'py-2.5' : 'py-4')}>
                        <div className="flex items-center gap-3 text-[12px] text-neutral-700">
                          <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-[#E8194E]" />{formatCompactNumber(row.likes)}</span>
                          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-neutral-500" />{formatCompactNumber(row.comments)}</span>
                          <span className="inline-flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5 text-neutral-500" />{formatCompactNumber(row.reposts + row.quotes)}</span>
                        </div>
                        {row.views > 0 && <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-500"><Eye className="h-3 w-3" />{formatCompactNumber(row.views)} views</p>}
                      </td>
                      <td className={clsx('px-4', compact ? 'py-2.5' : 'py-4')}>
                        {row.reports > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                            <AlertTriangle className="h-3 w-3" /> Reported ({row.reports})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Clean
                          </span>
                        )}
                      </td>
                      <td className={clsx('px-4', compact ? 'py-2.5' : 'py-4')}>
                        <p className="whitespace-nowrap text-[12px] font-semibold text-neutral-800">{ts.date}</p>
                        <p className="whitespace-nowrap text-[11px] text-neutral-500">{ts.time}</p>
                      </td>
                      <td className={clsx('px-4', compact ? 'py-2.5' : 'py-4')}>
                        <RowMenu onView={() => navigate(`/tweets/${row.id}`)} onDelete={() => setConfirmDelete([row.id])} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-[12px] text-neutral-500">
                <Layers className="h-3.5 w-3.5" />
                Showing <span className="font-semibold text-neutral-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of
                <span className="font-semibold text-neutral-800">{formatNumber(filtered.length)}</span> buzz
                {hasMoreFeed && <span className="text-neutral-400">(latest {formatNumber(items.length)} loaded)</span>}
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
                {pageList(page, totalPages).map((p, i) => (p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-[12px] text-neutral-400">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)} className={clsx('h-8 min-w-[32px] rounded-lg px-2 text-[12.5px] font-semibold transition', p === page ? 'bg-[#E8194E] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'text-neutral-700 hover:bg-neutral-100')}>
                    {formatNumber(p)}
                  </button>
                )))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-soft">{toast}</div>}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={confirmDelete?.length > 1 ? `Delete ${confirmDelete.length} buzz posts` : 'Delete Buzz'}
        description={confirmDelete?.length > 1 ? `Are you sure you want to delete these ${confirmDelete.length} posts? This action cannot be undone.` : 'Are you sure you want to delete this buzz? This action cannot be undone.'}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </>
  );
};

export default Tweets;
