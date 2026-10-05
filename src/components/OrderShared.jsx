import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { PremiumBadge } from './PremiumResourcePage.jsx';
import { formatINR, humanize } from './MarketplaceShared.jsx';

export const ORDER_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
export const CANCELLABLE = ['pending', 'confirmed', 'processing'];

const ORDER_TONES = {
  pending: 'neutral',
  confirmed: 'violet',
  processing: 'magenta',
  shipped: 'violet',
  delivered: 'emerald',
  cancelled: 'rose',
};

const PAYMENT_TONES = {
  pending: 'neutral',
  paid: 'emerald',
  failed: 'rose',
  refunded: 'violet',
};

export const OrderStatusBadge = ({ status, className }) => (
  <PremiumBadge tone={ORDER_TONES[status] || 'neutral'} dot className={className}>{humanize(status)}</PremiumBadge>
);

export const PaymentStatusBadge = ({ status, className }) => (
  <PremiumBadge tone={PAYMENT_TONES[status] || 'neutral'} className={className}>{humanize(status)}</PremiumBadge>
);

export const buyerOf = (order) => {
  const user = order?.user_id && typeof order.user_id === 'object' ? order.user_id : {};
  return {
    id: user._id ? String(user._id) : (typeof order?.user_id === 'string' ? order.user_id : ''),
    username: user.username || '',
    fullName: user.full_name || '',
    avatar: user.avatar_url || '',
    email: user.email || '',
    phone: user.phone || '',
  };
};

// Mirrors the backend's refund behaviour in cancelOrder so the admin knows what
// will happen to the money before confirming.
const refundNote = (order) => {
  if (order.payment_status !== 'paid') return 'No payment has been captured, so nothing will be refunded.';
  const amount = formatINR(order.total_amount);
  if (order.payment_method === 'wallet') return `${amount} will be refunded to the buyer's wallet and the items restocked.`;
  return `${amount} will be refunded through Razorpay and the items restocked. If the Razorpay refund fails, the order is still cancelled and flagged "Refund failed" for a manual refund.`;
};

export const RefundFailedBadge = ({ className }) => (
  <PremiumBadge tone="rose" className={className}>
    <AlertTriangle className="h-3 w-3" /> Refund failed
  </PremiumBadge>
);

export const CancelOrderModal = ({ order, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  useEffect(() => { setReason(''); }, [order?._id]);

  return (
    <Modal
      isOpen={!!order}
      onClose={onClose}
      title="Cancel order"
      description={order?.order_number}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Keep order</Button>
          <Button variant="danger" onClick={() => onConfirm(reason.trim())} loading={loading} disabled={!reason.trim()}>
            Cancel order
          </Button>
        </>
      )}
    >
      {order && (
        <div className="space-y-4">
          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{refundNote(order)}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Why is this order being cancelled? The buyer can see this."
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
            />
          </div>
        </div>
      )}
    </Modal>
  );
};
