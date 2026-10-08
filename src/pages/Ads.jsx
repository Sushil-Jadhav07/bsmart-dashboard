import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Download,
  Eye,
  Hourglass,
  Megaphone,
  MoreHorizontal,
  PauseCircle,
  Play,
  RotateCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/Modal.jsx';
import { deleteAdById, fetchAdCategories, fetchAdsAdmin, patchAdStatus } from '../store/adsSlice.js';
import { formatCompactNumber, formatNumber } from '../utils/helpers.jsx';
import { downloadCsv, growthOf, pageList } from '../utils/contentHelpers.js';

const PAGE_SIZE = 10;

const STATUS_META = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  pending: { label: 'Pending', cls: 'bg-pink-100 text-[#C81345]', dot: 'bg-[#E8194E]' },
  paused: { label: 'Paused', cls: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
  rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  draft: { label: 'Draft', cls: 'bg-purple-100 text-[#8E35B5]', dot: 'bg-[#8E35B5]' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'rejected', label: 'Rejected' },
];

const BUDGET_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'small', label: 'Under 10K coins' },
  { value: 'mid', label: '10K–50K coins' },
  { value: 'large', label: 'Over 50K coins' },
];

const budgetBucket = (coins) => (coins < 10000 ? 'small' : coins <= 50000 ? 'mid' : 'large');

const Select = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 text-[13px] text-neutral-600 transition hover:border-neutral-300 hover:shadow-sm"
      >
        {label && <span>{label}:</span>}
        <span className="font-bold text-neutral-900">{selected?.label}</span>
        <ChevronDown className={clsx('h-3.5 w-3.5 text-neutral-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 max-h-72 min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
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

const StatCard = ({ label, value, valueClass, icon: Icon, iconTone, badge, note, hoverTone }) => (
  <div className={clsx('group rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1', hoverTone)}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <span className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-1 flex flex-wrap items-baseline gap-2">
      <p className={clsx('font-display text-[26px] font-extrabold leading-none tracking-tight', valueClass || 'text-neutral-900')}>{value}</p>
      {badge}
    </div>
    <p className="mt-3 truncate text-[11px] text-neutral-500">{note}</p>
  </div>
);

const Delta = ({ value, title }) => {
  if (value === null || !Number.isFinite(value)) return null;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <span title={title} className={clsx('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold', value >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
      <Icon className="h-3 w-3" />{value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
};

const Thumb = ({ src, isVideo }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
      {src && !failed && <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />}
      {!src || failed ? <Megaphone className="absolute inset-0 m-auto h-4 w-4 text-white/40" /> : null}
      {isVideo && (
        <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/50">
          <Play className="h-2 w-2 fill-white text-white" />
        </span>
      )}
    </div>
  );
};

const RowMenu = ({ row, onView, onStatus, onDelete }) => {
  const [open, setOpen] = useState(false);
  const item = (Icon, label, onClick, danger = false) => (
    <button onClick={(e) => { e.stopPropagation(); setOpen(false); onClick(); }} className={clsx('flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors', danger ? 'text-red-600 hover:bg-red-50' : 'text-neutral-700 hover:bg-neutral-50')}>
      <Icon className={clsx('h-3.5 w-3.5', !danger && 'text-neutral-400')} /> {label}
    </button>
  );
  return (
    <div className="relative flex justify-center">
      <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-label="Row actions" className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {item(Eye, 'View details', onView)}
            {row.status !== 'active' && item(CheckCircle2, 'Approve', () => onStatus('active'))}
            {row.status === 'active' && item(PauseCircle, 'Pause', () => onStatus('paused'))}
            {item(Trash2, 'Delete', onDelete, true)}
          </div>
        </>
      )}
    </div>
  );
};

const thumbOf = (media) => {
  if (!media) return '';
  const t = media.thumbnails || media.thumbnail;
  const first = Array.isArray(t) ? t[0] : t;
  if (first?.fileUrl) return first.fileUrl;
  const isVideo = String(media.media_type || media.type || '').toLowerCase().includes('video');
  return isVideo ? '' : (media.fileUrl || '');
};

const Ads = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, status, error, categories } = useSelector((state) => state.ads);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState('');

  const refresh = () => { dispatch(fetchAdsAdmin({ limit: 100 })); };
  useEffect(() => { dispatch(fetchAdCategories()); dispatch(fetchAdsAdmin({ limit: 100 })); }, [dispatch]);

  const rows = useMemo(() => (items || []).map((ad) => {
    const id = String(ad._id || ad.ad_id || ad.id || '');
    const productTitle = Array.isArray(ad.product_offer) && ad.product_offer[0]?.title ? ad.product_offer[0].title : null;
    const categoryRaw = ad.category || ad.targeting_rules?.category_label || '';
    const media = Array.isArray(ad.media) ? ad.media[0] : null;
    const budget = Number(ad.total_budget_coins ?? ad.budget?.total_budget_coins ?? 0) || 0;
    const spent = Number(ad.total_coins_spent ?? 0) || 0;
    const views = Number(ad.views_count ?? 0) || 0;
    const clicks = Number(ad.clicks_count ?? 0) || 0;
    return {
      id,
      code: `#SPT-${id.slice(-5).toUpperCase()}`,
      title: ad.title || ad.headline || ad.caption || productTitle || 'Untitled spotlight',
      vendor: ad.vendor_id?.business_name || ad.user_id?.full_name || ad.user_id?.username || 'Unknown vendor',
      vendorId: String(ad.vendor_id?._id || ad.vendor_id || ''),
      category: (typeof categoryRaw === 'string' ? categoryRaw : categoryRaw?.label || categoryRaw?.name) || 'General',
      thumb: thumbOf(media),
      isVideo: String(media?.media_type || media?.type || '').toLowerCase().includes('video'),
      budget,
      spent,
      spentPct: budget > 0 ? Math.min(100, (spent / budget) * 100) : 0,
      views,
      uniqueViews: Number(ad.unique_views_count ?? 0) || 0,
      likes: Number(ad.likes_count ?? 0) || 0,
      clicks,
      ctr: views > 0 ? (clicks / views) * 100 : null,
      status: String(ad.status || 'pending').toLowerCase(),
      createdAt: ad.createdAt || ad.created_at,
    };
  }), [items]);

  const categoryOptions = useMemo(() => {
    const fromApi = (categories || []).map((c) => c?.label || c?.name || c?.value || '').filter(Boolean);
    const fromRows = rows.map((r) => r.category);
    const names = [...new Set([...fromApi, ...fromRows])].sort((a, b) => a.localeCompare(b));
    return [{ value: 'all', label: 'All Categories' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [categories, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (q && ![r.id, r.code, r.title, r.vendor, r.category].some((v) => String(v).toLowerCase().includes(q))) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && r.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
        if (budgetFilter !== 'all' && budgetBucket(r.budget) !== budgetFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rows, search, statusFilter, categoryFilter, budgetFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, budgetFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtersActive = search || statusFilter !== 'all' || categoryFilter !== 'all' || budgetFilter !== 'all';

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === 'pending');
    const waits = pending.map((r) => (Date.now() - new Date(r.createdAt).getTime()) / 3600000).filter((h) => h >= 0).sort((a, b) => a - b);
    const median = waits.length ? waits[Math.floor(waits.length / 2)] : null;
    const views = rows.reduce((s, r) => s + r.views, 0);
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const active = rows.filter((r) => r.status === 'active').length;
    return {
      total: rows.length,
      growth: growthOf(rows, (r) => r.createdAt),
      vendors: new Set(rows.map((r) => r.vendorId || r.vendor)).size,
      active,
      activeShare: rows.length ? (active / rows.length) * 100 : 0,
      pending: pending.length,
      medianWait: median,
      views,
      uniqueViews: rows.reduce((s, r) => s + r.uniqueViews, 0),
      ctr: views ? (clicks / views) * 100 : null,
    };
  }, [rows]);

  const waitLabel = (hours) => (hours === null ? '—' : hours < 1 ? `${Math.round(hours * 60)} min` : hours < 48 ? `${hours.toFixed(1)} hours` : `${Math.round(hours / 24)} days`);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const changeStatus = (row, next) => {
    dispatch(patchAdStatus({ id: row.id, status: next })).unwrap()
      .then(() => showToast(next === 'active' ? 'Spotlight approved' : 'Spotlight paused'))
      .catch((msg) => showToast(msg || 'Failed to update status'));
  };

  const handleExport = () => {
    downloadCsv(`spotlights-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Code', 'ID', 'Title', 'Vendor', 'Category', 'Status', 'Budget coins', 'Coins spent', 'Views', 'Clicks', 'CTR %', 'Created'],
      ...filtered.map((r) => [r.code, r.id, r.title, r.vendor, r.category, r.status, r.budget, r.spent, r.views, r.clicks, r.ctr === null ? '' : r.ctr.toFixed(2), r.createdAt]),
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
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E8194E]" />
                <span className="text-[#C81345]">Spotlights</span>
                <span className="text-neutral-500">/ Campaign Engine</span>
              </p>
              <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight text-neutral-900">Spotlights</h1>
              <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">
                Manage platform video ads, inspect pending submissions, review performance metrics, and approve vendor ad campaigns.
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={handleExport}
                disabled={!filtered.length}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E9EBFA] px-4 text-[13.5px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-[#DFE2F7] hover:shadow-[0_8px_18px_-10px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <Download className="h-4 w-4" /> Export Data
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_26px_-8px_rgba(232,25,78,0.7)]"
              >
                <BadgeCheck className="h-4 w-4" /> Audit Queue
                <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-bold">{stats.pending}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Spotlights"
            value={formatNumber(stats.total)}
            icon={Megaphone}
            iconTone="bg-pink-100 text-[#C81345]"
            badge={<Delta value={stats.growth} title="vs previous 30 days" />}
            note={`Across ${formatNumber(stats.vendors)} vendors`}
            hoverTone="hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.45)]"
          />
          <StatCard
            label="Active"
            value={formatNumber(stats.active)}
            icon={CheckCircle2}
            iconTone="bg-indigo-50 text-[#8E35B5]"
            badge={stats.total ? <span className="rounded-full bg-[#E9EBFA] px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700">{Math.round(stats.activeShare)}% live</span> : null}
            note="Streaming on user feeds"
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
          />
          <StatCard
            label="Pending Review"
            value={formatNumber(stats.pending)}
            valueClass="text-[#C81345]"
            icon={Hourglass}
            iconTone="bg-rose-100 text-rose-600"
            badge={stats.pending ? <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-700">Needs action</span> : null}
            note={stats.pending ? `Median wait: ${waitLabel(stats.medianWait)}` : 'Queue is clear'}
            hoverTone="hover:border-rose-200 hover:shadow-[0_14px_30px_-14px_rgba(225,29,72,0.45)]"
          />
          <StatCard
            label="Total Views"
            value={formatCompactNumber(stats.views)}
            icon={Eye}
            iconTone="bg-purple-100 text-[#8E35B5]"
            badge={stats.ctr !== null ? <span className="rounded-full bg-[#E9EBFA] px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700">{stats.ctr.toFixed(1)}% CTR</span> : null}
            note={`${formatCompactNumber(stats.uniqueViews)} unique reach`}
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
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
                  placeholder="Search by ID, title, vendor or category..."
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-[13px] text-neutral-800 placeholder-neutral-400 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <Select value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
              <Select value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} />
              <Select label="Budget" value={budgetFilter} options={BUDGET_OPTIONS} onChange={setBudgetFilter} />
              <button type="button" onClick={refresh} title="Refresh" aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition hover:border-neutral-300 hover:shadow-sm">
                <RotateCw className={clsx('h-4 w-4', status === 'loading' && 'animate-spin')} />
              </button>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <p className="text-neutral-600">
                Showing <span className="font-bold text-neutral-900">{visible.length}</span> of <span className="font-bold text-neutral-900">{formatNumber(filtered.length)}</span> spotlight ads
                {stats.pending > 0 && <> <span className="text-neutral-300">•</span> <span className="font-bold text-[#C81345]">{stats.pending} pending moderation</span></>}
              </p>
              {filtersActive && (
                <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setBudgetFilter('all'); }} className="text-[11px] font-bold uppercase tracking-wide text-[#C81345] hover:underline">
                  Reset filters
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-y border-neutral-100">
                  {['Spotlight', 'Category', 'Budget / Coins', 'Views & Engagement', 'Status', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>
                  ))}
                  <th className="w-14 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading spotlights…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><Search className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{error ? `Error: ${error}` : 'No spotlights match these filters'}</p></td></tr>
                ) : visible.map((row) => {
                  const meta = STATUS_META[row.status] || STATUS_META.draft;
                  const d = new Date(row.createdAt);
                  return (
                    <tr key={row.id} onClick={() => navigate(`/ads/${row.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', row.status === 'pending' && 'bg-pink-50/30')}>
                      <td className={clsx('border-l-2 px-4 py-3 transition-colors group-hover:border-[#E8194E]', row.status === 'pending' ? 'border-pink-300' : 'border-transparent')}>
                        <div className="flex items-center gap-3">
                          <Thumb src={row.thumb} isVideo={row.isVideo} />
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate text-[13.5px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">{row.title}</p>
                            <p className="max-w-[240px] truncate text-[11.5px] text-neutral-500">By {row.vendor}</p>
                            <p className="mt-0.5 text-[10.5px] font-bold text-[#C81345]">{row.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex max-w-[140px] rounded-full bg-[#E9EBFA] px-2.5 py-1 text-[11px] font-semibold leading-tight text-neutral-700">{row.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-baseline gap-2">
                          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-neutral-900"><Coins className="h-3.5 w-3.5 text-amber-500" />{formatNumber(row.budget)}</span>
                          <span className="text-[10.5px] font-semibold text-neutral-500">{Math.round(row.spentPct)}% spent</span>
                        </div>
                        <div className="mt-1.5 h-1 w-32 overflow-hidden rounded-full bg-[#EEF0FA]">
                          <div className={clsx('h-full rounded-full', row.spentPct >= 100 ? 'bg-rose-500' : 'bg-gradient-to-r from-[#E8194E] to-[#8E35B5]')} style={{ width: `${Math.max(2, row.spentPct)}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.views > 0 ? (
                          <>
                            <p className="text-[13px] font-bold text-neutral-900">{formatNumber(row.views)}</p>
                            <p className={clsx('text-[11px] font-semibold', row.ctr >= 4 ? 'text-[#8E35B5]' : 'text-neutral-500')}>
                              {row.ctr === null ? '—' : `${row.ctr.toFixed(1)}% CTR`} · {formatCompactNumber(row.likes)} likes
                            </p>
                          </>
                        ) : (
                          <p className="inline-flex items-center gap-1 text-[11.5px] italic text-neutral-400">
                            <Clock className="h-3 w-3" /> {row.status === 'pending' ? 'Awaiting review' : 'Awaiting launch'}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', meta.cls)}>
                          <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap text-[12px] font-semibold text-neutral-800">{Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <RowMenu row={row} onView={() => navigate(`/ads/${row.id}`)} onStatus={(next) => changeStatus(row, next)} onDelete={() => setConfirm(row)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-neutral-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of <span className="font-semibold text-neutral-800">{formatNumber(filtered.length)}</span>
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
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { if (!confirm?.id) return; dispatch(deleteAdById(confirm.id)).finally(() => setConfirm(null)); }}
        title="Delete Spotlight"
        description={`Are you sure you want to delete "${confirm?.title || 'this spotlight'}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Ads;
