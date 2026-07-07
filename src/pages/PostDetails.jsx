import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchPostById, deletePostById, deleteCommentById, deleteReplyById } from '../store/postsSlice.js'
import { API_BASE_URL } from '../lib/apiBase.js'
import { formatDateTime, capitalize } from '../utils/helpers.jsx'
import {
  ChevronLeft, Film, Image as ImageIcon, Heart, MessageCircle,
  MapPin, Tag, Users, Trash2, Calendar, Play, X, ChevronRight,
  Hash, AtSign, Eye, MoreHorizontal, User, Clock, AlertCircle,
  Loader2
} from 'lucide-react'
import { clsx } from 'clsx'
import { ConfirmModal } from '../components/Modal.jsx'

const AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0Y0RjRGNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTQlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjQTFBMUFBIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+VVM8L3RleHQ+PC9zdmc+'

const toAbsoluteMediaUrl = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/uploads/')) return `${API_BASE_URL}${raw}`
  if (raw.startsWith('uploads/')) return `${API_BASE_URL}/${raw}`
  if (!raw.includes('/') && raw.includes('.')) return `${API_BASE_URL}/uploads/${raw}`
  if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`
  return `${API_BASE_URL}/${raw}`
}

const getThumbnailUrl = (m) => {
  if (!m) return ''
  const candidates = []
  if (Array.isArray(m.thumbnail)) candidates.push(...m.thumbnail)
  else if (m.thumbnail && typeof m.thumbnail === 'object') candidates.push(m.thumbnail)
  if (Array.isArray(m.thumbnails)) candidates.push(...m.thumbnails)

  for (const t of candidates) {
    const resolved = toAbsoluteMediaUrl(t?.fileUrl || t?.url || t?.fileName)
    if (resolved) return resolved
  }

  const fallback = toAbsoluteMediaUrl(m.fileUrl || m.url || m.fileName)
  if (fallback) return fallback
  return ''
}

function Avatar({ src, alt, size = 'md' }) {
  const [err, setErr] = useState(false)
  const sizes = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-16 h-16 text-base',
  }
  return (
    <img
      src={err || !src ? AVATAR_PLACEHOLDER : src}
      alt={alt || ''}
      onError={() => setErr(true)}
      className={clsx(sizes[size], 'rounded-full object-cover flex-shrink-0 bg-neutral-100 ring-2 ring-white shadow-sm')}
    />
  )
}

function SafeMediaImage({ src, alt, className, fallback }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) return fallback
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

function StatBadge({ icon: Icon, label, value, tone = 'neutral' }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    neutral: 'bg-neutral-50 text-neutral-600 border-neutral-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  }
  return (
    <div className={clsx('flex items-center gap-2 rounded-lg border px-3 py-2', tones[tone])}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-base font-bold leading-tight">{value}</p>
      </div>
    </div>
  )
}

function MetaRow({ icon: Icon, children }) {
  if (!children) return null
  return (
    <div className="flex items-start gap-2.5 text-sm text-neutral-500">
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-neutral-400" />
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

function ReelMediaPanel({ item }) {
  const [showVideo, setShowVideo] = useState(false)
  const thumbUrl = getThumbnailUrl(item)
  const videoUrl = toAbsoluteMediaUrl(item?.fileUrl || item?.url || item?.fileName)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Thumbnail */}
        <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900">
          <div className="px-3 py-2 bg-white/90 border-b border-neutral-200 flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3 text-neutral-400" />
            <p className="text-[10px] font-semibold tracking-[0.1em] text-neutral-500 uppercase">Thumbnail</p>
          </div>
          <div className="aspect-[9/16]">
            <SafeMediaImage
              src={thumbUrl}
              alt="thumbnail"
              className="w-full h-full object-cover"
              fallback={
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-500">
                  <Film className="w-8 h-8 opacity-30" />
                  <span className="text-[11px] opacity-50">No thumbnail</span>
                </div>
              }
            />
          </div>
        </div>

        {/* Video */}
        <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900">
          <div className="px-3 py-2 bg-white/90 border-b border-neutral-200 flex items-center gap-1.5">
            <Film className="w-3 h-3 text-neutral-400" />
            <p className="text-[10px] font-semibold tracking-[0.1em] text-neutral-500 uppercase">bSpark Video</p>
          </div>
          <div className="relative aspect-[9/16]">
            {!showVideo ? (
              <button
                onClick={() => setShowVideo(true)}
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 group"
              >
                <SafeMediaImage
                  src={thumbUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                  fallback={<div className="absolute inset-0 bg-neutral-800" />}
                />
                <div className="relative z-10 w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/30 transition-all duration-200 shadow-lg">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>
                <span className="relative z-10 text-white/80 text-xs font-semibold tracking-wide">Play bSpark</span>
              </button>
            ) : (
              <video
                src={videoUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PostImageGrid({ media, onOpenViewer }) {
  const items = Array.isArray(media) ? media : []
  const imageUrls = items
    .map((m) => getThumbnailUrl(m) || toAbsoluteMediaUrl(m?.fileUrl || m?.url || m?.fileName))
    .filter(Boolean)

  const slots = Math.max(3, imageUrls.length)
  const gridItems = Array.from({ length: slots }, (_, i) => imageUrls[i] || null)

  return (
    <div className="grid grid-cols-3 gap-2">
      {gridItems.map((url, i) => (
        <div key={i} className="aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 relative group">
          {url ? (
            <button type="button" onClick={() => onOpenViewer?.(i)} className="w-full h-full block">
              <SafeMediaImage
                src={url}
                alt="post media"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                fallback={<div className="w-full h-full bg-neutral-100" />}
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
  )
}

function CommentThread({ comment, onDeleteComment, onDeleteReply }) {
  const [showReplies, setShowReplies] = useState(true)
  const repliesCount = Array.isArray(comment.replies) ? comment.replies.length : 0

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden">
      {/* Comment */}
      <div className="p-4 group/comment">
        <div className="flex gap-3">
          <Avatar src={comment.user?.avatar_url} alt={comment.user?.username} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-neutral-900">
                  {comment.user?.full_name || comment.user?.username || 'User'}
                </span>
                {comment.user?.username && (
                  <span className="ml-1.5 text-xs text-neutral-400">@{comment.user.username}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {comment.createdAt && (
                  <span className="text-[10px] text-neutral-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(comment.createdAt)}
                  </span>
                )}
                <button
                  onClick={() => onDeleteComment(comment)}
                  className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete comment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">{comment.text}</p>
            {repliesCount > 0 && (
              <button
                onClick={() => setShowReplies((v) => !v)}
                className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {showReplies ? 'Hide' : 'Show'} {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {showReplies && repliesCount > 0 && (
        <div className="border-t border-neutral-50 bg-neutral-50/60">
          {comment.replies.map((reply, ri) => (
            <div
              key={reply.reply_id || reply._id || ri}
              className="px-4 py-3 flex gap-3 group/reply border-b border-neutral-50 last:border-0"
            >
              <div className="w-4 flex-shrink-0 flex items-start justify-end pt-2.5">
                <div className="w-2 h-4 border-l-2 border-b-2 border-neutral-200 rounded-bl-md" />
              </div>
              <Avatar src={reply.user?.avatar_url} alt={reply.user?.username} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-neutral-900">
                      {reply.user?.full_name || reply.user?.username || 'User'}
                    </span>
                    {reply.user?.username && (
                      <span className="ml-1.5 text-xs text-neutral-400">@{reply.user.username}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {reply.createdAt && (
                      <span className="text-[10px] text-neutral-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(reply.createdAt)}
                      </span>
                    )}
                    <button
                      onClick={() => onDeleteReply(reply)}
                      className="opacity-0 group-hover/reply:opacity-100 transition-opacity p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete reply"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">{reply.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PostDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { current, currentStatus, currentError } = useSelector((s) => s.posts)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [replyToDelete, setReplyToDelete] = useState(null)
  const [viewerIndex, setViewerIndex] = useState(-1)

  useEffect(() => { if (id) dispatch(fetchPostById(id)) }, [dispatch, id])

  const post = useMemo(() => {
    const p = current || {}
    const media = Array.isArray(p.media) ? p.media : []
    const user = p.user_id || p.user || {}
    const isVideo = media[0]?.type === 'video'
    const likesArr = Array.isArray(p.likes) ? p.likes : []
    const commentsArr = Array.isArray(p.comments) ? p.comments : []
    return {
      id: p.post_id || p._id || p.id || id,
      caption: p.caption || '',
      location: p.location || '',
      createdAt: p.createdAt || p.created_at || '',
      likesCount: p.likes_count ?? likesArr.length ?? 0,
      likesArr,
      commentsArr,
      media,
      user: {
        username: user.username || '',
        full_name: user.full_name || user.name || '',
        avatar_url: user.avatar_url || '',
      },
      tags: Array.isArray(p.tags) ? p.tags : [],
      people_tags: Array.isArray(p.people_tags) ? p.people_tags : [],
      type: isVideo ? 'reel' : 'post',
    }
  }, [current, id])

  const postImageUrls = useMemo(() => {
    const items = Array.isArray(post.media) ? post.media : []
    return items
      .map((m) => getThumbnailUrl(m) || toAbsoluteMediaUrl(m?.fileUrl || m?.url || m?.fileName))
      .filter(Boolean)
  }, [post.media])

  const isViewerOpen = viewerIndex >= 0
  const canNavigateViewer = postImageUrls.length > 1
  const closeViewer = () => setViewerIndex(-1)
  const showPrev = () => setViewerIndex((prev) => (prev - 1 + postImageUrls.length) % postImageUrls.length)
  const showNext = () => setViewerIndex((prev) => (prev + 1) % postImageUrls.length)

  const handleDelete = () => {
    setDeleting(true)
    dispatch(deletePostById(post.id))
      .unwrap()
      .then(() => navigate(post.type === 'reel' ? '/reels' : '/posts', { replace: true }))
      .catch(() => setDeleting(false))
      .finally(() => setDeleteModal(false))
  }

  const handleCommentDelete = () => {
    if (!commentToDelete) return
    setDeleting(true)
    dispatch(deleteCommentById(commentToDelete.comment_id || commentToDelete._id || commentToDelete.id))
      .unwrap()
      .finally(() => {
        setDeleting(false)
        setCommentToDelete(null)
      })
  }

  const handleReplyDelete = () => {
    if (!replyToDelete) return
    setDeleting(true)
    dispatch(deleteReplyById(replyToDelete.reply_id || replyToDelete._id || replyToDelete.id))
      .unwrap()
      .finally(() => {
        setDeleting(false)
        setReplyToDelete(null)
      })
  }

  const isLoading = currentStatus === 'loading'
  const isReel = post.type === 'reel'

  return (
    <div className="w-full pb-8 max-w-[1400px] mx-auto">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(isReel ? '/reels' : '/posts')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {isReel ? 'Back to bSparks' : 'Back to Moments'}
        </button>

        <div className="flex items-center gap-2">
          <span className={clsx(
            'inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border',
            isReel
              ? 'bg-violet-50 text-violet-600 border-violet-100'
              : 'bg-rose-50 text-rose-500 border-rose-100'
          )}>
            {isReel ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
            {capitalize(post.type)}
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

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading post details…</p>
        </div>
      )}

      {/* ── Error ── */}
      {!isLoading && currentError && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-semibold text-neutral-800">Could not load post</p>
          <p className="text-sm text-neutral-400">{currentError}</p>
        </div>
      )}

      {/* ── Main content ── */}
      {!isLoading && !currentError && (
        <div className="space-y-4">

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBadge icon={Heart} label="Likes" value={post.likesCount} tone="rose" />
            <StatBadge icon={MessageCircle} label="Comments" value={post.commentsArr.length} tone="blue" />
            <StatBadge icon={Users} label="People Tagged" value={post.people_tags.length} tone="violet" />
            <StatBadge icon={Tag} label="Hashtags" value={post.tags.length} tone="emerald" />
          </div>

          {/* ── Post card: info + media ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            {/* Left: Info card */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Moment Info</p>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar src={post.user.avatar_url} alt={post.user.full_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-neutral-900 text-sm leading-tight truncate">
                      {post.user.full_name || 'Unknown User'}
                    </p>
                    {post.user.username && (
                      <p className="text-sm text-neutral-400 mt-0.5 flex items-center gap-1">
                        <AtSign className="w-3.5 h-3.5" />
                        {post.user.username}
                      </p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-neutral-100" />

                {/* Caption */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Caption</p>
                  {post.caption
                    ? <p className="text-sm text-neutral-700 leading-relaxed">{post.caption}</p>
                    : <p className="text-sm text-neutral-300 italic">No caption provided</p>
                  }
                </div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Hashtags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((t, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-500 font-semibold border border-rose-100">
                          <Hash className="w-3 h-3" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* People tags */}
                {post.people_tags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">People Tagged</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.people_tags.map((pt, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 font-semibold border border-violet-100">
                          <AtSign className="w-3 h-3" />
                          {pt.username}
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
                  <MetaRow icon={Calendar}>{post.createdAt ? formatDateTime(post.createdAt) : null}</MetaRow>
                  <MetaRow icon={MapPin}>{post.location || null}</MetaRow>
                </div>

                {/* Post ID */}
                <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Post ID</p>
                  <p className="text-[11px] font-mono text-neutral-400 break-all leading-relaxed">{post.id}</p>
                </div>
              </div>
            </div>

            {/* Right: Media card */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-2">
                {isReel
                  ? <><Film className="w-3.5 h-3.5 text-violet-400" /><p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Reel Media</p></>
                  : <><ImageIcon className="w-3.5 h-3.5 text-rose-400" /><p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Images</p></>
                }
                {!isReel && post.media.length > 0 && (
                  <span className="ml-auto text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {post.media.length} file{post.media.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="p-4">
                {isReel
                  ? <ReelMediaPanel item={post.media[0]} />
                  : <PostImageGrid media={post.media} onOpenViewer={setViewerIndex} />
                }
              </div>
            </div>
          </div>

          {/* ── Comments section ── */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-3">
              <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Comments</p>
              <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold border border-blue-100">
                {post.commentsArr.length}
              </span>
            </div>

            <div className="p-4">
              {post.commentsArr.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-neutral-300" />
                  </div>
                  <p className="text-xs text-neutral-400">No comments yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                  {post.commentsArr.map((c, i) => (
                    <CommentThread
                      key={c.comment_id || c._id || i}
                      comment={c}
                      onDeleteComment={setCommentToDelete}
                      onDeleteReply={setReplyToDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Post"
        description={`Are you sure you want to permanently delete this ${post.type}? This cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />

      <ConfirmModal
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleCommentDelete}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />

      <ConfirmModal
        isOpen={!!replyToDelete}
        onClose={() => setReplyToDelete(null)}
        onConfirm={handleReplyDelete}
        title="Delete Reply"
        description="Are you sure you want to delete this reply? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />

      {/* ── Image lightbox viewer ── */}
      {isViewerOpen && postImageUrls[viewerIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeViewer}
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeViewer}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          {canNavigateViewer && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm z-10">
              {viewerIndex + 1} / {postImageUrls.length}
            </div>
          )}

          {/* Prev */}
          {canNavigateViewer && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); showPrev() }}
              className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <img
            src={postImageUrls[viewerIndex]}
            alt="preview"
            className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {canNavigateViewer && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); showNext() }}
              className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
