import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Heart,
  Hourglass,
  MessageSquare,
  MoreHorizontal,
  Play,
  RotateCw,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ConfirmModal } from '../components/Modal.jsx';
import { fetchPosts, deletePostById } from '../store/postsSlice.js';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatCompactNumber, formatNumber, formatRelativeTime } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, getThumbnailUrl, growthOf, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const PAGE_SIZE = 10;
const HIGH_PRIORITY_REPORTS = 3;
const TRENDING_VIEWS = 50000;
const OPTIMAL_RANGE = [24, 32];

const DURATION_OPTIONS = [
  { value: 'all', label: 'All lengths' },
  { value: 'short', label: 'Under 15s' },
  { value: 'mid', label: '15–30s' },
  { value: 'long', label: '30–60s' },
  { value: 'xl', label: 'Over 60s' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'clear', label: 'Clear' },
];

const QUICK_VIEWS = [
  { key: 'flagged', label: 'Flagged Priority', dot: true },
  { key: 'trending', label: 'Trending (>50k views)' },
  { key: 'retention', label: 'High Retention (70%+)' },
  { key: 'new', label: 'New Today' },
];

const isReel = (post) => {
  const media = Array.isArray(post.media) ? post.media[0] : null;
  const mediaType = String(media?.type || media?.media_type || '').toLowerCase();
  return mediaType.includes('video') || String(post.type || post.item_type || '').toLowerCase() === 'reel';
};

// Seconds of playable video: the edited length when present, else the trim window.
const durationOf = (media) => {
  if (!media) return 0;
  let seconds = Number(media.finallength) || 0;
  if (!seconds && media.timing) seconds = (Number(media.timing.end) || 0) - (Number(media.timing.start) || 0);
  if (seconds > 1000) seconds /= 1000; // stored in ms on some uploads
  return seconds > 0 ? seconds : 0;
};

const formatDuration = (seconds) => {
  if (!seconds) return '—';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const durationBucket = (seconds) => {
  if (!seconds) return null;
  if (seconds < 15) return 'short';
  if (seconds < 30) return 'mid';
  if (seconds <= 60) return 'long';
  return 'xl';
};

const humanizeTag = (tag) => String(tag || '').replace(/^#/, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const LabeledSelect = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 text-[13px] text-neutral-600 transition hover:border-neutral-300 hover:shadow-sm"
      >
        {label}: <span className="font-bold text-neutral-900">{selected?.label}</span>
        <ChevronDown className={clsx('h-3.5 w-3.5 text-neutral-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 max-h-72 min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={clsx(
                  'block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition',
                  option.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value, valueClass, icon: Icon, iconTone, pill, pillTone, note, hoverTone }) => (
  <div className={clsx(
    'group rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1',
    hoverTone
  )}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
        <p className={clsx('mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight', valueClass || 'text-neutral-900')}>{value}</p>
      </div>
      <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
    </div>
    <div className="mt-5 flex items-center justify-between gap-2">
      {pill ? <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold', pillTone)}>{pill}</span> : <span />}
      {note && <span className="text-right text-[12px] text-neutral-500">{note}</span>}
    </div>
  </div>
);

const RowMenu = ({ onView, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
        aria-label="Row actions"
      >
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

const ReelThumb = ({ src, duration }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-[84px] w-12 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
      {src && !failed && <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition group-hover:bg-[#E8194E]/80">
          <Play className="h-3 w-3 fill-white text-white" />
        </span>
      </span>
      {duration > 0 && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/70 px-1 text-[9px] font-bold text-white">{formatDuration(duration)}</span>
      )}
    </div>
  );
};

const Avatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-white" />;
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
      {String(name || '?')[0]?.toUpperCase()}
    </div>
  );
};

const Reels = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const { items, status, error } = useSelector((state) => state.posts);
  const [reports, setReports] = useState({ items: [], status: 'idle' });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [duration, setDuration] = useState('all');
  const [quick, setQuick] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);

  // Pending reports against reels drive the "Flagged" state; there is no
  // moderation status on the reel itself.
  const loadReports = useCallback(async () => {
    if (!token) return;
    setReports((r) => ({ ...r, status: 'loading' }));
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/content-reports/admin?content_type=reel&status=pending&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load reports');
      setReports({ items: Array.isArray(json?.reports) ? json.reports : [], status: 'succeeded' });
    } catch {
      setReports({ items: [], status: 'failed' });
    }
  }, [token]);

  const refresh = useCallback(() => {
    dispatch(fetchPosts());
    loadReports();
  }, [dispatch, loadReports]);

  useEffect(() => { refresh(); }, [refresh]);

  const reportIndex = useMemo(() => {
    const map = new Map();
    reports.items.forEach((report) => {
      const id = String(report.content_id?._id || report.content_id || '');
      if (!id) return;
      const entry = map.get(id) || { count: 0, oldest: null };
      entry.count += 1;
      const created = report.createdAt || report.created_at;
      if (created && (!entry.oldest || new Date(created) < new Date(entry.oldest))) entry.oldest = created;
      map.set(id, entry);
    });
    return map;
  }, [reports.items]);

  const rows = useMemo(() => (items || []).filter(isReel).map((post) => {
    const id = String(post.post_id || post._id || post.id || '');
    const user = post.user_id && typeof post.user_id === 'object' ? post.user_id : {};
    const media = Array.isArray(post.media) ? post.media[0] : null;
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const views = Number(post.views_count) || 0;
    const completed = Number(post.completed_views_count) || 0;
    const report = reportIndex.get(id);
    return {
      id,
      code: `#BSP-${id.slice(-5).toUpperCase()}`,
      caption: post.caption || '',
      category: tags[0] ? humanizeTag(tags[0]) : '',
      thumbnail: getThumbnailUrl(media),
      duration: durationOf(media),
      owner: user.full_name || user.username || 'Unknown',
      handle: user.username || '',
      avatar: user.avatar_url ? toAbsoluteMediaUrl(user.avatar_url) : '',
      followers: Number(user.followers_count) || 0,
      views,
      uniqueViews: Number(post.unique_views_count) || 0,
      retention: views ? Math.min(100, (completed / views) * 100) : null,
      likes: Number(post.likes_count) || 0,
      comments: Number(post.comments_count) || 0,
      reports: report?.count || 0,
      createdAt: post.createdAt || post.created_at,
    };
  }), [items, reportIndex]);

  const categoryOptions = useMemo(() => {
    const names = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort();
    return [{ value: 'all', label: 'All Categories' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const dayAgo = Date.now() - DAY_MS;
    const list = rows.filter((r) => {
      if (q && ![r.id, r.code, r.caption, r.owner, r.handle, r.category].some((v) => String(v).toLowerCase().includes(q))) return false;
      if (category !== 'all' && r.category !== category) return false;
      if (statusFilter === 'flagged' && !r.reports) return false;
      if (statusFilter === 'clear' && r.reports) return false;
      if (duration !== 'all' && durationBucket(r.duration) !== duration) return false;
      if (quick.has('flagged') && !r.reports) return false;
      if (quick.has('trending') && r.views <= TRENDING_VIEWS) return false;
      if (quick.has('retention') && !(r.retention >= 70)) return false;
      if (quick.has('new') && new Date(r.createdAt).getTime() < dayAgo) return false;
      return true;
    });
    // Flagged reels float to the top (most-reported first), then newest.
    return list.sort((a, b) => (b.reports - a.reports) || (new Date(b.createdAt) - new Date(a.createdAt)));
  }, [rows, search, category, statusFilter, duration, quick]);

  useEffect(() => { setPage(1); }, [search, category, statusFilter, duration, quick]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const totalViews = rows.reduce((sum, r) => sum + r.views, 0);
    const totalCompleted = rows.reduce((sum, r) => sum + (r.retention !== null ? (r.retention / 100) * r.views : 0), 0);
    const timed = rows.filter((r) => r.duration > 0);
    const weekAgo = Date.now() - 7 * DAY_MS;
    const flagged = rows.filter((r) => r.reports);
    const oldestReport = [...reportIndex.values()].map((e) => e.oldest).filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0];
    return {
      total: rows.length,
      growth: growthOf(rows, (r) => r.createdAt),
      views: totalViews,
      viewsGrowth: growthOf(rows, (r) => r.createdAt, (r) => r.views),
      viewsThisWeek: rows.filter((r) => new Date(r.createdAt).getTime() >= weekAgo).reduce((sum, r) => sum + r.views, 0),
      flagged: flagged.length,
      highPriority: flagged.filter((r) => r.reports >= HIGH_PRIORITY_REPORTS).length,
      oldestReport,
      avgDuration: timed.length ? timed.reduce((sum, r) => sum + r.duration, 0) / timed.length : 0,
      optimalShare: timed.length ? (timed.filter((r) => r.duration >= OPTIMAL_RANGE[0] && r.duration <= OPTIMAL_RANGE[1]).length / timed.length) * 100 : 0,
      retention: totalViews ? (totalCompleted / totalViews) * 100 : null,
    };
  }, [rows, reportIndex]);

  const toggleQuick = (key) => setQuick((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const handleExport = () => {
    downloadCsv(`bsparks-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Code', 'ID', 'Caption', 'Creator', 'Username', 'Category', 'Duration (s)', 'Views', 'Likes', 'Comments', 'Completion %', 'Pending reports', 'Posted'],
      ...filtered.map((r) => [r.code, r.id, r.caption, r.owner, r.handle, r.category, Math.round(r.duration), r.views, r.likes, r.comments, r.retention === null ? '' : r.retention.toFixed(1), r.reports, r.createdAt]),
    ]);
  };

  const growthPill = (value) => (value === null || !Number.isFinite(value) ? null : (
    <><TrendingUp className="h-3.5 w-3.5" />{value >= 0 ? '+' : ''}{value.toFixed(1)}%</>
  ));

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white px-6 py-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-pink-50/90 via-pink-50/30 to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#E8194E]">Content Management</span>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-600">
                  <span className={clsx('h-1.5 w-1.5 rounded-full', error ? 'bg-rose-500' : 'bg-[#E8194E]')} />
                  {error ? 'Feed unavailable' : 'Live feed'}
                </span>
              </div>
              <h1 className="mt-2 font-display text-[26px] font-bold tracking-tight text-neutral-900">bSparks Moderation</h1>
              <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">
                Review, moderate and inspect vertical short video reels across active community feeds.
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
                title="Open the content report queue"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_26px_-8px_rgba(232,25,78,0.7)]"
              >
                <BadgeCheck className="h-4 w-4" /> Review Flagged
                {stats.flagged > 0 && <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-bold">{stats.flagged}</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total bSparks"
            value={formatNumber(stats.total)}
            icon={Play}
            iconTone="bg-purple-100 text-[#8E35B5] [&_svg]:fill-[#8E35B5]"
            pill={growthPill(stats.growth)}
            pillTone="bg-purple-100 text-[#8E35B5]"
            note="vs last 30 days"
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
          />
          <StatCard
            label="Total Views"
            value={formatCompactNumber(stats.views)}
            icon={Eye}
            iconTone="bg-indigo-50 text-neutral-800"
            pill={growthPill(stats.viewsGrowth)}
            pillTone="bg-indigo-50 text-neutral-800"
            note={`${formatCompactNumber(stats.viewsThisWeek)} on new reels / wk`}
            hoverTone="hover:border-indigo-200 hover:shadow-[0_14px_30px_-14px_rgba(99,102,241,0.4)]"
          />
          <StatCard
            label="Flagged / Review"
            value={reports.status === 'failed' ? '—' : formatNumber(stats.flagged)}
            valueClass="text-[#C81345]"
            icon={AlertTriangle}
            iconTone="bg-rose-100 text-rose-600"
            pill={stats.highPriority > 0 ? <><span className="font-black">!</span>{stats.highPriority} high priority</> : null}
            pillTone="bg-rose-100 text-rose-700"
            note={reports.status === 'failed' ? 'Reports unavailable' : stats.oldestReport ? `Oldest ${formatRelativeTime(stats.oldestReport).toLowerCase()}` : 'Queue clear'}
            hoverTone="hover:border-rose-200 hover:shadow-[0_14px_30px_-14px_rgba(225,29,72,0.45)]"
          />
          <StatCard
            label="Avg Duration"
            value={stats.avgDuration ? `${formatDuration(stats.avgDuration)}s` : '—'}
            icon={Clock}
            iconTone="bg-indigo-50 text-neutral-900"
            pill={stats.avgDuration ? <><Hourglass className="h-3.5 w-3.5" />{Math.round(stats.optimalShare)}% at {OPTIMAL_RANGE[0]}–{OPTIMAL_RANGE[1]}s</> : null}
            pillTone="bg-neutral-100 text-neutral-700"
            note={stats.retention === null ? null : `Retention ${Math.round(stats.retention)}%`}
            hoverTone="hover:border-neutral-300 hover:shadow-[0_14px_30px_-14px_rgba(17,24,39,0.35)]"
          />
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="space-y-3 bg-[#F4F5FC] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by ID, creator, caption or category..."
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-[13px] text-neutral-800 placeholder-neutral-400 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <LabeledSelect label="Category" value={category} options={categoryOptions} onChange={setCategory} />
              <LabeledSelect label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
              <LabeledSelect label="Duration" value={duration} options={DURATION_OPTIONS} onChange={setDuration} />
              <button
                type="button"
                onClick={refresh}
                title="Refresh"
                aria-label="Refresh"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition hover:border-neutral-300 hover:shadow-sm"
              >
                <RotateCw className={clsx('h-4 w-4', (status === 'loading' || reports.status === 'loading') && 'animate-spin')} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">Quick views:</span>
              {QUICK_VIEWS.map((view) => {
                const active = quick.has(view.key);
                return (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => toggleQuick(view.key)}
                    aria-pressed={active}
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold transition',
                      active
                        ? 'border-transparent bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-white shadow-[0_4px_10px_-4px_rgba(232,25,78,0.6)]'
                        : view.dot
                          ? 'border-purple-200/70 bg-purple-50 text-[#8E35B5] hover:border-purple-300 hover:bg-purple-100'
                          : 'border-[#DCE0F2] bg-[#E9EBF8] text-neutral-700 hover:border-[#C9CFEC] hover:bg-[#DFE2F5]'
                    )}
                  >
                    {active && <Check className="h-3 w-3" strokeWidth={3} />}
                    {view.label}
                    {view.dot && !active && <span className="h-1.5 w-1.5 rounded-full bg-[#E8194E]" />}
                  </button>
                );
              })}
              {quick.size > 0 && (
                <button type="button" onClick={() => setQuick(new Set())} className="ml-1 text-[11px] font-semibold text-[#E8194E] hover:underline">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-y border-neutral-100">
                  {['Video / Reel', 'Creator', 'Watch Quality', 'Engagement', 'Status'].map((head) => (
                    <th key={head} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-700">{head}</th>
                  ))}
                  <th className="w-14 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading bSparks...</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center"><Search className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{error ? `Error: ${error}` : 'No bSparks match these filters'}</p></td></tr>
                ) : visible.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/reels/${row.id}`)}
                    className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', row.reports > 0 && 'bg-rose-50/40')}
                  >
                    <td className={clsx('border-l-2 px-4 py-3 transition-colors group-hover:border-[#E8194E]', row.reports > 0 ? 'border-rose-400' : 'border-transparent')}>
                      <div className="flex items-center gap-3">
                        <ReelThumb src={row.thumbnail} duration={row.duration} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[#E8194E]">{row.code}</p>
                          <p className="mt-0.5 line-clamp-2 max-w-[230px] text-[13.5px] font-bold leading-snug text-neutral-900 transition-colors group-hover:text-[#C81345]">
                            {row.caption || 'No caption'}
                          </p>
                          {row.category && (
                            <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-neutral-500">
                              <Tag className="h-3 w-3" /> {row.category}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={row.avatar} name={row.owner} />
                        <div className="min-w-0">
                          <p className="max-w-[150px] truncate text-[13px] font-semibold text-neutral-900">{row.owner}</p>
                          {row.handle && <p className="max-w-[150px] truncate text-[11.5px] text-neutral-500">@{row.handle}</p>}
                          {row.followers > 0 && <p className="text-[10.5px] font-bold text-[#8E35B5]">{formatCompactNumber(row.followers)} followers</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-purple-50 text-[#8E35B5]">
                          <Users className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold text-neutral-900">
                            {row.retention === null ? 'No views yet' : `${Math.round(row.retention)}% completion`}
                          </p>
                          <p className="text-[11.5px] text-neutral-500">{formatCompactNumber(row.uniqueViews)} unique viewers</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="inline-flex items-center gap-1.5 text-[14px] font-bold text-neutral-900">
                        <Eye className="h-4 w-4 text-neutral-600" />{formatCompactNumber(row.views)}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[11.5px] text-neutral-500">
                        <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{formatCompactNumber(row.likes)}</span>
                        <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{formatCompactNumber(row.comments)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.reports > 0 ? (
                        <span className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                          row.reports >= HIGH_PRIORITY_REPORTS ? 'bg-rose-100 text-rose-700' : 'bg-amber-50 text-amber-700'
                        )}>
                          <AlertTriangle className="h-3 w-3" />
                          {row.reports} {row.reports === 1 ? 'report' : 'reports'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                        </span>
                      )}
                      <p className="mt-1 text-[11px] text-neutral-500">{row.createdAt ? formatRelativeTime(row.createdAt) : '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RowMenu onView={() => navigate(`/reels/${row.id}`)} onDelete={() => setConfirm(row)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-neutral-500">
                Showing <span className="font-semibold text-neutral-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of{' '}
                <span className="font-semibold text-neutral-800">{formatNumber(filtered.length)}</span> bSparks
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
                {pageList(page, totalPages).map((p, i) => (p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-[12px] text-neutral-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={clsx('h-8 min-w-[32px] rounded-lg px-2 text-[12.5px] font-semibold transition', p === page ? 'bg-[#E8194E] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'text-neutral-700 hover:bg-neutral-100')}
                  >
                    {formatNumber(p)}
                  </button>
                )))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { if (!confirm?.id) return; dispatch(deletePostById(confirm.id)).finally(() => setConfirm(null)); }}
        title="Delete bSpark"
        description={`Are you sure you want to permanently delete ${confirm?.code || 'this bSpark'}? This cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Reels;
