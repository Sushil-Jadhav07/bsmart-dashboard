import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ExternalLink, LayoutGrid, ShieldCheck, ShieldOff } from 'lucide-react';
import { Avatar, SuspendInfluencerModal, Toast, sellerOf } from './MarketplaceShared.jsx';
import useInfluencerSuspension from '../hooks/useInfluencerSuspension.js';
import { fetchInfluencers } from '../store/marketplaceSlice.js';
import { formatDateTime } from '../utils/helpers.jsx';
import { toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

// The single-listing endpoints don't populate influencer_profile, so the
// suspension state is read from the admin influencer list instead.
const MarketplaceSellerPanel = ({ listing, listPath, listLabel, listHref }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: influencers, status: influencersStatus } = useSelector((s) => s.marketplace.influencers);
  const suspension = useInfluencerSuspension();
  const seller = sellerOf(listing);

  useEffect(() => {
    if (influencersStatus === 'idle') dispatch(fetchInfluencers());
  }, [dispatch, influencersStatus]);

  const profile = useMemo(
    () => influencers.find((u) => String(u._id) === seller.id)?.influencer_profile || null,
    [influencers, seller.id],
  );
  const isSuspended = !!profile?.is_suspended;
  const storeName = profile?.store_name || seller.fullName || seller.username || 'Unknown seller';
  const outline = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E2E5F4] bg-[#F1F3FC] text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-pink-200 hover:bg-white disabled:opacity-50';

  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[15px] font-bold text-neutral-900">Seller</p>
        {profile && (
          <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', isSuspended ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
            <span className={clsx('h-1.5 w-1.5 rounded-full', isSuspended ? 'bg-rose-500' : 'bg-emerald-500')} />{isSuspended ? 'Suspended' : 'Selling active'}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Avatar src={seller.avatar ? toAbsoluteMediaUrl(seller.avatar) : ''} name={storeName} size="w-11 h-11" textSize="text-sm" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-neutral-900">{storeName}</p>
          <p className="truncate text-[11.5px] text-neutral-500">
            {seller.fullName && seller.fullName !== storeName && <>{seller.fullName} </>}
            {seller.username && <span className="text-[#8E35B5]">@{seller.username}</span>}
          </p>
        </div>
      </div>

      {isSuspended && (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Suspension reason</p>
          <p className="mt-0.5 text-[13px] text-rose-800">{profile.suspension_reason || 'No reason given'}</p>
          {profile.suspended_at && <p className="mt-1 text-[11px] text-rose-400">Since {formatDateTime(profile.suspended_at)}</p>}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" disabled={!seller.id} onClick={() => navigate(`/users/${seller.id}`)} className={outline}>Profile <ExternalLink className="h-3.5 w-3.5 text-neutral-500" /></button>
        <button type="button" disabled={!seller.id} onClick={() => navigate(listHref ? listHref(seller.id) : `${listPath}?seller=${seller.id}`)} className={outline}>{listLabel} <LayoutGrid className="h-3.5 w-3.5 text-neutral-500" /></button>
      </div>

      {profile && (
        <button
          type="button"
          onClick={() => suspension.open({ id: seller.id, name: storeName, username: seller.username, isSuspended, suspensionReason: profile.suspension_reason })}
          className={clsx('mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-[13px] font-bold transition hover:-translate-y-0.5',
            isSuspended ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-rose-200 bg-rose-50 text-[#E8194E] hover:bg-rose-100')}
        >
          {isSuspended ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
          {isSuspended ? 'Restore selling privileges' : 'Suspend selling privileges'}
        </button>
      )}

      <SuspendInfluencerModal influencer={suspension.target} onClose={suspension.close} onConfirm={suspension.confirm} loading={suspension.loading} />
      {suspension.toast && <Toast message={suspension.toast.message} tone={suspension.toast.tone} />}
    </div>
  );
};

export default MarketplaceSellerPanel;
