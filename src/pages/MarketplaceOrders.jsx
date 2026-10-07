import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertTriangle, Ban, ClipboardList, Download, Eye, IndianRupee, MoreVertical, Package, ShoppingCart, X } from 'lucide-react';
import {
  Chip, Delta, OutlineButton, ORDER_STATUS, PAYMENT_STATUS, PageHeader, Pager, RefreshButton, SearchInput, Select, StatCard, StateRow, Th, inr,
} from '../components/MarketplaceKit.jsx';
import { Avatar, Toast, humanize } from '../components/MarketplaceShared.jsx';
import { CANCELLABLE, CancelOrderModal, buyerOf } from '../components/OrderShared.jsx';
import { useAbortableFetch, useDebouncedValue, useSellerOptions, useUrlParam } from '../hooks/useCatalogQuery.js';
import useOrderCancel from '../hooks/useOrderCancel.js';
import { fetchAdminOrders } from '../store/marketplaceSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const SLA_HOURS = 48;

const STATUS_OPTIONS = [{ value: 'all', label: 'All Statuses' }, ...Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: s.label }))];
const PAYMENT_OPTIONS = [{ value: 'all', label: 'All Payments' }, ...Object.entries(PAYMENT_STATUS).map(([value, s]) => ({ value, label: s.label }))];

const ItemThumb = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-[#EEF0FA]">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        : <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-[#8E35B5]" /></div>}
    </div>
  );
};

const RowMenu = ({ row, onView, onCancel }) => {
  const [open, setOpen] = useState(false);
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50';
  return (
    <div className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Actions for ${row.orderNumber}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-[#EEF0FA]"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={() => { setOpen(false); onView(); }} className={item}><Eye className="h-3.5 w-3.5 text-neutral-400" /> View details</button>
            {CANCELLABLE.includes(row.orderStatus) && <button type="button" onClick={() => { setOpen(false); onCancel(); }} className={clsx(item, 'text-red-600 hover:bg-red-50')}><Ban className="h-3.5 w-3.5" /> Cancel order</button>}
          </div>
        </>
      )}
    </div>
  );
};

const MarketplaceOrders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total, status: loadStatus, error } = useSelector((s) => s.marketplace.orders);
  const influencers = useSelector((s) => s.marketplace.influencers.items);
  const [seller, setSeller] = useUrlParam('seller');
  const [buyer, setBuyer] = useUrlParam('buyer');
  const [refundFailed, setRefundFailed] = useUrlParam('refund_failed');
  const refundFailedOnly = refundFailed === 'true';
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const sellerOptions = useSellerOptions(seller);
  const cancel = useOrderCancel();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const params = { seller, buyer, status, payment_status: paymentStatus, refund_failed: refundFailedOnly ? 'true' : 'all', q: debouncedSearch };
  useAbortableFetch(fetchAdminOrders, params);
  useEffect(() => { setPage(1); }, [seller, buyer, status, paymentStatus, refundFailedOnly, debouncedSearch]);

  const storeNames = useMemo(() => new Map(influencers.map((u) => [String(u._id), u.influencer_profile?.store_name || u.full_name || u.username])), [influencers]);

  const rows = useMemo(() => items.map((order) => {
    const orderBuyer = buyerOf(order);
    const lineItems = Array.isArray(order.items) ? order.items : [];
    const sellerIds = Array.from(new Set(lineItems.map((i) => String(i.seller_id?._id || i.seller_id))));
    return {
      id: String(order._id),
      orderNumber: order.order_number,
      buyerId: orderBuyer.id,
      buyer: orderBuyer.fullName || orderBuyer.username || 'Unknown buyer',
      buyerUsername: orderBuyer.username,
      buyerAvatar: orderBuyer.avatar ? toAbsoluteMediaUrl(orderBuyer.avatar) : '',
      firstItem: lineItems[0]?.name || '—',
      firstImage: lineItems[0]?.image ? toAbsoluteMediaUrl(lineItems[0].image) : '',
      variant: [lineItems[0]?.variant?.size, lineItems[0]?.variant?.color].filter(Boolean).join(' · '),
      itemCount: lineItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
      extraLines: Math.max(0, lineItems.length - 1),
      sellerIds,
      sellers: sellerIds.map((sid) => storeNames.get(sid) || 'Unknown seller').join(', '),
      total: Number(order.total_amount) || 0,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      refundFailed: !!order.refund_failed,
      placedAt: order.placed_at || order.createdAt,
      raw: order,
    };
  }), [items, storeNames]);

  const stats = useMemo(() => {
    const now = Date.now();
    let recent = 0;
    let prior = 0;
    let paidValue = 0;
    let paid = 0;
    let failed = 0;
    let slaBreach = 0;
    let toFulfil = 0;
    rows.forEach((r) => {
      const t = new Date(r.placedAt).getTime();
      if (t > now - 7 * DAY_MS) recent += 1;
      else if (t > now - 14 * DAY_MS) prior += 1;
      if (r.paymentStatus === 'paid') { paid += 1; paidValue += r.total; }
      if (r.paymentStatus === 'failed') failed += 1;
      if (CANCELLABLE.includes(r.orderStatus)) {
        toFulfil += 1;
        if (t < now - SLA_HOURS * 3600 * 1000) slaBreach += 1;
      }
    });
    return {
      weekly: prior ? ((recent - prior) / prior) * 100 : null,
      recent,
      paidValue,
      successRate: paid + failed ? (paid / (paid + failed)) * 100 : null,
      toFulfil,
      slaBreach,
      refundFailed: rows.filter((r) => r.refundFailed).length,
    };
  }, [rows]);

  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const truncated = total > items.length;
  const buyerLabel = rows.find((r) => r.buyerId === buyer)?.buyer || 'Selected buyer';

  const exportCsv = () => downloadCsv(`marketplace-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Order number', 'Placed', 'Buyer', 'Buyer username', 'Items', 'Units', 'Sellers', 'Total (INR)', 'Payment method', 'Payment status', 'Order status', 'Refund failed'],
    ...rows.map((r) => [r.orderNumber, r.placedAt ? new Date(r.placedAt).toISOString() : '', r.buyer, r.buyerUsername, r.firstItem + (r.extraLines ? ` +${r.extraLines} more` : ''), r.itemCount, r.sellers, r.total, r.paymentMethod, r.paymentStatus, r.orderStatus, r.refundFailed ? 'yes' : 'no']),
  ]);

  return (
    <>
      <div className="space-y-5">
        <PageHeader eyebrow="Marketplace" section="Live Order Stream" title="Orders"
          description={truncated
            ? `Showing the newest ${formatNumber(items.length)} of ${formatNumber(total)} matching orders. Narrow the filters to see older ones.`
            : 'Every marketplace order across all buyers and sellers. Open an order to update its status or cancel it.'}>
          <OutlineButton icon={Download} onClick={exportCsv} disabled={!rows.length}>Export CSV</OutlineButton>
        </PageHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Matching Orders" value={formatNumber(total)} icon={ShoppingCart} tone="pink" foot={stats.weekly !== null ? <><Delta value={stats.weekly} /> vs previous 7 days</> : <>{formatNumber(stats.recent)} placed in the last 7 days</>} />
          <StatCard label="To Fulfil" value={formatNumber(stats.toFulfil)} icon={ClipboardList} tone="violet" foot={<>{stats.toFulfil > 0 && <Chip tone="purple">Action needed</Chip>}{stats.slaBreach > 0 ? <span className="text-rose-600">{formatNumber(stats.slaBreach)} older than {SLA_HOURS}h</span> : 'pending · confirmed · processing'}</>} />
          <StatCard label="Refund Failed" value={formatNumber(stats.refundFailed)} icon={AlertTriangle} tone="rose" valueClass={stats.refundFailed ? 'text-[#E8194E]' : undefined} foot={stats.refundFailed ? <><Chip tone="rose">Critical</Chip> needs a manual refund</> : 'All refunds processed'} />
          <StatCard label="Paid Value" value={inr(stats.paidValue)} icon={IndianRupee} tone="indigo" foot={stats.successRate !== null ? <><Chip tone="lavender">{stats.successRate.toFixed(1)}%</Chip> payment success rate</> : 'From paid orders'} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search order number or Razorpay payment ID…" />
            <button type="button" onClick={() => setRefundFailed(refundFailedOnly ? 'all' : 'true')} aria-pressed={refundFailedOnly}
              className={clsx('inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-bold uppercase tracking-wide transition',
                refundFailedOnly ? 'border-rose-300 bg-rose-100 text-rose-700 shadow-[0_6px_14px_-8px_rgba(225,29,72,0.6)]' : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100')}>
              <AlertTriangle className="h-3.5 w-3.5" /> Refund failed
              {stats.refundFailed > 0 && <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E8194E] px-1 text-[10px] text-white">{stats.refundFailed}</span>}
              {refundFailedOnly && <X className="h-3.5 w-3.5" />}
            </button>
            <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <Select value={paymentStatus} onChange={setPaymentStatus} options={PAYMENT_OPTIONS} />
            <Select value={seller} onChange={setSeller} options={sellerOptions} className="min-w-[180px]" />
            {buyer !== 'all' && (
              <button type="button" onClick={() => setBuyer('all')} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#E2E5F4] bg-white px-3 text-[12.5px] font-semibold text-neutral-800 hover:bg-neutral-50">Buyer: {buyerLabel}<X className="h-3.5 w-3.5 text-neutral-500" /></button>
            )}
            <RefreshButton onClick={() => dispatch(fetchAdminOrders(params))} spinning={loadStatus === 'loading'} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  {['Order ID & date', 'Buyer', 'Items', 'Seller', 'Total', 'Payment', 'Status'].map((h) => <Th key={h}>{h}</Th>)}
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loadStatus === 'loading' && !rows.length ? <StateRow colSpan={8} loading message="Loading orders…" />
                  : !visible.length ? <StateRow colSpan={8} icon={ShoppingCart} message={error ? `Error: ${error}` : 'No orders found'} />
                    : visible.map((r) => {
                      const os = ORDER_STATUS[r.orderStatus] || ORDER_STATUS.pending;
                      const ps = PAYMENT_STATUS[r.paymentStatus] || PAYMENT_STATUS.pending;
                      return (
                        <tr key={r.id} onClick={() => navigate(`/marketplace/orders/${r.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', r.refundFailed && 'bg-rose-50/70')}>
                          <td className="px-4 py-3">
                            <p className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">
                              {r.refundFailed && <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" title="Refund failed" />}{r.orderNumber}
                            </p>
                            <p className="mt-0.5 whitespace-nowrap text-[11px] text-neutral-500">{formatDateTime(r.placedAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Avatar src={r.buyerAvatar} name={r.buyer} size="w-8 h-8" />
                              <div className="min-w-0">
                                <p className="max-w-[140px] truncate text-[13px] font-semibold text-neutral-900">{r.buyer}</p>
                                {r.buyerUsername && <p className="max-w-[140px] truncate text-[11px] text-neutral-500">@{r.buyerUsername}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 max-w-[240px] items-center gap-2.5">
                              <ItemThumb src={r.firstImage} />
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-neutral-800">{r.firstItem}</p>
                                <p className="truncate text-[11px] text-neutral-500">{r.itemCount} {r.itemCount === 1 ? 'unit' : 'units'}{r.variant && ` · ${r.variant}`}{r.extraLines > 0 && <span className="font-semibold text-[#8E35B5]"> · +{r.extraLines} more</span>}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={(e) => { e.stopPropagation(); if (r.sellerIds[0]) setSeller(r.sellerIds[0]); }} title={r.sellers} className="max-w-[170px] truncate text-left text-[13px] font-medium text-neutral-700 hover:text-[#C81345]">{r.sellers}</button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13.5px] font-extrabold text-neutral-900">{inr(r.total)}</td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold', ps.cls)}>{ps.label}</span>
                            <p className="mt-0.5 text-[10.5px] text-neutral-500">{r.refundFailed ? <span className="font-semibold text-rose-600">Refund failed</span> : humanize(r.paymentMethod)}</p>
                          </td>
                          <td className="px-4 py-3"><span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', os.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', os.dot)} />{os.label}</span></td>
                          <td className="px-4 py-3"><RowMenu row={r} onView={() => navigate(`/marketplace/orders/${r.id}`)} onCancel={() => cancel.open(r.raw)} /></td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={rows.length} noun="orders" />
        </div>
      </div>

      {stats.refundFailed > 0 && !refundFailedOnly && !alertDismissed && !cancel.toast && (
        <div className="fixed bottom-6 right-6 z-40 flex max-w-sm items-start gap-3 rounded-xl border border-rose-200 bg-white p-3.5 shadow-[0_18px_40px_-16px_rgba(225,29,72,0.45)]">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600"><AlertTriangle className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-neutral-900">Refund alert</p>
            <p className="text-[11.5px] text-neutral-500">{formatNumber(stats.refundFailed)} cancelled order{stats.refundFailed === 1 ? '' : 's'} could not be refunded automatically.</p>
            <button type="button" onClick={() => setRefundFailed('true')} className="mt-1 text-[11.5px] font-bold text-[#C81345] hover:underline">Review now →</button>
          </div>
          <button type="button" onClick={() => setAlertDismissed(true)} aria-label="Dismiss" className="rounded-md p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><X className="h-4 w-4" /></button>
        </div>
      )}

      <CancelOrderModal order={cancel.target} onClose={cancel.close} onConfirm={cancel.confirm} loading={cancel.loading} />
      {cancel.toast && <Toast message={cancel.toast.message} tone={cancel.toast.tone} />}
    </>
  );
};

export default MarketplaceOrders;
