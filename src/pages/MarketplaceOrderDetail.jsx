import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { Ban, Check, ExternalLink, MapPin, Save } from 'lucide-react';
import Button from '../components/Button.jsx';
import Dropdown from '../components/Dropdown.jsx';
import {
  Avatar, DetailShell, InfoTile, MetaRow, SectionCard, Thumb, Toast, formatINR, humanize,
} from '../components/MarketplaceShared.jsx';
import {
  CANCELLABLE, CancelOrderModal, ORDER_FLOW, OrderStatusBadge, PaymentStatusBadge, buyerOf,
} from '../components/OrderShared.jsx';
import useOrderCancel from '../hooks/useOrderCancel.js';
import { fetchInfluencers, fetchMarketplaceOrder, updateOrderStatus } from '../store/marketplaceSlice.js';
import { formatDateTime } from '../utils/helpers.jsx';

const inputClass = 'w-full h-9 px-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition';

const StatusStepper = ({ order }) => {
  if (order.order_status === 'cancelled') {
    return (
      <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
        <p className="text-sm font-semibold text-rose-800">Cancelled {order.cancelled_at && `on ${formatDateTime(order.cancelled_at)}`}</p>
        <p className="text-sm text-rose-700 mt-0.5">{order.cancelled_reason || 'No reason given'}</p>
      </div>
    );
  }
  const current = ORDER_FLOW.indexOf(order.order_status);
  return (
    <div className="flex items-center">
      {ORDER_FLOW.map((step, index) => {
        const done = index <= current;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition',
                done ? 'bg-gradient-brand border-transparent text-white' : 'border-neutral-200 text-neutral-400 bg-white',
              )}>
                {index < current ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </div>
              <span className={clsx('text-[11px] font-medium capitalize', done ? 'text-neutral-800' : 'text-neutral-400')}>{step}</span>
            </div>
            {index < ORDER_FLOW.length - 1 && (
              <div className={clsx('flex-1 h-0.5 mx-1.5 mb-5 rounded-full', index < current ? 'bg-primary' : 'bg-neutral-200')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ManagePanel = ({ order, onCancel }) => {
  const dispatch = useDispatch();
  const updating = useSelector((s) => !!s.marketplace.orderUpdating[String(order._id)]);
  const current = ORDER_FLOW.indexOf(order.order_status);
  // Forward moves only; 'shipped' stays selectable while shipped so courier/tracking can be corrected.
  const options = ORDER_FLOW
    .slice(Math.max(1, order.order_status === 'shipped' ? current : current + 1))
    .map((value) => ({ value, label: humanize(value) }));

  const [nextStatus, setNextStatus] = useState(options[0]?.value || '');
  const [courier, setCourier] = useState(order.courier || '');
  const [tracking, setTracking] = useState(order.tracking_number || '');
  const [notify, setNotify] = useState(order.notify_customer !== false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setNextStatus(options[0]?.value || '');
    setCourier(order.courier || '');
    setTracking(order.tracking_number || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.order_status, order.courier, order.tracking_number]);

  const showShipping = nextStatus === 'shipped' || nextStatus === 'delivered';
  const missingShipping = nextStatus === 'shipped' && (!courier.trim() || !tracking.trim());

  const submit = async () => {
    const body = { id: String(order._id), order_status: nextStatus, notify_customer: notify };
    if (showShipping) {
      body.courier = courier.trim();
      body.tracking_number = tracking.trim();
    }
    try {
      await dispatch(updateOrderStatus(body)).unwrap();
      setToast({ message: `Order marked as ${humanize(nextStatus).toLowerCase()}`, tone: 'success' });
    } catch (message) {
      setToast({ message: message || 'Failed to update order', tone: 'error' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const canCancel = CANCELLABLE.includes(order.order_status);

  return (
    <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-neutral-100">
        <p className="text-sm font-semibold text-neutral-800">Manage Order</p>
      </div>
      <div className="px-6 py-5 space-y-4">
        {options.length > 0 ? (
          <>
            <Dropdown label="Update status" value={nextStatus} onChange={setNextStatus} options={options} fullWidth />
            {showShipping && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Courier {nextStatus === 'shipped' && <span className="text-rose-500">*</span>}
                  </label>
                  <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Blue Dart" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Tracking number {nextStatus === 'shipped' && <span className="text-rose-500">*</span>}
                  </label>
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. BD123456" className={inputClass} />
                </div>
              </>
            )}
            <label className="flex items-center gap-2.5 text-sm text-neutral-700 cursor-pointer select-none">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
              Notify the buyer
            </label>
            <Button variant="primary" size="sm" className="w-full justify-center" onClick={submit} loading={updating} disabled={!nextStatus || missingShipping}>
              <Save className="w-3.5 h-3.5" /> Update status
            </Button>
          </>
        ) : (
          <p className="text-sm text-neutral-500">
            {order.order_status === 'cancelled' ? 'This order was cancelled and can no longer be updated.' : 'This order has been delivered. No further status changes are possible.'}
          </p>
        )}

        {canCancel && (
          <div className="pt-4 border-t border-neutral-100">
            <Button variant="outline" size="sm" className="w-full justify-center !text-red-600 hover:!bg-red-50 hover:!border-red-200" onClick={onCancel} disabled={updating}>
              <Ban className="w-3.5 h-3.5" /> Cancel order
            </Button>
          </div>
        )}
      </div>
      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
};

const MarketplaceOrderDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { item: order, status, error } = useSelector((s) => s.marketplace.order);
  const { items: influencers, status: influencersStatus } = useSelector((s) => s.marketplace.influencers);
  const cancel = useOrderCancel();

  useEffect(() => {
    if (id) dispatch(fetchMarketplaceOrder(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (influencersStatus === 'idle') dispatch(fetchInfluencers());
  }, [dispatch, influencersStatus]);

  const storeNames = useMemo(() => new Map(influencers.map((u) => [
    String(u._id),
    u.influencer_profile?.store_name || u.full_name || u.username,
  ])), [influencers]);

  const buyer = buyerOf(order);
  const items = Array.isArray(order?.items) ? order.items : [];
  const address = order?.shipping_address || {};
  const addressLines = [
    address.address_line1,
    address.address_line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean);

  return (
    <DetailShell backLabel="Back to Orders" backPath="/marketplace/orders" status={status} error={error} loadingLabel="Loading order…">
      {order && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-neutral-900 break-all">{order.order_number}</h1>
                    <p className="text-sm text-neutral-500 mt-1">Placed {formatDateTime(order.placed_at || order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PaymentStatusBadge status={order.payment_status} />
                    <OrderStatusBadge status={order.order_status} />
                  </div>
                </div>
                <div className="mt-6">
                  <StatusStepper order={order} />
                </div>
              </div>
            </div>

            <SectionCard title="Items" count={items.length} bodyClassName="">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      {['Product', 'Seller', 'Unit Price', 'Qty', 'Subtotal'].map((h) => (
                        <th key={h} className={clsx('px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500', h !== 'Product' && h !== 'Seller' && 'text-right')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {items.map((item, index) => {
                      const variant = [item.variant?.color, item.variant?.size].filter(Boolean).join(' / ');
                      return (
                        <tr key={`${item.product_id}-${index}`}>
                          <td className="px-6 py-3">
                            <button type="button" onClick={() => navigate(`/marketplace/products/${item.product_id}`)} className="flex items-center gap-3 text-left group/item min-w-0">
                              <Thumb src={item.image} alt={item.name} size="w-10 h-10" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-neutral-900 group-hover/item:text-primary transition-colors truncate max-w-[220px]">{item.name}</p>
                                {variant && <p className="text-[11px] text-neutral-500">{variant}</p>}
                              </div>
                            </button>
                          </td>
                          <td className="px-6 py-3 text-sm text-neutral-700">{storeNames.get(String(item.seller_id)) || 'Unknown seller'}</td>
                          <td className="px-6 py-3 text-sm text-neutral-700 text-right">{formatINR(item.unit_price)}</td>
                          <td className="px-6 py-3 text-sm text-neutral-700 text-right">{item.quantity}</td>
                          <td className="px-6 py-3 text-sm font-semibold text-neutral-900 text-right">{formatINR(item.subtotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-neutral-100 space-y-1.5">
                <MetaRow label="Subtotal" value={formatINR(order.subtotal_amount)} />
                <MetaRow label="Shipping" value={order.shipping_fee ? formatINR(order.shipping_fee) : 'Free'} />
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <span className="text-sm font-semibold text-neutral-800">Total</span>
                  <span className="text-base font-bold text-neutral-900">{formatINR(order.total_amount)}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Fulfilment" bodyClassName="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoTile label="Items Confirmed">{order.confirmed_items ? 'Yes' : 'No'}</InfoTile>
              <InfoTile label="Packed">{order.packed ? 'Yes' : 'No'}</InfoTile>
              <InfoTile label="Notify Buyer">{order.notify_customer !== false ? 'Yes' : 'No'}</InfoTile>
              <InfoTile label="Courier">{order.courier || '-'}</InfoTile>
              <InfoTile label="Tracking Number">{order.tracking_number || '-'}</InfoTile>
              <InfoTile label="Shipped">{formatDateTime(order.shipped_at)}</InfoTile>
              <InfoTile label="Delivered">{formatDateTime(order.delivered_at)}</InfoTile>
            </SectionCard>

            <SectionCard title="Payment" bodyClassName="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoTile label="Method">{humanize(order.payment_method)}</InfoTile>
              <InfoTile label="Status"><PaymentStatusBadge status={order.payment_status} /></InfoTile>
              <InfoTile label="Currency">{order.currency || 'INR'}</InfoTile>
              {order.payment_method === 'razorpay' ? (
                <>
                  <InfoTile label="Razorpay Order ID"><span className="text-xs">{order.razorpay_order_id || '-'}</span></InfoTile>
                  <InfoTile label="Razorpay Payment ID"><span className="text-xs">{order.razorpay_payment_id || '-'}</span></InfoTile>
                </>
              ) : (
                <InfoTile label="Wallet Transaction"><span className="text-xs">{order.wallet_transaction_id || '-'}</span></InfoTile>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6 lg:sticky lg:top-6">
            <ManagePanel order={order} onCancel={() => cancel.open(order)} />

            <SectionCard title="Buyer" bodyClassName="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar src={buyer.avatar} name={buyer.fullName || buyer.username} size="w-11 h-11" textSize="text-sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{buyer.fullName || buyer.username || 'Unknown buyer'}</p>
                  {buyer.username && <p className="text-[11px] text-neutral-400 truncate">@{buyer.username}</p>}
                  {buyer.email && <p className="text-[11px] text-neutral-400 truncate">{buyer.email}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-center" disabled={!buyer.id} onClick={() => navigate(`/users/${buyer.id}`)}>
                  <ExternalLink className="w-3.5 h-3.5" /> Profile
                </Button>
                <Button variant="outline" size="sm" className="justify-center" disabled={!buyer.id} onClick={() => navigate(`/marketplace/orders?buyer=${buyer.id}`)}>
                  Their orders
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="Shipping Address" bodyClassName="px-6 py-5">
              <div className="flex gap-3">
                <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-neutral-700 space-y-0.5">
                  {address.name && <p className="font-semibold text-neutral-900">{address.name}</p>}
                  {addressLines.map((line) => <p key={line}>{line}</p>)}
                  {address.phone && <p className="text-neutral-500 pt-1">{address.phone}</p>}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Order Info" bodyClassName="px-6 py-5 space-y-2">
              <MetaRow label="Order ID" value={order._id} />
              <MetaRow label="Created" value={formatDateTime(order.createdAt)} />
              <MetaRow label="Updated" value={formatDateTime(order.updatedAt)} />
            </SectionCard>
          </div>
        </div>
      )}

      <CancelOrderModal order={cancel.target} onClose={cancel.close} onConfirm={cancel.confirm} loading={cancel.loading} />
      {cancel.toast && <Toast message={cancel.toast.message} tone={cancel.toast.tone} />}
    </DetailShell>
  );
};

export default MarketplaceOrderDetail;
