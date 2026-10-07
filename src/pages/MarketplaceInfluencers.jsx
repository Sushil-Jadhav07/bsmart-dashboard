import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  BadgeCheck, ChevronDown, Download, Eye, IndianRupee, MoreVertical, Package, Plus, Receipt, RotateCw, Search,
  ShieldCheck, ShieldOff, ShoppingCart, Store, TrendingDown, TrendingUp, UserPlus, Users, Wrench, X,
} from 'lucide-react';
import { SuspendInfluencerModal } from '../components/MarketplaceShared.jsx';
import useInfluencerSuspension from '../hooks/useInfluencerSuspension.js';
import { fetchAdminOrders, fetchAdminProducts, fetchAdminServices, fetchInfluencers, setInfluencerSuspension } from '../store/marketplaceSlice.js';
import { fetchUsers } from '../store/usersSlice.js';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatCompactNumber, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const PAGE_SIZE = 8;
const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '');
const inrCompact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};
const startOfMonth = (offset = 0) => { const d = new Date(); d.setMonth(d.getMonth() + offset, 1); d.setHours(0, 0, 0, 0); return d.getTime(); };
const isRevenueOrder = (o) => o.payment_status === 'paid' && o.order_status !== 'cancelled';

const SORTS = [
  { value: 'gmv', label: 'Highest GMV (month)' },
  { value: 'lifetime', label: 'Highest GMV (all-time)' },
  { value: 'products', label: 'Most products' },
  { value: 'followers', label: 'Most followers' },
  { value: 'newest', label: 'Newest' },
];

const Select = ({ value, options, onChange, prefix }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 min-w-[130px] items-center justify-between gap-2 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] px-3 text-[12.5px] text-neutral-600 transition hover:border-[#C9CFEC] hover:bg-[#E9EBFA]">
        <span>{prefix && `${prefix}: `}<b className="text-neutral-900">{selected?.label}</b></span>
        <ChevronDown className={clsx('h-3.5 w-3.5 text-neutral-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 max-h-72 min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((o) => <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={clsx('block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition', o.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50')}>{o.label}</button>)}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, iconTone, foot, hoverTone, children }) => (
  <div className={clsx('group rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1', hoverTone)}>
    <div className="flex items-start justify-between gap-2">
      <p className="pt-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}><Icon className="h-[18px] w-[18px]" /></span>
    </div>
    <p className="mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight text-neutral-900">{value}</p>
    {children}
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-neutral-500">{foot}</div>
  </div>
);

const Delta = ({ value }) => {
  if (value === null || !Number.isFinite(value)) return null;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return <span className={clsx('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold', value >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}><Icon className="h-3 w-3" />{value >= 0 ? '+' : ''}{value.toFixed(1)}%</span>;
};

const Avatar = ({ src, name, suspended }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-10 w-10 flex-shrink-0">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-10 w-10 rounded-full object-cover" />
        : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-[12px] font-bold text-white">{String(name || '?')[0]?.toUpperCase()}</span>}
      <span className={clsx('absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white', suspended ? 'bg-rose-500' : 'bg-[#E8194E]')}>
        <Store className="h-2.5 w-2.5 text-white" />
      </span>
    </div>
  );
};

const RowMenu = ({ row, navigate, onSuspend }) => {
  const [open, setOpen] = useState(false);
  const go = (path) => (e) => { e.stopPropagation(); setOpen(false); navigate(path); };
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50';
  return (
    <div className="relative flex justify-center">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-label={`Actions for ${row.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-[#EEF0FA] hover:text-neutral-900"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={go(`/users/${row.id}`)} className={item}><Eye className="h-3.5 w-3.5 text-neutral-400" /> View profile</button>
            <button type="button" onClick={go(`/marketplace/influencers/${row.id}/products`)} className={item}><Package className="h-3.5 w-3.5 text-neutral-400" /> View products</button>
            <button type="button" onClick={go(`/marketplace/services?seller=${row.id}`)} className={item}><Wrench className="h-3.5 w-3.5 text-neutral-400" /> View services</button>
            <button type="button" onClick={go(`/marketplace/orders?seller=${row.id}`)} className={item}><ShoppingCart className="h-3.5 w-3.5 text-neutral-400" /> View orders</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onSuspend(); }} className={clsx(item, row.suspended ? 'text-emerald-700' : 'text-red-600 hover:bg-red-50')}>
              {row.suspended ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}{row.suspended ? 'Restore selling' : 'Suspend selling'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Converts an existing member into an influencer (PATCH /users/:id/role).
const OnboardModal = ({ open, onClose, onDone }) => {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const { items: users, status: usersStatus } = useSelector((s) => s.users);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [form, setForm] = useState({ store_name: '', business_type: '', store_description: '', products_type: '', service_type: '', trust_badges: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open && usersStatus === 'idle') dispatch(fetchUsers()); }, [open, usersStatus, dispatch]);
  useEffect(() => { if (open) { setQuery(''); setPicked(null); setError(''); setForm({ store_name: '', business_type: '', store_description: '', products_type: '', service_type: '', trust_badges: '' }); } }, [open]);

  const members = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q) return [];
    return (users || []).map((u) => u?.user || u).filter((u) => String(u.role || 'member') === 'member' && [u.full_name, u.username, u.email].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 6);
  }, [users, query]);

  if (!open) return null;
  const list = (v) => v.split(',').map((s) => s.trim()).filter(Boolean);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!picked) { setError('Choose the member to onboard.'); return; }
    if (!list(form.products_type).length || !list(form.service_type).length) { setError('Add at least one product type and one service type.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/users/${picked._id}/role`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          role: 'influencer',
          store_name: form.store_name.trim(),
          business_type: form.business_type.trim(),
          store_description: form.store_description.trim(),
          products_type: list(form.products_type),
          service_type: list(form.service_type),
          ...(list(form.trust_badges).length ? { trust_badges: list(form.trust_badges) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Onboarding failed');
      onDone(form.store_name || picked.full_name || picked.username);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-neutral-700';
  const field = 'h-10 w-full rounded-lg border border-transparent bg-[#F1F3FC] px-3 text-[13.5px] text-neutral-900 outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-[#E8194E] to-[#8E35B5]" />
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[19px] font-bold text-neutral-900"><UserPlus className="h-5 w-5 text-[#C81345]" /> Onboard Influencer</h2>
            <p className="text-[12.5px] text-neutral-500">Turn an existing member into an influencer with their own storefront.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-5">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">{error}</div>}
          <div className="relative">
            <label className={label}>Member account <span className="text-rose-500">*</span></label>
            {picked ? (
              <div className="flex items-center justify-between rounded-lg bg-[#F1F3FC] px-3 py-2">
                <div className="min-w-0"><p className="truncate text-[13px] font-bold text-neutral-900">{picked.full_name || picked.username}</p><p className="truncate text-[11.5px] text-neutral-500">@{picked.username} · {picked.email}</p></div>
                <button type="button" onClick={() => setPicked(null)} className="text-[11.5px] font-bold text-[#C81345]">Change</button>
              </div>
            ) : (
              <>
                <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={usersStatus === 'loading' ? 'Loading members…' : 'Search member by name, @username or email'} className={clsx(field, 'pl-9')} /></div>
                {members.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                    {members.map((u) => <button key={u._id} type="button" onClick={() => { setPicked(u); setForm((f) => ({ ...f, store_name: f.store_name || `${u.full_name || u.username}'s Store` })); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-neutral-50"><span className="truncate font-semibold text-neutral-900">{u.full_name || u.username}<span className="ml-1.5 font-normal text-neutral-500">@{u.username}</span></span></button>)}
                  </div>
                )}
                {query && !members.length && usersStatus !== 'loading' && <p className="mt-1 text-[11.5px] text-neutral-500">No matching members. Only member accounts can be onboarded.</p>}
              </>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={label}>Store name <span className="text-rose-500">*</span></label><input required value={form.store_name} onChange={set('store_name')} placeholder="Priya's Closet" className={field} /></div>
            <div><label className={label}>Category / business type <span className="text-rose-500">*</span></label><input required value={form.business_type} onChange={set('business_type')} placeholder="Fashion & Apparel" className={field} /></div>
          </div>
          <div><label className={label}>Store description <span className="text-rose-500">*</span></label><textarea required value={form.store_description} onChange={set('store_description')} rows={2} placeholder="What this storefront sells" className="w-full resize-none rounded-lg border border-transparent bg-[#F1F3FC] px-3 py-2 text-[13px] outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10" /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={label}>Product types <span className="text-rose-500">*</span></label><input value={form.products_type} onChange={set('products_type')} placeholder="Dresses, Jewellery" className={field} /><p className="mt-1 text-[10.5px] text-neutral-500">Comma separated</p></div>
            <div><label className={label}>Service types <span className="text-rose-500">*</span></label><input value={form.service_type} onChange={set('service_type')} placeholder="Styling sessions" className={field} /><p className="mt-1 text-[10.5px] text-neutral-500">Comma separated</p></div>
          </div>
          <div><label className={label}>Trust badges</label><input value={form.trust_badges} onChange={set('trust_badges')} placeholder="Verified Seller, Top Rated" className={field} /><p className="mt-1 text-[10.5px] text-neutral-500">Optional, comma separated. Shown on the storefront.</p></div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-neutral-100 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-800 hover:bg-neutral-50">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:opacity-60"><Plus className="h-4 w-4" />{busy ? 'Onboarding…' : 'Onboard Influencer'}</button>
        </div>
      </form>
    </div>
  );
};

const MarketplaceInfluencers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { influencers, products, services, orders } = useSelector((s) => s.marketplace);
  const suspension = useInfluencerSuspension();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('gmv');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [batch, setBatch] = useState(null); // 'suspend' | 'restore'
  const [batchReason, setBatchReason] = useState('');
  const [batchBusy, setBatchBusy] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const loadAll = () => {
    dispatch(fetchInfluencers());
    dispatch(fetchAdminProducts({}));
    dispatch(fetchAdminServices({}));
    dispatch(fetchAdminOrders({}));
  };
  useEffect(loadAll, [dispatch]);

  const stats = useMemo(() => {
    const thisMonth = startOfMonth(0);
    const lastMonth = startOfMonth(-1);
    const bySeller = new Map();
    const bump = (id, key, amount) => {
      const entry = bySeller.get(id) || { lifetime: 0, month: 0, prevMonth: 0, orders: new Set() };
      entry[key] += amount;
      bySeller.set(id, entry);
      return entry;
    };
    let gmvAll = 0; let gmvMonth = 0; let gmvPrev = 0; let paidOrders = 0;
    (orders.items || []).filter(isRevenueOrder).forEach((o) => {
      paidOrders += 1;
      const t = new Date(o.placed_at || o.createdAt).getTime();
      (o.items || []).forEach((it) => {
        const sid = idOf(it.seller_id);
        const amount = Number(it.subtotal) || 0;
        gmvAll += amount;
        const entry = bump(sid, 'lifetime', amount);
        entry.orders.add(String(o._id));
        if (t >= thisMonth) { gmvMonth += amount; bump(sid, 'month', amount); } else if (t >= lastMonth) { gmvPrev += amount; bump(sid, 'prevMonth', amount); }
      });
    });
    const productsBySeller = new Map();
    (products.items || []).forEach((p) => {
      const sid = idOf(p.user_id);
      const entry = productsBySeller.get(sid) || { total: 0, active: 0 };
      entry.total += 1; if (p.status === 'active') entry.active += 1;
      productsBySeller.set(sid, entry);
    });
    const servicesBySeller = new Map();
    (services.items || []).forEach((s) => { const sid = idOf(s.user_id); servicesBySeller.set(sid, (servicesBySeller.get(sid) || 0) + 1); });
    return { bySeller, productsBySeller, servicesBySeller, gmvAll, gmvMonth, gmvPrev, paidOrders };
  }, [orders.items, products.items, services.items]);

  const rows = useMemo(() => (influencers.items || []).map((u) => {
    const id = String(u._id);
    const p = u.influencer_profile || {};
    const sales = stats.bySeller.get(id) || { lifetime: 0, month: 0, prevMonth: 0, orders: new Set() };
    const prod = stats.productsBySeller.get(id) || { total: 0, active: 0 };
    const suspended = !!p.is_suspended;
    const listings = prod.total + (stats.servicesBySeller.get(id) || 0);
    return {
      id,
      name: u.full_name || u.username || 'Influencer',
      username: u.username || '',
      store: p.store_name || '',
      avatar: u.avatar_url ? toAbsoluteMediaUrl(u.avatar_url) : '',
      category: p.business_type || '',
      badges: Array.isArray(p.trust_badges) ? p.trust_badges : [],
      products: prod.total,
      activeProducts: prod.active,
      services: stats.servicesBySeller.get(id) || 0,
      gmvMonth: sales.month,
      gmvPrev: sales.prevMonth,
      gmvLifetime: sales.lifetime,
      orders: sales.orders.size,
      followers: Number(u.followers_count) || 0,
      suspended,
      suspensionReason: p.suspension_reason || '',
      accountActive: u.is_active !== false,
      status: suspended ? 'suspended' : listings === 0 || !p.store_name ? 'setup' : 'active',
      createdAt: u.createdAt,
    };
  }), [influencers.items, stats]);

  const topEarnerIds = useMemo(() => new Set([...rows].filter((r) => r.gmvLifetime > 0).sort((a, b) => b.gmvLifetime - a.gmvLifetime).slice(0, Math.max(1, Math.ceil(rows.length * 0.1))).map((r) => r.id)), [rows]);
  const tabs = [
    { key: 'all', label: 'All', count: rows.length },
    { key: 'badged', label: 'Trust-badged', count: rows.filter((r) => r.badges.length).length },
    { key: 'top', label: 'Top GMV earners', count: topEarnerIds.size },
    { key: 'setup', label: 'Needs setup', count: rows.filter((r) => r.status === 'setup').length },
    { key: 'suspended', label: 'Suspended', count: rows.filter((r) => r.suspended).length },
  ];

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, '');
    const list = rows.filter((r) => {
      if (tab === 'badged' && !r.badges.length) return false;
      if (tab === 'top' && !topEarnerIds.has(r.id)) return false;
      if (tab === 'setup' && r.status !== 'setup') return false;
      if (tab === 'suspended' && !r.suspended) return false;
      if (q && ![r.name, r.username, r.store, r.category, r.id].some((v) => String(v).toLowerCase().includes(q))) return false;
      if (category !== 'all' && r.category !== category) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
    const by = {
      gmv: (a, b) => b.gmvMonth - a.gmvMonth || b.gmvLifetime - a.gmvLifetime,
      lifetime: (a, b) => b.gmvLifetime - a.gmvLifetime,
      products: (a, b) => b.products - a.products,
      followers: (a, b) => b.followers - a.followers,
      newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    };
    return list.sort(by[sort]);
  }, [rows, tab, topEarnerIds, search, category, statusFilter, sort]);

  useEffect(() => { setPage(1); }, [tab, search, category, statusFilter, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const now = Date.now();
  const newThisMonth = rows.filter((r) => new Date(r.createdAt).getTime() >= startOfMonth(0)).length;
  const prior30 = rows.filter((r) => { const t = new Date(r.createdAt).getTime(); return t <= now - 30 * DAY_MS && t > now - 60 * DAY_MS; }).length;
  const recent30 = rows.filter((r) => new Date(r.createdAt).getTime() > now - 30 * DAY_MS).length;
  const activeStores = rows.filter((r) => r.status === 'active').length;
  const gmvDelta = stats.gmvPrev ? ((stats.gmvMonth - stats.gmvPrev) / stats.gmvPrev) * 100 : null;
  const aov = stats.paidOrders ? stats.gmvAll / stats.paidOrders : 0;
  const loadingAny = [influencers.status, products.status, orders.status].includes('loading');

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 3000); };

  const openSuspension = (row) => suspension.open({ id: row.id, name: row.store || row.name, username: row.username, isSuspended: row.suspended, suspensionReason: row.suspensionReason });

  const runBatch = async () => {
    const targets = rows.filter((r) => selected.has(r.id) && (batch === 'suspend' ? !r.suspended : r.suspended));
    if (!targets.length) { setBatch(null); return; }
    setBatchBusy(true);
    const results = await Promise.allSettled(targets.map((r) => dispatch(setInfluencerSuspension({ id: r.id, suspended: batch === 'suspend', reason: batchReason.trim() })).unwrap()));
    const failed = results.filter((x) => x.status === 'rejected').length;
    showToast(failed ? `${targets.length - failed} updated, ${failed} failed` : `${targets.length} influencer${targets.length === 1 ? '' : 's'} ${batch === 'suspend' ? 'suspended' : 'restored'}`, failed ? 'error' : 'success');
    setBatchBusy(false);
    setBatch(null);
    setBatchReason('');
    setSelected(new Set());
  };

  const exportRoster = () => downloadCsv(`influencers-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['User ID', 'Name', 'Username', 'Store', 'Category', 'Trust badges', 'Products', 'Active products', 'Services', 'GMV this month (INR)', 'GMV all-time (INR)', 'Orders', 'Followers', 'Status'],
    ...filtered.map((r) => [r.id, r.name, r.username, r.store, r.category, r.badges.join(' | '), r.products, r.activeProducts, r.services, Math.round(r.gmvMonth), Math.round(r.gmvLifetime), r.orders, r.followers, r.status]),
  ]);

  const STATUS = {
    active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    setup: { label: 'Needs setup', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    suspended: { label: 'Suspended', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest"><span className="text-neutral-500">Marketplace</span><span className="text-neutral-400">›</span><span className="text-[#E8194E]">Influencers Directory</span></p>
            <div className="mt-1 flex items-center gap-2.5">
              <h1 className="font-display text-[24px] font-bold tracking-tight text-neutral-900">Influencers Management</h1>
              <span className="rounded-md bg-pink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C81345]">Live roster</span>
            </div>
            <p className="mt-0.5 text-[13.5px] text-neutral-500">Creator storefronts, catalog health, marketplace GMV and selling privileges in one place.</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2.5">
            <button type="button" onClick={exportRoster} disabled={!filtered.length} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><Download className="h-4 w-4" /> Export Roster (CSV)</button>
            <button type="button" onClick={() => setOnboardOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5"><UserPlus className="h-4 w-4" /> Onboard Influencer</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Influencers" value={formatNumber(rows.length)} icon={Users} iconTone="bg-pink-100 text-[#C81345]" hoverTone="hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.45)]"
            foot={<><Delta value={prior30 ? ((recent30 - prior30) / prior30) * 100 : null} />{formatNumber(newThisMonth)} onboarded this month</>} />
          <StatCard label="Active Storefronts" value={formatNumber(activeStores)} icon={Store} iconTone="bg-purple-100 text-[#8E35B5]" hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
            foot={<><b className="text-neutral-800">{rows.length ? Math.round((activeStores / rows.length) * 100) : 0}%</b> selling with live listings</>}>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#EEF0FA]"><div className="h-full rounded-full bg-gradient-to-r from-[#E8194E] to-[#8E35B5]" style={{ width: `${rows.length ? (activeStores / rows.length) * 100 : 0}%` }} /></div>
          </StatCard>
          <StatCard label="Influencer GMV" value={inrCompact(stats.gmvAll)} icon={IndianRupee} iconTone="bg-rose-100 text-rose-600" hoverTone="hover:border-rose-200 hover:shadow-[0_14px_30px_-14px_rgba(225,29,72,0.45)]"
            foot={<><Delta value={gmvDelta} />{inrCompact(stats.gmvMonth)} this month · paid orders</>} />
          <StatCard label="Avg Order Value" value={inrCompact(aov)} icon={Receipt} iconTone="bg-indigo-50 text-indigo-600" hoverTone="hover:border-indigo-200 hover:shadow-[0_14px_30px_-14px_rgba(99,102,241,0.4)]"
            foot={<><span className="rounded-full bg-[#E9EBFA] px-1.5 py-0.5 font-bold text-neutral-700">{formatNumber(stats.paidOrders)} orders</span> paid & not cancelled</>} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={clsx('inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition', tab === t.key ? 'bg-[#1F2340] text-white' : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50')}>
              {t.label}
              <span className={clsx('rounded-full px-1.5 text-[10.5px] font-bold', tab === t.key ? 'bg-white/20 text-white' : t.key === 'suspended' ? 'bg-rose-100 text-rose-700' : t.key === 'setup' ? 'bg-amber-100 text-amber-700' : 'bg-pink-100 text-[#C81345]')}>{formatNumber(t.count)}</span>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E72A8]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by creator name, @handle, store or ID…" className="h-10 w-full rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-9 pr-3 text-[13px] text-neutral-800 placeholder-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10" />
            </div>
            <Select value={category} onChange={setCategory} options={[{ value: 'all', label: 'All Categories' }, ...categories.map((c) => ({ value: c, label: c }))]} />
            <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'setup', label: 'Needs setup' }, { value: 'suspended', label: 'Suspended' }]} />
            <Select prefix="Sort" value={sort} onChange={setSort} options={SORTS} />
            <button type="button" onClick={loadAll} title="Refresh" aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-neutral-700 transition hover:bg-[#E9EBFA]"><RotateCw className={clsx('h-4 w-4', loadingAny && 'animate-spin')} /></button>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 border-y border-pink-100 bg-pink-50/60 px-4 py-2">
              <p className="text-[12.5px] font-semibold text-neutral-700">{selected.size} selected</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] font-semibold text-neutral-600 hover:underline">Clear</button>
                <button type="button" onClick={() => setBatch('restore')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-[12px] font-bold text-emerald-700 hover:bg-emerald-50"><ShieldCheck className="h-3.5 w-3.5" /> Restore selling</button>
                <button type="button" onClick={() => setBatch('suspend')} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#C81345] px-3 text-[12px] font-bold text-white hover:bg-[#A50F39]"><ShieldOff className="h-3.5 w-3.5" /> Suspend selling</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  <th className="w-10 py-3 pl-4"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected((prev) => { const n = new Set(prev); if (allVisibleSelected) visible.forEach((r) => n.delete(r.id)); else visible.forEach((r) => n.add(r.id)); return n; })} aria-label="Select page" className="h-4 w-4 rounded accent-[#E8194E]" /></th>
                  {['Influencer & storefront', 'Category', 'Trust badges', 'Listings', 'Monthly GMV', 'Reach', 'Status'].map((h) => <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>)}
                  <th className="w-14 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {influencers.status === 'loading' && !rows.length ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading influencers…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center"><Users className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{influencers.error ? `Error: ${influencers.error}` : 'No influencers match'}</p></td></tr>
                ) : visible.map((r) => {
                  const st = STATUS[r.status];
                  const mom = r.gmvPrev ? ((r.gmvMonth - r.gmvPrev) / r.gmvPrev) * 100 : null;
                  const isSel = selected.has(r.id);
                  return (
                    <tr key={r.id} onClick={() => navigate(`/users/${r.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', isSel && 'bg-pink-50/60', r.suspended && 'bg-rose-50/30')}>
                      <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={isSel} onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label={`Select ${r.name}`} className="h-4 w-4 rounded accent-[#E8194E]" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={r.avatar} name={r.name} suspended={r.suspended} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5"><span className="max-w-[140px] truncate text-[13.5px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">{r.name}</span>{r.username && <span className="max-w-[110px] truncate text-[11px] text-neutral-500">@{r.username}</span>}</p>
                            <p className="flex items-center gap-1 truncate text-[11.5px] font-semibold text-[#C81345]"><Store className="h-3 w-3 flex-shrink-0" />{r.store || <span className="italic text-neutral-400">No store name</span>}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.category ? <span className="inline-flex max-w-[130px] rounded-lg bg-[#E9EBFA] px-2 py-1 text-[11px] font-semibold leading-tight text-neutral-800">{r.category}</span> : <span className="text-neutral-400">—</span>}</td>
                      <td className="px-4 py-3">
                        {r.badges.length ? (
                          <span title={r.badges.join(', ')} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-pink-100 to-purple-100 px-2 py-1 text-[11.5px] font-bold text-[#8E35B5]">
                            <BadgeCheck className="h-3.5 w-3.5" />{r.badges[0]}{r.badges.length > 1 && <span className="text-neutral-500"> +{r.badges.length - 1}</span>}
                          </span>
                        ) : <span className="rounded-lg bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-500">None</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-bold text-neutral-900">{r.products} <span className="text-[11px] font-semibold text-neutral-500">products</span></p>
                        <p className="text-[11px] text-neutral-500">{r.activeProducts} live · {r.services} services</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13.5px] font-extrabold text-neutral-900">{inrCompact(r.gmvMonth)}</p>
                        <p className="text-[10.5px] font-semibold">
                          {mom === null ? <span className="text-neutral-400">{r.gmvLifetime ? `${inrCompact(r.gmvLifetime)} all-time` : 'No sales yet'}</span>
                            : <span className={mom >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{mom >= 0 ? '+' : ''}{mom.toFixed(1)}% MoM</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3"><p className="text-[13px] font-bold text-neutral-900">{formatCompactNumber(r.followers)}</p><p className="text-[10.5px] text-neutral-500">followers</p></td>
                      <td className="px-4 py-3">
                        <span title={r.suspended ? r.suspensionReason : undefined} className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
                        {!r.accountActive && <p className="mt-0.5 text-[10.5px] text-rose-600">Account banned</p>}
                      </td>
                      <td className="px-4 py-3"><RowMenu row={r} navigate={navigate} onSuspend={() => openSuspension(r)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-neutral-500">Showing <span className="font-semibold text-neutral-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of {formatNumber(filtered.length)} influencers · GMV from paid, non-cancelled orders</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 rounded-lg px-2 text-[12.5px] font-semibold text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">‹ Prev</button>
                {pageList(page, totalPages).map((p, i) => (p === '…' ? <span key={`gap-${i}`} className="px-1 text-[12px] text-neutral-400">…</span> : (
                  <button key={p} onClick={() => setPage(p)} className={clsx('h-8 min-w-[32px] rounded-lg px-2 text-[12.5px] font-semibold transition', p === page ? 'bg-[#E8194E] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'text-neutral-700 hover:bg-neutral-100')}>{formatNumber(p)}</button>
                )))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 rounded-lg px-2 text-[12.5px] font-semibold text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">Next ›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SuspendInfluencerModal influencer={suspension.target} onClose={suspension.close} onConfirm={suspension.confirm} loading={suspension.loading} />

      {batch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setBatch(null)} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="font-display text-[18px] font-bold text-neutral-900">{batch === 'suspend' ? 'Suspend selling' : 'Restore selling'} for {selected.size} influencer{selected.size === 1 ? '' : 's'}</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">{batch === 'suspend' ? "They keep app access but can't create or edit products and services." : 'They can create and edit listings again.'} Already {batch === 'suspend' ? 'suspended' : 'active'} accounts are skipped.</p>
            {batch === 'suspend' && (
              <textarea value={batchReason} onChange={(e) => setBatchReason(e.target.value)} rows={3} placeholder="Reason shown to the influencers" className="mt-4 w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-primary/50 focus:bg-white" />
            )}
            <div className="mt-5 flex justify-end gap-2.5">
              <button type="button" onClick={() => setBatch(null)} disabled={batchBusy} className="h-10 rounded-xl border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-800 hover:bg-neutral-50">Cancel</button>
              <button type="button" onClick={runBatch} disabled={batchBusy || (batch === 'suspend' && !batchReason.trim())} className={clsx('h-10 rounded-xl px-4 text-[13px] font-bold text-white disabled:opacity-50', batch === 'suspend' ? 'bg-[#C81345] hover:bg-[#A50F39]' : 'bg-emerald-600 hover:bg-emerald-700')}>
                {batchBusy ? 'Working…' : batch === 'suspend' ? 'Suspend selected' : 'Restore selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      <OnboardModal open={onboardOpen} onClose={() => setOnboardOpen(false)} onDone={(name) => { showToast(`${name} is now an influencer`); dispatch(fetchInfluencers()); }} />
      {(toast || suspension.toast) && (
        <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', (toast || suspension.toast).tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          {(toast || suspension.toast).message}
        </div>
      )}
    </>
  );
};

export default MarketplaceInfluencers;
