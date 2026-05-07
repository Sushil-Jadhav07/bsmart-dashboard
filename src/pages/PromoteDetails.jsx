import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { API_BASE_URL, API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { ChevronLeft, Film, Heart, MessageCircle, Trash2, Play } from 'lucide-react';
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
    <div className="w-full pb-10 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/promote')} className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Promote
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-violet-50 text-violet-600">
            <Film className="w-3 h-3" />
            Promote
          </span>
          <button onClick={() => setDeleteModal(true)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>

      {status === 'loading' && <div className="p-10 rounded-3xl border border-neutral-100 bg-white text-neutral-500">Loading promote reel...</div>}
      {status !== 'loading' && error && (
        <div className="p-10 text-center rounded-3xl border border-red-100 bg-red-50">
          <p className="font-semibold text-red-500">Could not load promote reel</p>
          <p className="text-sm text-red-400 mt-1">{error}</p>
        </div>
      )}

      {status === 'succeeded' && item && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
              <div className="flex items-center gap-2 text-rose-600"><Heart className="w-4 h-4" /><p className="text-xs font-medium">Likes</p></div>
              <p className="text-2xl font-bold text-rose-600 mt-2">{formatNumber(item?.likes_count || 0)}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
              <div className="flex items-center gap-2 text-blue-600"><MessageCircle className="w-4 h-4" /><p className="text-xs font-medium">Comments</p></div>
              <p className="text-2xl font-bold text-blue-600 mt-2">{formatNumber(item?.comments_count || comments.length || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-100"><p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase">Content</p></div>
              <div className="px-5 py-5 space-y-3">
                <p className="text-lg font-bold text-neutral-900">{item?.user_id?.full_name || 'Unknown'}</p>
                <p className="text-sm text-neutral-500">@{item?.user_id?.username || 'unknown'}</p>
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">{item?.caption || '(no caption)'}</p>
                <p className="text-xs text-neutral-400">{formatDateTime(item?.createdAt)}</p>
                <p className="text-[10px] font-mono text-neutral-300 break-all">{item?.promote_reel_id || item?._id}</p>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-100"><p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase">Thumbnail / Video</p></div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-900">
                    {thumbUrl ? <img src={thumbUrl} alt="thumbnail" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-neutral-600" /></div>}
                  </div>
                  <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-900">
                    {!showVideo ? (
                      <button onClick={() => setShowVideo(true)} className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3">
                        {thumbUrl && <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
                        <div className="relative z-10 w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                        <span className="relative z-10 text-white/60 text-[11px]">Tap to play</span>
                      </button>
                    ) : (
                      <video src={videoUrl} className="w-full h-full object-cover" controls autoPlay playsInline />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase">All Comments</p>
              <span className="ml-auto text-xs text-neutral-400 font-semibold">{comments.length}</span>
            </div>
            <div className="px-5 py-5">
              {comments.length === 0 ? (
                <p className="text-sm text-neutral-400">No comments found</p>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div key={c._id || c.comment_id} className="rounded-xl border border-neutral-100 p-3 bg-neutral-50/40">
                      <p className="text-xs font-semibold text-neutral-700">@{c?.user?.username || 'user'}</p>
                      <p className="text-sm text-neutral-700 mt-1 whitespace-pre-wrap break-words">{c?.text || ''}</p>
                      <p className="text-[11px] text-neutral-400 mt-2">{formatDateTime(c?.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
              <Film className="w-4 h-4 text-violet-500" />
              <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase">Products</p>
              <span className="ml-auto text-xs text-neutral-400 font-semibold">{products.length}</span>
            </div>
            <div className="px-5 py-5">
              {products.length === 0 ? (
                <p className="text-sm text-neutral-400">No products attached</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((p, idx) => {
                    const price = Number(p?.product_price || 0);
                    const discount = Number(p?.discount_amount || 0);
                    const finalPrice = Math.max(0, price - discount);
                    const productImage = toAbsoluteMediaUrl(p?.promote_img || '');
                    return (
                      <div key={`${p?.product_name || 'product'}-${idx}`} className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4 items-start">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-semibold text-neutral-900">{p?.product_name || 'Unnamed Product'}</p>
                              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-violet-50 text-violet-600">Product</span>
                            </div>
                            {p?.product_description ? (
                              <p className="text-sm text-neutral-600 leading-relaxed">{p.product_description}</p>
                            ) : (
                              <p className="text-sm text-neutral-300 italic">No description</p>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-lg bg-white border border-neutral-200 p-2">
                                <p className="text-[10px] text-neutral-400">Price</p>
                                <p className="text-sm font-bold text-neutral-900">Rs. {Number.isFinite(price) ? price.toLocaleString('en-IN') : '0'}</p>
                              </div>
                              <div className="rounded-lg bg-white border border-neutral-200 p-2">
                                <p className="text-[10px] text-neutral-400">Discount</p>
                                <p className="text-sm font-bold text-emerald-600">Rs. {Number.isFinite(discount) ? discount.toLocaleString('en-IN') : '0'}</p>
                              </div>
                              <div className="rounded-lg bg-white border border-neutral-200 p-2">
                                <p className="text-[10px] text-neutral-400">Final</p>
                                <p className="text-sm font-bold text-violet-700">Rs. {Number.isFinite(finalPrice) ? finalPrice.toLocaleString('en-IN') : '0'}</p>
                              </div>
                            </div>
                            {p?.visit_link && (
                              <a
                                href={p.visit_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700"
                              >
                                Visit Product Link
                              </a>
                            )}
                          </div>

                          <div className="w-full h-44 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                            {productImage ? (
                              <img
                                src={productImage}
                                alt={p?.product_name || 'product image'}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-8 h-8 text-neutral-300" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Promote Reel"
        description="Are you sure you want to delete this promote reel?"
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
