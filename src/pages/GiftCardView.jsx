import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Coins, Copy, Download, Gift, Hourglass, Layers, Loader2, Pause, PenLine, Play,
  Receipt, ScrollText, ShieldCheck, Store, Tag, Timer, Trash2, Undo2,
} from 'lucide-react';
import { FieldSelect, inr } from '../components/MarketplaceKit.jsx';
import { clearDeleteStatus, deleteGiftCard, fetchGiftCardById, fetchGiftCards, updateGiftCard } from '../store/giftCardsSlice.js';
import { fetchGiftCardOrders } from '../store/giftCardOrdersSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const HOUR = 3600 * 1000;
const STATUS = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', hint: 'Listed in the app and can be bought' },
  inactive: { label: 'Inactive', cls: 'bg-[#E9EBFA] text-neutral-600', dot: 'bg-neutral-400', hint: 'Hidden from members, existing orders unaffected' },
  draft: { label: 'Draft', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', hint: 'Work in progress, not visible to members' },
};
const ORDER_STATUS = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700' },
  processing: { label: 'Processing', cls: 'bg-indigo-50 text-indigo-700' },
  completed: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
};
const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '');
const shortRef = (id) => `GC-${String(id).slice(-6).toUpperCase()}`;
const orderRef = (id) => `#GCO-${String(id).slice(-5).toUpperCase()}`;
const ago = (ms) => (ms < HOUR ? `${Math.max(1, Math.round(ms / 60000))} min ago` : ms < DAY_MS ? `${Math.round(ms / HOUR)} hrs ago` : `${Math.round(ms / DAY_MS)} days ago`);
const duration = (ms) => (!Number.isFinite(ms) ? '—' : ms < HOUR ? `${Math.round(ms / 60000)} min` : ms < DAY_MS ? `${(ms / HOUR).toFixed(1)} hrs` : `${(ms / DAY_MS).toFixed(1)} days`);
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
const nameOf = (u) => (u && typeof u === 'object' ? u.full_name || u.email || '' : '');

const Card = ({ title, icon: Icon, aside, children, bodyClass = 'p-5' }) => (
  <section className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
    <div className="flex items-center justify-between gap-3 px-5 pt-4">
      <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-neutral-900">{Icon && <Icon className="h-4 w-4 text-[#E8194E]" />}{title}</h2>
      {aside}
    </div>
    <div className={bodyClass}>{children}</div>
  </section>
);

const Metric = ({ label, value, icon: Icon, tone, foot, bar, barCls }) => (
  <div className="group rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.4)]">
    <div className="flex items-start justify-between gap-2">
      <p className="pt-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <span className={clsx('flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:-rotate-6 group-hover:scale-110', tone)}><Icon className="h-[18px] w-[18px]" /></span>
    </div>
    <p className="mt-1.5 font-display text-[26px] font-extrabold leading-none text-neutral-900">{value}</p>
    <div className="mt-2 text-[11.5px] text-neutral-500">{foot}</div>
    {bar !== undefined && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EEF0FA]"><div className={clsx('h-full rounded-full', barCls)} style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} /></div>}
  </div>
);

const Row = ({ label, children, mono }) => (
  <div className="flex items-start justify-between gap-3 py-2 text-[12.5px]">
    <span className="flex-shrink-0 text-neutral-500">{label}</span>
    <span className={clsx('min-w-0 break-all text-right font-semibold text-neutral-800', mono && 'font-mono text-[11px]')}>{children ?? '—'}</span>
  </div>
);

export default function GiftCardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { current, currentStatus, currentError, list, listStatus, deleteStatus } = useSelector((s) => s.giftCards);
  const orders = useSelector((s) => s.giftCardOrders?.list || []);
  const ordersStatus = useSelector((s) => s.giftCardOrders?.listStatus);
  const [selected, setSelected] = useState(0);
  const [statusDraft, setStatusDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { if (id) dispatch(fetchGiftCardById(id)); }, [dispatch, id]);
  useEffect(() => { dispatch(fetchGiftCardOrders()); }, [dispatch]);
  useEffect(() => { if (listStatus === 'idle') dispatch(fetchGiftCards()); }, [listStatus, dispatch]);
  useEffect(() => { if (current?.card_status) setStatusDraft(current.card_status); }, [current?.card_status]);
  useEffect(() => {
    if (deleteStatus === 'succeeded') { dispatch(clearDeleteStatus()); navigate('/gift-cards'); }
    if (deleteStatus === 'failed') { dispatch(clearDeleteStatus()); setConfirmDelete(false); setToast({ message: 'Delete failed', tone: 'error' }); setTimeout(() => setToast(null), 2600); }
  }, [deleteStatus, dispatch, navigate]);

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };

  const card = current && String(current._id || current.id) === String(id) ? current : null;
  const listed = list.find((c) => String(c._id || c.id) === String(id));
  const denoms = useMemo(() => (card?.denominations || []).map((d) => ({ amount: Number(d.amount) || 0, bcoins: Number(d.bcoins) || 0 })).sort((a, b) => a.amount - b.amount), [card]);
  useEffect(() => { setSelected(Math.max(0, denoms.length - 1)); }, [denoms.length]);

  const cardOrders = useMemo(() => orders.filter((o) => idOf(o.gift_card_id) === String(id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [orders, id]);

  const stats = useMemo(() => {
    const live = cardOrders.filter((o) => o.status !== 'cancelled');
    const done = cardOrders.filter((o) => o.status === 'completed');
    const open = cardOrders.filter((o) => o.status === 'pending' || o.status === 'processing');
    const cancelled = cardOrders.filter((o) => o.status === 'cancelled');
    const times = done.map((o) => new Date(o.updatedAt) - new Date(o.createdAt)).filter((ms) => Number.isFinite(ms) && ms >= 0);
    const now = Date.now();
    const recent = live.filter((o) => now - new Date(o.createdAt).getTime() <= 30 * DAY_MS).length;
    const prior = live.filter((o) => { const a = now - new Date(o.createdAt).getTime(); return a > 30 * DAY_MS && a <= 60 * DAY_MS; }).length;
    const byDenom = new Map();
    cardOrders.forEach((o) => {
      const k = Number(o.amount) || 0;
      const e = byDenom.get(k) || { sold: 0, delivered: 0, open: 0, cancelled: 0, bcoins: 0 };
      if (o.status === 'cancelled') e.cancelled += 1;
      else { e.sold += 1; e.bcoins += Number(o.bcoins) || 0; if (o.status === 'completed') e.delivered += 1; else e.open += 1; }
      byDenom.set(k, e);
    });
    return {
      sold: live.length,
      value: live.reduce((s, o) => s + (Number(o.amount) || 0), 0),
      bcoins: live.reduce((s, o) => s + (Number(o.bcoins) || 0), 0),
      delivered: done.length,
      deliveredValue: done.reduce((s, o) => s + (Number(o.amount) || 0), 0),
      open: open.length,
      openValue: open.reduce((s, o) => s + (Number(o.amount) || 0), 0),
      overdue: open.filter((o) => now - new Date(o.createdAt).getTime() > DAY_MS).length,
      cancelled: cancelled.length,
      refunded: cancelled.reduce((s, o) => s + (Number(o.bcoins) || 0), 0),
      avg: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
      onTime: times.length ? (times.filter((ms) => ms <= DAY_MS).length / times.length) * 100 : null,
      growth: prior ? ((recent - prior) / prior) * 100 : null,
      recent,
      byDenom,
    };
  }, [cardOrders]);

  const isLoading = currentStatus === 'idle' || currentStatus === 'loading';
  const crumbs = (
    <nav className="flex flex-wrap items-center gap-1.5 text-[12px]">
      <Link to="/gift-cards" className="inline-flex items-center gap-1 font-bold text-[#C81345] hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Gift Cards</Link>
      <span className="text-neutral-300">/</span><span className="text-neutral-500">Promotions</span>
      {card && <><span className="text-neutral-300">/</span><span className="font-semibold text-neutral-900">{card.title}</span></>}
    </nav>
  );

  if (isLoading || currentError || !card) {
    return (
      <div className="space-y-6">
        {crumbs}
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-neutral-400">
          {currentError ? <><AlertCircle className="h-8 w-8 text-rose-400" /><p className="font-semibold text-neutral-800">Could not load this gift card</p><p className="text-sm">{currentError}</p></>
            : <><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm font-medium">Loading gift card…</p></>}
        </div>
      </div>
    );
  }

  const st = STATUS[card.card_status] || STATUS.draft;
  const sel = denoms[selected] || denoms[0] || { amount: 0, bcoins: 0 };
  const selStats = stats.byDenom.get(sel.amount) || { sold: 0, delivered: 0, open: 0, cancelled: 0, bcoins: 0 };
  const image = card.media?.type !== 'video' && card.media?.url ? toAbsoluteMediaUrl(card.media.url) : '';
  const terms = (card.terms_and_conditions || []).filter(Boolean);
  const rates = denoms.filter((d) => d.amount > 0).map((d) => d.bcoins / d.amount);
  const createdBy = nameOf(card.created_by) || nameOf(listed?.created_by);
  const updatedBy = nameOf(card.updated_by) || nameOf(listed?.updated_by);
  const highDemand = card.card_status === 'active' && stats.recent > 0 && (stats.growth === null || stats.growth > 0);

  const saveStatus = async (next) => {
    setBusy(true);
    try { await dispatch(updateGiftCard({ id: card._id, card_status: next })).unwrap(); dispatch(fetchGiftCardById(card._id)); showToast(`Gift card is now ${STATUS[next].label.toLowerCase()}`); }
    catch (msg) { showToast(msg || 'Update failed', 'error'); setStatusDraft(card.card_status); }
    setBusy(false);
  };

  const exportOrders = () => downloadCsv(`${String(card.title).replace(/[^\w-]+/g, '-').toLowerCase()}-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Reference', 'Order ID', 'Placed', 'Buyer', 'Email', 'Face value (INR)', 'Bcoins', 'Status', 'Voucher delivered', 'Voucher expiry'],
    ...cardOrders.map((o) => [orderRef(o._id), o._id, o.createdAt, o.user_id?.full_name || o.user_id?.username || '', o.user_id?.email || '', o.amount, o.bcoins, ORDER_STATUS[o.status]?.label || o.status, o.voucher_code ? 'yes' : 'no', o.expiry_date || '']),
  ]);

  return (
    <div className="space-y-5 pb-10">
      {crumbs}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-bold tracking-tight text-neutral-900">{card.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}{highDemand && ' · High demand'}</span>
            <span className="rounded-md bg-[#E9EBFA] px-2 py-0.5 font-mono text-[10.5px] font-bold text-neutral-700">ID: {shortRef(card._id)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => saveStatus(card.card_status === 'active' ? 'inactive' : 'active')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">
            {card.card_status === 'active' ? <><Pause className="h-4 w-4 text-[#8E35B5]" />Pause voucher</> : <><Play className="h-4 w-4 text-emerald-600" />Activate voucher</>}
          </button>
          <button type="button" onClick={exportOrders} disabled={!cardOrders.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><Download className="h-4 w-4 text-[#8E35B5]" />Export orders (CSV)</button>
          <button type="button" onClick={() => navigate(`/gift-cards/${card._id}/edit`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-3.5 text-[12.5px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5"><PenLine className="h-4 w-4" />Edit gift card</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total sold" value={`${formatNumber(stats.sold)} units`} icon={Receipt} tone="bg-pink-100 text-[#C81345]" foot={<>{inr(stats.value)} face value{stats.growth !== null && <span className={clsx('ml-1.5 rounded px-1 font-bold', stats.growth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(0)}% 30d</span>}</>} bar={stats.sold + stats.cancelled ? (stats.sold / (stats.sold + stats.cancelled)) * 100 : 0} barCls="bg-gradient-to-r from-[#E8194E] to-[#C81345]" />
        <Metric label="Delivered" value={formatNumber(stats.delivered)} icon={CheckCircle2} tone="bg-purple-100 text-[#8E35B5]" foot={<>{stats.sold ? `${((stats.delivered / stats.sold) * 100).toFixed(1)}% of sold` : 'Nothing sold yet'} · {inr(stats.deliveredValue)}</>} bar={stats.sold ? (stats.delivered / stats.sold) * 100 : 0} barCls="bg-[#8E35B5]" />
        <Metric label="Awaiting fulfilment" value={inr(stats.openValue)} icon={Hourglass} tone="bg-amber-50 text-amber-600" foot={<>{formatNumber(stats.open)} orders{stats.overdue > 0 && <span className="ml-1.5 rounded bg-rose-100 px-1 font-bold text-rose-700">{stats.overdue} over 24h</span>}</>} bar={stats.sold ? (stats.open / stats.sold) * 100 : 0} barCls="bg-amber-500" />
        <Metric label="Avg fulfilment time" value={duration(stats.avg)} icon={Timer} tone="bg-emerald-50 text-emerald-600" foot={stats.onTime !== null ? <span className="font-semibold text-emerald-600">{stats.onTime.toFixed(0)}% delivered within 24h</span> : 'No deliveries yet'} bar={stats.onTime ?? 0} barCls="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <Card title="Card Specification & Digital Canvas" icon={Gift} aside={<span className="rounded-md bg-[#E9EBFA] px-2 py-0.5 font-mono text-[10px] font-bold text-neutral-600">{shortRef(card._id)}</span>}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <div className="group relative aspect-[1.58/1] overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8194E] via-[#C81345] to-[#8E35B5] p-4 text-white shadow-[0_18px_36px_-18px_rgba(200,19,69,0.8)] transition-transform hover:-rotate-1 hover:scale-[1.02]">
                  {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  <div className={clsx('absolute inset-0', image ? 'bg-gradient-to-t from-black/75 via-black/20 to-black/40' : 'bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.3),transparent_45%)]')} />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-extrabold uppercase"><span className="flex h-5 w-5 items-center justify-center rounded bg-white/25 text-[10px]">{initials(card.vendor)[0]}</span><span className="truncate">{card.vendor}</span></span>
                      {card.type && <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase backdrop-blur-sm">{card.type}</span>}
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="h-6 w-8 rounded bg-gradient-to-br from-[#F6C453] to-[#C9952B]" />
                      <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-widest text-white/80">Denomination</p><p className="font-display text-[22px] font-extrabold leading-none">{inr(sel.amount)}</p></div>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-neutral-500">Preview of how members see it in the app</p>
              </div>

              <div className="min-w-0">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Configured denomination matrix</p>
                <div className="flex flex-wrap gap-2">
                  {denoms.map((d, i) => (
                    <button key={i} type="button" onClick={() => setSelected(i)} className={clsx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition', i === selected ? 'bg-[#C81345] text-white shadow-[0_6px_14px_-8px_rgba(200,19,69,0.8)]' : 'bg-[#F1F3FC] text-neutral-700 hover:bg-[#E9EBFA]')}>
                      {i === selected && <Check className="h-3.5 w-3.5" />}{inr(d.amount)}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[['Costs', `${formatNumber(sel.bcoins)} Bcoins`], ['Sold', formatNumber(selStats.sold)], ['Delivered', formatNumber(selStats.delivered)]].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-[#F6F7FD] px-3 py-2"><p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">{l}</p><p className="text-[13px] font-extrabold text-neutral-900">{v}</p></div>
                  ))}
                </div>
                {card.description && (
                  <div className="mt-3 rounded-xl bg-[#F1F3FC] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Voucher description</p>
                    <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-neutral-700">{card.description}</p>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[['Vendor', card.vendor || '—'], ['Category', card.category || '—'], ['Type', card.type || '—'], ['Payment', 'Bcoins only']].map(([l, v]) => (
                    <div key={l} className="rounded-xl border border-neutral-100 px-3 py-2"><p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">{l}</p><p className="truncate text-[12.5px] font-bold text-neutral-900" title={v}>{v}</p></div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Sales by Denomination" icon={Layers} bodyClass="pt-3" aside={<span className="text-[11px] text-neutral-500">From {formatNumber(cardOrders.length)} orders</span>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="bg-[#F7F8FD]">
                    {['Denomination', 'Bcoins price', 'Fulfilment progress', 'Sold', 'Awaiting', 'Cancelled'].map((h) => <th key={h} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {denoms.map((d, i) => {
                    const e = stats.byDenom.get(d.amount) || { sold: 0, delivered: 0, open: 0, cancelled: 0 };
                    const pct = e.sold ? (e.delivered / e.sold) * 100 : 0;
                    return (
                      <tr key={i} onClick={() => setSelected(i)} className={clsx('cursor-pointer transition-colors hover:bg-[#FDF2F6]', i === selected && 'bg-pink-50/50')}>
                        <td className="px-5 py-3"><span className="flex items-center gap-2 text-[13px] font-extrabold text-neutral-900"><span className={clsx('h-2 w-2 rounded-full', e.open ? 'bg-amber-500' : e.sold ? 'bg-emerald-500' : 'bg-neutral-300')} />{inr(d.amount)}</span></td>
                        <td className="px-5 py-3 text-[12.5px] text-neutral-700">{formatNumber(d.bcoins)}<span className="ml-1 text-[10.5px] text-neutral-400">({d.amount ? (d.bcoins / d.amount).toFixed(2) : '—'}/₹)</span></td>
                        <td className="px-5 py-3">
                          <p className="text-[11px] font-semibold text-[#8E35B5]">{formatNumber(e.delivered)} delivered <span className="float-right text-neutral-500">{pct.toFixed(0)}%</span></p>
                          <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-[#EEF0FA]"><div className="h-full rounded-full bg-gradient-to-r from-[#8E35B5] to-[#E8194E]" style={{ width: `${pct}%` }} /></div>
                        </td>
                        <td className="px-5 py-3"><span className="rounded-md bg-[#E9EBFA] px-2 py-0.5 text-[12px] font-bold text-neutral-800">{formatNumber(e.sold)}</span></td>
                        <td className="px-5 py-3 text-[12.5px] font-semibold text-amber-600">{formatNumber(e.open)}</td>
                        <td className="px-5 py-3 text-[12.5px] text-neutral-500">{formatNumber(e.cancelled)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Live Order Activity" icon={Receipt} aside={<button type="button" onClick={() => navigate(`/gift-card-orders?card=${card._id}`)} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#C81345] hover:underline">All {formatNumber(cardOrders.length)} orders<ArrowRight className="h-3.5 w-3.5" /></button>}>
            {ordersStatus === 'loading' && !cardOrders.length ? <p className="py-6 text-center text-[12.5px] text-neutral-400">Loading orders…</p>
              : !cardOrders.length ? <p className="py-6 text-center text-[12.5px] text-neutral-400">No one has bought this gift card yet.</p> : (
                <div className="space-y-2">
                  {cardOrders.slice(0, 6).map((o) => {
                    const u = typeof o.user_id === 'object' && o.user_id ? o.user_id : {};
                    const name = u.full_name || u.username || 'Member';
                    const os = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
                    return (
                      <button key={o._id} type="button" onClick={() => navigate(`/gift-card-orders/${o._id}`)} className="flex w-full items-center gap-3 rounded-xl bg-[#F6F7FD] p-3 text-left transition hover:bg-[#FDF2F6]">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF0FA] text-[11px] font-bold text-[#8E35B5] ring-2 ring-white">{initials(name)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-neutral-900">{name} <span className="ml-1 rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#E8194E]">{orderRef(o._id)}</span></p>
                          <p className="text-[11px] text-neutral-500">{ago(Date.now() - new Date(o.createdAt).getTime())}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13.5px] font-extrabold text-neutral-900">{inr(o.amount)}</p>
                          <p className="text-[10.5px] font-semibold text-[#8E35B5]">{formatNumber(o.bcoins)} Bcoins</p>
                        </div>
                        <span className={clsx('hidden rounded-md px-2 py-0.5 text-[10.5px] font-bold sm:inline', os.cls)}>{os.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-[72px]">
          <Card title="Bcoins Economics" icon={Coins} aside={<span className="h-2 w-2 rounded-full bg-emerald-500" />}>
            <div className="space-y-2.5">
              <div className="rounded-xl bg-[#F6F7FD] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Bcoins collected</p>
                <p className="mt-0.5 text-[17px] font-extrabold text-neutral-900">{formatNumber(stats.bcoins)} <span className="text-[12px] text-[#8E35B5]">Bcoins</span></p>
                <p className="text-[11px] text-neutral-500">From {formatNumber(stats.sold)} non-cancelled orders</p>
              </div>
              <div className="rounded-xl bg-[#F6F7FD] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Exchange rate</p>
                <p className="mt-0.5 text-[14px] font-extrabold text-neutral-900">{rates.length ? (Math.min(...rates) === Math.max(...rates) ? `${rates[0].toFixed(2)} Bcoins per ₹1` : `${Math.min(...rates).toFixed(2)} – ${Math.max(...rates).toFixed(2)} Bcoins per ₹1`) : '—'}</p>
                <p className="text-[11px] text-neutral-500">{rates.length > 1 && Math.min(...rates) !== Math.max(...rates) ? 'Rate varies by denomination' : 'Same rate on every denomination'}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Refunded on cancel</p><p className="text-[14px] font-extrabold text-emerald-700">{formatNumber(stats.refunded)} Bcoins</p></div>
                <Undo2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card title="Availability" icon={ShieldCheck}>
            <FieldSelect value={statusDraft} onChange={setStatusDraft} options={Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label, dot: s.dot, hint: s.hint }))} />
            <p className="mt-2 text-[11.5px] text-neutral-500">{STATUS[statusDraft]?.hint}</p>
            <button type="button" onClick={() => saveStatus(statusDraft)} disabled={busy || statusDraft === card.card_status} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#1F2340] text-[12.5px] font-bold text-white transition hover:bg-[#2B3263] disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save status</button>
          </Card>

          <Card title="Terms & Usage Scope" icon={ScrollText}>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-[#8E35B5]"><Store className="h-3 w-3" />{card.vendor}</span>
              {card.category && <span className="inline-flex items-center gap-1 rounded-md bg-pink-100 px-2 py-0.5 text-[11px] font-bold text-[#C81345]"><Tag className="h-3 w-3" />{card.category}</span>}
            </div>
            {terms.length ? (
              <ul className="space-y-1.5">
                {terms.map((t, i) => <li key={i} className="flex items-start gap-2 text-[12px] text-neutral-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />{t}</li>)}
              </ul>
            ) : <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">No terms set. Add them from Edit so members know the conditions.</p>}
          </Card>

          <Card title="Audit Governance" icon={ShieldCheck}>
            <div className="divide-y divide-neutral-100">
              <Row label="Created by">{createdBy || '—'}</Row>
              <Row label="Created on">{formatDateTime(card.createdAt)}</Row>
              <Row label="Last edited by">{updatedBy || '—'}</Row>
              <Row label="Last updated">{formatDateTime(card.updatedAt)}</Row>
              <Row label="Gift card ID" mono>
                <button type="button" onClick={() => navigator.clipboard?.writeText(String(card._id)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})} className="inline-flex items-center gap-1 rounded bg-[#F1F3FC] px-1.5 py-0.5 hover:bg-[#E9EBFA]">{String(card._id).slice(-10)}{copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-neutral-500" />}</button>
              </Row>
            </div>
            <div className="mt-3 space-y-2">
              <button type="button" onClick={() => navigate(`/gift-card-orders?card=${card._id}`)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#EEF0FA] text-[12.5px] font-bold text-neutral-800 hover:bg-[#E2E5F4]"><Receipt className="h-4 w-4" />Review all orders</button>
              <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-[12.5px] font-bold text-[#E8194E] hover:bg-rose-100"><Trash2 className="h-4 w-4" />Delete gift card</button>
            </div>
          </Card>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setConfirmDelete(false)} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50"><Trash2 className="h-5 w-5 text-rose-500" /></span>
            <h2 className="mt-4 font-display text-[17px] font-bold text-neutral-900">Delete gift card?</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500"><b className="text-neutral-800">{card.title}</b> will be removed from the catalog.{cardOrders.length > 0 && ` Its ${cardOrders.length} order${cardOrders.length === 1 ? '' : 's'} keep their own copy of the details.`} To just hide it, pause it instead.</p>
            <div className="mt-5 flex gap-2.5">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 flex-1 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
              <button type="button" onClick={() => dispatch(deleteGiftCard(card._id))} disabled={deleteStatus === 'loading'} className="h-10 flex-1 rounded-xl bg-[#C81345] text-[13px] font-bold text-white hover:bg-[#A50F39] disabled:opacity-60">{deleteStatus === 'loading' ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </div>
  );
}
