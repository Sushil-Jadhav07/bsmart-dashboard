import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  AlertTriangle, CheckCircle2, Clock, Coins, Download, Eye, Gift, Hourglass, Loader2, MoreVertical, PackageCheck, Play, Receipt, Send,
  Trash2, Undo2, XCircle,
} from 'lucide-react';
import { Chip, Delta, OutlineButton, Pager, RefreshButton, SearchInput, Select, StatCard, StateRow, Th, inr } from '../components/MarketplaceKit.jsx';
import { useUrlParam } from '../hooks/useCatalogQuery.js';
import {
  cancelGiftCardOrder, deleteGiftCardOrder, fetchGiftCardOrders, startProcessingGiftCardOrder,
} from '../store/giftCardOrdersSlice.js';
import { fetchGiftCards } from '../store/giftCardsSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const HOUR = 3600 * 1000;
const SLA_HOURS = 24;
const STATUS = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', icon: Clock },
  processing: { label: 'Processing', cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500', icon: Loader2 },
  completed: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', icon: XCircle },
};
const RANGES = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '');
const orderRef = (id) => `#GCO-${String(id).slice(-5).toUpperCase()}`;
const ago = (ms) => (ms < HOUR ? `${Math.max(1, Math.round(ms / 60000))}m` : ms < DAY_MS ? `${Math.round(ms / HOUR)}h` : `${Math.round(ms / DAY_MS)}d`);
const duration = (ms) => (!Number.isFinite(ms) ? '—' : ms < HOUR ? `${Math.round(ms / 60000)} min` : ms < DAY_MS ? `${(ms / HOUR).toFixed(1)} hrs` : `${(ms / DAY_MS).toFixed(1)} days`);
const mask = (code) => (code && code.length > 4 ? `${'•'.repeat(Math.min(6, code.length - 4))}${code.slice(-4)}` : code || '');
const monthStart = (offset = 0) => { const d = new Date(); d.setMonth(d.getMonth() + offset, 1); d.setHours(0, 0, 0, 0); return d.getTime(); };

const Thumb = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-10 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#E8194E] to-[#8E35B5]">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        : <div className="flex h-full w-full items-center justify-center"><Gift className="h-4 w-4 text-white/80" /></div>}
    </div>
  );
};

const RowMenu = ({ row, onView, onProcess, onStart, onCancel, onDelete }) => {
  const [open, setOpen] = useState(false);
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50';
  const act = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Actions for ${row.ref}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-[#EEF0FA]"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={act(onView)} className={item}><Eye className="h-3.5 w-3.5 text-neutral-400" /> View order</button>
            {row.status === 'pending' && <button type="button" onClick={act(onStart)} className={item}><Play className="h-3.5 w-3.5 text-neutral-400" /> Start processing</button>}
            {row.status === 'processing' && <button type="button" onClick={act(onProcess)} className={clsx(item, 'text-emerald-700')}><Send className="h-3.5 w-3.5" /> Deliver voucher</button>}
            {row.status === 'pending' && <button type="button" onClick={act(onCancel)} className={clsx(item, 'text-red-600 hover:bg-red-50')}><XCircle className="h-3.5 w-3.5" /> Cancel & refund</button>}
            {row.status === 'cancelled' && <button type="button" onClick={act(onDelete)} className={clsx(item, 'text-red-600 hover:bg-red-50')}><Trash2 className="h-3.5 w-3.5" /> Delete order</button>}
          </div>
        </>
      )}
    </div>
  );
};

const GiftCardOrders = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list = [], listStatus, listError } = useSelector((s) => s.giftCardOrders || {});
  const cards = useSelector((s) => s.giftCards?.list || []);
  const cardsStatus = useSelector((s) => s.giftCards?.listStatus);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [card, setCard] = useUrlParam('card');
  const [vendor, setVendor] = useState('all');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirm, setConfirm] = useState(null); // { kind: 'cancel' | 'delete', row }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => dispatch(fetchGiftCardOrders());
  useEffect(() => { dispatch(fetchGiftCardOrders()); }, [dispatch]);
  useEffect(() => { if (cardsStatus === 'idle') dispatch(fetchGiftCards()); }, [cardsStatus, dispatch]);
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2800); };

  const rows = useMemo(() => {
    const now = Date.now();
    return list.map((o) => {
      const id = String(o._id || o.id);
      const user = o.user_id && typeof o.user_id === 'object' ? o.user_id : (o.user || {});
      const created = new Date(o.createdAt).getTime();
      const status = STATUS[o.status] ? o.status : 'pending';
      const open = status === 'pending' || status === 'processing';
      const processedBy = o.processed_by && typeof o.processed_by === 'object' ? o.processed_by : null;
      return {
        id,
        ref: orderRef(id),
        cardId: idOf(o.gift_card_id),
        title: o.title || 'Gift card',
        vendor: o.vendor || '',
        image: o.media?.type !== 'video' && o.media?.url ? toAbsoluteMediaUrl(o.media.url) : '',
        amount: Number(o.amount) || 0,
        bcoins: Number(o.bcoins) || 0,
        status,
        buyerId: idOf(o.user_id),
        buyer: user.full_name || user.username || 'Unknown member',
        username: user.username || '',
        email: user.email || '',
        voucher: o.voucher_code || '',
        hasPin: !!o.voucher_pin,
        expiry: o.expiry_date,
        refunded: !!o.refund_transaction_id,
        processedBy: processedBy?.full_name || processedBy?.email || '',
        createdAt: o.createdAt,
        ageMs: Number.isFinite(created) ? now - created : 0,
        deliveryMs: status === 'completed' ? new Date(o.updatedAt).getTime() - created : null,
        overdue: open && now - created > SLA_HOURS * HOUR,
        expired: status === 'completed' && o.expiry_date && new Date(o.expiry_date).getTime() < now,
      };
    });
  }, [list]);

  const stats = useMemo(() => {
    const thisM = monthStart(0);
    const lastM = monthStart(-1);
    const t = (r) => new Date(r.createdAt).getTime();
    const live = rows.filter((r) => r.status !== 'cancelled');
    const monthCount = rows.filter((r) => t(r) >= thisM).length;
    const prevCount = rows.filter((r) => t(r) >= lastM && t(r) < thisM).length;
    const done = rows.filter((r) => r.status === 'completed');
    const times = done.map((r) => r.deliveryMs).filter((ms) => Number.isFinite(ms) && ms >= 0);
    const open = rows.filter((r) => r.status === 'pending' || r.status === 'processing');
    return {
      mom: prevCount ? ((monthCount - prevCount) / prevCount) * 100 : null,
      monthCount,
      aov: live.length ? live.reduce((s, r) => s + r.amount, 0) / live.length : 0,
      gross: live.reduce((s, r) => s + r.amount, 0),
      monthGross: live.filter((r) => t(r) >= thisM).reduce((s, r) => s + r.amount, 0),
      bcoins: live.reduce((s, r) => s + r.bcoins, 0),
      deliveredRate: live.length ? (done.length / live.length) * 100 : null,
      delivered: done.length,
      avgDelivery: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
      onTime: times.length ? (times.filter((ms) => ms <= SLA_HOURS * HOUR).length / times.length) * 100 : null,
      open: open.length,
      overdue: open.filter((r) => r.overdue).length,
      refundedBcoins: rows.filter((r) => r.status === 'cancelled').reduce((s, r) => s + r.bcoins, 0),
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
    };
  }, [rows]);

  const tabs = [
    { key: 'all', label: 'All Orders', test: () => true },
    { key: 'overdue', label: `Overdue (>${SLA_HOURS}h)`, test: (r) => r.overdue, tone: 'rose' },
    { key: 'pending', label: 'Pending', test: (r) => r.status === 'pending' },
    { key: 'processing', label: 'Processing', test: (r) => r.status === 'processing' },
    { key: 'completed', label: 'Delivered', test: (r) => r.status === 'completed' },
    { key: 'cancelled', label: 'Cancelled & Refunded', test: (r) => r.status === 'cancelled' },
  ].map((t) => ({ ...t, count: rows.filter(t.test).length }));

  const cardOptions = useMemo(() => {
    const map = new Map(cards.map((c) => [String(c._id || c.id), c.title]));
    rows.forEach((r) => { if (r.cardId && !map.has(r.cardId)) map.set(r.cardId, r.title); });
    return [{ value: 'all', label: 'All' }, ...[...map.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]))).map(([value, label]) => ({ value, label }))];
  }, [cards, rows]);
  const vendorOptions = useMemo(() => [{ value: 'all', label: 'All' }, ...[...new Set(rows.map((r) => r.vendor).filter(Boolean))].sort().map((v) => ({ value: v, label: v }))], [rows]);

  const filtered = (() => {
    const q = search.trim().toLowerCase().replace(/^#/, '');
    const test = tabs.find((t) => t.key === tab)?.test || (() => true);
    const maxAge = range === 'all' ? Infinity : Number(range) * DAY_MS;
    return rows.filter((r) => test(r)
      && r.ageMs <= maxAge
      && (card === 'all' || r.cardId === card)
      && (vendor === 'all' || r.vendor === vendor)
      && (!q || [r.ref, r.id, r.buyer, r.username, r.email, r.title, r.vendor, r.voucher].some((v) => String(v).toLowerCase().includes(q))))
      .sort((a, b) => Number(b.overdue) - Number(a.overdue) || new Date(b.createdAt) - new Date(a.createdAt));
  })();

  useEffect(() => { setPage(1); }, [tab, search, card, vendor, range]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const startProcessing = async (row) => {
    try { await dispatch(startProcessingGiftCardOrder(row.id)).unwrap(); showToast(`${row.ref} is now processing`); }
    catch (msg) { showToast(msg || 'Could not start processing', 'error'); }
  };

  const runConfirm = async () => {
    const { kind, row } = confirm;
    setBusy(true);
    try {
      if (kind === 'cancel') { await dispatch(cancelGiftCardOrder(row.id)).unwrap(); showToast(`${row.ref} cancelled · ${formatNumber(row.bcoins)} Bcoins refunded`); }
      else { await dispatch(deleteGiftCardOrder(row.id)).unwrap(); showToast(`${row.ref} deleted`); }
    } catch (msg) { showToast(msg || 'Action failed', 'error'); }
    setBusy(false);
    setConfirm(null);
  };

  const exportCsv = () => downloadCsv(`gift-card-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Reference', 'Order ID', 'Placed', 'Buyer', 'Username', 'Email', 'Gift card', 'Vendor', 'Face value (INR)', 'Bcoins paid', 'Status', 'Voucher delivered', 'Voucher expiry', 'Processed by', 'Refunded'],
    ...filtered.map((r) => [r.ref, r.id, r.createdAt, r.buyer, r.username, r.email, r.title, r.vendor, r.amount, r.bcoins, STATUS[r.status].label, r.voucher ? 'yes' : 'no', r.expiry || '', r.processedBy, r.refunded ? 'yes' : 'no']),
  ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest"><span className="text-[#E8194E]">Promotions</span><span className="text-neutral-300">·</span><span className="text-neutral-500">Voucher Purchases & Redemption Ledger</span></p>
            <p className="mt-1.5"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{formatNumber(rows.length)} orders synced</span></p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Gift Card Orders & Fulfillment</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">Gift cards members bought with Bcoins. Process each order, deliver the voucher code, or cancel to refund the Bcoins.</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2.5">
            <OutlineButton icon={Download} onClick={exportCsv} disabled={!filtered.length}>Export Orders (CSV)</OutlineButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Orders" value={formatNumber(rows.length)} icon={Receipt} tone="pink" foot={<>{stats.mom !== null && <Delta value={stats.mom} suffix=" MoM" />}Avg value {inr(stats.aov)}</>} />
          <StatCard label="Gross Voucher Sales" value={inr(stats.gross)} icon={Coins} tone="purple" foot={<><Chip tone="purple">{inr(stats.monthGross)} this month</Chip>{formatNumber(stats.bcoins)} Bcoins</>} />
          <StatCard label="Delivered" value={stats.deliveredRate === null ? '—' : `${stats.deliveredRate.toFixed(1)}%`} icon={PackageCheck} tone="emerald" foot={<><Chip tone="emerald">{formatNumber(stats.delivered)} vouchers</Chip>avg {duration(stats.avgDelivery)}{stats.onTime !== null && ` · ${stats.onTime.toFixed(0)}% within ${SLA_HOURS}h`}</>} />
          <StatCard label="Awaiting Fulfilment" value={formatNumber(stats.open)} icon={Hourglass} tone="rose" valueClass={stats.overdue ? 'text-[#E8194E]' : undefined} foot={<>{stats.overdue > 0 ? <Chip tone="rose">{stats.overdue} over {SLA_HOURS}h</Chip> : <Chip tone="emerald">On time</Chip>}{formatNumber(stats.cancelled)} cancelled · {formatNumber(stats.refundedBcoins)} Bcoins refunded</>} />
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={clsx('-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wide transition', tab === t.key ? 'border-[#E8194E] text-[#E8194E]' : 'border-transparent text-neutral-500 hover:text-neutral-800')}>
              {t.label}
              <span className={clsx('rounded-full px-1.5 text-[10px]', tab === t.key ? 'bg-pink-100 text-[#C81345]' : t.tone === 'rose' && t.count ? 'bg-[#E8194E] text-white' : 'bg-[#EEF0FA] text-neutral-600')}>{formatNumber(t.count)}</span>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search #GCO, buyer, email, gift card or voucher code…" />
            <Select prefix="Card" value={card} onChange={setCard} options={cardOptions} className="max-w-[260px]" />
            <Select prefix="Vendor" value={vendor} onChange={setVendor} options={vendorOptions} />
            <Select value={range} onChange={setRange} options={RANGES} />
            <RefreshButton onClick={load} spinning={listStatus === 'loading'} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  {['Order ID & date', 'Purchaser', 'Gift card product', 'Paid', 'Delivery status', 'Voucher'].map((h) => <Th key={h}>{h}</Th>)}
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {listStatus === 'loading' && !rows.length ? <StateRow colSpan={7} loading message="Loading orders…" />
                  : !visible.length ? <StateRow colSpan={7} icon={Gift} message={listError ? `Error: ${listError}` : 'No orders match these filters'} />
                    : visible.map((r) => {
                      const st = STATUS[r.status];
                      return (
                        <tr key={r.id} onClick={() => navigate(`/gift-card-orders/${r.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', r.overdue && 'bg-rose-50/50')}>
                          <td className="px-4 py-3">
                            <p className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[12.5px] font-bold text-[#E8194E]">{r.overdue && <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />}{r.ref}</p>
                            <p className="text-[10.5px] text-neutral-500">{ago(r.ageMs)} ago</p>
                            {r.overdue && <span className="mt-1 inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-rose-700"><AlertTriangle className="h-2.5 w-2.5" />Action required</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={(e) => { e.stopPropagation(); if (r.buyerId) navigate(`/users/${r.buyerId}`); }} className="max-w-[170px] truncate text-left text-[13px] font-bold text-neutral-900 hover:text-[#C81345]">{r.buyer}</button>
                            {r.email && <p className="max-w-[170px] truncate text-[11px] text-neutral-500">{r.email}</p>}
                            {r.username && <p className="text-[10.5px] text-[#8E35B5]">@{r.username}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Thumb src={r.image} />
                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate text-[13px] font-semibold text-neutral-900 group-hover:text-[#C81345]">{r.title}</p>
                                <p className="max-w-[220px] truncate text-[11px] text-neutral-500">{inr(r.amount)} face value · {r.vendor || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="flex items-center gap-1 text-[13.5px] font-extrabold text-neutral-900"><Coins className="h-3.5 w-3.5 text-[#C9952B]" />{formatNumber(r.bcoins)}</p>
                            <p className="text-[10.5px] text-neutral-500">Bcoins wallet</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', st.cls)}><st.icon className={clsx('h-3 w-3', r.status === 'processing' && 'animate-spin')} />{st.label}</span>
                            <p className="mt-0.5 text-[10.5px] text-neutral-500">
                              {r.status === 'completed' ? `in ${duration(r.deliveryMs)}${r.processedBy ? ` · ${r.processedBy}` : ''}`
                                : r.status === 'cancelled' ? (r.refunded ? <span className="inline-flex items-center gap-1 text-emerald-600"><Undo2 className="h-3 w-3" />Bcoins refunded</span> : 'Cancelled')
                                  : r.overdue ? <span className="font-semibold text-rose-600">waiting {ago(r.ageMs)}</span> : `due in ${ago(Math.max(0, SLA_HOURS * HOUR - r.ageMs))}`}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {r.voucher ? (
                              <>
                                <p className="font-mono text-[12px] font-bold text-neutral-800">{mask(r.voucher)}{r.hasPin && <span className="ml-1 font-sans text-[10px] font-semibold text-neutral-400">+ PIN</span>}</p>
                                {r.expiry && <p className={clsx('text-[10.5px]', r.expired ? 'font-semibold text-rose-600' : 'text-neutral-500')}>{r.expired ? 'Expired' : 'Expires'} {formatDateTime(r.expiry).split(',').slice(0, 2).join(',')}</p>}
                              </>
                            ) : r.status === 'processing' ? (
                              <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/gift-card-orders/${r.id}/process`); }} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-2.5 py-1 text-[11px] font-bold text-white transition hover:-translate-y-0.5"><Send className="h-3 w-3" />Deliver</button>
                            ) : r.status === 'pending' ? (
                              <button type="button" onClick={(e) => { e.stopPropagation(); startProcessing(r); }} className="inline-flex items-center gap-1 rounded-lg border border-[#C9CFEC] px-2.5 py-1 text-[11px] font-bold text-[#8E35B5] transition hover:border-[#8E35B5] hover:bg-purple-50"><Play className="h-3 w-3" />Start</button>
                            ) : <span className="text-[11px] text-neutral-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <RowMenu row={r} onView={() => navigate(`/gift-card-orders/${r.id}`)} onProcess={() => navigate(`/gift-card-orders/${r.id}/process`)} onStart={() => startProcessing(r)} onCancel={() => setConfirm({ kind: 'cancel', row: r })} onDelete={() => setConfirm({ kind: 'delete', row: r })} />
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} noun="orders" />
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => !busy && setConfirm(null)} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50">{confirm.kind === 'cancel' ? <XCircle className="h-5 w-5 text-rose-500" /> : <Trash2 className="h-5 w-5 text-rose-500" />}</span>
            <h2 className="mt-4 font-display text-[17px] font-bold text-neutral-900">{confirm.kind === 'cancel' ? `Cancel ${confirm.row.ref}?` : `Delete ${confirm.row.ref}?`}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">
              {confirm.kind === 'cancel'
                ? <><b className="text-neutral-800">{formatNumber(confirm.row.bcoins)} Bcoins</b> go back to {confirm.row.buyer}'s wallet and they're notified. This can't be undone.</>
                : 'The order record is permanently removed for everyone, including the buyer.'}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button type="button" onClick={() => setConfirm(null)} disabled={busy} className="h-10 flex-1 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50">Keep</button>
              <button type="button" onClick={runConfirm} disabled={busy} className="h-10 flex-1 rounded-xl bg-[#C81345] text-[13px] font-bold text-white hover:bg-[#A50F39] disabled:opacity-60">{busy ? 'Working…' : confirm.kind === 'cancel' ? 'Cancel & refund' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
};

export default GiftCardOrders;
