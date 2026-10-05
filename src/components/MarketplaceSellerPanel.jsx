import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ShieldCheck, ShieldOff } from 'lucide-react';
import Button from './Button.jsx';
import { PremiumBadge } from './PremiumResourcePage.jsx';
import { Avatar, SuspendInfluencerModal, Toast, sellerOf } from './MarketplaceShared.jsx';
import useInfluencerSuspension from '../hooks/useInfluencerSuspension.js';
import { fetchInfluencers } from '../store/marketplaceSlice.js';
import { formatDateTime } from '../utils/helpers.jsx';

// The single-listing endpoints don't populate influencer_profile, so the
// suspension state is read from the admin influencer list instead.
const MarketplaceSellerPanel = ({ listing, listPath, listLabel }) => {
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

  return (
    <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-800">Seller</p>
        {profile && <PremiumBadge tone={isSuspended ? 'rose' : 'emerald'} dot>{isSuspended ? 'Suspended' : 'Selling active'}</PremiumBadge>}
      </div>
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar src={seller.avatar} name={storeName} size="w-11 h-11" textSize="text-sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-800 truncate">{storeName}</p>
            {seller.fullName && seller.fullName !== storeName && <p className="text-[11px] text-neutral-500 truncate">{seller.fullName}</p>}
            {seller.username && <p className="text-[11px] text-neutral-400 truncate">@{seller.username}</p>}
          </div>
        </div>

        {isSuspended && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Suspension reason</p>
            <p className="text-sm text-rose-800 mt-0.5">{profile.suspension_reason || 'No reason given'}</p>
            {profile.suspended_at && <p className="text-[11px] text-rose-400 mt-1">Since {formatDateTime(profile.suspended_at)}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="justify-center" disabled={!seller.id} onClick={() => navigate(`/users/${seller.id}`)}>
            <ExternalLink className="w-3.5 h-3.5" /> Profile
          </Button>
          <Button variant="outline" size="sm" className="justify-center" disabled={!seller.id} onClick={() => navigate(`${listPath}?seller=${seller.id}`)}>
            {listLabel}
          </Button>
        </div>

        {profile && (
          <Button
            variant={isSuspended ? 'primary' : 'danger'}
            size="sm"
            className="w-full justify-center"
            onClick={() => suspension.open({
              id: seller.id,
              name: storeName,
              username: seller.username,
              isSuspended,
              suspensionReason: profile.suspension_reason,
            })}
          >
            {isSuspended ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
            {isSuspended ? 'Restore selling privileges' : 'Suspend selling privileges'}
          </Button>
        )}
      </div>

      <SuspendInfluencerModal
        influencer={suspension.target}
        onClose={suspension.close}
        onConfirm={suspension.confirm}
        loading={suspension.loading}
      />
      {suspension.toast && <Toast message={suspension.toast.message} tone={suspension.toast.tone} />}
    </div>
  );
};

export default MarketplaceSellerPanel;
