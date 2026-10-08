import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ExternalLink, Eye, Film, Heart, MessageSquare, Package, ShoppingBag } from 'lucide-react';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber, formatCompactNumber } from '../utils/helpers.jsx';
import { getThumbnailUrl, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import { ConfirmModal } from '../components/Modal.jsx';
import {
  CaptionPanel, CommunityPanel, DetailTopBar, ErrorState, HashtagsPanel, InfoPanel, LoadingState,
  MediaActions, MetricsPanel, ModerationPanel, Panel, Pill, VideoStage, pctLabel, ratio,
} from '../components/ContentDetailKit.jsx';

const inr = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;

const STATUS_TONE = { active: 'green', live: 'green', paused: 'grey', draft: 'purple', rejected: 'red', pending: 'amber' };

const ProductCard = ({ product }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const price = Number(product?.product_price) || 0;
  const discount = Number(product?.discount_amount) || 0;
  const finalPrice = Math.max(0, price - discount);
  const image = toAbsoluteMediaUrl(product?.promote_img || '');
  const off = price > 0 && discount > 0 ? Math.round((discount / price) * 100) : 0;

  return (
    <div className="group flex gap-3 rounded-xl bg-[#F1F3FC] p-3 transition hover:-translate-y-0.5 hover:bg-[#ECEEFA] hover:shadow-[0_10px_24px_-16px_rgba(16,24,40,0.35)]">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-white">
        {image && !imgFailed
          ? <img src={image} alt="" onError={() => setImgFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center text-neutral-300"><Package className="h-6 w-6" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold text-neutral-900">{product?.product_name || 'Unnamed product'}</p>
        {product?.product_description && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-neutral-500">{product.product_description}</p>}
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-[15px] font-extrabold text-[#C81345]">{inr(finalPrice)}</span>
          {discount > 0 && <span className="text-[12px] text-neutral-400 line-through">{inr(price)}</span>}
          {off > 0 && <span className="rounded bg-emerald-100 px-1.5 text-[10.5px] font-bold text-emerald-700">{off}% off</span>}
          {product?.visit_link && (
            <a href={product.visit_link} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-bold text-[#8E35B5] hover:underline">
              Visit <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default function PromoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useSelector((s) => s.auth.token);
  const [item, setItem] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels/${id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load campaign');
      setItem(data || null);
      setStatus('succeeded');
    } catch (e) {
      setError(e.message || 'Failed to load campaign');
      setStatus('failed');
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  const campaign = useMemo(() => {
    const p = item || {};
    const user = p.user_id && typeof p.user_id === 'object' ? p.user_id : (p.user || {});
    const media = Array.isArray(p.media) ? p.media[0] : null;
    return {
      id: String(p.promote_reel_id || p._id || id),
      docId: String(p._id || id),
      caption: p.caption || '',
      status: String(p.status || 'active').toLowerCase(),
      createdAt: p.createdAt || '',
      likes: Number(p.likes_count) || 0,
      views: Number(p.views_count) || 0,
      comments: Array.isArray(p.comments) ? p.comments : [],
      commentsCount: Number(p.comments_count) || (Array.isArray(p.comments) ? p.comments.length : 0),
      products: Array.isArray(p.products) ? p.products : [],
      tags: Array.isArray(p.tags) ? p.tags : [],
      media,
      user: {
        id: user._id || user.id || '',
        username: user.username || '',
        name: user.full_name || user.name || user.username || 'Unknown user',
        avatar: user.avatar_url ? toAbsoluteMediaUrl(user.avatar_url) : '',
      },
    };
  }, [item, id]);

  const handleDelete = async () => {
    if (!token || !id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete campaign');
      navigate('/promote', { replace: true });
    } catch (e) {
      setError(e.message || 'Failed to delete campaign');
      setDeleteModal(false);
      setDeleting(false);
    }
  };

  const videoUrl = toAbsoluteMediaUrl(campaign.media?.fileUrl || campaign.media?.url || campaign.media?.fileName);
  const catalogValue = campaign.products.reduce((sum, p) => sum + Math.max(0, (Number(p?.product_price) || 0) - (Number(p?.discount_amount) || 0)), 0);
  const engagementRate = ratio(campaign.likes + campaign.commentsCount, campaign.views);
  const isLoading = status === 'loading' || status === 'idle';

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-10">
      <DetailTopBar
        backLabel="Back to Campaigns"
        onBack={() => navigate('/promote')}
        chips={<Pill tone="purple">Campaign</Pill>}
        onDelete={() => setDeleteModal(true)}
        deleteLabel="Delete Campaign"
      />

      {isLoading && <LoadingState label="Loading campaign…" />}
      {!isLoading && error && <ErrorState title="Could not load campaign" message={error} />}

      {status === 'succeeded' && item && !error && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            <Panel icon={Film} iconClass="text-[#8E35B5]" title="Campaign Reel" actions={<MediaActions url={videoUrl} />}>
              <VideoStage videoUrl={videoUrl} posterUrl={getThumbnailUrl(campaign.media)} />
            </Panel>

            <CaptionPanel caption={campaign.caption} title="Campaign Caption" />

            <Panel
              icon={ShoppingBag}
              title="Shoppable Products"
              badge={<Pill tone="lavender" className="normal-case">{campaign.products.length} linked</Pill>}
            >
              {campaign.products.length ? (
                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                  {campaign.products.map((p, i) => <ProductCard key={`${p?.product_name || 'product'}-${i}`} product={p} />)}
                </div>
              ) : <p className="text-[12.5px] italic text-neutral-400">No products attached to this campaign</p>}
            </Panel>

            {campaign.tags.length > 0 && <HashtagsPanel tags={campaign.tags} />}

            <CommunityPanel comments={campaign.comments} authorId={campaign.user.id} authorHandle={campaign.user.username} />
          </div>

          <div className="space-y-5 xl:sticky xl:top-[72px]">
            <InfoPanel
              title="Campaign Info"
              status={{ label: campaign.status, tone: STATUS_TONE[campaign.status] || 'grey' }}
              creator={{ name: campaign.user.name, handle: campaign.user.username, avatar: campaign.user.avatar }}
              rows={[
                { label: 'Campaign ID', value: `#CMP-${campaign.id.slice(-5).toUpperCase()}`, chip: true },
                { label: 'Created date', value: campaign.createdAt ? formatDateTime(campaign.createdAt) : '—' },
                { label: 'Products', value: `${campaign.products.length} linked` },
                { label: 'Catalog value', value: campaign.products.length ? inr(catalogValue) : null },
              ]}
              onViewCreator={campaign.user.id ? () => navigate(`/users/${campaign.user.id}`) : null}
            />

            <MetricsPanel
              tiles={[
                { label: 'Likes', value: formatNumber(campaign.likes), icon: Heart, tone: 'pink', sub: pctLabel(ratio(campaign.likes, campaign.views), 'of views') },
                { label: 'Comments', value: formatNumber(campaign.commentsCount), icon: MessageSquare, tone: 'purple', sub: pctLabel(ratio(campaign.commentsCount, campaign.likes), 'ratio') },
                { label: 'Views', value: formatCompactNumber(campaign.views), icon: Eye, tone: 'dark' },
                { label: 'Products', value: formatNumber(campaign.products.length), icon: Package, tone: 'green', sub: campaign.products.length ? `${inr(catalogValue)} total` : null },
              ]}
              bar={engagementRate === null ? null : { label: 'Engagement rate', value: `${engagementRate.toFixed(1)}%`, pct: engagementRate }}
            />

            <ModerationPanel contentType="promote_reel" contentId={campaign.docId} />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
