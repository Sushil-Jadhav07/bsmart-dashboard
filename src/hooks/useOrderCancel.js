import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { cancelOrder } from '../store/marketplaceSlice.js';

// Drives CancelOrderModal. `target` is the order being cancelled.
export default function useOrderCancel() {
  const dispatch = useDispatch();
  const updating = useSelector((s) => s.marketplace.orderUpdating);
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, tone) => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 4000);
  };

  const confirm = async (reason) => {
    if (!target) return;
    try {
      const order = await dispatch(cancelOrder({ id: String(target._id), reason })).unwrap();
      // The backend still cancels when a Razorpay refund fails, leaving payment_status 'paid'.
      if (order?.payment_status === 'paid') {
        showToast('Order cancelled, but the refund did not go through. Refund it manually.', 'error');
      } else {
        showToast(order?.payment_status === 'refunded' ? 'Order cancelled and refunded' : 'Order cancelled', 'success');
      }
      setTarget(null);
    } catch (message) {
      showToast(message || 'Failed to cancel order', 'error');
    }
  };

  return {
    target,
    open: setTarget,
    close: () => setTarget(null),
    confirm,
    loading: !!(target && updating[String(target._id)]),
    toast,
  };
}
