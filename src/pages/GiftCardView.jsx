import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  ChevronLeft, CheckCircle2, XCircle, Clock, Gift, Building2, Package,
  Loader2, AlertCircle, Pencil, IndianRupee
} from 'lucide-react'
import { fetchGiftCardById } from '../store/giftCardsSlice.js'
import Button from '../components/Button.jsx'

const STATUS_MAP = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-400', icon: CheckCircle2 },
  inactive: { label: 'Inactive', cls: 'bg-neutral-50 text-neutral-700 border-neutral-200', dot: 'bg-neutral-300', icon: Clock },
  draft: { label: 'Draft', cls: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-400', icon: Clock },
}

const CARD_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-rose-500 to-pink-700',
  'from-amber-400 to-orange-600',
  'from-sky-500 to-blue-700',
  'from-emerald-400 to-teal-600',
  'from-indigo-500 to-blue-700',
]

export default function GiftCardView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { current, currentStatus, currentError } = useSelector((s) => s.giftCards)

  useEffect(() => {
    if (id) {
      dispatch(fetchGiftCardById(id))
    }
  }, [dispatch, id])

  const status = useMemo(() => current?.card_status || current?.status || 'inactive', [current])
  const statusConfig = useMemo(() => STATUS_MAP[status] || STATUS_MAP.inactive, [status])
  const StatusIcon = statusConfig.icon

  const isLoading = currentStatus === 'idle' || currentStatus === 'loading'

  return (
    <div className="max-w-7xl mx-auto pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/gift-cards')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Gift Cards
        </button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/gift-cards/${id}/edit`)}
        >
          <Pencil className="w-3.5 h-3.5 mr-1" />
          Edit
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading gift card…</p>
        </div>
      )}

      {!isLoading && currentError && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-semibold text-neutral-800">Could not load gift card</p>
          <p className="text-sm text-neutral-400">{currentError}</p>
        </div>
      )}

      {!isLoading && !currentError && current && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* LEFT column */}
          <div className="space-y-6">
            {/* Header card with media */}
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
                    <h1 className="text-xl font-bold text-neutral-900 truncate">{current.title || 'Untitled Gift Card'}</h1>
                    {current.vendor && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm text-neutral-500">
                        <Building2 className="w-4 h-4" />
                        {current.vendor}
                      </div>
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

            {/* Description card */}
            {current.description && (
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-neutral-100">
                  <h2 className="text-sm font-semibold text-neutral-800">Description</h2>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                    {current.description}
                  </p>
                </div>
              </div>
            )}

            {/* Denominations card */}
            {current.denominations?.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-neutral-100">
                  <h2 className="text-sm font-semibold text-neutral-800">Denominations</h2>
                </div>
                <div className="px-6 py-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {current.denominations.map((denom, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50">
                        {denom.bcoins > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100">
                            <span className="text-sm">🪙</span>
                            <span className="text-sm font-bold text-amber-700">{Number(denom.bcoins).toLocaleString()}</span>
                          </div>
                        )}
                        {denom.bcoins > 0 && denom.amount > 0 && (
                          <span className="text-neutral-300">•</span>
                        )}
                        {denom.amount > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                            <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="text-sm font-bold text-emerald-700">{Number(denom.amount).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Terms & Conditions card */}
            {current.terms_and_conditions?.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-neutral-100">
                  <h2 className="text-sm font-semibold text-neutral-800">Terms & Conditions</h2>
                </div>
                <div className="px-6 py-5">
                  <ul className="space-y-3">
                    {current.terms_and_conditions.map((term, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-neutral-300 flex-shrink-0" />
                        <p className="text-sm text-neutral-700">{term}</p>
                      </li>
                    ))}
                  </ul>
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
                  <span className="text-sm text-neutral-500">Category</span>
                  <span className="text-sm text-neutral-800 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-neutral-400" />
                    {current.category || 'Gift Cards'}
                  </span>
                </div>
                {current.vendor && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-500">Vendor</span>
                    <span className="text-sm text-neutral-800 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                      {current.vendor}
                    </span>
                  </div>
                )}
                {current._id && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-500">ID</span>
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
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => navigate(`/gift-cards/${id}/edit`)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit Gift Card
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => navigate('/gift-cards')}
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
  )
}
