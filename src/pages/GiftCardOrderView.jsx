import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ChevronLeft, CheckCircle2, XCircle, Clock, Gift, Building2,
  Loader2, AlertCircle, User, IndianRupee, Play, Edit
} from 'lucide-react';
import { fetchGiftCardOrderById } from '../store/giftCardOrdersSlice.js';
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

export default function GiftCardOrderView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { current, currentStatus, currentError } = useSelector((s) => s.giftCardOrders);

  useEffect(() => {
    if (id) {
      dispatch(fetchGiftCardOrderById(id));
    }
  }, [dispatch, id]);

  const status = useMemo(() => current?.status || 'pending', [current]);
  const statusConfig = useMemo(() => STATUS_MAP[status] || STATUS_MAP.pending, [status]);
  const StatusIcon = statusConfig.icon;

  const isLoading = currentStatus === 'idle' || currentStatus === 'loading';

  return (
    <div className="max-w-7xl mx-auto pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/gift-card-orders')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Orders
        </button>
        {status === 'pending' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/gift-card-orders/${id}/process`)}
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            Start Process
          </Button>
        )}
        {status === 'processing' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/gift-card-orders/${id}/process`)}
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            Complete Order
          </Button>
        )}
      </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* LEFT column */}
          <div className="space-y-6">
            {/* Header card with gift card media */}
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className={clsx('relative h-48 w-full overflow-hidden bg-gradient-to-br', CARD_GRADIENTS[0])}>
                {current.media?.url ? (
                  <img src={current.media.url} alt={current.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Gift className="w-16 h-16 text-white/30" />
                  </div>
                )}
              </div>
              <div className="px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-neutral-900 truncate">
                      Order #{(current._id || current.id)?.slice(-8) || 'Unknown'}
                    </h1>
                    {current.vendor && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm text-neutral-500">
                        <Building2 className="w-4 h-4" />
                        {current.vendor}
                      </div>
                    )}
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

            {/* Voucher details (if completed) */}
            {status === 'completed' && current.voucher_code && (
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-neutral-100">
                  <h2 className="text-sm font-semibold text-neutral-800">Voucher Details</h2>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <span className="text-xs text-neutral-500 uppercase tracking-wide">Voucher Code</span>
                    <p className="text-lg font-mono font-bold text-neutral-800 mt-1">{current.voucher_code}</p>
                  </div>
                  {current.voucher_pin && (
                    <div>
                      <span className="text-xs text-neutral-500 uppercase tracking-wide">PIN</span>
                      <p className="text-lg font-mono font-bold text-neutral-800 mt-1">{current.voucher_pin}</p>
                    </div>
                  )}
                  {current.expiry_date && (
                    <div>
                      <span className="text-xs text-neutral-500 uppercase tracking-wide">Expiry Date</span>
                      <p className="text-sm text-neutral-800 mt-1">{formatDateTime(current.expiry_date)}</p>
                    </div>
                  )}
                  {current.redeem_steps?.length > 0 && (
                    <div>
                      <span className="text-xs text-neutral-500 uppercase tracking-wide">Redeem Steps</span>
                      <ul className="mt-2 space-y-2">
                        {current.redeem_steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <p className="text-sm text-neutral-700">{step}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT column */}
          <div className="space-y-6 lg:sticky lg:top-6">
            {/* Quick Info card */}
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-800">Quick Info</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">Status</span>
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
                    statusConfig.cls
                  )}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">Amount</span>
                  <span className="text-sm font-bold text-neutral-800 flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {Number(current.amount || 0).toLocaleString()}
                  </span>
                </div>
                {current.bcoins != null && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-500">B Coins</span>
                    <span className="text-sm font-bold text-neutral-800">
                      {Number(current.bcoins || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                {current.user_id && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-500">User</span>
                    <div className="flex items-center gap-2 text-right">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="text-sm text-neutral-800">
                        {current.user_id.full_name || current.user_id.username || current.user_id.email || 'Unknown'}
                      </span>
                    </div>
                  </div>
                )}
                {current.createdAt && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-500">Created At</span>
                    <span className="text-xs text-neutral-600">{formatDateTime(current.createdAt || current.created_at)}</span>
                  </div>
                )}
                {current._id && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-500">Order ID</span>
                    <span className="text-xs text-neutral-600 font-mono truncate">{current._id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions card */}
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-800">Actions</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                {status === 'pending' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => navigate(`/gift-card-orders/${id}/process`)}
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Start Process
                  </Button>
                )}
                {status === 'processing' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => navigate(`/gift-card-orders/${id}/process`)}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    Complete Order
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => navigate('/gift-card-orders')}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1.5" />
                  Back to List
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
