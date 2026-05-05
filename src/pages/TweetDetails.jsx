import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { API_BASE_URL, API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { ChevronLeft, Heart, MessageCircle, Repeat2, Trash2, Image as ImageIcon, X, ChevronRight } from 'lucide-react';
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

export default function TweetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useSelector((s) => s.auth.token);

  const [tweet, setTweet] = useState(null);
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mediaError, setMediaError] = useState({});
  const [viewerIndex, setViewerIndex] = useState(-1);

  const loadTweet = async () => {
    if (!token || !id) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/tweets/${id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load tweet');
      const t = data?.tweet || data?.data || data;
      setTweet(t || null);
      setStatus('succeeded');
    } catch (e) {
      setError(e.message || 'Failed to load tweet');
      setStatus('failed');
    }
  };

  const loadComments = async () => {
    if (!token || !id) return;
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/tweets/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const list = Array.isArray(data?.comments) ? data.comments : Array.isArray(data) ? data : [];
      setComments(list);
    } catch {
      setComments([]);
    }
  };

  useEffect(() => {
    loadTweet();
    loadComments();
  }, [token, id]);

  const mediaList = useMemo(() => {
    if (!tweet?.media || !Array.isArray(tweet.media)) return [];
    return tweet.media.map((m, idx) => ({
      id: `${idx}`,
      url: toAbsoluteMediaUrl(m?.url || m?.fileUrl || m?.fileName || ''),
    })).filter((m) => !!m.url);
  }, [tweet]);
  const mediaSlots = useMemo(() => {
    const slots = Math.max(3, mediaList.length);
    return Array.from({ length: slots }, (_, i) => mediaList[i] || null);
  }, [mediaList]);

  const author = tweet?.author || {};
  const tweetId = tweet?._id || id;
  const content = tweet?.content || '';

  const Divider = () => <div className="h-px bg-neutral-100 mx-6" />;
  const SectionLabel = ({ children }) => (
    <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase mb-3">{children}</p>
  );

  const handleDelete = async () => {
    if (!token || !id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/tweets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete tweet');
      navigate('/tweets', { replace: true });
    } catch (e) {
      setError(e.message || 'Failed to delete tweet');
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  const isViewerOpen = viewerIndex >= 0;
  const canNavigateViewer = mediaList.length > 1;

  const closeViewer = () => setViewerIndex(-1);
  const openViewer = (index) => setViewerIndex(index);
  const showPrev = () => setViewerIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  const showNext = () => setViewerIndex((prev) => (prev + 1) % mediaList.length);

  return (
    <div className="w-full pb-12 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tweets')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Tweets
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
            <MessageCircle className="w-3 h-3" />
            Tweet
          </span>
          <button
            onClick={() => setDeleteModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
            <div className="aspect-square bg-neutral-100 rounded-2xl animate-pulse" />
          </div>
          <div className="bg-neutral-100 rounded-3xl h-[500px] animate-pulse" />
        </div>
      )}

      {status !== 'loading' && error && (
        <div className="p-10 text-center rounded-3xl border border-red-100 bg-red-50">
          <p className="font-semibold text-red-500">Could not load tweet</p>
          <p className="text-sm text-red-400 mt-1">{error}</p>
        </div>
      )}

      {status === 'succeeded' && tweet && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Heart className="w-4 h-4" />
                <p className="text-xs font-medium">Likes</p>
              </div>
              <p className="text-2xl font-bold text-rose-600 mt-2">{formatNumber(tweet?.likesCount || 0)}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
              <div className="flex items-center gap-2 text-blue-600">
                <MessageCircle className="w-4 h-4" />
                <p className="text-xs font-medium">Comments</p>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-2">{formatNumber(tweet?.commentsCount || 0)}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4">
              <div className="flex items-center gap-2 text-violet-600">
                <Repeat2 className="w-4 h-4" />
                <p className="text-xs font-medium">Reposts</p>
              </div>
              <p className="text-2xl font-bold text-violet-600 mt-2">{formatNumber(tweet?.repostsCount || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-100">
                <SectionLabel>Content</SectionLabel>
              </div>
              <div className="px-5 py-5">
                <p className="text-lg font-bold text-neutral-900 truncate">{author?.full_name || author?.name || 'Unknown'}</p>
                <p className="text-sm text-neutral-500 mt-0.5">@{author?.username || 'unknown'}</p>
                <p className="text-sm text-neutral-700 mt-4 whitespace-pre-wrap break-words leading-relaxed">{content || '(no text)'}</p>
                <p className="text-xs text-neutral-400 mt-3">{formatDateTime(tweet?.createdAt)}</p>
                <p className="text-[10px] font-mono text-neutral-300 break-all mt-3">{tweetId}</p>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-100">
                <SectionLabel>Image / Media</SectionLabel>
              </div>
              <div className="p-5">
                {mediaList.length > 0 ? (
                  <div className="max-h-[420px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-3 gap-3">
                    {mediaSlots.map((m, index) => (
                      <div key={m?.id || `blank-${index}`} className="rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 w-full aspect-square">
                        {m ? (
                          <button
                            type="button"
                            onClick={() => openViewer(index)}
                            className="w-full h-full"
                          >
                            {!mediaError[m.id] ? (
                              <img
                                src={m.url}
                                alt="tweet-media"
                                className="w-full h-full object-cover"
                                onError={() => setMediaError((prev) => ({ ...prev, [m.id]: true }))}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-neutral-300" />
                              </div>
                            )}
                          </button>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-neutral-300" />
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-neutral-300" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <SectionLabel>All Comments</SectionLabel>
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
                      <p className="text-sm text-neutral-700 mt-1 whitespace-pre-wrap break-words leading-relaxed">{c?.text || ''}</p>
                      <p className="text-[11px] text-neutral-400 mt-2">{formatDateTime(c?.createdAt)}</p>
                    </div>
                  ))}
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
        title="Delete Tweet"
        description="Are you sure you want to delete this tweet?"
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />

      {isViewerOpen && mediaList[viewerIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 !mt-0">
          <button
            type="button"
            onClick={closeViewer}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>

          {canNavigateViewer && (
            <button
              type="button"
              onClick={showPrev}
              className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <img
            src={mediaList[viewerIndex].url}
            alt="preview"
            className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain"
          />

          {canNavigateViewer && (
            <button
              type="button"
              onClick={showNext}
              className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {canNavigateViewer && (
            <div className="absolute bottom-6 text-white/80 text-sm">
              {viewerIndex + 1} / {mediaList.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
