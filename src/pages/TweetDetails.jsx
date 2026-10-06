import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronLeft, Clock, Eye, Globe, Heart, History, Images, Lock, MessageSquare, Quote, Repeat2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatCompactNumber, formatNumber } from '../utils/helpers.jsx';
import { toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import { ConfirmModal } from '../components/Modal.jsx';
import {
  CaptionPanel, CommunityPanel, ErrorState, HashtagsPanel, Initials, InfoPanel, Lightbox, LoadingState,
  MetricsPanel, ModerationPanel, Panel, Pill, pctLabel, ratio,
} from '../components/ContentDetailKit.jsx';

const MAX_THREADS_WITH_REPLIES = 25;

const formatUtc = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} (UTC)`;
};

// Image card that reports its real pixel size and file type once loaded.
const MediaCard = ({ url, index, onOpen }) => {
  const [size, setSize] = useState(null);
  const [failed, setFailed] = useState(false);
  const ext = (url.split('?')[0].split('.').pop() || '').toUpperCase();
  return (
    <button type="button" onClick={onOpen} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(16,24,40,0.4)]">
      <div className="aspect-[16/10] overflow-hidden bg-neutral-100">
        {!failed
          ? <img src={url} alt="" onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-[12px] text-neutral-400">Image unavailable</div>}
      </div>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <div>
          <p className="text-[13.5px] font-bold text-neutral-900">Image {index + 1}</p>
          <p className="text-[11.5px] text-neutral-500">{size ? `${size.w}×${size.h}` : 'Loading…'}{ext && ext.length <= 4 ? ` ${ext}` : ''}</p>
        </div>
        {size && <Pill tone="pink">{size.w >= 1920 || size.h >= 1920 ? 'Hi-res' : 'Standard'}</Pill>}
      </div>
    </button>
  );
};

export default function TweetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useSelector((s) => s.auth.token);

  const [tweet, setTweet] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(-1);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' }), [token]);

  const loadTweet = useCallback(async () => {
    if (!token || !id) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/tweets/${id}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load buzz');
      setTweet(data?.tweet || data?.data || data);
      setStatus('succeeded');
    } catch (e) {
      setError(e.message || 'Failed to load buzz');
      setStatus('failed');
    }
  }, [token, id, headers]);

  // Top-level comments come from one endpoint; replies are fetched per comment.
  const loadComments = useCallback(async () => {
    if (!token || !id) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/tweets/${id}/comments`, { headers });
      const data = await res.json().catch(() => ([]));
      const top = res.ok ? (Array.isArray(data?.comments) ? data.comments : Array.isArray(data) ? data : []) : [];
      const withReplies = top.filter((c) => Number(c.replies_count) > 0).slice(0, MAX_THREADS_WITH_REPLIES);
      const replyLists = await Promise.all(withReplies.map((c) => fetch(`${API_BASE_WITH_PATH}/tweets/comments/${c._id || c.comment_id}/replies`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])));
      const repliesById = new Map(withReplies.map((c, i) => [String(c._id || c.comment_id), Array.isArray(replyLists[i]) ? replyLists[i] : []]));
      setComments(top.map((c) => ({ ...c, replies: repliesById.get(String(c._id || c.comment_id)) || [] })));
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [token, id, headers]);

  useEffect(() => { loadTweet(); loadComments(); }, [loadTweet, loadComments]);

  const buzz = useMemo(() => {
    const t = tweet || {};
    const author = t.author || {};
    const original = t.repostOf && typeof t.repostOf === 'object' ? t.repostOf : null;
    const type = original ? (t.quoteContent ? 'quote' : 'repost') : (Array.isArray(t.media) && t.media.length ? 'media' : 'post');
    const ownText = t.quoteContent || t.content || '';
    return {
      id: String(t._id || id),
      type,
      text: type === 'repost' ? (original?.content || '') : ownText,
      tags: (`${ownText} ${original?.content || ''}`.match(/#[\p{L}\p{N}_]+/gu) || []).map((tag) => tag.slice(1)),
      media: (Array.isArray(t.media) ? t.media : []).map((m) => toAbsoluteMediaUrl(m?.url || m?.fileUrl || m?.fileName)).filter(Boolean),
      original,
      audience: t.audience || 'everyone',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      likes: Number(t.likesCount ?? t.likes_count ?? 0) || 0,
      comments: Number(t.commentsCount ?? t.comments_count ?? 0) || 0,
      commentsTotal: Number(t.commentsTotal ?? t.commentsCount ?? 0) || 0,
      reposts: Number(t.repostsCount ?? t.reposts_count ?? 0) || 0,
      quotes: Number(t.quotesCount ?? 0) || 0,
      views: Number(t.viewsCount ?? 0) || 0,
      author: {
        id: author._id || author.id || '',
        name: author.full_name || author.username || 'Unknown user',
        handle: author.username || '',
        avatar: author.avatar_url ? toAbsoluteMediaUrl(author.avatar_url) : '',
      },
    };
  }, [tweet, id]);

  const handleDelete = async () => {
    if (!token || !id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/tweets/${id}`, { method: 'DELETE', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to delete buzz');
      navigate('/tweets', { replace: true });
    } catch (e) {
      setError(e.message || 'Failed to delete buzz');
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  const isLoading = status === 'loading' || status === 'idle';
  const edited = buzz.updatedAt && buzz.createdAt && new Date(buzz.updatedAt) - new Date(buzz.createdAt) > 60000;
  const engagementRate = ratio(buzz.likes + buzz.commentsTotal + buzz.reposts, buzz.views);
  const typeLabel = { post: 'Post', media: 'Media post', repost: 'Repost', quote: 'Quote' }[buzz.type];

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-10">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <button type="button" onClick={() => navigate('/tweets')} className="group inline-flex items-center gap-1 font-semibold text-neutral-600 transition-colors hover:text-neutral-900">
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Buzz
            </button>
            <span className="text-neutral-300">·</span>
            <span className="text-[10.5px] font-bold uppercase tracking-widest text-[#C81345]">Content Management / Realtime Moderation</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[26px] font-bold tracking-tight text-neutral-900">Buzz Detail</h1>
            {status === 'succeeded' && (
              <>
                <Pill tone="green" dot className="normal-case">Published</Pill>
                <Pill tone="purple" className="normal-case">{typeLabel}</Pill>
                <Pill tone="lavender">{buzz.audience === 'followers' ? 'Followers only' : 'Public feed'}</Pill>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => navigate('/reports/content')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-sm">
            <History className="h-4 w-4" /> Report History
          </button>
          <button type="button" onClick={() => setDeleteModal(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#C81345] px-4 text-[13px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#A50F39] hover:shadow-[0_10px_22px_-10px_rgba(200,19,69,0.7)]">
            <Trash2 className="h-4 w-4" /> Delete Buzz
          </button>
        </div>
      </div>

      {isLoading && <LoadingState label="Loading buzz…" />}
      {!isLoading && error && <ErrorState title="Could not load buzz" message={error} />}

      {status === 'succeeded' && tweet && !error && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            <CaptionPanel
              title="Buzz Content"
              caption={buzz.text}
              footer={(
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-neutral-500">
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Posted on {formatUtc(buzz.createdAt)}</span>
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-emerald-700">
                      {buzz.audience === 'followers' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                      {buzz.audience === 'followers' ? 'Followers' : 'Everyone'}
                    </span>
                    {edited && <span className="text-[11px] font-semibold text-neutral-600">Edited</span>}
                  </span>
                </div>
              )}
            />

            {buzz.original && (
              <Panel icon={buzz.type === 'quote' ? Quote : Repeat2} iconClass="text-[#8E35B5]" title={buzz.type === 'quote' ? 'Quoted Buzz' : 'Original Buzz'}>
                <button
                  type="button"
                  onClick={() => buzz.original._id && navigate(`/tweets/${buzz.original._id}`)}
                  className="flex w-full gap-3 rounded-xl border border-[#E4E7F5] bg-[#F7F8FD] p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-[#F1F3FC]"
                >
                  <Initials name={buzz.original.author?.full_name || buzz.original.author?.username} src={buzz.original.author?.avatar_url ? toAbsoluteMediaUrl(buzz.original.author.avatar_url) : ''} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-neutral-900">
                      {buzz.original.author?.full_name || buzz.original.author?.username || 'Unknown'}
                      {buzz.original.author?.username && <span className="ml-1.5 font-normal text-neutral-500">@{buzz.original.author.username}</span>}
                    </p>
                    <p className="mt-0.5 line-clamp-3 text-[13px] text-neutral-700">{buzz.original.content || 'No text'}</p>
                  </div>
                </button>
              </Panel>
            )}

            {buzz.media.length > 0 && (
              <Panel icon={Images} title="Media Assets" badge={<Pill tone="purple" className="normal-case">{buzz.media.length} image{buzz.media.length === 1 ? '' : 's'} attached</Pill>}>
                <div className={clsx('grid gap-3', buzz.media.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
                  {buzz.media.map((url, i) => <MediaCard key={url} url={url} index={i} onOpen={() => setViewerIndex(i)} />)}
                </div>
              </Panel>
            )}

            {buzz.tags.length > 0 && <HashtagsPanel tags={buzz.tags} />}

            <CommunityPanel comments={comments} loading={commentsLoading} authorId={buzz.author.id} authorHandle={buzz.author.handle} />
          </div>

          <div className="space-y-5 xl:sticky xl:top-[72px]">
            <InfoPanel
              title="Creator & Post Record"
              status={{ label: 'Active', tone: 'green' }}
              creator={{ name: buzz.author.name, handle: buzz.author.handle, avatar: buzz.author.avatar }}
              rows={[
                { label: 'Buzz ID', value: `#BUZ-${buzz.id.slice(-5).toUpperCase()}`, chip: true },
                { label: 'Published', value: formatUtc(buzz.createdAt) },
                { label: 'Type', value: typeLabel },
                { label: 'Audience', value: buzz.audience === 'followers' ? 'Followers only' : 'Everyone' },
                { label: 'Last edited', value: edited ? formatUtc(buzz.updatedAt) : null },
              ]}
              onViewCreator={buzz.author.id ? () => navigate(`/users/${buzz.author.id}`) : null}
            />

            <MetricsPanel
              title="Engagement"
              tiles={[
                { label: 'Likes', value: formatNumber(buzz.likes), icon: Heart, tone: 'pink', sub: pctLabel(ratio(buzz.likes, buzz.views), 'of views') },
                { label: 'Replies', value: formatNumber(buzz.commentsTotal), icon: MessageSquare, tone: 'purple', sub: buzz.comments ? `${buzz.comments} threads` : null },
                { label: 'Reposts', value: formatNumber(buzz.reposts), icon: Repeat2, tone: 'purple', sub: buzz.quotes ? `+${formatNumber(buzz.quotes)} quotes` : null },
                { label: 'Reach', value: formatCompactNumber(buzz.views), icon: Eye, tone: 'dark', sub: 'total views' },
              ]}
              bar={engagementRate === null ? null : {
                label: 'Engagement rate',
                value: `${engagementRate.toFixed(1)}% (${formatNumber(buzz.likes + buzz.commentsTotal + buzz.reposts)} actions)`,
                pct: engagementRate,
              }}
            />

            <ModerationPanel contentType="tweet" contentId={buzz.id} />
          </div>
        </div>
      )}

      <ConfirmModal isOpen={deleteModal} onClose={() => setDeleteModal(false)} onConfirm={handleDelete} title="Delete Buzz" description="Are you sure you want to delete this buzz? This cannot be undone." confirmText="Delete" confirmVariant="danger" loading={deleting} />
      <Lightbox images={buzz.media} index={viewerIndex} onClose={() => setViewerIndex(-1)} onIndex={setViewerIndex} />
    </div>
  );
}
