import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { API_BASE_URL, API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import {
  ChevronLeft, Film, Heart, MessageCircle, Trash2, Play,
  User, AtSign, Calendar, ShoppingBag, Tag, ExternalLink,
  AlertCircle, Loader2, Clock, Package,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmModal } from '../components/Modal.jsx';

const toAbsoluteMediaUrl = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/')) return `${API_BASE_URL}${raw}`;
  if (raw.startsWith('uploads/')) return `${API_BASE_URL}/${raw}`;
  if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
};

const getThumb = (m) => {
  if (!m) return '';
  if (Array.isArray(m.thumbnail) && m.thumbnail[0]) return toAbsoluteMediaUrl(m.thumbnail[0].fileUrl || m.thumbnail[0].url || m.thumbnail[0].fileName);
  if (m.thumbnail && typeof m.thumbnail === 'object') return toAbsoluteMediaUrl(m.thumbnail.fileUrl || m.thumbnail.url || m.thumbnail.fileName);
  if (Array.isArray(m.thumbnails) && m.thumbnails[0]) return toAbsoluteMediaUrl(m.thumbnails[0].fileUrl || m.thumbnails[0].url || m.thumbnails[0].fileName);
  return toAbsoluteMediaUrl(m.fileUrl || m.url || m.fileName);
};

const AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0Y0RjRGNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTQlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjQTFBMUFBIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+VVM8L3RleHQ+PC9zdmc+';

function Avatar({ src, alt, size = 'lg' }) {
  const [err, setErr] = useState(false);
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
  return (
    <img
      src={err || !src ? AVATAR_PLACEHOLDER : src}
      alt={alt || ''}
      onError={() => setErr(true)}
      className={clsx(sizes[size], 'rounded-full object-cover flex-shrink-0 bg-neutral-100 ring-2 ring-white shadow-sm')}
    />
  );
}

function StatBadge({ icon: Icon, label, value, tone }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  return (
    <div className={clsx('flex items-center gap-2 rounded-lg border px-3 py-2', tones[tone])}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-base font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function PromoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useSelector((s) => s.auth.token);
  const [item, setItem] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const load = async () => {
    if (!token || !id) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels/${id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load promote reel');
      setItem(data || null);
      setStatus('succeeded');
    } catch (e) {
      setError(e.message || 'Failed to load promote reel');
      setStatus('failed');
    }
  };

  useEffect(() => { load(); }, [token, id]);

  const mediaItem = useMemo(() => (Array.isArray(item?.media) ? item.media[0] : null), [item]);
  const thumbUrl = getThumb(mediaItem);
  const videoUrl = toAbsoluteMediaUrl(mediaItem?.fileUrl || mediaItem?.url || mediaItem?.fileName);
  const comments = Array.isArray(item?.comments) ? item.comments : [];
  const products = Array.isArray(item?.products) ? item.products : [];

  const author = item?.user_id || item?.user || {};

  const handleDelete = async () => {
    if (!token || !id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/promote-reels/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete promote reel');
      navigate('/promote', { replace: true });
    } catch (e) {
      setError(e.message || 'Failed to delete promote reel');
      setDeleteModal(false);
      setDeleting(false);
    }
  };

  return (
    <div className="w-full pb-8 max-w-[1400px] mx-auto">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/promote')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Boosts
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
            <Film className="w-3 h-3" />
            Boost
          </span>
          <button
            onClick={() => setDeleteModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading boost…</p>
        </div>
      )}

      {/* ── Error ── */}
      {status !== 'loading' && error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-semibold text-neutral-800">Could not load promote reel</p>
          <p className="text-sm text-neutral-400">{error}</p>
        </div>
      )}

      {/* ── Main content ── */}
      {status === 'succeeded' && item && (
        <div className="space-y-4">

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBadge icon={Heart} label="Likes" value={formatNumber(item?.likes_count || 0)} tone="rose" />
            <StatBadge icon={MessageCircle} label="Comments" value={formatNumber(item?.comments_count || comments.length || 0)} tone="blue" />
            <StatBadge icon={Package} label="Products" value={products.length} tone="violet" />
            <StatBadge icon={ShoppingBag} label="Status" value={item?.status || 'active'} tone="emerald" />
          </div>

          {/* ── Info + Media ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            {/* Info card */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Boost Info</p>
              </div>
              <div className="px-5 py-4 space-y-4">

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar src={author?.avatar_url} alt={author?.full_name || author?.username} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-neutral-900 text-sm leading-tight truncate">
                      {author?.full_name || author?.name || 'Unknown User'}
                    </p>
                    {author?.username && (
                      <p className="text-sm text-neutral-400 mt-0.5 flex items-center gap-1">
                        <AtSign className="w-3.5 h-3.5" />
                        {author.username}
                      </p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-neutral-100" />

                {/* Caption */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Caption</p>
                  {item?.caption
                    ? <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{item.caption}</p>
                    : <p className="text-sm text-neutral-300 italic">No caption provided</p>
                  }
                </div>

                <div className="h-px bg-neutral-100" />

                {/* Metadata */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Details</p>
                  {item?.createdAt && (
                    <div className="flex items-center gap-2.5 text-sm text-neutral-500">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      {formatDateTime(item.createdAt)}
                    </div>
                  )}
                </div>

                {/* ID */}
                <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Boost ID</p>
                  <p className="text-[11px] font-mono text-neutral-400 break-all leading-relaxed">
                    {item?.promote_reel_id || item?._id}
                  </p>
                </div>
              </div>
            </div>

            {/* Media card */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-violet-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Thumbnail / Video</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">

                  {/* Thumbnail */}
                  <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900">
                    <div className="px-3 py-2 bg-white/90 border-b border-neutral-200 flex items-center gap-1.5">
                      <Film className="w-3 h-3 text-neutral-400" />
                      <p className="text-[10px] font-semibold tracking-[0.1em] text-neutral-500 uppercase">Thumbnail</p>
                    </div>
                    <div className="aspect-[9/16]">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-500">
                          <Film className="w-8 h-8 opacity-30" />
                          <span className="text-[11px] opacity-50">No thumbnail</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Video */}
                  <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900">
                    <div className="px-3 py-2 bg-white/90 border-b border-neutral-200 flex items-center gap-1.5">
                      <Play className="w-3 h-3 text-neutral-400" />
                      <p className="text-[10px] font-semibold tracking-[0.1em] text-neutral-500 uppercase">Video</p>
                    </div>
                    <div className="relative aspect-[9/16]">
                      {!showVideo ? (
                        <button
                          onClick={() => setShowVideo(true)}
                          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 group"
                        >
                          {thumbUrl && (
                            <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                          )}
                          <div className="relative z-10 w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/30 transition-all duration-200 shadow-lg">
                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                          </div>
                          <span className="relative z-10 text-white/80 text-xs font-semibold tracking-wide">Play Reel</span>
                        </button>
                      ) : (
                        <video src={videoUrl} className="w-full h-full object-contain" controls autoPlay playsInline />
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* ── Products ── */}
          {products.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-3">
                <ShoppingBag className="w-3.5 h-3.5 text-violet-500" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Products</p>
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-violet-50 text-violet-600 text-[11px] font-bold border border-violet-100">
                  {products.length}
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {products.map((p, idx) => {
                    const price = Number(p?.product_price || 0);
                    const discount = Number(p?.discount_amount || 0);
                    const finalPrice = Math.max(0, price - discount);
                    const productImage = toAbsoluteMediaUrl(p?.promote_img || '');
                    return (
                      <div
                        key={`${p?.product_name || 'product'}-${idx}`}
                        className="rounded-2xl border border-neutral-200 bg-neutral-50/40 overflow-hidden"
                      >
                        {/* Product image header */}
                        {productImage && (
                          <div className="h-28 bg-neutral-100 overflow-hidden">
                            <img
                              src={productImage}
                              alt={p?.product_name || 'product'}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        )}
                        {!productImage && (
                          <div className="h-16 bg-neutral-100 flex items-center justify-center">
                            <Package className="w-6 h-6 text-neutral-300" />
                          </div>
                        )}

                        <div className="p-3 space-y-2.5">
                          {/* Name + badge */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-neutral-900 text-sm leading-snug">{p?.product_name || 'Unnamed Product'}</p>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-100 flex-shrink-0">
                              Product
                            </span>
                          </div>

                          {p?.product_description && (
                            <p className="text-xs text-neutral-500 leading-relaxed">{p.product_description}</p>
                          )}

                          {/* Pricing */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-white border border-neutral-200 px-3 py-2 text-center">
                              <p className="text-[10px] text-neutral-400 font-medium">Price</p>
                              <p className="text-sm font-bold text-neutral-900 mt-0.5">
                                ₹{Number.isFinite(price) ? price.toLocaleString('en-IN') : '0'}
                              </p>
                            </div>
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-center">
                              <p className="text-[10px] text-emerald-600 font-medium">Discount</p>
                              <p className="text-sm font-bold text-emerald-700 mt-0.5">
                                ₹{Number.isFinite(discount) ? discount.toLocaleString('en-IN') : '0'}
                              </p>
                            </div>
                            <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-2 text-center">
                              <p className="text-[10px] text-violet-600 font-medium">Final</p>
                              <p className="text-sm font-bold text-violet-700 mt-0.5">
                                ₹{Number.isFinite(finalPrice) ? finalPrice.toLocaleString('en-IN') : '0'}
                              </p>
                            </div>
                          </div>

                          {p?.visit_link && (
                            <a
                              href={p.visit_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Visit Product Link
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Comments ── */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-3">
              <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Comments</p>
              <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold border border-blue-100">
                {comments.length}
              </span>
            </div>
            <div className="p-4">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-neutral-300" />
                  </div>
                  <p className="text-xs text-neutral-400">No comments yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                  {comments.map((c, i) => (
                    <div
                      key={c._id || c.comment_id || i}
                      className="rounded-2xl border border-neutral-100 bg-white p-4"
                    >
                      <div className="flex gap-3">
                        <img
                          src={c?.user?.avatar_url || AVATAR_PLACEHOLDER}
                          alt={c?.user?.username || ''}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-neutral-100 ring-2 ring-white shadow-sm"
                          onError={(e) => { e.currentTarget.src = AVATAR_PLACEHOLDER; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-sm font-semibold text-neutral-900">
                                {c?.user?.full_name || c?.user?.username || 'User'}
                              </span>
                              {c?.user?.username && (
                                <span className="ml-1.5 text-xs text-neutral-400">@{c.user.username}</span>
                              )}
                            </div>
                            {c?.createdAt && (
                              <span className="text-[10px] text-neutral-300 flex items-center gap-1 flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                {formatDateTime(c.createdAt)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap break-words">
                            {c?.text || ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Boost"
        description="Are you sure you want to delete this boost? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
