import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Ban, Eye, IndianRupee, PackageCheck, ShoppingCart, Truck } from 'lucide-react';
import PremiumResourcePage from '../components/PremiumResourcePage.jsx';
import { Avatar, Thumb, Toast, formatINR, humanize } from '../components/MarketplaceShared.jsx';
import {
  CANCELLABLE, CancelOrderModal, OrderStatusBadge, PaymentStatusBadge, buyerOf,
} from '../components/OrderShared.jsx';
import { useAbortableFetch, useDebouncedValue, useSellerOptions, useUrlParam } from '../hooks/useCatalogQuery.js';
import useOrderCancel from '../hooks/useOrderCancel.js';
import { fetchAdminOrders } from '../store/marketplaceSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  ...['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((value) => ({ value, label: humanize(value) })),
];

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  ...['pending', 'paid', 'failed', 'refunded'].map((value) => ({ value, label: humanize(value) })),
];

const MarketplaceOrders = () => {
  const navigate = useNavigate();
  const { items, total, status: loadStatus, error } = useSelector((s) => s.marketplace.orders);
  const influencers = useSelector((s) => s.marketplace.influencers.items);
  const [seller, setSeller] = useUrlParam('seller');
  const [buyer, setBuyer] = useUrlParam('buyer');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const sellerOptions = useSellerOptions(seller);
  const cancel = useOrderCancel();

  useAbortableFetch(fetchAdminOrders, { seller, buyer, status, payment_status: paymentStatus, q: debouncedSearch });

  const storeNames = useMemo(() => new Map(influencers.map((u) => [
    String(u._id),
    u.influencer_profile?.store_name || u.full_name || u.username,
  ])), [influencers]);

  const rows = useMemo(() => items.map((order) => {
    const orderBuyer = buyerOf(order);
    const lineItems = Array.isArray(order.items) ? order.items : [];
    const sellerIds = Array.from(new Set(lineItems.map((i) => String(i.seller_id))));
    return {
      id: String(order._id),
      orderNumber: order.order_number,
      buyerId: orderBuyer.id,
      buyer: orderBuyer.fullName || orderBuyer.username || 'Unknown buyer',
      buyerUsername: orderBuyer.username,
      buyerAvatar: orderBuyer.avatar,
      firstItem: lineItems[0]?.name || '-',
      firstImage: lineItems[0]?.image || '',
      itemCount: lineItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
      extraLines: Math.max(0, lineItems.length - 1),
      sellers: sellerIds.map((id) => storeNames.get(id) || 'Unknown seller').join(', '),
      total: Number(order.total_amount) || 0,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      placedAt: order.placed_at || order.createdAt,
      raw: order,
    };
  }), [items, storeNames]);

  const count = (fn) => formatNumber(rows.filter(fn).length);
  const paidValue = rows.filter((r) => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.total, 0);
  const truncated = total > items.length;

  const buyerLabel = rows.find((r) => r.buyerId === buyer)?.buyer || 'Selected buyer';

  return (
    <>
      <PremiumResourcePage
        eyebrow="Marketplace"
        title="Orders"
        description={truncated
          ? `Showing the newest ${formatNumber(items.length)} of ${formatNumber(total)} matching orders. Narrow the filters to see older ones.`
          : 'Every marketplace order across all buyers and sellers. Open an order to update its status or cancel it.'}
        metrics={[
          { label: 'Matching Orders', value: formatNumber(total), icon: ShoppingCart, tone: 'magenta' },
          { label: 'To Fulfil', value: count((r) => CANCELLABLE.includes(r.orderStatus)), icon: PackageCheck, tone: 'violet' },
          { label: 'In Transit', value: count((r) => r.orderStatus === 'shipped'), icon: Truck, tone: 'emerald' },
          { label: 'Paid Value', value: formatINR(paidValue), icon: IndianRupee, tone: 'rose' },
        ]}
        rows={rows}
        columns={[
          {
            key: 'orderNumber',
            title: 'Order',
            render: (value, row) => (
              <button type="button" onClick={() => navigate(`/marketplace/orders/${row.id}`)} className="text-left group/cell">
                <p className="text-sm font-bold text-neutral-950 group-hover/cell:text-primary transition-colors whitespace-nowrap">{value}</p>
                <p className="mt-0.5 text-xs text-neutral-500 whitespace-nowrap">{formatDateTime(row.placedAt)}</p>
              </button>
            ),
          },
          {
            key: 'buyer',
            title: 'Buyer',
            render: (value, row) => (
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar src={row.buyerAvatar} name={value} size="w-8 h-8" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">{value}</p>
                  {row.buyerUsername && <p className="truncate text-xs text-neutral-500">@{row.buyerUsername}</p>}
                </div>
              </div>
            ),
          },
          {
            key: 'firstItem',
            title: 'Items',
            render: (value, row) => (
              <div className="flex items-center gap-2.5 min-w-0 max-w-[260px]">
                <Thumb src={row.firstImage} alt={value} size="w-9 h-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-neutral-800">{value}</p>
                  <p className="text-[11px] text-neutral-400">
                    {row.itemCount} {row.itemCount === 1 ? 'unit' : 'units'}{row.extraLines > 0 && ` · +${row.extraLines} more`}
                  </p>
                </div>
              </div>
            ),
          },
          { key: 'sellers', title: 'Seller', render: (value) => <p className="max-w-[180px] truncate text-sm text-neutral-700" title={value}>{value}</p> },
          { key: 'total', title: 'Total', render: (value) => <span className="text-sm font-semibold text-neutral-900 whitespace-nowrap">{formatINR(value)}</span> },
          {
            key: 'paymentStatus',
            title: 'Payment',
            render: (value, row) => (
              <div className="flex flex-col items-start gap-1">
                <PaymentStatusBadge status={value} />
                <span className="text-[11px] text-neutral-400">{humanize(row.paymentMethod)}</span>
              </div>
            ),
          },
          { key: 'orderStatus', title: 'Status', render: (value) => <OrderStatusBadge status={value} /> },
        ]}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search order number or Razorpay payment ID..."
        filters={[
          { label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
          { label: 'Payment', value: paymentStatus, onChange: setPaymentStatus, options: PAYMENT_OPTIONS },
          { label: 'Seller', value: seller, onChange: setSeller, options: sellerOptions },
          ...(buyer !== 'all'
            ? [{ label: 'Buyer', value: buyer, onChange: setBuyer, options: [{ value: 'all', label: 'All Buyers' }, { value: buyer, label: `Buyer: ${buyerLabel}` }] }]
            : []),
        ]}
        actions={[
          { label: 'View details', icon: Eye, onClick: (row) => navigate(`/marketplace/orders/${row.id}`) },
          { label: 'Cancel order', icon: Ban, tone: 'rose', hidden: (row) => !CANCELLABLE.includes(row.orderStatus), onClick: (row) => cancel.open(row.raw) },
        ]}
        emptyMessage={loadStatus === 'loading' ? 'Loading orders...' : error ? `Error: ${error}` : 'No orders found'}
        rowKey={(row) => row.id}
      />

      <CancelOrderModal order={cancel.target} onClose={cancel.close} onConfirm={cancel.confirm} loading={cancel.loading} />
      {cancel.toast && <Toast message={cancel.toast.message} tone={cancel.toast.tone} />}
    </>
  );
};

export default MarketplaceOrders;
