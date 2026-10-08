import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  BadgeCheck, CheckCircle2, Coins, Download, Eye, Gift, Hourglass, LayoutGrid, List, MoreVertical, Pause, PenLine, Play, Plus,
  Receipt, ScrollText, Timer, Trash2, Wallet,
} from 'lucide-react';
import { Chip, Delta, GradientButton, OutlineButton, Pager, RefreshButton, SearchInput, Select, StatCard, inr } from '../components/MarketplaceKit.jsx';
import { clearDeleteStatus, deleteGiftCard, fetchGiftCards, updateGiftCard } from '../store/giftCardsSlice.js';
import { fetchGiftCardOrders } from '../store/giftCardOrdersSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import { prefRows } from '../utils/consolePrefs.js';

const HOUR = 3600 * 1000;
const STATUS = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  draft: { label: 'Draft', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  inactive: { label: 'Inactive', cls: 'bg-[#E9EBFA] text-neutral-600', dot: 'bg-neutral-400' },
};
const THEMES = [
  'from-[#C9952B] via-[#E8B64C] to-[#8A5A12]',
  'from-[#E8194E] via-[#B0278F] to-[#6B2BB5]',
  'from-[#1F2340] via-[#2B3263] to-[#0F1226]',
  'from-[#0E7C66] via-[#18A383] to-[#075544]',
  'from-[#3A47D5] via-[#5B6CF0] to-[#1E2A8C]',
  'from-[#C2410C] via-[#EA6A2A] to-[#7C2D12]',
];
const VALUE_BANDS = [
  { value: 'all', label: 'All', test: () => true },
  { value: 'lt1k', label: 'Under ₹1,000', test: (min) => min < 1000 },
  { value: '1k-5k', label: '₹1,000 – ₹5,000', test: (min, max) => max >= 1000 && min <= 5000 },
  { value: 'gt5k', label: 'Above ₹5,000', test: (min, max) => max > 5000 },
];
const SORTS = [
  { value: 'revenue', label: 'Highest revenue' },
  { value: 'sold', label: 'Most sold' },
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'Title A–Z' },
];

const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '');
const cardId = (c) => String(c._id || c.id);
const shortRef = (id) => `GC-${String(id).slice(-6).toUpperCase()}`;
const hashIdx = (s) => [...String(s)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % THEMES.length;
const monthStart = (offset = 0) => { const d = new Date(); d.setMonth(d.getMonth() + offset, 1); d.setHours(0, 0, 0, 0); return d.getTime(); };
const duration = (ms) => (!Number.isFinite(ms) ? '—' : ms < HOUR ? `${Math.round(ms / 60000)} min` : ms < DAY_MS ? `${(ms / HOUR).toFixed(1)} hrs` : `${(ms / DAY_MS).toFixed(1)} days`);

const CardFace = ({ card, theme, min, count, compact }) => {
  const [failed, setFailed] = useState(false);
  const img = card.media?.type !== 'video' && card.media?.url ? toAbsoluteMediaUrl(card.media.url) : '';
  return (
    <div className={clsx('relative overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-[0_14px_30px_-16px_rgba(31,35,64,0.6)] transition-transform duration-300 group-hover:-rotate-1 group-hover:scale-[1.02]', theme, compact ? 'aspect-[1.6/1]' : 'h-[150px] w-full sm:w-[250px]')}>
      {img && !failed && <img src={img} alt="" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />}
      <div className={clsx('absolute inset-0', img && !failed ? 'bg-gradient-to-t from-black/75 via-black/25 to-black/40' : 'bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.28),transparent_45%)]')} />
      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-extrabold"><Gift className="h-4 w-4 flex-shrink-0" /><span className="truncate">{card.vendor || 'B-smart'}</span></span>
          {(card.category || card.type) && <span className="max-w-[110px] truncate rounded-md bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">{card.category || card.type}</span>}
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/75">{count > 1 ? 'From' : 'Denomination'}</p>
          <p className="font-display text-[22px] font-extrabold leading-tight">{inr(min)}{count > 1 && <span className="ml-1.5 text-[11px] font-semibold text-white/80">+{count - 1} more</span>}</p>
        </div>
      </div>
    </div>
  );
};

const RowMenu = ({ card, onView, onToggle, onDelete }) => {
  const [open, setOpen] = useState(false);
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50';
  const act = (fn) => () => { setOpen(false); fn(); };
  const active = card.card_status === 'active';
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="More actions" className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-[#EEF0FA] hover:text-neutral-900"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={act(onView)} className={item}><Eye className="h-3.5 w-3.5 text-neutral-400" /> View details</button>
            <button type="button" onClick={act(onToggle)} className={item}>{active ? <Pause className="h-3.5 w-3.5 text-neutral-400" /> : <Play className="h-3.5 w-3.5 text-neutral-400" />}{active ? 'Deactivate' : 'Activate'}</button>
            <button type="button" onClick={act(onDelete)} className={clsx(item, 'text-red-600 hover:bg-red-50')}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>
        </>
      )}
    </div>
  );
};

export default function GiftCards() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list, listStatus, listError, deleteStatus } = useSelector((s) => s.giftCards);
  const orders = useSelector((s) => s.giftCardOrders?.list || []);
  const ordersStatus = useSelector((s) => s.giftCardOrders?.listStatus);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [band, setBand] = useState('all');
  const [sort, setSort] = useState('revenue');
  const [view, setView] = useState('list');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => prefRows(10));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => { dispatch(fetchGiftCards()); dispatch(fetchGiftCardOrders()); };
  useEffect(() => { dispatch(fetchGiftCards()); dispatch(fetchGiftCardOrders()); }, [dispatch]);
  useEffect(() => {
    if (deleteStatus === 'succeeded') { setDeleteTarget(null); dispatch(clearDeleteStatus()); showToast('Gift card deleted'); }
    if (deleteStatus === 'failed') { setDeleteTarget(null); dispatch(clearDeleteStatus()); showToast('Delete failed', 'error'); }
  }, [deleteStatus, dispatch]);
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };

  // Per-card sales from orders (cancelled orders were refunded, so they don't count).
  const sales = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      const key = idOf(o.gift_card_id);
      const e = map.get(key) || { sold: 0, value: 0, bcoins: 0, completed: 0, cancelled: 0, pending: 0, total: 0 };
      e.total += 1;
      if (o.status === 'cancelled') e.cancelled += 1;
      else {
        e.sold += 1;
        e.value += Number(o.amount) || 0;
        e.bcoins += Number(o.bcoins) || 0;
        if (o.status === 'completed') e.completed += 1; else e.pending += 1;
      }
      map.set(key, e);
    });
    return map;
  }, [orders]);

  const rows = useMemo(() => list.map((c) => {
    const id = cardId(c);
    const denoms = (c.denominations || []).map((d) => ({ amount: Number(d.amount) || 0, bcoins: Number(d.bcoins) || 0 })).sort((a, b) => a.amount - b.amount);
    const amounts = denoms.map((d) => d.amount);
    const s = sales.get(id) || { sold: 0, value: 0, bcoins: 0, completed: 0, cancelled: 0, pending: 0, total: 0 };
    return {
      ...c,
      id,
      status: STATUS[c.card_status] ? c.card_status : 'draft',
      denoms,
      min: amounts.length ? Math.min(...amounts) : 0,
      max: amounts.length ? Math.max(...amounts) : 0,
      theme: THEMES[hashIdx(id)],
      ...s,
      fulfilRate: s.completed + s.cancelled ? (s.completed / (s.completed + s.cancelled)) * 100 : null,
    };
  }), [list, sales]);

  const stats = useMemo(() => {
    const live = orders.filter((o) => o.status !== 'cancelled');
    const thisM = monthStart(0);
    const lastM = monthStart(-1);
    const t = (o) => new Date(o.createdAt).getTime();
    const monthValue = live.filter((o) => t(o) >= thisM).reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const prevValue = live.filter((o) => t(o) >= lastM && t(o) < thisM).reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const open = orders.filter((o) => o.status === 'pending' || o.status === 'processing');
    const done = orders.filter((o) => o.status === 'completed');
    const times = done.map((o) => new Date(o.updatedAt).getTime() - t(o)).filter((ms) => Number.isFinite(ms) && ms >= 0);
    const closed = done.length + orders.filter((o) => o.status === 'cancelled').length;
    return {
      active: rows.filter((r) => r.status === 'active').length,
      newThisMonth: rows.filter((r) => new Date(r.createdAt).getTime() >= thisM).length,
      soldValue: live.reduce((s, o) => s + (Number(o.amount) || 0), 0),
      soldCount: live.length,
      bcoins: live.reduce((s, o) => s + (Number(o.bcoins) || 0), 0),
      mom: prevValue ? ((monthValue - prevValue) / prevValue) * 100 : null,
      openValue: open.reduce((s, o) => s + (Number(o.amount) || 0), 0),
      openCount: open.length,
      openOld: open.filter((o) => Date.now() - t(o) > DAY_MS).length,
      avgFulfil: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
      fulfilRate: closed ? (done.length / closed) * 100 : null,
    };
  }, [orders, rows]);

  const categories = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => { if (r.category) counts.set(r.category, (counts.get(r.category) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const tabs = [
    { key: 'all', label: 'All Vouchers', test: () => true },
    ...categories.slice(0, 4).map(([name, count]) => ({ key: `cat:${name}`, label: name, count, test: (r) => r.category === name })),
    { key: 'unpublished', label: 'Draft & Inactive', test: (r) => r.status !== 'active' },
  ].map((t) => ({ ...t, count: rows.filter(t.test).length }));

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    const test = tabs.find((t) => t.key === tab)?.test || (() => true);
    const bandTest = VALUE_BANDS.find((b) => b.value === band)?.test || (() => true);
    const list2 = rows.filter((r) => test(r)
      && (category === 'all' || r.category === category)
      && (statusFilter === 'all' || r.status === statusFilter)
      && (!r.denoms.length || bandTest(r.min, r.max))
      && (!q || [r.title, r.vendor, r.description, r.category, r.type, shortRef(r.id)].some((v) => String(v || '').toLowerCase().includes(q))));
    const sorters = {
      revenue: (a, b) => b.value - a.value || b.sold - a.sold,
      sold: (a, b) => b.sold - a.sold,
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      az: (a, b) => String(a.title).localeCompare(String(b.title)),
    };
    return list2.sort(sorters[sort]);
  })();

  useEffect(() => { setPage(1); }, [tab, search, category, statusFilter, band, sort]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleStatus = async (r) => {
    const next = r.status === 'active' ? 'inactive' : 'active';
    try { await dispatch(updateGiftCard({ id: r.id, card_status: next })).unwrap(); showToast(next === 'active' ? 'Gift card is live in the app' : 'Gift card hidden from the app'); }
    catch (msg) { showToast(msg || 'Update failed', 'error'); }
  };

  const exportCsv = () => downloadCsv(`gift-cards-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Reference', 'ID', 'Title', 'Vendor', 'Category', 'Type', 'Status', 'Denominations (INR / Bcoins)', 'Orders sold', 'Face value sold (INR)', 'Bcoins spent', 'Completed', 'Cancelled', 'Created'],
    ...filtered.map((r) => [shortRef(r.id), r.id, r.title, r.vendor, r.category, r.type, STATUS[r.status].label, r.denoms.map((d) => `${d.amount}/${d.bcoins}`).join(' | '), r.sold, r.value, r.bcoins, r.completed, r.cancelled, r.createdAt]),
  ]);

  const isLoading = (listStatus === 'idle' || listStatus === 'loading') && !list.length;

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest">
              <span className="text-[#E8194E]">Promotions</span><span className="text-neutral-300">·</span><span className="text-neutral-500">Digital Vouchers & Store Credit</span>
              {stats.active > 0 && <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{stats.active} live in app</span>}
            </p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Gift Cards Catalog & Inventory</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">Voucher designs members can buy with Bcoins: denominations, vendors, terms and live status.</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">
            <OutlineButton icon={Download} onClick={exportCsv} disabled={!filtered.length}>Export Vouchers (CSV)</OutlineButton>
            <GradientButton icon={Plus} onClick={() => navigate('/gift-cards/create')} className="!bg-gradient-to-r !from-[#E8194E] !to-[#8E35B5]">Create Gift Card</GradientButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Gift Cards Active" value={`${formatNumber(stats.active)}`} icon={BadgeCheck} tone="pink" foot={<><Chip tone="lavender">{formatNumber(rows.length)} in catalog</Chip>{stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'none added this month'}</>} />
          <StatCard label="Total Sold Volume" value={inr(stats.soldValue)} icon={Receipt} tone="purple" foot={<>{stats.mom !== null && <Delta value={stats.mom} suffix=" MoM" />}{formatNumber(stats.soldCount)} vouchers · {formatNumber(stats.bcoins)} Bcoins</>} />
          <StatCard label="Awaiting Fulfilment" value={inr(stats.openValue)} icon={Hourglass} tone="rose" valueClass={stats.openOld ? 'text-[#E8194E]' : undefined} foot={<>{stats.openOld > 0 ? <Chip tone="rose">{stats.openOld} over 24h</Chip> : <Chip tone="emerald">On time</Chip>}{formatNumber(stats.openCount)} paid orders, voucher not sent</>} />
          <StatCard label="Avg Fulfilment Time" value={stats.avgFulfil === null ? '—' : duration(stats.avgFulfil)} icon={Timer} tone="indigo" foot={stats.fulfilRate !== null ? <><Chip tone="emerald">{stats.fulfilRate.toFixed(1)}%</Chip>delivered vs cancelled</> : 'No completed orders yet'} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={clsx('rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition', tab === t.key ? 'bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-white shadow-[0_6px_14px_-8px_rgba(232,25,78,0.7)]' : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50')}>{t.label} ({formatNumber(t.count)})</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search title, vendor, category or GC-ID…" />
          <Select prefix="Category" value={category} onChange={setCategory} options={[{ value: 'all', label: 'All' }, ...categories.map(([c]) => ({ value: c, label: c }))]} />
          <Select prefix="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
          <Select prefix="Denomination" value={band} onChange={setBand} options={VALUE_BANDS} />
          <Select prefix="Sort" value={sort} onChange={setSort} options={SORTS} />
          <div className="flex rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] p-0.5">
            {[['list', List], ['grid', LayoutGrid]].map(([v, Icon]) => (
              <button key={v} type="button" onClick={() => setView(v)} aria-label={`${v} view`} className={clsx('flex h-8 w-8 items-center justify-center rounded-md transition', view === v ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-500 hover:text-neutral-800')}><Icon className="h-4 w-4" /></button>
            ))}
          </div>
          <RefreshButton onClick={load} spinning={listStatus === 'loading' || ordersStatus === 'loading'} />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200/70 bg-white py-16"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading gift cards…</p></div>
        ) : !visible.length ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200/70 bg-white py-16">
            <Gift className="h-8 w-8 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-500">{listError ? `Error: ${listError}` : rows.length ? 'No gift cards match these filters' : 'No gift cards yet'}</p>
            <button type="button" onClick={() => navigate('/gift-cards/create')} className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#C81345] hover:underline"><Plus className="h-3.5 w-3.5" /> Create a gift card</button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((r) => {
              const st = STATUS[r.status];
              return (
                <div key={r.id} className="group rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_14px_30px_-16px_rgba(232,25,78,0.45)]">
                  <button type="button" onClick={() => navigate(`/gift-cards/${r.id}`)} className="block w-full text-left"><CardFace card={r} theme={r.theme} min={r.min} count={r.denoms.length} compact /></button>
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-neutral-900 group-hover:text-[#C81345]">{r.title || 'Untitled'}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px]"><span className={clsx('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span><span className="text-neutral-500">{formatNumber(r.sold)} sold · {inr(r.value)}</span></p>
                    </div>
                    <RowMenu card={r} onView={() => navigate(`/gift-cards/${r.id}`)} onToggle={() => toggleStatus(r)} onDelete={() => setDeleteTarget(r)} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((r) => {
              const st = STATUS[r.status];
              const terms = (r.terms_and_conditions || []).filter(Boolean);
              return (
                <article key={r.id} className="group grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-pink-200 hover:shadow-[0_14px_30px_-18px_rgba(232,25,78,0.45)] lg:grid-cols-[250px_minmax(0,1fr)_150px_170px_130px] lg:items-start">
                  <button type="button" onClick={() => navigate(`/gift-cards/${r.id}`)} className="block text-left"><CardFace card={r} theme={r.theme} min={r.min} count={r.denoms.length} /></button>

                  <div className="min-w-0">
                    <button type="button" onClick={() => navigate(`/gift-cards/${r.id}`)} className="text-left"><h3 className="font-display text-[17px] font-bold leading-snug text-neutral-900 transition-colors group-hover:text-[#C81345]">{r.title || 'Untitled'}</h3></button>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}{r.status === 'active' && r.pending > 0 ? ' · In demand' : ''}</span>
                      {r.category && <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10.5px] font-bold text-[#8E35B5]">{r.category}</span>}
                      {r.type && <span className="rounded-md bg-[#E9EBFA] px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700">{r.type}</span>}
                      <span className="font-mono text-[10.5px] text-neutral-400">ID: {shortRef(r.id)}</span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-neutral-500">by <b className="font-semibold text-neutral-700">{r.vendor || '—'}</b></p>
                    {r.denoms.length > 0 && (
                      <div className="mt-2.5">
                        <p className="mb-1 text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">Available denominations</p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.denoms.slice(0, 5).map((d, i) => (
                            <span key={i} className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold', i === r.denoms.length - 1 && r.denoms.length > 1 ? 'bg-pink-100 text-[#C81345]' : 'bg-[#F1F3FC] text-neutral-800')}>
                              {inr(d.amount)}<span className="font-medium text-neutral-500">· {formatNumber(d.bcoins)}<Coins className="ml-0.5 inline h-2.5 w-2.5" /></span>
                            </span>
                          ))}
                          {r.denoms.length > 5 && <span className="self-center text-[11px] font-semibold text-neutral-400">+{r.denoms.length - 5}</span>}
                        </div>
                      </div>
                    )}
                    {r.description && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-neutral-500">{r.description}</p>}
                  </div>

                  <div>
                    <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">Performance</p>
                    <p className="mt-1 font-display text-[18px] font-extrabold text-neutral-900">{formatNumber(r.sold)} sold</p>
                    <p className="text-[11px] text-neutral-500">{inr(r.value)} face value</p>
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#8E35B5]"><Coins className="h-3 w-3" />{formatNumber(r.bcoins)} Bcoins spent</p>
                    {r.pending > 0 && <p className="mt-1 text-[11px] font-semibold text-amber-600">{r.pending} awaiting voucher</p>}
                  </div>

                  <div>
                    <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">Rules & delivery</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-bold text-neutral-900"><ScrollText className="h-3.5 w-3.5 text-[#E8194E]" />{terms.length ? `${terms.length} term${terms.length === 1 ? '' : 's'}` : 'No terms set'}</p>
                    {terms[0] && <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-500">{terms[0]}</p>}
                    <p className="mt-1.5 text-[11px]">{r.fulfilRate !== null ? <><span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700">{r.fulfilRate.toFixed(1)}%</span> <span className="text-neutral-500">delivered</span></> : <span className="text-neutral-400">No closed orders yet</span>}</p>
                  </div>

                  <div className="flex flex-row gap-2 lg:flex-col">
                    <button type="button" onClick={() => navigate(`/gift-cards/${r.id}/edit`)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E2E5F4] bg-[#F1F3FC] text-[12.5px] font-semibold text-neutral-800 transition hover:border-pink-200 hover:bg-white lg:flex-none"><PenLine className="h-3.5 w-3.5" /> Edit</button>
                    <button type="button" onClick={() => navigate(`/gift-card-orders?card=${r.id}`)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-[12.5px] font-semibold text-[#E8194E] transition hover:bg-rose-100 lg:flex-none"><Wallet className="h-3.5 w-3.5" /> Orders ({r.total})</button>
                    <button type="button" onClick={() => toggleStatus(r)} className={clsx('inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition lg:flex-none', r.status === 'active' ? 'text-neutral-500 hover:bg-neutral-100' : 'text-emerald-700 hover:bg-emerald-50')}>{r.status === 'active' ? <><Pause className="h-3.5 w-3.5" />Deactivate</> : <><CheckCircle2 className="h-3.5 w-3.5" />Activate</>}</button>
                    <button type="button" onClick={() => setDeleteTarget(r)} aria-label="Delete" className="inline-flex h-9 items-center justify-center rounded-lg px-2 text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 lg:hidden"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white">
            <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} noun="gift cards" />
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50"><Trash2 className="h-5 w-5 text-rose-500" /></span>
            <h2 className="mt-4 font-display text-[17px] font-bold text-neutral-900">Delete gift card?</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500"><b className="text-neutral-800">{deleteTarget.title}</b> will be removed from the catalog.{deleteTarget.total > 0 && ` Its ${deleteTarget.total} existing order${deleteTarget.total === 1 ? '' : 's'} keep their own copy of the details.`} To just hide it, deactivate it instead.</p>
            <div className="mt-5 flex gap-2.5">
              <button type="button" onClick={() => setDeleteTarget(null)} className="h-10 flex-1 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
              <button type="button" onClick={() => dispatch(deleteGiftCard(deleteTarget.id))} disabled={deleteStatus === 'loading'} className="h-10 flex-1 rounded-xl bg-[#C81345] text-[13px] font-bold text-white hover:bg-[#A50F39] disabled:opacity-60">{deleteStatus === 'loading' ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
}
