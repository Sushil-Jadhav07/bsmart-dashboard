import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { API_BASE_URL, API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import {
  ChevronLeft, Heart, MessageCircle, Repeat2, Trash2,
  Image as ImageIcon, X, ChevronRight, AtSign, Calendar,
  Send, User, Clock, AlertCircle, Loader2, Eye, Hash,
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

const AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0Y0RjRGNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTQlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjQTFBMUFBIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+VVM8L3RleHQ+PC9zdmc+';

function Avatar({ src, alt, size = 'md' }) {
  const [err, setErr] = useState(false);
  const sizes = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
  };
  return (
    <img
      src={err || !src ? AVATAR_PLACEHOLDER : src}
      alt={alt || ''}
      onError={() => setErr(true)}
      className={clsx(sizes[size], 'rounded-full object-cover flex-shrink-0 bg-neutral-100 ring-2 ring-white shadow-sm')}
    />
  );
}

function StatBadge({ icon: Icon, label, value, tone = 'neutral' }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    neutral: 'bg-neutral-50 text-neutral-600 border-neutral-200',
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

function MetaRow({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm text-neutral-500">
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-neutral-400" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function MediaGrid({ mediaList, onOpenViewer }) {
  const slots = Math.max(3, mediaList.length);
  const gridItems = Array.from({ length: slots }, (_, i) => mediaList[i] || null);

  return (
    <div className="grid grid-cols-3 gap-2">
      {gridItems.map((m, i) => (
        <div key={m?.id || `blank-${i}`} className="aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 relative group">
          {m ? (
            <button type="button" onClick={() => onOpenViewer(i)} className="w-full h-full block">
              <img
                src={m.url}
                alt="tweet media"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" />
              </div>
            </button>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
              <ImageIcon className="w-5 h-5 text-neutral-300" />
              <span className="text-[10px] text-neutral-300">No image</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

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
      setTweet(data?.tweet || data?.data || data);
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
      setComments(Array.isArray(data?.comments) ? data.comments : Array.isArray(data) ? data : []);
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
    return tweet.media
      .map((m, idx) => ({
        id: `${idx}`,
        url: toAbsoluteMediaUrl(m?.url || m?.fileUrl || m?.fileName || ''),
      }))
      .filter((m) => !!m.url);
  }, [tweet]);

  const author = tweet?.author || {};
  const tweetId = tweet?._id || id;
  const content = tweet?.content || '';
  const isReply = !!tweet?.parent_tweet_id;

  const isViewerOpen = viewerIndex >= 0;
  const canNavigateViewer = mediaList.length > 1;
  const closeViewer = () => setViewerIndex(-1);
  const showPrev = () => setViewerIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  const showNext = () => setViewerIndex((prev) => (prev + 1) % mediaList.length);

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

  return (
    <div className="w-full pb-8 max-w-[1400px] mx-auto">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/tweets')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Tweets
        </button>

        <div className="flex items-center gap-2">
          <span className={clsx(
            'inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border',
            isReply
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-violet-50 text-violet-600 border-violet-100'
          )}>
            {isReply ? <MessageCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />}
            {isReply ? 'Reply' : 'Tweet'}
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
          <p className="text-sm font-medium">Loading tweet details…</p>
        </div>
      )}

      {/* ── Error ── */}
      {status !== 'loading' && error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-semibold text-neutral-800">Could not load tweet</p>
          <p className="text-sm text-neutral-400">{error}</p>
        </div>
      )}

      {/* ── Main content ── */}
      {status === 'succeeded' && tweet && (
        <div className="space-y-4">

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatBadge icon={Heart} label="Likes" value={formatNumber(tweet?.likes_count ?? tweet?.likesCount ?? 0)} tone="rose" />
            <StatBadge icon={MessageCircle} label="Replies" value={formatNumber(tweet?.replies_count ?? tweet?.commentsCount ?? 0)} tone="blue" />
            <StatBadge icon={Repeat2} label="Reposts" value={formatNumber(tweet?.reposts_count ?? tweet?.repostsCount ?? 0)} tone="violet" />
          </div>

          {/* ── Tweet card + media ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            {/* Left: Info card */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Tweet Info</p>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar
                    src={author?.avatar_url || author?.profile_picture}
                    alt={author?.full_name || author?.username}
                    size="md"
                  />
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

                {/* Divider */}
                <div className="h-px bg-neutral-100" />

                {/* Tweet content */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Content</p>
                  {content
                    ? <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap break-words">{content}</p>
                    : <p className="text-sm text-neutral-300 italic">No content</p>
                  }
                </div>

                {/* Hashtags extracted from content */}
                {content && /#\w+/.test(content) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Hashtags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(content.match(/#\w+/g) || []).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 font-semibold border border-violet-100">
                          <Hash className="w-3 h-3" />
                          {tag.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="h-px bg-neutral-100" />

                {/* Metadata */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Details</p>
                  <MetaRow icon={Calendar}>{tweet?.createdAt ? formatDateTime(tweet.createdAt) : null}</MetaRow>
                  {isReply && (
                    <MetaRow icon={MessageCircle}>
                      <span>Reply to tweet <span className="font-mono text-xs">{tweet.parent_tweet_id}</span></span>
                    </MetaRow>
                  )}
                </div>

                {/* Tweet ID */}
                <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Tweet ID</p>
                  <p className="text-[11px] font-mono text-neutral-400 break-all leading-relaxed">{tweetId}</p>
                </div>
              </div>
            </div>

            {/* Right: Media card */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Media</p>
                {mediaList.length > 0 && (
                  <span className="ml-auto text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {mediaList.length} file{mediaList.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="p-4">
                {mediaList.length > 0 ? (
                  <MediaGrid mediaList={mediaList} onOpenViewer={setViewerIndex} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-neutral-300" />
                    </div>
                    <p className="text-xs text-neutral-400">No media attached</p>
                  </div>
                )}
              </div>
            </div>
          </div>

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
                      className="rounded-2xl border border-neutral-100 bg-white overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex gap-3">
                          <Avatar
                            src={c?.user?.avatar_url}
                            alt={c?.user?.username}
                            size="sm"
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Tweet"
        description="Are you sure you want to delete this tweet? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />

      {/* ── Image lightbox ── */}
      {isViewerOpen && mediaList[viewerIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeViewer}
        >
          <button
            type="button"
            onClick={closeViewer}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {canNavigateViewer && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm z-10">
              {viewerIndex + 1} / {mediaList.length}
            </div>
          )}

          {canNavigateViewer && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); showPrev(); }}
              className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <img
            src={mediaList[viewerIndex].url}
            alt="preview"
            className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {canNavigateViewer && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); showNext(); }}
              className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
