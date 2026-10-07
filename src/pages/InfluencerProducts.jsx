import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertTriangle, ArrowLeft, BadgeCheck, CheckCircle2, ChevronDown, Download, Eye, Layers, Package, RotateCw, Search,
  ShieldCheck, ShieldOff, ShoppingCart, Store, Trophy, User, Wrench,
} from 'lucide-react';
import { SuspendInfluencerModal } from '../components/MarketplaceShared.jsx';
import useInfluencerSuspension from '../hooks/useInfluencerSuspension.js';
import { fetchAdminOrders, fetchAdminProducts, fetchInfluencers } from '../store/marketplaceSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { downloadCsv, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const PAGE_SIZE = 8;
const LOW_STOCK = 5;
const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '');
const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;
const isRevenueOrder = (o) => o.payment_status === 'paid' && o.order_status !== 'cancelled';

const STATUS = {
  active: { label: 'Live', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  draft: { label: 'Draft', cls: 'bg-purple-100 text-[#8E35B5]', dot: 'bg-[#8E35B5]' },
  inactive: { label: 'Inactive', cls: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
  out_of_stock: { label: 'Out of Stock', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

const SORTS = [
  { value: 'revenue', label: 'Highest Revenue' },
  { value: 'units', label: 'Most units sold' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'stock', label: 'Lowest stock' },
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
          <div className="absolute left-0 top-11 z-20 max-h-72 min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((o) => <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={clsx('block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition', o.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50')}>{o.label}</button>)}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, iconTone, foot, highlight }) => {
  const body = (
    <div className={clsx('group h-full rounded-2xl bg-white p-5 transition-all duration-200', !highlight && 'border border-neutral-200/70 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.4)]')}>
      <div className="flex items-start justify-between gap-2">
        <p className="pt-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
        <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}><Icon className="h-[18px] w-[18px]" /></span>
      </div>
      <p className={clsx('mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight', highlight ? 'bg-gradient-to-r from-[#E8194E] to-[#8E35B5] bg-clip-text text-transparent' : 'text-neutral-900')}>{value}</p>
      <p className="mt-2.5 text-[11.5px] font-semibold text-neutral-500">{foot}</p>
    </div>
  );
  if (!highlight) return body;
  return <div className="group rounded-2xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] p-[1.5px] shadow-[0_14px_30px_-16px_rgba(232,25,78,0.55)] transition-transform duration-200 hover:-translate-y-1">{body}</div>;
};

const Thumb = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
        : <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-neutral-300" /></div>}
    </div>
  );
};

const InfluencerProducts = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { influencers, products, orders } = useSelector((s) => s.marketplace);
  const suspension = useInfluencerSuspension();
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('revenue');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());

  const loadAll = () => {
    dispatch(fetchInfluencers());
    dispatch(fetchAdminProducts({ seller: id }));
    dispatch(fetchAdminOrders({ seller: id }));
  };
  useEffect(loadAll, [dispatch, id]);

  const user = useMemo(() => (influencers.items || []).find((u) => String(u._id) === String(id)) || null, [influencers.items, id]);
  const profile = user?.influencer_profile || {};
  const suspended = !!profile.is_suspended;
  const storeName = profile.store_name || (user ? `${user.full_name || user.username}'s Store` : 'Storefront');
  const badges = Array.isArray(profile.trust_badges) ? profile.trust_badges : [];

  // Per-product sales from this seller's line items on paid, non-cancelled orders.
  const sales = useMemo(() => {
    const byProduct = new Map();
    let units = 0;
    let revenue = 0;
    (orders.items || []).filter(isRevenueOrder).forEach((o) => {
      (o.items || []).forEach((item) => {
        if (idOf(item.seller_id) !== String(id)) return;
        const key = idOf(item.product_id);
        const entry = byProduct.get(key) || { units: 0, revenue: 0 };
        entry.units += Number(item.quantity) || 0;
        entry.revenue += Number(item.subtotal) || 0;
        byProduct.set(key, entry);
        units += Number(item.quantity) || 0;
        revenue += Number(item.subtotal) || 0;
      });
    });
    return { byProduct, units, revenue };
  }, [orders.items, id]);

  const rows = useMemo(() => {
    const list = (products.items || []).filter((p) => idOf(p.user_id) === String(id)).map((p) => {
      const sold = sales.byProduct.get(String(p._id)) || { units: 0, revenue: 0 };
      const variants = Array.isArray(p.variants) ? p.variants : [];
      const sizes = [...new Set(variants.map((v) => String(v.size || '').trim()).filter(Boolean))];
      const colors = [...new Set(variants.map((v) => String(v.color || '').trim()).filter(Boolean))];
      const price = Number(p.selling_price) || 0;
      const mrp = Number(p.mrp) || 0;
      const stock = Number(p.stock_quantity) || 0;
      const status = p.status || 'active';
      return {
        id: String(p._id),
        name: p.name || 'Untitled product',
        sku: p.seller_sku || '',
        brand: p.brand || '',
        image: p.images?.[0]?.fileUrl ? toAbsoluteMediaUrl(p.images[0].fileUrl) : '',
        category: p.category || '',
        price,
        mrp,
        off: mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : Number(p.discount) || 0,
        stock,
        tracked: p.track_inventory !== false,
        sizes,
        colors,
        status,
        outOfStock: status === 'out_of_stock' || (p.track_inventory !== false && stock === 0 && status !== 'draft'),
        units: sold.units,
        revenue: sold.revenue,
        createdAt: p.createdAt,
      };
    });
    const ranked = list.filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 3).map((r) => r.id);
    return list.map((r) => ({ ...r, bestSeller: ranked.includes(r.id) }));
  }, [products.items, sales, id]);

  const topCategories = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => { if (r.category) counts.set(r.category, (counts.get(r.category) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const needsRestock = (r) => r.outOfStock || (r.tracked && r.stock > 0 && r.stock <= LOW_STOCK);
  const views = [
    { key: 'all', label: 'All Products', count: rows.length, test: () => true },
    ...topCategories.slice(0, 2).map(([name, count]) => ({ key: `cat:${name}`, label: name, count, test: (r) => r.category === name })),
    { key: 'restock', label: 'Restock Urgency', count: rows.filter(needsRestock).length, test: needsRestock },
    { key: 'unpublished', label: 'Drafts & Inactive', count: rows.filter((r) => r.status === 'draft' || r.status === 'inactive').length, test: (r) => r.status === 'draft' || r.status === 'inactive' },
  ];

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    const viewTest = views.find((v) => v.key === view)?.test || (() => true);
    const list = rows.filter((r) => viewTest(r)
      && (category === 'all' || r.category === category)
      && (statusFilter === 'all' || r.status === statusFilter)
      && (!q || [r.name, r.sku, r.brand, r.category, r.id].some((v) => String(v).toLowerCase().includes(q))));
    const sorters = {
      revenue: (a, b) => b.revenue - a.revenue || b.units - a.units,
      units: (a, b) => b.units - a.units,
      price_desc: (a, b) => b.price - a.price,
      price_asc: (a, b) => a.price - b.price,
      stock: (a, b) => a.stock - b.stock,
      newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    };
    return [...list].sort(sorters[sort]);
  })();

  useEffect(() => { setPage(1); }, [view, search, category, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const live = rows.filter((r) => r.status === 'active').length;
  const outCount = rows.filter((r) => r.outOfStock).length;
  const loading = products.status === 'loading' || orders.status === 'loading' || influencers.status === 'loading';

  const exportCatalog = () => {
    const source = selected.size ? rows.filter((r) => selected.has(r.id)) : filtered;
    downloadCsv(`${(storeName || 'store').replace(/[^\w-]+/g, '-').toLowerCase()}-catalog-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Product ID', 'Name', 'SKU', 'Brand', 'Category', 'Selling price (INR)', 'MRP (INR)', 'Discount %', 'Stock', 'Sizes', 'Colours', 'Status', 'Units sold', 'Revenue (INR)'],
      ...source.map((r) => [r.id, r.name, r.sku, r.brand, r.category, r.price, r.mrp, r.off, r.stock, r.sizes.join(' | '), r.colors.join(' | '), STATUS[r.status]?.label || r.status, r.units, Math.round(r.revenue)]),
    ]);
  };

  const openSuspension = () => user && suspension.open({
    id: String(user._id),
    name: user.full_name || user.username,
    username: user.username,
    isSuspended: suspended,
    suspensionReason: profile.suspension_reason || '',
  });

  if (influencers.status === 'succeeded' && !user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white py-20 text-center">
        <Store className="h-8 w-8 text-neutral-300" />
        <p className="mt-3 text-sm font-semibold text-neutral-700">This account isn't an influencer, or it no longer exists.</p>
        <Link to="/marketplace/influencers" className="mt-4 text-[13px] font-bold text-[#C81345] hover:underline">Back to Influencers</Link>
      </div>
    );
  }

  const outlineBtn = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md';

  return (
    <>
      <div className="space-y-5">
        <nav className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <Link to="/marketplace/influencers" className="inline-flex items-center gap-1 font-bold text-[#C81345] hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Back to Influencers</Link>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-500">Marketplace</span>
          <span className="text-neutral-300">/</span>
          <span className="font-semibold text-neutral-900">{storeName}{user?.username && ` (@${user.username})`} — Products</span>
        </nav>

        <div className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 flex-shrink-0">
                {user?.avatar_url ? <img src={toAbsoluteMediaUrl(user.avatar_url)} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-pink-100" />
                  : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand text-xl font-bold text-white">{String(storeName)[0]?.toUpperCase()}</span>}
                <span className={clsx('absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white', suspended ? 'bg-rose-500' : 'bg-[#E8194E]')}><Store className="h-3.5 w-3.5 text-white" /></span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[22px] font-bold tracking-tight text-neutral-900">{storeName}</h1>
                  {profile.business_type && <span className="rounded-md bg-pink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C81345]">{profile.business_type}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                  <span className={clsx('inline-flex items-center gap-1.5 font-bold', suspended ? 'text-rose-600' : 'text-emerald-600')}><span className={clsx('h-1.5 w-1.5 rounded-full', suspended ? 'bg-rose-500' : 'bg-emerald-500')} />{suspended ? 'Selling Suspended' : 'Selling Active'}</span>
                  {user?.username && <span className="text-neutral-500">@{user.username}</span>}
                  <span className="text-neutral-500">Storefront ID: <b className="font-mono text-neutral-800">{String(id).slice(-8).toUpperCase()}</b></span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-neutral-500">
                  Trust badges:
                  {badges.length ? badges.map((b) => <span key={b} className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-pink-100 to-purple-100 px-1.5 py-0.5 text-[11px] font-bold text-[#8E35B5]"><BadgeCheck className="h-3 w-3" />{b}</span>) : <span className="font-semibold text-neutral-400">None</span>}
                </p>
                {suspended && profile.suspension_reason && <p className="mt-1 text-[11.5px] text-rose-600">Reason: {profile.suspension_reason}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => navigate(`/users/${id}`)} className={outlineBtn}><User className="h-3.5 w-3.5 text-[#8E35B5]" /> View Profile</button>
              <button type="button" onClick={() => navigate(`/marketplace/services?seller=${id}`)} className={outlineBtn}><Wrench className="h-3.5 w-3.5 text-[#8E35B5]" /> Services</button>
              <button type="button" onClick={openSuspension} disabled={!user} className={clsx('inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-bold transition hover:-translate-y-0.5 disabled:opacity-50', suspended ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100')}>
                {suspended ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}{suspended ? 'Restore Selling' : 'Suspend Selling'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Products" value={formatNumber(rows.length)} icon={Layers} iconTone="bg-pink-100 text-[#C81345]" foot={`Catalog breadth · ${formatNumber(topCategories.length)} categories`} />
          <StatCard label="Active Listings" value={formatNumber(live)} icon={CheckCircle2} iconTone="bg-emerald-50 text-emerald-600" foot={`${rows.length ? ((live / rows.length) * 100).toFixed(1) : '0.0'}% live rate`} />
          <StatCard label="Out of Stock" value={formatNumber(outCount)} icon={AlertTriangle} iconTone="bg-rose-100 text-rose-600" foot={outCount ? 'Requires restock' : 'Inventory healthy'} />
          <StatCard highlight label="Total Sales GMV" value={inr(sales.revenue)} icon={Trophy} iconTone="bg-gradient-to-br from-[#E8194E] to-[#8E35B5] text-white" foot={`${formatNumber(sales.units)} units lifetime · paid orders`} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E72A8]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by title, SKU, brand…" className="h-10 w-full rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-9 pr-3 text-[13px] text-neutral-800 placeholder-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10" />
            </div>
            <Select value={category} onChange={setCategory} options={[{ value: 'all', label: 'All Categories' }, ...topCategories.map(([c]) => ({ value: c, label: c }))]} />
            <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All Statuses' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
            <Select prefix="Sort" value={sort} onChange={setSort} options={SORTS} />
            <button type="button" onClick={loadAll} title="Refresh" aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-neutral-700 transition hover:bg-[#E9EBFA]"><RotateCw className={clsx('h-4 w-4', loading && 'animate-spin')} /></button>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={exportCatalog} disabled={!rows.length} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><Download className="h-4 w-4" /> {selected.size ? `Export ${selected.size} (CSV)` : 'Export Catalog CSV'}</button>
              <button type="button" onClick={() => navigate(`/marketplace/orders?seller=${id}`)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5"><ShoppingCart className="h-4 w-4" /> View Store Orders</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-500">Active views:</span>
            {views.map((v) => (
              <button key={v.key} type="button" onClick={() => setView(v.key)} className={clsx('rounded-full px-3 py-1 text-[12px] font-semibold transition', view === v.key ? 'bg-[#E8194E] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'bg-[#EEF0FA] text-neutral-700 hover:bg-[#E2E5F4]')}>
                {v.label} ({formatNumber(v.count)})
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  <th className="w-10 py-3 pl-4"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected((prev) => { const n = new Set(prev); if (allVisibleSelected) visible.forEach((r) => n.delete(r.id)); else visible.forEach((r) => n.add(r.id)); return n; })} aria-label="Select page" className="h-4 w-4 rounded accent-[#E8194E]" /></th>
                  {['Product & SKU', 'Category', 'Retail price', 'Stock & sizes', 'Sales performance', 'Status'].map((h) => <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>)}
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.status === 'loading' && !rows.length ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading catalog…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><Package className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{products.error ? `Error: ${products.error}` : rows.length ? 'No products match these filters' : 'This influencer has no products yet'}</p></td></tr>
                ) : visible.map((r) => {
                  const st = STATUS[r.status] || STATUS.inactive;
                  const isSel = selected.has(r.id);
                  const unpublished = r.status === 'draft' || r.status === 'inactive';
                  return (
                    <tr key={r.id} onClick={() => navigate(`/marketplace/products/${r.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', r.outOfStock ? 'bg-rose-50/60' : isSel && 'bg-pink-50/60')}>
                      <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={isSel} onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label={`Select ${r.name}`} className="h-4 w-4 rounded accent-[#E8194E]" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Thumb src={r.image} />
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate text-[13.5px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">{r.name}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="font-mono text-neutral-500">SKU: {r.sku || '—'}</span>
                              {r.bestSeller && <span className="font-bold text-[#E8194E]">Best Seller</span>}
                              {r.status === 'draft' && <span className="font-bold text-[#8E35B5]">Draft Review</span>}
                              {!r.outOfStock && r.tracked && r.stock > 0 && r.stock <= LOW_STOCK && <span className="font-bold text-amber-600">Low Stock</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.category ? <span className="inline-flex max-w-[120px] rounded-lg bg-[#E9EBFA] px-2 py-1 text-[11px] font-semibold leading-tight text-neutral-800">{r.category}</span> : <span className="text-neutral-400">—</span>}</td>
                      <td className="px-4 py-3">
                        <p className="text-[13.5px] font-extrabold text-neutral-900">{inr(r.price)} {r.mrp > r.price && <span className="text-[11px] font-medium text-neutral-400 line-through">{inr(r.mrp)}</span>}</p>
                        {r.off > 0 && <p className="text-[10.5px] font-bold text-emerald-600">{r.off}% OFF</p>}
                      </td>
                      <td className="px-4 py-3">
                        {r.outOfStock ? (
                          <><p className="text-[13px] font-extrabold text-rose-600">0 in stock</p><p className="text-[10.5px] font-semibold text-rose-500">Inventory exhausted</p></>
                        ) : (
                          <><p className="text-[13px] font-bold text-neutral-900">{formatNumber(r.stock)} in stock</p>
                            <p className="max-w-[160px] truncate text-[10.5px] text-neutral-500">{r.sizes.length ? `${r.sizes.length} size${r.sizes.length === 1 ? '' : 's'} (${r.sizes.join(', ')})` : r.colors.length ? `${r.colors.length} colour${r.colors.length === 1 ? '' : 's'}` : 'Free size'}</p></>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13.5px] font-extrabold text-neutral-900">{inr(r.revenue)}</p>
                        <p className="text-[10.5px] text-neutral-500">{formatNumber(r.units)} units sold{unpublished && !r.units ? ' (unpublished)' : ''}</p>
                      </td>
                      <td className="px-4 py-3"><span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span></td>
                      <td className="px-4 py-3"><button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/marketplace/products/${r.id}`); }} aria-label={`View ${r.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-[#EEF0FA] hover:text-[#C81345]"><Eye className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-neutral-500">Showing <span className="font-semibold text-neutral-800">{(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)}</span> of {formatNumber(filtered.length)} products{selected.size > 0 && <> · <span className="font-semibold text-[#C81345]">{selected.size} selected</span> <button type="button" onClick={() => setSelected(new Set())} className="ml-1 font-semibold text-neutral-500 hover:underline">Clear</button></>}</p>
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
      {suspension.toast && (
        <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', suspension.toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          {suspension.toast.message}
        </div>
      )}
    </>
  );
};

export default InfluencerProducts;
