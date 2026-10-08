import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  ChevronDown,
  Download,
  Eye,
  Heart,
  IndianRupee,
  Layers,
  ListFilter,
  MessageSquare,
  MessageSquareOff,
  MoreHorizontal,
  Package,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
  EyeOff,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/Modal.jsx';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatCompactNumber, formatNumber } from '../utils/helpers.jsx';
import { downloadCsv, getThumbnailUrl, growthOf, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const PAGE_SIZE = 10;
const LIST_LIMIT = 50; // the promote-reels list caps each request at 50
const MAX_LIST_PAGES = 10;

const PRODUCT_OPTIONS = [
  { value: 'all', label: 'All Campaigns' },
  { value: 'with', label: 'With products' },
  { value: 'without', label: 'No products' },
  { value: 'discounted', label: 'Discounted items' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'views', label: 'Most viewed' },
  { value: 'likes', label: 'Most liked' },
  { value: 'value', label: 'Highest catalog value' },
];

const inr = (value) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
const finalPrice = (p) => Math.max(0, (Number(p?.product_price) || 0) - (Number(p?.discount_amount) || 0));

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
          <div className="absolute right-0 top-11 z-20 min-w-full overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
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

const StatCard = ({ label, value, icon: Icon, iconTone, pill, pillTone, note, hoverTone }) => (
  <div className={clsx('group rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1', hoverTone)}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <span className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <p className="mt-1 font-display text-[26px] font-extrabold leading-none tracking-tight text-neutral-900">{value}</p>
    <div className="mt-3 flex items-center gap-2 text-[11px]">
      {pill && <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold', pillTone)}>{pill}</span>}
      {note && <span className="truncate text-neutral-500">{note}</span>}
    </div>
  </div>
);

const growthPill = (value) => {
  if (value === null || !Number.isFinite(value)) return null;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return <><Icon className="h-3 w-3" />{value >= 0 ? '+' : ''}{value.toFixed(1)}%</>;
};

const ReelThumb = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-[72px] w-11 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
      {src && !failed && <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/40 transition group-hover:bg-[#E8194E]/80">
          <Play className="h-2.5 w-2.5 fill-white text-white" />
        </span>
      </span>
    </div>
  );
};

const ProductStack = ({ products }) => {
  if (!products.length) return <span className="text-[12px] italic text-neutral-400">None</span>;
  const images = products.map((p) => toAbsoluteMediaUrl(p?.promote_img || '')).slice(0, 3);
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {images.map((src, i) => (
          <span key={i} className="h-7 w-7 overflow-hidden rounded-md bg-neutral-100 ring-2 ring-white">
            {src ? <img src={src} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <Package className="m-1.5 h-4 w-4 text-neutral-300" />}
          </span>
        ))}
      </div>
      <p className="text-[12px] font-semibold leading-tight text-[#8E35B5]">{products.length}<br /><span className="font-medium text-neutral-500">{products.length === 1 ? 'Product' : 'Products'}</span></p>
    </div>
  );
};

const Avatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />;
  return <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-white">{String(name || '?')[0]?.toUpperCase()}</span>;
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

const Prompts = () => {
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const [items, setItems] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError('');
    try {
      const all = [];
      let full = false;
      for (let p = 1; p <= MAX_LIST_PAGES; p += 1) {
        const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels?page=${p}&limit=${LIST_LIMIT}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Failed to load campaigns');
        const batch = Array.isArray(data?.data) ? data.data : [];
        all.push(...batch);
        full = batch.length === LIST_LIMIT;
        if (!full) break;
      }
      setItems(all);
      setTruncated(full);
      setStatus('succeeded');
    } catch (e) {
      setError(e.message || 'Failed to load campaigns');
      setStatus('failed');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => items.map((item) => {
    const id = String(item.promote_reel_id || item._id || '');
    const user = item.user_id && typeof item.user_id === 'object' ? item.user_id : {};
    const products = Array.isArray(item.products) ? item.products : [];
    const media = Array.isArray(item.media) ? item.media[0] : null;
    const listValue = products.reduce((s, p) => s + (Number(p?.product_price) || 0), 0);
    const value = products.reduce((s, p) => s + finalPrice(p), 0);
    return {
      id,
      code: `#CMP-${String(item._id || id).slice(-5).toUpperCase()}`,
      caption: item.caption || '',
      thumb: getThumbnailUrl(media),
      owner: user.full_name || user.username || 'Unknown',
      handle: user.username || '',
      ownerId: user._id || '',
      avatar: user.avatar_url ? toAbsoluteMediaUrl(user.avatar_url) : '',
      products,
      value,
      avgOff: listValue > 0 ? ((listValue - value) / listValue) * 100 : 0,
      likes: Number(item.likes_count) || 0,
      comments: Number(item.comments_count) || 0,
      views: Number(item.views_count) || 0,
      uniqueViews: Number(item.unique_views_count) || 0,
      likesHidden: !!item.hide_likes_count,
      commentsOff: !!item.turn_off_commenting,
      createdAt: item.createdAt || item.created_at,
    };
  }), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q && ![r.id, r.code, r.caption, r.owner, r.handle, ...r.products.map((p) => p?.product_name)].some((v) => String(v || '').toLowerCase().includes(q))) return false;
      if (productFilter === 'with' && !r.products.length) return false;
      if (productFilter === 'without' && r.products.length) return false;
      if (productFilter === 'discounted' && !r.products.some((p) => Number(p?.discount_amount) > 0)) return false;
      return true;
    });
    const by = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      views: (a, b) => b.views - a.views,
      likes: (a, b) => b.likes - a.likes,
      value: (a, b) => b.value - a.value,
    };
    return list.sort(by[sort]);
  }, [rows, search, productFilter, sort]);

  useEffect(() => { setPage(1); }, [search, productFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const productCount = rows.reduce((s, r) => s + r.products.length, 0);
    const shoppable = rows.filter((r) => r.products.length).length;
    return {
      total: rows.length,
      growth: growthOf(rows, (r) => r.createdAt),
      views: rows.reduce((s, r) => s + r.views, 0),
      uniqueViews: rows.reduce((s, r) => s + r.uniqueViews, 0),
      viewsGrowth: growthOf(rows, (r) => r.createdAt, (r) => r.views),
      products: productCount,
      shoppable,
      perCampaign: shoppable ? productCount / shoppable : 0,
      value: rows.reduce((s, r) => s + r.value, 0),
      stores: new Set(rows.filter((r) => r.products.length).map((r) => r.handle || r.owner)).size,
    };
  }, [rows]);

  const handleDelete = async () => {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete');
      setItems((prev) => prev.filter((item) => String(item.promote_reel_id || item._id) !== confirmDelete.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const handleExport = () => {
    downloadCsv(`campaigns-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Code', 'ID', 'Caption', 'Owner', 'Username', 'Products', 'Catalog value (INR)', 'Views', 'Likes', 'Comments', 'Created'],
      ...filtered.map((r) => [r.code, r.id, r.caption, r.owner, r.handle, r.products.map((p) => p?.product_name).join(' | '), Math.round(r.value), r.views, r.likes, r.comments, r.createdAt]),
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
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest text-[#C81345]">
                <ListFilter className="h-3.5 w-3.5" /> Campaigns
              </p>
              <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight text-neutral-900">Campaigns</h1>
              <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">
                Monitor promoted shoppable reels, tagged products and creator campaign performance.
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
                onClick={() => navigate('/reports/content')}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_26px_-8px_rgba(232,25,78,0.7)]"
              >
                <ShieldCheck className="h-4 w-4" /> Review Reports
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Campaigns"
            value={formatNumber(stats.total)}
            icon={ListFilter}
            iconTone="bg-pink-100 text-[#C81345]"
            pill={growthPill(stats.growth)}
            pillTone="bg-emerald-50 text-emerald-700"
            note="vs previous 30 days"
            hoverTone="hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.45)]"
          />
          <StatCard
            label="Total Reach"
            value={formatCompactNumber(stats.views)}
            icon={Eye}
            iconTone="bg-indigo-50 text-neutral-800"
            pill={growthPill(stats.viewsGrowth)}
            pillTone="bg-emerald-50 text-emerald-700"
            note={`${formatCompactNumber(stats.uniqueViews)} unique viewers`}
            hoverTone="hover:border-indigo-200 hover:shadow-[0_14px_30px_-14px_rgba(99,102,241,0.4)]"
          />
          <StatCard
            label="Tagged Products"
            value={formatCompactNumber(stats.products)}
            icon={ShoppingBag}
            iconTone="bg-purple-100 text-[#8E35B5]"
            pill={stats.shoppable ? <>{stats.perCampaign.toFixed(1)} avg</> : null}
            pillTone="bg-purple-100 text-[#8E35B5]"
            note={`in ${formatNumber(stats.shoppable)} shoppable campaigns`}
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
          />
          <StatCard
            label="Tagged Catalog Value"
            value={inr(stats.value)}
            icon={IndianRupee}
            iconTone="bg-indigo-50 text-neutral-800"
            pill={stats.stores ? <>{formatNumber(stats.stores)} stores</> : null}
            pillTone="bg-[#E9EBFA] text-neutral-700"
            note="at current sale prices"
            hoverTone="hover:border-neutral-300 hover:shadow-[0_14px_30px_-14px_rgba(17,24,39,0.35)]"
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
                placeholder="Search by ID, caption, owner or product..."
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-[13px] text-neutral-800 placeholder-neutral-400 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <LabeledSelect label="Catalog" value={productFilter} options={PRODUCT_OPTIONS} onChange={setProductFilter} />
            <LabeledSelect label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  {['Campaigns', 'Owner', 'Tagged Products', 'Engagement', 'Catalog', 'Status', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>
                  ))}
                  <th className="w-14 px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading campaigns…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><Search className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{error ? `Error: ${error}` : 'No campaigns match these filters'}</p></td></tr>
                ) : visible.map((row) => {
                  const d = new Date(row.createdAt);
                  const valid = !Number.isNaN(d.getTime());
                  return (
                    <tr key={row.id} onClick={() => navigate(`/promote/${row.id}`)} className="group cursor-pointer transition-colors hover:bg-[#FDF2F6]">
                      <td className="border-l-2 border-transparent px-4 py-3 transition-colors group-hover:border-[#E8194E]">
                        <div className="flex items-center gap-3">
                          <ReelThumb src={row.thumb} />
                          <div className="min-w-0">
                            <p className="line-clamp-2 max-w-[200px] text-[13px] font-bold leading-snug text-neutral-900 transition-colors group-hover:text-[#C81345]">
                              {row.caption || 'Untitled campaign'}
                            </p>
                            <p className="mt-1 text-[10.5px] font-bold text-[#C81345]">{row.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={row.avatar} name={row.owner} />
                          <div className="min-w-0">
                            <p className="max-w-[130px] truncate text-[13px] font-semibold text-neutral-900">{row.owner}</p>
                            {row.handle && <p className="max-w-[130px] truncate text-[11px] text-neutral-500">@{row.handle}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><ProductStack products={row.products} /></td>
                      <td className="px-4 py-3">
                        <p className="inline-flex items-center gap-1 text-[13px] font-bold text-[#C81345]">
                          <Heart className="h-3.5 w-3.5 fill-[#E8194E] text-[#E8194E]" />{formatCompactNumber(row.likes)} likes
                        </p>
                        <p className="mt-0.5 flex items-center gap-2.5 text-[11px] text-neutral-500">
                          <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{formatCompactNumber(row.comments)}</span>
                          <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{formatCompactNumber(row.views)} views</span>
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {row.products.length ? (
                          <>
                            <p className="text-[13px] font-bold text-neutral-900">{inr(row.value)}</p>
                            <p className={clsx('text-[11px] font-semibold', row.avgOff > 0 ? 'text-emerald-600' : 'text-neutral-400')}>
                              {row.avgOff > 0 ? `${Math.round(row.avgOff)}% avg off` : 'No discount'}
                            </p>
                          </>
                        ) : <span className="text-[12px] text-neutral-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                        </span>
                        {(row.commentsOff || row.likesHidden) && (
                          <div className="mt-1 flex flex-col gap-0.5 text-[10.5px] text-neutral-500">
                            {row.commentsOff && <span className="inline-flex items-center gap-1"><MessageSquareOff className="h-3 w-3" /> Comments off</span>}
                            {row.likesHidden && <span className="inline-flex items-center gap-1"><EyeOff className="h-3 w-3" /> Likes hidden</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap text-[12px] font-semibold text-neutral-800">{valid ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</p>
                        <p className="text-[11px] text-neutral-500">{valid ? d.getFullYear() : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <RowMenu onView={() => navigate(`/promote/${row.id}`)} onDelete={() => setConfirmDelete(row)} />
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
                <span className="font-semibold text-neutral-800">{formatNumber(filtered.length)}</span> campaigns
                {truncated && <span className="text-neutral-400">(latest {formatNumber(items.length)} loaded)</span>}
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

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        description={`Are you sure you want to delete ${confirmDelete?.code || 'this campaign'}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </>
  );
};

export default Prompts;
