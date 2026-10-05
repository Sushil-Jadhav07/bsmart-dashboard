import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle2, ChevronLeft, Loader2, ShieldOff } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { PremiumBadge } from './PremiumResourcePage.jsx';

export const formatINR = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const humanize = (value) => {
  if (!value) return '-';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const listingStatusTone = (status) => {
  if (status === 'active') return 'emerald';
  if (status === 'draft') return 'violet';
  if (status === 'out_of_stock') return 'rose';
  return 'neutral';
};

// Normalises the populated `user_id` on a product/service into display fields.
export const sellerOf = (listing) => {
  const user = listing?.user_id && typeof listing.user_id === 'object' ? listing.user_id : {};
  const profile = user.influencer_profile || {};
  return {
    id: user._id ? String(user._id) : (typeof listing?.user_id === 'string' ? listing.user_id : ''),
    username: user.username || '',
    fullName: user.full_name || '',
    avatar: user.avatar_url || '',
    storeName: profile.store_name || '',
    isSuspended: !!profile.is_suspended,
  };
};

export const SuspendedBadge = () => (
  <PremiumBadge tone="rose" className="!px-1.5 !py-0.5 text-[10px]">
    <ShieldOff className="h-3 w-3" /> Suspended
  </PremiumBadge>
);

export const Avatar = ({ src, name, size = 'w-9 h-9', textSize = 'text-xs' }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt="" onError={() => setFailed(true)} className={`${size} rounded-full object-cover flex-shrink-0 border border-neutral-200`} />;
  }
  return (
    <div className={`${size} ${textSize} rounded-full bg-gradient-brand flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
};

export const Thumb = ({ src, alt = '', size = 'w-11 h-11' }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${size} rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0`}>
      {src && !failed && <img src={src} alt={alt} onError={() => setFailed(true)} className="w-full h-full object-cover" />}
    </div>
  );
};

export const SellerCell = ({ listing, onClick }) => {
  const seller = sellerOf(listing);
  const name = seller.storeName || seller.fullName || seller.username || 'Unknown seller';
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2.5 min-w-0 text-left group/seller">
      <Avatar src={seller.avatar} name={name} size="w-8 h-8" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-neutral-900 group-hover/seller:text-primary transition-colors">{name}</p>
          {seller.isSuspended && <SuspendedBadge />}
        </div>
        {seller.username && <p className="truncate text-xs text-neutral-500">@{seller.username}</p>}
      </div>
    </button>
  );
};

export const InfoTile = ({ label, children }) => (
  <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3.5 py-2.5 min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
    <div className="text-sm text-neutral-800 mt-0.5 break-words">{children ?? '-'}</div>
  </div>
);

export const SectionCard = ({ title, count, children, bodyClassName = 'px-6 py-5' }) => (
  <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
    <div className="px-6 py-5 border-b border-neutral-100">
      <h2 className="text-sm font-semibold text-neutral-800">
        {title}
        {count !== undefined && <span className="text-neutral-400 font-normal"> ({count})</span>}
      </h2>
    </div>
    <div className={bodyClassName}>{children}</div>
  </div>
);

export const Toast = ({ message, tone = 'success' }) => (
  <div className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
    {message}
  </div>
);

// Suspend asks for a reason (shown to the influencer); restore is a plain confirm.
export const SuspendInfluencerModal = ({ influencer, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  const suspending = !!influencer && !influencer.isSuspended;

  useEffect(() => { setReason(''); }, [influencer?.id]);

  return (
    <Modal
      isOpen={!!influencer}
      onClose={onClose}
      title={suspending ? 'Suspend selling privileges' : 'Restore selling privileges'}
      description={influencer ? `${influencer.name} (@${influencer.username})` : ''}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant={suspending ? 'danger' : 'primary'}
            onClick={() => onConfirm(reason.trim())}
            loading={loading}
            disabled={suspending && !reason.trim()}
          >
            {suspending ? 'Suspend' : 'Restore'}
          </Button>
        </>
      )}
    >
      {suspending ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            They keep normal app access as a member, but won't be able to create or edit products and services until restored.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Explain why selling is being suspended — this is shown to the influencer."
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            They'll be able to create and edit products and services again.
          </p>
          {influencer?.suspensionReason && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Current reason</p>
              <p className="text-sm text-rose-800 mt-0.5">{influencer.suspensionReason}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export const ImageGallery = ({ images, fallbackIcon: FallbackIcon }) => {
  const [active, setActive] = useState(0);
  const current = images[active] || images[0];

  useEffect(() => { setActive(0); }, [images]);

  if (!current?.fileUrl) {
    return (
      <div className="h-40 w-full bg-gradient-to-br from-primary/80 to-violet-600 flex items-center justify-center">
        <FallbackIcon className="w-12 h-12 text-white/40" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-72 sm:h-80 w-full overflow-hidden bg-neutral-900">
        <img src={current.fileUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40" />
        <img src={current.fileUrl} alt="" className="relative w-full h-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-6 pt-4">
          {images.map((img, index) => (
            <button
              key={img.fileName || index}
              type="button"
              onClick={() => setActive(index)}
              className={clsx(
                'w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition',
                index === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={img.fileUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const DetailShell = ({ backLabel, backPath, status, error, loadingLabel, children }) => {
  const navigate = useNavigate();
  const isLoading = status === 'idle' || status === 'loading';
  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {backLabel}
        </button>
      </div>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">{loadingLabel}</p>
        </div>
      )}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-semibold text-neutral-800">Could not load this listing</p>
          <p className="text-sm text-neutral-400">{error}</p>
        </div>
      )}
      {!isLoading && !error && children}
    </div>
  );
};

export const Highlights = ({ items }) => (
  <ul className="space-y-2">
    {items.map((item, index) => (
      <li key={index} className="flex items-start gap-2 text-sm text-neutral-700">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
        {item}
      </li>
    ))}
  </ul>
);

export const MetaRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-sm text-neutral-500">{label}</span>
    <span className="text-xs text-neutral-600 text-right break-all">{value}</span>
  </div>
);
