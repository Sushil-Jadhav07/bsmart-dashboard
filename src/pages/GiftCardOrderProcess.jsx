import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ChevronLeft, CheckCircle2, XCircle, Clock, Gift, Building2,
  Loader2, AlertCircle, User, IndianRupee, Play, Plus, Trash2
} from 'lucide-react';
import {
  fetchGiftCardOrderById,
  startProcessingGiftCardOrder,
  completeGiftCardOrder,
  clearStartProcessingStatus,
  clearCompleteStatus,
} from '../store/giftCardOrdersSlice.js';
import Button from '../components/Button.jsx';
import { formatDateTime } from '../utils/helpers.jsx';

const STATUS_MAP = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-400', icon: Clock },
  processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-400', icon: Play },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-400', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-400', icon: XCircle },
};

const CARD_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-rose-500 to-pink-700',
  'from-amber-400 to-orange-600',
  'from-sky-500 to-blue-700',
  'from-emerald-400 to-teal-600',
  'from-indigo-500 to-blue-700',
];

export default function GiftCardOrderProcess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    current,
    currentStatus,
    currentError,
    startProcessingStatus,
    startProcessingError,
    completeStatus,
    completeError,
  } = useSelector((s) => s.giftCardOrders);

  const [form, setForm] = useState({
    voucher_code: '',
    voucher_pin: '',
    expiry_date: '',
    redeem_steps: [''],
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchGiftCardOrderById(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (startProcessingStatus === 'succeeded') {
      setMessage('Processing started!');
      dispatch(clearStartProcessingStatus());
      setTimeout(() => setMessage(''), 2500);
    } else if (startProcessingStatus === 'failed') {
      setMessage(startProcessingError || 'Failed to start processing');
      setTimeout(() => setMessage(''), 2500);
    }
  }, [startProcessingStatus, startProcessingError, dispatch]);

  useEffect(() => {
    if (completeStatus === 'succeeded') {
      setMessage('Order completed successfully!');
      dispatch(clearCompleteStatus());
      setTimeout(() => {
        setMessage('');
        navigate(`/gift-card-orders/${id}`);
      }, 1500);
    } else if (completeStatus === 'failed') {
      setMessage(completeError || 'Failed to complete order');
      setTimeout(() => setMessage(''), 2500);
    }
  }, [completeStatus, completeError, dispatch, id, navigate]);

  const status = useMemo(() => current?.status || 'pending', [current]);
  const statusConfig = useMemo(() => STATUS_MAP[status] || STATUS_MAP.pending, [status]);
  const StatusIcon = statusConfig.icon;

  const isLoading = currentStatus === 'idle' || currentStatus === 'loading';
  const isStartProcessingLoading = startProcessingStatus === 'loading';
  const isCompleteLoading = completeStatus === 'loading';

  const handleStartProcessing = async () => {
    dispatch(startProcessingGiftCardOrder(id));
  };

  const handleAddStep = () => {
    setForm((prev) => ({ ...prev, redeem_steps: [...prev.redeem_steps, ''] }));
  };

  const handleRemoveStep = (index) => {
    setForm((prev) => ({
      ...prev,
      redeem_steps: prev.redeem_steps.filter((_, i) => i !== index),
    }));
  };

  const handleStepChange = (index, value) => {
    setForm((prev) => {
      const newSteps = [...prev.redeem_steps];
      newSteps[index] = value;
      return { ...prev, redeem_steps: newSteps };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      redeem_steps: form.redeem_steps.filter((step) => step.trim() !== ''),
    };
    dispatch(completeGiftCardOrder({ orderId: id, data }));
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(`/gift-card-orders/${id}`)}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Order
        </button>
      </div>

      {message && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft',
          completeStatus === 'succeeded' || startProcessingStatus === 'succeeded'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        )}>
          {message}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading order…</p>
        </div>
      )}

      {!isLoading && currentError && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-semibold text-neutral-800">Could not load order</p>
          <p className="text-sm text-neutral-400">{currentError}</p>
        </div>
      )}

      {!isLoading && !currentError && current && (
        <div className="space-y-6">
          {/* Header card with gift card media */}
          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
            <div className={clsx('relative h-40 w-full overflow-hidden bg-gradient-to-br', CARD_GRADIENTS[0])}>
              {current.media?.url ? (
                <img src={current.media.url} alt={current.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Gift className="w-12 h-12 text-white/30" />
                </div>
              )}
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-neutral-900 truncate">
                    Order #{(current._id || current.id)?.slice(-8) || 'Unknown'}
                  </h1>
                  {current.title && (
                    <p className="text-sm text-neutral-600 mt-1">{current.title}</p>
                  )}
                </div>
                <span className={clsx(
                  'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border flex-shrink-0',
                  statusConfig.cls
                )}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>

          {/* If pending, show start processing button */}
          {status === 'pending' && (
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100">
                <h2 className="text-sm font-semibold text-neutral-800">Start Processing</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-neutral-600 mb-4">
                  Click below to start processing this order. You will then be able to complete it by adding voucher details.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartProcessing}
                  loading={isStartProcessingLoading}
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Start Processing
                </Button>
              </div>
            </div>
          )}

          {/* If processing, show complete form */}
          {status === 'processing' && (
            <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100">
                <h2 className="text-sm font-semibold text-neutral-800">Complete Order</h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* Voucher Code */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                    Voucher Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.voucher_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, voucher_code: e.target.value }))}
                    placeholder="e.g. AMZN-XXXX-XXXX"
                    className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                {/* Voucher PIN */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                    Voucher PIN
                  </label>
                  <input
                    type="text"
                    value={form.voucher_pin}
                    onChange={(e) => setForm((prev) => ({ ...prev, voucher_pin: e.target.value }))}
                    placeholder="e.g. 1234"
                    className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.expiry_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                {/* Redeem Steps */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Redeem Steps
                    </label>
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Step
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.redeem_steps.map((step, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={step}
                          onChange={(e) => handleStepChange(index, e.target.value)}
                          placeholder={`Step ${index + 1}`}
                          className="flex-1 h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                        {form.redeem_steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(index)}
                            className="p-2.5 rounded-xl border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/gift-card-orders/${id}`)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isCompleteLoading}
                  >
                    Complete Order
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* If already completed or cancelled, show message */}
          {(status === 'completed' || status === 'cancelled') && (
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-10 text-center">
                <StatusIcon className={clsx('w-12 h-12 mx-auto mb-3', status === 'completed' ? 'text-emerald-500' : 'text-red-500')} />
                <p className="text-lg font-bold text-neutral-800">Order is already {status}</p>
                <p className="text-sm text-neutral-500 mt-1">
                  You can view the order details by clicking the button below.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate(`/gift-card-orders/${id}`)}
                >
                  View Order
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
