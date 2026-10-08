import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertCircle, ArrowLeft, ArrowRight, CalendarClock, Check, CheckCircle2, ClipboardCheck, Coins, Copy, CreditCard, Eye, EyeOff, Gift, Hourglass,
  KeyRound, Loader2, PackageCheck, Play, Printer, Receipt, Send, ShieldCheck, ShoppingBag, Timer, Undo2, User, Wallet, XCircle,
} from 'lucide-react';
import { inr } from '../components/MarketplaceKit.jsx';
import { cancelGiftCardOrder, fetchGiftCardOrderById, startProcessingGiftCardOrder } from '../store/giftCardOrdersSlice.js';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const HOUR = 3600 * 1000;
const STATUS = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  processing: { label: 'Processing', cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  completed: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled & refunded', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};
const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '');
const orderRef = (id) => `#GCO-${String(id).slice(-5).toUpperCase()}`;
const duration = (ms) => (!Number.isFinite(ms) ? '—' : ms < HOUR ? `${Math.max(1, Math.round(ms / 60000))} min` : ms < DAY_MS ? `${(ms / HOUR).toFixed(1)} hrs` : `${(ms / DAY_MS).toFixed(1)} days`);
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const Card = ({ title, icon: Icon, aside, children, bodyClass = 'p-5' }) => (
  <section className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
    <div className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-[#FAFAFE] px-5 py-3.5">
      <h2 className="flex items-center gap-2 font-display text-[14.5px] font-bold text-neutral-900">{Icon && <Icon className="h-4 w-4 text-[#E8194E]" />}{title}</h2>
      {aside}
    </div>
    <div className={bodyClass}>{children}</div>
  </section>
);

const Fact = ({ icon: Icon, tone, label, value, sub }) => (
  <div className="group flex items-start gap-3 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:border-pink-200">
    <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110', tone)}><Icon className="h-[18px] w-[18px]" /></span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="mt-0.5 break-words text-[15px] font-extrabold leading-tight text-neutral-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-neutral-500">{sub}</div>}
    </div>
  </div>
);

const Row = ({ label, children, mono }) => (
  <div className="flex items-start justify-between gap-3 py-2 text-[12.5px]">
    <span className="flex-shrink-0 text-neutral-500">{label}</span>
    <span className={clsx('min-w-0 break-all text-right font-semibold text-neutral-800', mono && 'font-mono text-[11.5px]')}>{children ?? '—'}</span>
  </div>
);

const SecretBox = ({ label, value, revealed, onToggle, onCopy, copied, note }) => (
  <div className="rounded-xl bg-[#F1F3FC] p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">{label}</p>
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700"><ShieldCheck className="h-3 w-3" />Admin only</span>
    </div>
    <div className="mt-2 flex items-center justify-between gap-2">
      <p className="min-w-0 break-all font-mono text-[15px] font-bold tracking-wider text-neutral-900">{revealed ? value : '•'.repeat(Math.min(14, Math.max(4, value.length)))}</p>
      <div className="flex flex-shrink-0 items-center gap-1">
        <button type="button" onClick={onToggle} aria-label={revealed ? 'Hide' : 'Reveal'} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-white hover:text-[#C81345]">{revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        <button type="button" onClick={onCopy} aria-label="Copy" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-white hover:text-[#C81345]">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>
      </div>
    </div>
    {note && <p className="mt-2 text-[11px] text-neutral-500">{note}</p>}
  </div>
);

const printReceipt = (o, buyer) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(orderRef(o._id))}</title>
  <style>body{font-family:Arial,sans-serif;color:#111;margin:32px;max-width:640px}h1{font-size:20px;margin:0 0 4px}.m{color:#666;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}td{padding:8px;border-bottom:1px solid #ddd}td:last-child{text-align:right}.t td{font-weight:bold;border:none}</style></head><body>
  <h1>Gift card receipt · ${escapeHtml(orderRef(o._id))}</h1>
  <p class="m">Placed ${escapeHtml(formatDateTime(o.createdAt))} · Status: ${escapeHtml(STATUS[o.status]?.label || o.status)}</p>
  <p style="font-size:13px"><b>Member:</b> ${escapeHtml(buyer.name)}${buyer.email ? ` (${escapeHtml(buyer.email)})` : ''}</p>
  <table><tr><td>${escapeHtml(o.title)} — ${escapeHtml(o.vendor)}</td><td>${escapeHtml(inr(o.amount))} face value</td></tr>
  <tr><td>Paid with Bcoins wallet</td><td>${escapeHtml(formatNumber(o.bcoins))} Bcoins</td></tr>
  ${o.status === 'cancelled' ? `<tr><td>Refunded to wallet</td><td>${escapeHtml(formatNumber(o.bcoins))} Bcoins</td></tr>` : ''}
  ${o.expiry_date ? `<tr><td>Voucher valid until</td><td>${escapeHtml(formatDateTime(o.expiry_date))}</td></tr>` : ''}
  <tr class="t"><td>Order ID</td><td>${escapeHtml(o._id)}</td></tr></table>
  <script>window.onload=function(){window.print()}</script></body></html>`;
  const win = window.open('', '_blank', 'width=720,height=820');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
};

export default function GiftCardOrderView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const { current: o, currentStatus, currentError } = useSelector((s) => s.giftCardOrders);
  const [extra, setExtra] = useState({ user: null, orders: [], txs: [], balance: null });
  const [reveal, setReveal] = useState({ code: false, pin: false });
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { if (id) dispatch(fetchGiftCardOrderById(id)); }, [dispatch, id]);

  const buyerId = idOf(o?.user_id);
  useEffect(() => {
    if (!buyerId || !token) return undefined;
    let alive = true;
    const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
    const get = (url) => fetch(url, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([
      get(`${API_BASE_WITH_PATH}/users/${buyerId}`),
      get(`${API_BASE_WITH_PATH}/gift-card-orders/admin/all?userId=${buyerId}&limit=200`),
      get(`${API_BASE_WITH_PATH}/wallet?userId=${buyerId}&limit=200&page=1`),
    ]).then(([u, ords, w]) => {
      if (!alive) return;
      setExtra({
        user: u?.user || u?.data || (u?._id ? u : null),
        orders: Array.isArray(ords?.data) ? ords.data : [],
        txs: Array.isArray(w?.transactions) ? w.transactions : [],
        balance: (w?.wallets || []).find((x) => String(x.user?._id) === String(buyerId))?.balance ?? null,
      });
    });
    return () => { alive = false; };
  }, [buyerId, token]);

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };
  const copy = (key, value) => navigator.clipboard?.writeText(String(value)).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500); }).catch(() => {});

  const isLoading = currentStatus === 'idle' || currentStatus === 'loading';
  const crumbs = (
    <nav className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
      <Link to="/gift-card-orders" className="inline-flex items-center gap-1 text-[#C81345] hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Gift card orders</Link>
      <span className="text-neutral-300">/</span><span className="text-neutral-500">Promotions</span>
      {o && <><span className="text-neutral-300">/</span><span className="text-neutral-900">Order {orderRef(o._id || o.id)}</span></>}
    </nav>
  );

  if (isLoading || currentError || !o || String(o._id || o.id) !== String(id)) {
    return (
      <div className="space-y-6">
        {crumbs}
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-neutral-400">
          {currentError ? <><AlertCircle className="h-8 w-8 text-rose-400" /><p className="font-semibold text-neutral-800">Could not load this order</p><p className="text-sm">{currentError}</p></>
            : <><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm font-medium">Loading order…</p></>}
        </div>
      </div>
    );
  }

  const st = STATUS[o.status] || STATUS.pending;
  const created = new Date(o.createdAt).getTime();
  const userObj = typeof o.user_id === 'object' && o.user_id ? o.user_id : {};
  const profile = extra.user || {};
  const buyer = {
    name: profile.full_name || userObj.full_name || userObj.username || 'Member',
    username: profile.username || userObj.username || '',
    email: profile.email || userObj.email || '',
    phone: profile.phone || '',
    avatar: profile.avatar_url ? toAbsoluteMediaUrl(profile.avatar_url) : '',
    since: profile.createdAt,
  };
  const processedBy = o.processed_by && typeof o.processed_by === 'object' ? (o.processed_by.full_name || o.processed_by.email) : '';
  const deliveredAt = o.status === 'completed' ? new Date(o.updatedAt).getTime() : null;
  const expiry = o.expiry_date ? new Date(o.expiry_date).getTime() : null;
  const daysLeft = expiry ? Math.ceil((expiry - Date.now()) / DAY_MS) : null;
  const debitTx = extra.txs.find((t) => String(t._id) === idOf(o.wallet_transaction_id));
  const refundTx = extra.txs.find((t) => String(t._id) === idOf(o.refund_transaction_id));
  const buyerLive = extra.orders.filter((x) => x.status !== 'cancelled');
  const image = o.media?.type !== 'video' && o.media?.url ? toAbsoluteMediaUrl(o.media.url) : '';

  const timeline = [
    { key: 'placed', icon: ShoppingBag, title: 'Order placed in the app', note: `${o.title} · ${inr(o.amount)} face value`, at: o.createdAt, done: true },
    { key: 'paid', icon: Coins, title: `${formatNumber(o.bcoins)} Bcoins debited from wallet`, note: debitTx?.description || (o.wallet_transaction_id ? `Ledger entry ${idOf(o.wallet_transaction_id).slice(-10)}` : 'Wallet debit'), at: debitTx?.createdAt || o.createdAt, done: true },
    ...(o.status === 'cancelled' ? [
      { key: 'cancelled', icon: XCircle, title: 'Order cancelled', note: refundTx ? `${formatNumber(o.bcoins)} Bcoins refunded · ${refundTx.description || 'wallet credit'}` : `${formatNumber(o.bcoins)} Bcoins refunded to wallet`, at: o.cancelled_at, done: true, failed: true },
    ] : [
      { key: 'processing', icon: ClipboardCheck, title: 'Picked up for processing', note: o.status === 'pending' ? 'Waiting for a team member to start' : 'Voucher being sourced from the vendor', done: o.status !== 'pending' },
      { key: 'delivered', icon: Send, title: 'Voucher delivered to the member', note: o.status === 'completed' ? `Code sent in-app${processedBy ? ` by ${processedBy}` : ''} · member notified` : 'Code, PIN and expiry are sent in-app', at: o.status === 'completed' ? o.updatedAt : null, done: o.status === 'completed' },
    ]),
  ];
  const nextIdx = timeline.findIndex((s) => !s.done);

  const runStart = async () => {
    setBusy('start');
    try { await dispatch(startProcessingGiftCardOrder(o._id)).unwrap(); showToast('Order is now processing'); } catch (msg) { showToast(msg || 'Could not start processing', 'error'); }
    setBusy('');
  };
  const runCancel = async () => {
    setBusy('cancel');
    try { await dispatch(cancelGiftCardOrder(o._id)).unwrap(); showToast(`${formatNumber(o.bcoins)} Bcoins refunded`); dispatch(fetchGiftCardOrderById(o._id)); } catch (msg) { showToast(msg || 'Cancel failed', 'error'); }
    setBusy('');
    setConfirmCancel(false);
  };

  return (
    <div className="space-y-5 pb-10">
      {crumbs}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[26px] font-bold tracking-tight text-neutral-900">Order {orderRef(o._id)}</h1>
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot, o.status === 'processing' && 'animate-pulse')} />{st.label}</span>
          </div>
          <span className="mt-1.5 inline-block rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8E35B5]">Prepaid digital voucher · Bcoins</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {o.status === 'completed' && o.voucher_code && (
            <button type="button" onClick={() => copy('share', [`${o.title} (${inr(o.amount)})`, `Code: ${o.voucher_code}`, o.voucher_pin && `PIN: ${o.voucher_pin}`, expiry && `Valid until ${formatDateTime(o.expiry_date)}`].filter(Boolean).join('\n'))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md">{copied === 'share' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-[#8E35B5]" />} Copy voucher details</button>
          )}
          <button type="button" onClick={() => { if (!printReceipt(o, buyer)) showToast('Allow pop-ups to print', 'error'); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md"><Printer className="h-4 w-4 text-[#8E35B5]" /> Print receipt</button>
          {o.status === 'pending' && (
            <button type="button" onClick={() => setConfirmCancel(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[12.5px] font-bold text-[#E8194E] transition hover:-translate-y-0.5 hover:bg-rose-100"><XCircle className="h-4 w-4" /> Cancel & refund</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact icon={CalendarClock} tone="bg-pink-100 text-[#C81345]" label="Purchased on" value={formatDateTime(o.createdAt)} sub={Intl.DateTimeFormat().resolvedOptions().timeZone} />
        <Fact icon={Timer} tone="bg-purple-100 text-[#8E35B5]" label={o.status === 'completed' ? 'Fulfilment time' : o.status === 'cancelled' ? 'Cancelled after' : 'Waiting for'}
          value={o.status === 'completed' ? duration(deliveredAt - created) : o.status === 'cancelled' ? duration(new Date(o.cancelled_at).getTime() - created) : duration(Date.now() - created)}
          sub={o.status === 'completed' ? (processedBy ? `Delivered by ${processedBy}` : 'Delivered in-app') : o.status === 'cancelled' ? 'Order closed' : <span className={Date.now() - created > DAY_MS ? 'font-semibold text-rose-600' : ''}>{Date.now() - created > DAY_MS ? 'Past the 24h target' : 'Within the 24h target'}</span>} />
        <Fact icon={Wallet} tone="bg-emerald-50 text-emerald-600" label="Payment" value={o.status === 'cancelled' ? 'Refunded to wallet' : 'Bcoins wallet debit'} sub={<span className="font-mono">Txn {idOf(o.wallet_transaction_id).slice(-10) || '—'}</span>} />
        <Fact icon={Receipt} tone="bg-rose-100 text-rose-600" label="Face value" value={<span className="font-display text-[22px]">{inr(o.amount)}</span>} sub={<span className="font-semibold text-[#8E35B5]">{formatNumber(o.bcoins)} Bcoins paid</span>} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <Card title="Voucher Artifact & Credentials" icon={Gift} aside={o.status === 'completed' && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Issued</span>}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2A0F2E] via-[#4B1240] to-[#1B0B24] p-5 text-white shadow-[0_18px_40px_-18px_rgba(75,18,64,0.8)]">
              {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#E8194E]/30 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8194E] font-display text-[15px] font-extrabold">{initials(o.vendor || 'B')[0]}</span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[17px] font-bold">{o.title}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{o.vendor} · digital e-gift</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-[#F6C453]">Face value</p>
                  <p className="font-display text-[26px] font-extrabold leading-none">{inr(o.amount)}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#F6C453]">{formatNumber(o.bcoins)} Bcoins</p>
                </div>
              </div>
              <div className="relative mt-8 flex items-center gap-2">
                <span className="h-7 w-10 rounded-md bg-gradient-to-br from-[#F6C453] to-[#C9952B]" />
                {o.status === 'completed' && <span className="ml-auto rounded-md border border-[#F6C453]/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F6C453]">{daysLeft !== null && daysLeft < 0 ? 'Expired' : 'Active voucher'}</span>}
              </div>
              <div className="relative mt-4 flex items-end justify-between gap-3">
                <div><p className="text-[9.5px] font-bold uppercase tracking-widest text-white/55">Beneficiary</p><p className="text-[14px] font-bold">{buyer.name}</p></div>
                <div className="text-right"><p className="text-[9.5px] font-bold uppercase tracking-widest text-white/55">Expires on</p><p className="text-[14px] font-bold">{expiry ? new Date(expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'On delivery'}</p></div>
              </div>
            </div>

            {o.status === 'completed' && o.voucher_code ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SecretBox label="Voucher code" value={o.voucher_code} revealed={reveal.code} onToggle={() => setReveal((r) => ({ ...r, code: !r.code }))} onCopy={() => copy('code', o.voucher_code)} copied={copied === 'code'} note="Shown to the member in their gift card orders." />
                {o.voucher_pin
                  ? <SecretBox label="Security PIN" value={o.voucher_pin} revealed={reveal.pin} onToggle={() => setReveal((r) => ({ ...r, pin: !r.pin }))} onCopy={() => copy('pin', o.voucher_pin)} copied={copied === 'pin'} note="Required by the vendor at checkout." />
                  : <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#C9CFEC] p-4 text-[12px] text-neutral-500"><KeyRound className="h-5 w-5 text-neutral-400" />This voucher has no PIN.</div>}
              </div>
            ) : (
              <div className={clsx('mt-4 flex flex-col items-start gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between', o.status === 'cancelled' ? 'bg-rose-50' : 'bg-amber-50')}>
                <p className={clsx('flex items-center gap-2 text-[13px] font-semibold', o.status === 'cancelled' ? 'text-rose-700' : 'text-amber-800')}>
                  {o.status === 'cancelled' ? <><Undo2 className="h-4 w-4" />No voucher was issued. The Bcoins went back to the member.</> : <><Hourglass className="h-4 w-4" />Voucher not issued yet. The member is waiting.</>}
                </p>
                {o.status === 'pending' && <button type="button" onClick={runStart} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-3.5 text-[12.5px] font-bold text-white disabled:opacity-60">{busy === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Start processing</button>}
                {o.status === 'processing' && <button type="button" onClick={() => navigate(`/gift-card-orders/${o._id}/process`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-3.5 text-[12.5px] font-bold text-white"><Send className="h-4 w-4" />Deliver voucher</button>}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Order status', <span key="s" className={o.status === 'cancelled' ? 'text-rose-600' : o.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}>{st.label}</span>],
                ['Delivered to', 'Member\'s in-app orders'],
                ['Validity left', daysLeft === null ? '—' : daysLeft < 0 ? <span key="e" className="text-rose-600">Expired</span> : `${formatNumber(daysLeft)} days`],
                ['Processed by', processedBy || '—'],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-[#F6F7FD] px-3 py-2.5 text-center">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">{l}</p>
                  <p className="mt-0.5 text-[12.5px] font-bold text-neutral-900">{v}</p>
                </div>
              ))}
            </div>

            {o.redeem_steps?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-600">How the member redeems it</p>
                <ol className="space-y-1.5">
                  {o.redeem_steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[12.5px] text-neutral-700"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-[10.5px] font-bold text-[#C81345]">{i + 1}</span>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </Card>

          <Card title="Delivery & Audit Sequence" icon={Send} aside={<span className="text-[10.5px] font-bold text-emerald-600">{timeline.filter((s) => s.done).length}/{timeline.length} steps</span>}>
            <ol className="space-y-2.5">
              {timeline.map((s, i) => {
                const Icon = s.icon;
                const isNext = i === nextIdx;
                return (
                  <li key={s.key} className={clsx('flex items-start gap-3 rounded-xl p-3', isNext ? 'bg-pink-50/70 ring-1 ring-pink-100' : 'bg-[#F6F7FD]')}>
                    <span className={clsx('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full', s.failed ? 'bg-rose-100 text-rose-600' : s.done ? 'bg-emerald-500 text-white' : isNext ? 'bg-white text-[#E8194E] ring-2 ring-[#E8194E]/40' : 'bg-white text-neutral-400')}>
                      {s.done && !s.failed ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3">
                        <p className={clsx('text-[13px] font-bold', s.failed ? 'text-rose-700' : s.done || isNext ? 'text-neutral-900' : 'text-neutral-400')}>{s.title}{isNext && <span className="ml-2 rounded bg-[#E8194E] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Next</span>}</p>
                        {s.at && s.done && <span className="font-mono text-[11px] text-neutral-500">{formatDateTime(s.at)}</span>}
                      </div>
                      <p className="mt-0.5 break-words text-[11.5px] text-neutral-500">{s.note}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card title="Financial Summary & Ledger" icon={CreditCard} aside={<span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Closed-loop Bcoins</span>}>
            <div className="divide-y divide-neutral-100">
              <Row label="Voucher face value">{inr(o.amount)}</Row>
              <Row label="Bcoins debited from wallet"><span className="text-[#8E35B5]">{formatNumber(o.bcoins)} Bcoins</span></Row>
              <Row label="Effective rate">{o.amount ? `${(o.bcoins / o.amount).toFixed(2)} Bcoins per ₹1` : '—'}</Row>
              {o.status === 'cancelled' && <Row label="Refunded to wallet"><span className="text-emerald-600">+{formatNumber(o.bcoins)} Bcoins</span></Row>}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3">
              <div>
                <p className="text-[14px] font-bold text-neutral-900">{o.status === 'cancelled' ? 'Net charged' : 'Net paid by member'}</p>
                <p className="text-[11px] text-neutral-500">{o.status === 'cancelled' ? 'Order cancelled, coins returned' : `From ${buyer.name}'s Bcoins wallet`}</p>
              </div>
              <p className="font-display text-[22px] font-extrabold text-[#C81345]">{o.status === 'cancelled' ? '0' : formatNumber(o.bcoins)} <span className="text-[13px]">Bcoins</span></p>
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-[72px]">
          <Card title="Purchaser Profile" icon={User} aside={buyerLive.length > 1 && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Repeat buyer</span>}>
            <div className="flex items-center gap-3">
              {buyer.avatar ? <img src={buyer.avatar} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF0FA] text-[14px] font-bold text-[#8E35B5]">{initials(buyer.name)}</span>}
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-neutral-900">{buyer.name}</p>
                {buyer.username && <p className="truncate text-[11.5px] text-[#E8194E]">@{buyer.username}</p>}
                {buyer.since && <p className="text-[10.5px] text-neutral-500">Member since {new Date(buyer.since).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>}
              </div>
            </div>
            <div className="mt-3 divide-y divide-neutral-100 rounded-xl bg-[#F6F7FD] px-3">
              <Row label="Email">{buyer.email || '—'}</Row>
              <Row label="Phone">{buyer.phone || '—'}</Row>
              <Row label="Wallet balance">{extra.balance === null ? '—' : `${formatNumber(extra.balance)} Bcoins`}</Row>
              <Row label="Gift card orders">{extra.orders.length ? `${formatNumber(extra.orders.length)} (${inr(buyerLive.reduce((s, x) => s + (Number(x.amount) || 0), 0))} lifetime)` : '—'}</Row>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={!buyerId} onClick={() => navigate(`/users/${buyerId}`)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#EEF0FA] text-[12px] font-bold text-neutral-800 hover:bg-[#E2E5F4] disabled:opacity-50">Full profile <ArrowRight className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={!buyerId} onClick={() => navigate(`/wallets/${buyerId}`)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#EEF0FA] text-[12px] font-bold text-neutral-800 hover:bg-[#E2E5F4] disabled:opacity-50">Vault ledger <Wallet className="h-3.5 w-3.5" /></button>
            </div>
          </Card>

          <Card title="Wallet Ledger Links" icon={Coins} aside={<span className={clsx('h-2 w-2 rounded-full', o.status === 'cancelled' ? 'bg-rose-500' : 'bg-emerald-500')} />}>
            <div className="space-y-2.5">
              <div className="rounded-xl bg-[#F6F7FD] p-3">
                <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Purchase debit</p><span className="text-[10px] font-bold text-emerald-600">Settled</span></div>
                <p className="mt-1 text-[15px] font-extrabold text-neutral-900">−{formatNumber(o.bcoins)} Bcoins</p>
                <p className="font-mono text-[10.5px] text-neutral-500">{idOf(o.wallet_transaction_id) || '—'}</p>
                {debitTx?.description && <p className="mt-0.5 text-[11px] text-neutral-500">{debitTx.description}</p>}
              </div>
              {o.status === 'cancelled' && (
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Refund credit</p><span className="text-[10px] font-bold text-emerald-700">Settled</span></div>
                  <p className="mt-1 text-[15px] font-extrabold text-emerald-700">+{formatNumber(o.bcoins)} Bcoins</p>
                  <p className="font-mono text-[10.5px] text-emerald-700/70">{idOf(o.refund_transaction_id) || '—'}</p>
                </div>
              )}
              {expiry && o.status === 'completed' && (
                <div className={clsx('rounded-xl p-3', daysLeft < 0 ? 'bg-rose-50' : 'bg-amber-50')}>
                  <p className={clsx('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide', daysLeft < 0 ? 'text-rose-700' : 'text-amber-700')}><CalendarClock className="h-3.5 w-3.5" />Voucher validity</p>
                  <p className={clsx('mt-1 text-[11.5px]', daysLeft < 0 ? 'text-rose-800' : 'text-amber-800')}>{daysLeft < 0 ? 'Expired on ' : 'Valid until '}<b>{formatDateTime(o.expiry_date)}</b>{daysLeft >= 0 && ` · ${daysLeft} days left`}. Redemption happens on the vendor's side.</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Admin Actions" icon={ShieldCheck}>
            <div className="space-y-2">
              {o.status === 'pending' && <button type="button" onClick={runStart} disabled={!!busy} className="flex w-full items-center justify-between rounded-xl bg-[#F1F3FC] px-3.5 py-2.5 text-[12.5px] font-bold text-neutral-800 hover:bg-[#E9EBFA] disabled:opacity-60"><span className="flex items-center gap-2"><Play className="h-4 w-4 text-[#8E35B5]" />Start processing</span><ArrowRight className="h-3.5 w-3.5" /></button>}
              {o.status === 'processing' && <button type="button" onClick={() => navigate(`/gift-card-orders/${o._id}/process`)} className="flex w-full items-center justify-between rounded-xl bg-[#F1F3FC] px-3.5 py-2.5 text-[12.5px] font-bold text-neutral-800 hover:bg-[#E9EBFA]"><span className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-[#8E35B5]" />Enter code & deliver</span><ArrowRight className="h-3.5 w-3.5" /></button>}
              <button type="button" onClick={() => navigate(`/gift-card-orders?card=${idOf(o.gift_card_id)}`)} className="flex w-full items-center justify-between rounded-xl bg-[#F1F3FC] px-3.5 py-2.5 text-[12.5px] font-bold text-neutral-800 hover:bg-[#E9EBFA]"><span className="flex items-center gap-2"><Receipt className="h-4 w-4 text-[#8E35B5]" />Other orders for this card</span><ArrowRight className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => navigate(`/gift-cards/${idOf(o.gift_card_id)}`)} className="flex w-full items-center justify-between rounded-xl bg-[#F1F3FC] px-3.5 py-2.5 text-[12.5px] font-bold text-neutral-800 hover:bg-[#E9EBFA]"><span className="flex items-center gap-2"><Gift className="h-4 w-4 text-[#8E35B5]" />Open gift card</span><ArrowRight className="h-3.5 w-3.5" /></button>
              {o.status === 'pending' && <button type="button" onClick={() => setConfirmCancel(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#E8194E] text-[13px] font-bold text-white hover:bg-[#C81345]"><XCircle className="h-4 w-4" />Cancel & refund Bcoins</button>}
              {o.status === 'processing' && <p className="flex items-start gap-1.5 rounded-lg bg-[#F6F7FD] px-3 py-2 text-[11px] text-neutral-500"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />Orders can only be cancelled while pending.</p>}
            </div>
          </Card>
        </div>
      </div>

      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => !busy && setConfirmCancel(false)} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50"><XCircle className="h-5 w-5 text-rose-500" /></span>
            <h2 className="mt-4 font-display text-[17px] font-bold text-neutral-900">Cancel {orderRef(o._id)}?</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500"><b className="text-neutral-800">{formatNumber(o.bcoins)} Bcoins</b> go back to {buyer.name}'s wallet and they're notified. This can't be undone.</p>
            <div className="mt-5 flex gap-2.5">
              <button type="button" onClick={() => setConfirmCancel(false)} disabled={!!busy} className="h-10 flex-1 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50">Keep order</button>
              <button type="button" onClick={runCancel} disabled={!!busy} className="h-10 flex-1 rounded-xl bg-[#C81345] text-[13px] font-bold text-white hover:bg-[#A50F39] disabled:opacity-60">{busy === 'cancel' ? 'Cancelling…' : 'Cancel & refund'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </div>
  );
}
