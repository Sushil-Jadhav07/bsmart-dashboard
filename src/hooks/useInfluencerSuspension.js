import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setInfluencerSuspension } from '../store/marketplaceSlice.js';

// Drives SuspendInfluencerModal: `target` is { id, name, username, isSuspended, suspensionReason }.
export default function useInfluencerSuspension({ onDone } = {}) {
  const dispatch = useDispatch();
  const suspending = useSelector((s) => s.marketplace.suspending);
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, tone) => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2800);
  };

  const confirm = async (reason) => {
    if (!target) return;
    const suspended = !target.isSuspended;
    try {
      const result = await dispatch(setInfluencerSuspension({ id: target.id, suspended, reason })).unwrap();
      showToast(result.is_suspended ? 'Selling privileges suspended' : 'Selling privileges restored', 'success');
      onDone?.(result);
      setTarget(null);
    } catch (message) {
      showToast(message || 'Failed to update suspension', 'error');
    }
  };

  return {
    target,
    open: setTarget,
    close: () => setTarget(null),
    confirm,
    loading: !!(target && suspending[target.id]),
    toast,
  };
}
