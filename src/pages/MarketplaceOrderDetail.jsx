import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertCircle, AlertOctagon, ArrowLeft, Ban, Check, CheckCircle2, ClipboardCheck, Copy, CreditCard, ExternalLink, Loader2, Mail, MapPin,
  Package, PackageCheck, Phone, Printer, Receipt, Save, ShieldCheck, ShoppingBag, Store, Truck, Wallet, XCircle,
} from 'lucide-react';
import { FieldSelect, ORDER_STATUS, PAYMENT_STATUS, inr } from '../components/MarketplaceKit.jsx';
import { Avatar, Toast, humanize } from '../components/MarketplaceShared.jsx';
import { CANCELLABLE, CancelOrderModal, ORDER_FLOW, buyerOf } from '../components/OrderShared.jsx';
import useOrderCancel from '../hooks/useOrderCancel.js';
import { fetchInfluencers, fetchMarketplaceOrder, updateOrderStatus } from '../store/marketplaceSlice.js';
import { formatDateTime } from '../utils/helpers.jsx';
import { toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || '') : ref ? String(ref) : '');
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const field = 'h-10 w-full rounded-lg border border-transparent bg-[#F1F3FC] px-3 text-[13px] text-neutral-900 outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10';
const label = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-neutral-600';

const Card = ({ title, icon: Icon, aside, children, className, bodyClass = 'p-5' }) => (
  <section className={clsx('overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}>
    {title && (
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5">
        <h2 className="flex items-center gap-2 font-display text-[14.5px] font-bold text-neutral-900">{Icon && <Icon className="h-4 w-4 text-[#E8194E]" />}{title}</h2>
        {aside}
      </div>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
);

const Row = ({ label: l, children, mono }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 text-[12.5px]">
    <span className="flex-shrink-0 text-neutral-500">{l}</span>
    <span className={clsx('min-w-0 break-all text-right font-semibold text-neutral-800', mono && 'font-mono text-[11.5px]')}>{children ?? '—'}</span>
  </div>
);

const ItemThumb = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-[#EEF0FA]">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        : <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-[#8E35B5]" /></div>}
    </div>
  );
};

// There is no "mark refunded" API yet, so this only tells the admin what to do.
const RefundFailedAlert = ({ order }) => (
  <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
    <AlertOctagon className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
    <div className="min-w-0 space-y-2">
      <p className="text-[14px] font-bold text-rose-900">Automatic refund failed</p>
      <p className="text-[13px] text-rose-800">This order was cancelled but the Razorpay refund of {inr(order.total_amount)} did not go through. The buyer has been told their refund is being processed manually.</p>
      {order.refund_error && (
        <div className="rounded-xl border border-rose-100 bg-white/70 px-3.5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Refund error</p>
          <p className="mt-0.5 break-words text-[13px] text-rose-900">{order.refund_error}</p>
        </div>
      )}
      <p className="text-[13px] text-rose-800">
        <span className="font-semibold">Mark as refunded manually:</span> issue the refund from the Razorpay dashboard
        {order.razorpay_payment_id ? <> for payment <span className="font-mono text-xs">{order.razorpay_payment_id}</span></> : ''}.
        The dashboard can't update this order's payment status yet, so it will keep showing as paid.
      </p>
    </div>
  </div>
);

const buildTimeline = (order) => {
  const status = order.order_status;
  const reached = (s) => ORDER_FLOW.indexOf(status) >= ORDER_FLOW.indexOf(s);
  const steps = [
    { key: 'placed', title: 'Order placed', note: `${order.items?.length || 0} line item(s) · ${inr(order.total_amount)}`, at: order.placed_at || order.createdAt, done: true, icon: ShoppingBag },
    {
      key: 'paid',
      title: order.payment_status === 'paid' || order.payment_status === 'refunded' ? `Payment captured via ${humanize(order.payment_method)}` : `Payment ${order.payment_status}`,
      note: order.payment_method === 'razorpay' ? order.razorpay_payment_id || 'Awaiting Razorpay confirmation' : 'Debited from buyer wallet',
      done: ['paid', 'refunded'].includes(order.payment_status),
      failed: order.payment_status === 'failed',
      icon: CreditCard,
    },
    { key: 'confirmed', title: 'Order confirmed', note: order.confirmed_items ? 'Seller confirmed items are available' : 'Seller confirms item availability', done: order.confirmed_items || reached('confirmed'), icon: ClipboardCheck },
    { key: 'packed', title: 'Packed & ready to ship', note: 'Seller packs the order', done: order.packed || reached('shipped'), icon: PackageCheck },
    { key: 'shipped', title: order.courier ? `Shipped with ${order.courier}` : 'Shipped', note: order.tracking_number ? `Tracking ${order.tracking_number}` : 'Courier and tracking added on dispatch', at: order.shipped_at, done: reached('shipped'), icon: Truck },
    { key: 'delivered', title: 'Delivered', note: 'Handed over to the buyer', at: order.delivered_at, done: reached('delivered'), icon: CheckCircle2 },
  ];
  if (status === 'cancelled') {
    const cut = steps.filter((s) => s.done);
    cut.push({ key: 'cancelled', title: 'Order cancelled', note: order.cancelled_reason || 'No reason given', at: order.cancelled_at, done: true, failed: true, icon: XCircle });
    return cut;
  }
  return steps;
};

const Timeline = ({ order }) => {
  const steps = buildTimeline(order);
  const currentIndex = steps.findIndex((s) => !s.done);
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const current = i === currentIndex;
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span className={clsx('absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5', s.done && steps[i + 1].done ? 'bg-[#E8194E]/60' : 'bg-neutral-200')} />}
            <span className={clsx('relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
              s.failed ? 'bg-rose-100 text-rose-600' : s.done ? 'bg-gradient-to-br from-[#E8194E] to-[#8E35B5] text-white' : current ? 'bg-pink-50 text-[#E8194E] ring-2 ring-[#E8194E]/40' : 'bg-neutral-100 text-neutral-400')}>
              <Icon className="h-4 w-4" />
            </span>
            <div className={clsx('min-w-0 flex-1', current && 'rounded-xl bg-pink-50/70 px-3 py-2 -mt-1')}>
              <div className="flex flex-wrap items-center justify-between gap-x-3">
                <p className={clsx('text-[13px] font-bold', s.failed ? 'text-rose-700' : s.done || current ? 'text-neutral-900' : 'text-neutral-400')}>{s.title}</p>
                {current && <span className="text-[10px] font-bold uppercase tracking-wide text-[#E8194E]">Next step</span>}
                {s.at && s.done && <span className="text-[11px] text-neutral-500">{formatDateTime(s.at)}</span>}
              </div>
              <p className={clsx('break-words text-[11.5px]', s.done || current ? 'text-neutral-500' : 'text-neutral-400')}>{s.note}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const AdminControls = ({ order, onCancel }) => {
  const dispatch = useDispatch();
  const updating = useSelector((s) => !!s.marketplace.orderUpdating[String(order._id)]);
  const current = ORDER_FLOW.indexOf(order.order_status);
  // Forward moves only; 'shipped' stays selectable while shipped so courier/tracking can be corrected.
  const options = order.order_status === 'cancelled' ? [] : ORDER_FLOW.slice(Math.max(1, order.order_status === 'shipped' ? current : current + 1));

  const [nextStatus, setNextStatus] = useState(options[0] || '');
  const [courier, setCourier] = useState(order.courier || '');
  const [tracking, setTracking] = useState(order.tracking_number || '');
  const [confirmed, setConfirmed] = useState(!!order.confirmed_items);
  const [packed, setPacked] = useState(!!order.packed);
  const [notify, setNotify] = useState(order.notify_customer !== false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setNextStatus(options[0] || '');
    setCourier(order.courier || '');
    setTracking(order.tracking_number || '');
    setConfirmed(!!order.confirmed_items);
    setPacked(!!order.packed);
  },[order.order_status, order.courier, order.tracking_number, order.confirmed_items, order.packed]);

  const showShipping = nextStatus === 'shipped' || nextStatus === 'delivered';
  const missingShipping = nextStatus === 'shipped' && (!courier.trim() || !tracking.trim());

  const submit = async () => {
    const body = { id: String(order._id), order_status: nextStatus, notify_customer: notify, confirmed_items: confirmed, packed };
    if (showShipping) { body.courier = courier.trim(); body.tracking_number = tracking.trim(); }
    try {
      await dispatch(updateOrderStatus(body)).unwrap();
      setToast({ message: `Order marked as ${humanize(nextStatus).toLowerCase()}`, tone: 'success' });
    } catch (message) {
      setToast({ message: message || 'Failed to update order', tone: 'error' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const canCancel = CANCELLABLE.includes(order.order_status);
  const paid = order.payment_status === 'paid';

  return (
    <Card title="Administrative Controls" icon={ShieldCheck}>
      {options.length > 0 ? (
        <div className="space-y-3">
          <div>
            <label className={label}>Order status</label>
            <FieldSelect value={nextStatus} onChange={setNextStatus} options={options.map((s) => ({ value: s, label: ORDER_STATUS[s]?.label || humanize(s), dot: ORDER_STATUS[s]?.dot }))} />
          </div>
          {showShipping && (
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label}>Courier {nextStatus === 'shipped' && <span className="text-rose-500">*</span>}</label><input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Blue Dart" className={field} /></div>
              <div><label className={label}>Tracking no. {nextStatus === 'shipped' && <span className="text-rose-500">*</span>}</label><input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="BD123456" className={field} /></div>
            </div>
          )}
          <div className="space-y-2 rounded-xl bg-[#F6F7FD] px-3 py-2.5">
            {[['Items confirmed', confirmed, setConfirmed], ['Packed', packed, setPacked], ['Notify the buyer', notify, setNotify]].map(([text, value, set]) => (
              <label key={text} className="flex cursor-pointer select-none items-center justify-between gap-2 text-[12.5px] font-medium text-neutral-700">
                {text}
                <button type="button" role="switch" aria-checked={value} onClick={() => set(!value)} className={clsx('relative h-5 w-9 rounded-full transition', value ? 'bg-[#E8194E]' : 'bg-neutral-300')}>
                  <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', value ? 'left-[18px]' : 'left-0.5')} />
                </button>
              </label>
            ))}
          </div>
          <button type="button" onClick={submit} disabled={updating || !nextStatus || missingShipping} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-[13px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50">
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </button>
        </div>
      ) : (
        <p className="text-[12.5px] text-neutral-500">{order.order_status === 'cancelled' ? 'This order was cancelled and can no longer be updated.' : 'This order has been delivered. No further status changes are possible.'}</p>
      )}

      {canCancel && (
        <button type="button" onClick={onCancel} disabled={updating} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 text-[13px] font-bold text-[#E8194E] transition hover:bg-rose-100 disabled:opacity-50">
          <Ban className="h-4 w-4" /> {paid ? 'Cancel & refund' : 'Cancel order'}
        </button>
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </Card>
  );
};

const printInvoice = (order, buyer, storeNames) => {
  const address = order.shipping_address || {};
  const rows = (order.items || []).map((item) => `
    <tr><td>${escapeHtml(item.name)}${item.variant?.size || item.variant?.color ? `<br><small>${escapeHtml([item.variant.color, item.variant.size].filter(Boolean).join(' / '))}</small>` : ''}</td>
    <td>${escapeHtml(storeNames.get(idOf(item.seller_id)) || '')}</td><td class="r">${item.quantity}</td><td class="r">${escapeHtml(inr(item.unit_price))}</td><td class="r">${escapeHtml(inr(item.subtotal))}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(order.order_number)}</title>
  <style>body{font-family:Arial,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}.r{text-align:right}.muted{color:#666;font-size:12px}.grid{display:flex;justify-content:space-between;gap:24px;margin-top:16px;font-size:13px}
  .tot td{border:none;padding:4px 8px}</style></head><body>
  <h1>Invoice · ${escapeHtml(order.order_number)}</h1><p class="muted">Placed ${escapeHtml(formatDateTime(order.placed_at || order.createdAt))} · Payment: ${escapeHtml(humanize(order.payment_method))} (${escapeHtml(order.payment_status)})</p>
  <div class="grid"><div><b>Bill / ship to</b><br>${escapeHtml(address.name || buyer.fullName || buyer.username)}<br>${[address.address_line1, address.address_line2, [address.city, address.state, address.pincode].filter(Boolean).join(', '), address.country].filter(Boolean).map(escapeHtml).join('<br>')}<br>${escapeHtml(address.phone)}</div>
  <div class="r"><b>Order status</b><br>${escapeHtml(humanize(order.order_status))}${order.tracking_number ? `<br>${escapeHtml(order.courier)} · ${escapeHtml(order.tracking_number)}` : ''}</div></div>
  <table><thead><tr><th>Item</th><th>Seller</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
  <table class="tot"><tr><td class="r">Subtotal</td><td class="r" style="width:120px">${escapeHtml(inr(order.subtotal_amount))}</td></tr>
  <tr><td class="r">Shipping</td><td class="r">${order.shipping_fee ? escapeHtml(inr(order.shipping_fee)) : 'Free'}</td></tr>
  <tr><td class="r"><b>Total</b></td><td class="r"><b>${escapeHtml(inr(order.total_amount))}</b></td></tr></table>
  <script>window.onload=function(){window.print()}</script></body></html>`;
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
};

const MarketplaceOrderDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { item: order, status, error } = useSelector((s) => s.marketplace.order);
  const { items: influencers, status: influencersStatus } = useSelector((s) => s.marketplace.influencers);
  const cancel = useOrderCancel();
  const [copied, setCopied] = useState('');
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => { if (id) dispatch(fetchMarketplaceOrder(id)); }, [dispatch, id]);
  useEffect(() => { if (influencersStatus === 'idle') dispatch(fetchInfluencers()); }, [dispatch, influencersStatus]);

  const storeNames = useMemo(() => new Map(influencers.map((u) => [String(u._id), u.influencer_profile?.store_name || u.full_name || u.username])), [influencers]);

  const isLoading = status === 'idle' || status === 'loading';
  const breadcrumb = (
    <nav className="flex flex-wrap items-center gap-1.5 text-[12px]">
      <Link to="/marketplace/orders" className="inline-flex items-center gap-1 font-bold text-[#C81345] hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Back to Orders</Link>
      <span className="text-neutral-300">/</span><span className="text-neutral-500">Marketplace</span>
      {order && <><span className="text-neutral-300">/</span><span className="font-semibold text-neutral-900">Order {order.order_number}</span></>}
    </nav>
  );

  if (isLoading || error || !order) {
    return (
      <div className="space-y-6">
        {breadcrumb}
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-neutral-400">
          {isLoading ? <><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm font-medium">Loading order…</p></>
            : <><AlertCircle className="h-8 w-8 text-rose-400" /><p className="font-semibold text-neutral-800">Could not load this order</p><p className="text-sm">{error || 'Not found'}</p></>}
        </div>
      </div>
    );
  }

  const buyer = buyerOf(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.shipping_address || {};
  const os = ORDER_STATUS[order.order_status] || ORDER_STATUS.pending;
  const ps = PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS.pending;
  const units = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const sellers = [...new Set(items.map((i) => idOf(i.seller_id)))];

  const copy = (key, value) => {
    navigator.clipboard?.writeText(String(value)).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500); }).catch(() => {});
  };
  const CopyBtn = ({ k, value }) => (value ? (
    <button type="button" onClick={() => copy(k, value)} title="Copy" className="ml-1 inline-flex align-middle text-neutral-400 hover:text-[#C81345]">
      {copied === k ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
    </button>
  ) : null);

  return (
    <div className="space-y-5 pb-10">
      {breadcrumb}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[24px] font-bold tracking-tight text-neutral-900">Order {order.order_number}</h1>
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', os.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', os.dot)} />{os.label}</span>
            <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-bold', ps.cls)}>{ps.label} via {humanize(order.payment_method)}</span>
            {order.refund_failed && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700"><AlertOctagon className="h-3 w-3" />Refund failed</span>}
          </div>
          <p className="mt-1 text-[12.5px] text-neutral-500">Placed {formatDateTime(order.placed_at || order.createdAt)} · <span className="font-semibold text-[#8E35B5]">Last updated {formatDateTime(order.updatedAt)}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPopupBlocked(!printInvoice(order, buyer, storeNames))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md"><Printer className="h-4 w-4 text-[#8E35B5]" /> Print Invoice</button>
          <button type="button" onClick={() => navigate(`/marketplace/orders?buyer=${buyer.id}`)} disabled={!buyer.id} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><Receipt className="h-4 w-4 text-[#8E35B5]" /> Buyer's Orders</button>
          {CANCELLABLE.includes(order.order_status) && (
            <button type="button" onClick={() => cancel.open(order)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[12.5px] font-bold text-[#E8194E] transition hover:-translate-y-0.5 hover:bg-rose-100"><Ban className="h-4 w-4" /> {order.payment_status === 'paid' ? 'Cancel & Refund' : 'Cancel Order'}</button>
          )}
        </div>
      </div>
      {popupBlocked && <p className="text-[12px] font-semibold text-amber-700">Your browser blocked the invoice window. Allow pop-ups for this site and try again.</p>}

      {order.refund_failed && <RefundFailedAlert order={order} />}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <Card title="Purchased Line Items" icon={ShoppingBag} bodyClass="" aside={<span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{items.length} item{items.length === 1 ? '' : 's'} · {units} unit{units === 1 ? '' : 's'}{sellers.length > 1 ? ` · ${sellers.length} sellers` : ''}</span>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="bg-[#F7F8FD]">
                    {['Product', 'Seller', 'Qty', 'Unit price', 'Total'].map((h, i) => <th key={h} className={clsx('px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600', i >= 2 && 'text-right')}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map((item, index) => {
                    const variant = [item.variant?.color, item.variant?.size].filter(Boolean).join(' / ');
                    const sid = idOf(item.seller_id);
                    return (
                      <tr key={`${idOf(item.product_id)}-${index}`} className="group transition-colors hover:bg-[#FDF2F6]">
                        <td className="px-5 py-3">
                          <button type="button" onClick={() => navigate(`/marketplace/products/${idOf(item.product_id)}`)} className="flex min-w-0 items-center gap-3 text-left">
                            <ItemThumb src={item.image ? toAbsoluteMediaUrl(item.image) : ''} />
                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate text-[13px] font-bold text-neutral-900 group-hover:text-[#C81345]">{item.name}</p>
                              {variant && <p className="text-[11px] text-neutral-500">{variant}</p>}
                            </div>
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <button type="button" onClick={() => sid && navigate(`/marketplace/influencers/${sid}/products`)} className="inline-flex max-w-[160px] items-center gap-1 truncate text-[12.5px] font-semibold text-neutral-700 hover:text-[#C81345]"><Store className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />{storeNames.get(sid) || 'Unknown seller'}</button>
                        </td>
                        <td className="px-5 py-3 text-right text-[13px] font-semibold text-neutral-800">{item.quantity}</td>
                        <td className="px-5 py-3 text-right text-[13px] text-neutral-700">{inr(item.unit_price)}</td>
                        <td className="px-5 py-3 text-right text-[13px] font-extrabold text-neutral-900">{inr(item.subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-neutral-100 px-5 py-4">
              <div className="w-full max-w-[280px] space-y-1">
                <Row label="Items subtotal">{inr(order.subtotal_amount)}</Row>
                <Row label="Shipping & handling">{order.shipping_fee ? inr(order.shipping_fee) : <span className="text-emerald-600">Free</span>}</Row>
                <div className="mt-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 px-3 py-2.5">
                  <span className="text-[13px] font-bold text-neutral-800">{order.payment_status === 'paid' ? 'Total paid' : 'Order total'}</span>
                  <span className="font-display text-[20px] font-extrabold text-[#C81345]">{inr(order.total_amount)}</span>
                </div>
                <p className="text-right text-[10.5px] text-neutral-500">{order.currency || 'INR'} · {humanize(order.payment_method)}</p>
              </div>
            </div>
          </Card>

          <Card title="Shipment & Live Tracking" icon={Truck} aside={order.tracking_number && <span className="rounded-md bg-pink-50 px-2 py-0.5 font-mono text-[11px] font-bold text-[#C81345]">{order.tracking_number}</span>}>
            <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[['Courier partner', order.courier || 'Not assigned'], ['Tracking number', order.tracking_number || '—'], [order.delivered_at ? 'Delivered on' : 'Shipped on', order.delivered_at || order.shipped_at ? formatDateTime(order.delivered_at || order.shipped_at) : 'Not shipped yet']].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-[#F1F3FC] px-3.5 py-2.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">{l}</p>
                  <p className="mt-0.5 break-words text-[13px] font-bold text-neutral-900">{v}</p>
                </div>
              ))}
            </div>
            <Timeline order={order} />
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-[72px]">
          <Card title="Customer Profile">
            <div className="flex items-center gap-3">
              <Avatar src={buyer.avatar ? toAbsoluteMediaUrl(buyer.avatar) : ''} name={buyer.fullName || buyer.username} size="w-11 h-11" textSize="text-sm" />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-neutral-900">{buyer.fullName || buyer.username || 'Unknown buyer'}</p>
                {buyer.username && <p className="truncate text-[11.5px] text-[#8E35B5]">@{buyer.username}</p>}
              </div>
            </div>
            <div className="mt-3 divide-y divide-neutral-100">
              <Row label={<span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />Phone</span>}>{buyer.phone || address.phone || '—'}</Row>
              <Row label={<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />Email</span>}>{buyer.email || '—'}</Row>
              <Row label="User ID" mono>{buyer.id ? <>{buyer.id.slice(-10)}<CopyBtn k="buyer" value={buyer.id} /></> : '—'}</Row>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={!buyer.id} onClick={() => navigate(`/users/${buyer.id}`)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E2E5F4] bg-[#F1F3FC] text-[12px] font-semibold text-neutral-800 hover:bg-white disabled:opacity-50">View Profile <ExternalLink className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={!buyer.id} onClick={() => navigate(`/marketplace/orders?buyer=${buyer.id}`)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E2E5F4] bg-[#F1F3FC] text-[12px] font-semibold text-neutral-800 hover:bg-white disabled:opacity-50">All Orders</button>
            </div>
          </Card>

          <Card title="Delivery Address" icon={MapPin}>
            <div className="rounded-xl bg-[#F1F3FC] px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-700">
              {address.name && <p className="font-bold text-neutral-900">{address.name}</p>}
              {[address.address_line1, address.address_line2, [address.city, address.state, address.pincode].filter(Boolean).join(', '), address.country].filter(Boolean).map((line) => <p key={line}>{line}</p>)}
              {address.phone && <p className="mt-1 text-neutral-500">{address.phone}</p>}
            </div>
          </Card>

          <Card title="Payment & Security" icon={order.payment_method === 'wallet' ? Wallet : CreditCard}>
            <div className="divide-y divide-neutral-100">
              <Row label="Method">{humanize(order.payment_method)}</Row>
              <Row label="Status"><span className={clsx('rounded-md px-2 py-0.5 text-[11px] font-bold', ps.cls)}>{ps.label}</span></Row>
              {order.order_status === 'cancelled' && (
                <Row label="Refund">{order.refund_failed ? <span className="text-rose-600">Failed</span> : order.payment_status === 'refunded' ? 'Refunded' : order.payment_status === 'paid' ? <span className="text-rose-600">Paid, not refunded</span> : 'Not applicable'}</Row>
              )}
              {order.payment_method === 'razorpay' ? (
                <>
                  <Row label="Razorpay order" mono>{order.razorpay_order_id ? <>{order.razorpay_order_id}<CopyBtn k="rzo" value={order.razorpay_order_id} /></> : '—'}</Row>
                  <Row label="Payment ID" mono>{order.razorpay_payment_id ? <>{order.razorpay_payment_id}<CopyBtn k="rzp" value={order.razorpay_payment_id} /></> : '—'}</Row>
                  {order.razorpay_signature && <Row label="Signature"><span className="inline-flex items-center gap-1 text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" />Verified</span></Row>}
                </>
              ) : (
                <Row label="Wallet txn" mono>{order.wallet_transaction_id ? String(order.wallet_transaction_id) : '—'}</Row>
              )}
              <Row label="Order ID" mono>{String(order._id).slice(-10)}<CopyBtn k="order" value={order._id} /></Row>
            </div>
          </Card>

          <AdminControls order={order} onCancel={() => cancel.open(order)} />
        </div>
      </div>

      <CancelOrderModal order={cancel.target} onClose={cancel.close} onConfirm={cancel.confirm} loading={cancel.loading} />
      {cancel.toast && <Toast message={cancel.toast.message} tone={cancel.toast.tone} />}
    </div>
  );
};

export default MarketplaceOrderDetail;
