import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchPostById, deletePostById, deleteCommentById, deleteReplyById } from '../store/postsSlice.js'
import { API_BASE_URL } from '../lib/apiBase.js'
import { formatDateTime } from '../utils/helpers.jsx'
import {
  ChevronLeft, Film, Heart, MessageCircle,
  MapPin, Trash2, Calendar, Play
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
  const sizes = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' }
  return (
    <img
      src={err || !src ? AVATAR_PLACEHOLDER : src}
      alt={alt || ''}
      onError={() => setErr(true)}
      className={clsx(sizes[size], 'rounded-full object-cover flex-shrink-0 bg-neutral-100')}
    />
  )
}

function SectionLabel({ children }) {
  return <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase mb-3">{children}</p>
}

function SafeMediaImage({ src, alt, className, fallback }) {
  const [failed, setFailed] = useState(false)
  const showFallback = failed || !src
  if (showFallback) return fallback
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

function ReelMediaPanel({ item }) {
  const [showVideo, setShowVideo] = useState(false)
  const thumbUrl = getThumbnailUrl(item)
  const videoUrl = toAbsoluteMediaUrl(item?.fileUrl || item?.url || item?.fileName)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-3">
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3">
        <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-900">
          <div className="px-3 py-2 bg-white border-b border-neutral-200">
            <p className="text-[10px] font-semibold tracking-[0.1em] text-neutral-500 uppercase">Thumbnail</p>
          </div>
          <div className="aspect-[9/16] md:aspect-[3/5]">
            <SafeMediaImage
              src={thumbUrl}
              alt="thumbnail"
              className="w-full h-full object-cover"
              fallback={
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-500">
                  <Film className="w-7 h-7" />
                  <span className="text-[11px]">No thumbnail</span>
                </div>
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-900">
          <div className="px-3 py-2 bg-white border-b border-neutral-200">
            <p className="text-[10px] font-semibold tracking-[0.1em] text-neutral-500 uppercase">Reel Video</p>
          </div>
          <div className="relative aspect-[9/16] md:aspect-[16/10]">
            {!showVideo ? (
              <button
                onClick={() => setShowVideo(true)}
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 group"
              >
                <SafeMediaImage
                  src={thumbUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                  fallback={<div className="absolute inset-0 bg-neutral-900" />}
                />
                <div className="relative z-10 w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/25 transition-all duration-200">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
                <span className="relative z-10 text-white/75 text-[11px] font-medium">Play Reel</span>
              </button>
            ) : (
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
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

export default function ReelDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { current, currentStatus, currentError } = useSelector((s) => s.posts)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [replyToDelete, setReplyToDelete] = useState(null)

  useEffect(() => { if (id) dispatch(fetchPostById(id)) }, [dispatch, id])

  const reel = useMemo(() => {
    const p = current || {}
    const media = Array.isArray(p.media) ? p.media : []
    const user = p.user_id || p.user || {}
    const likesArr = Array.isArray(p.likes) ? p.likes : []
    const commentsArr = Array.isArray(p.comments) ? p.comments : []
    return {
      id: p.post_id || p._id || p.id || id,
      caption: p.caption || '',
      location: p.location || '',
      createdAt: p.createdAt || p.created_at || '',
      likesCount: p.likes_count ?? likesArr.length ?? 0,
      commentsArr,
      media,
      user: {
        username: user.username || '',
        full_name: user.full_name || user.name || '',
        avatar_url: user.avatar_url || '',
      },
    }
  }, [current, id])

  const handleDelete = () => {
    setDeleting(true)
    dispatch(deletePostById(reel.id))
      .unwrap()
      .then(() => navigate('/reels', { replace: true }))
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

  return (
    <div className="w-full pb-10">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/reels')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Reels
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-violet-50 text-violet-600">
            <Film className="w-3 h-3" /> Reel
          </span>
          <button
            onClick={() => setDeleteModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
            <div className="aspect-[9/16] bg-neutral-100 rounded-2xl animate-pulse" />
          </div>
          <div className="bg-neutral-100 rounded-3xl h-[500px] animate-pulse" />
        </div>
      )}

      {!isLoading && currentError && (
        <div className="p-10 text-center rounded-3xl border border-red-100 bg-red-50">
          <p className="font-semibold text-red-500">Could not load reel</p>
          <p className="text-sm text-red-400 mt-1">{currentError}</p>
        </div>
      )}

      {!isLoading && !currentError && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Heart className="w-4 h-4" />
                <p className="text-xs font-medium">Likes</p>
              </div>
              <p className="text-2xl font-bold text-rose-600 mt-2">{reel.likesCount}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
              <div className="flex items-center gap-2 text-blue-600">
                <MessageCircle className="w-4 h-4" />
                <p className="text-xs font-medium">Comments</p>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-2">{reel.commentsArr.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-6">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-100">
                <SectionLabel>Content</SectionLabel>
              </div>
              <div className="px-5 py-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar src={reel.user.avatar_url} alt={reel.user.full_name} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm leading-tight truncate">{reel.user.full_name || 'Unknown'}</p>
                    {reel.user.username && <p className="text-xs text-neutral-400 mt-0.5">@{reel.user.username}</p>}
                  </div>
                </div>
                {reel.caption ? <p className="text-sm text-neutral-700 leading-relaxed">{reel.caption}</p> : <p className="text-sm text-neutral-300 italic">No caption</p>}
                <div className="space-y-1.5">
                  {reel.createdAt && <div className="flex items-center gap-1.5 text-xs text-neutral-400"><Calendar className="w-3.5 h-3.5 flex-shrink-0" />{formatDateTime(reel.createdAt)}</div>}
                  {reel.location && <div className="flex items-center gap-1.5 text-xs text-neutral-400"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{reel.location}</div>}
                </div>
                <p className="text-[10px] font-mono text-neutral-300 break-all">{reel.id}</p>
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-100">
                <SectionLabel>Thumbnail / Video</SectionLabel>
              </div>
              <div className="p-5">
                <ReelMediaPanel item={reel.media[0]} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <SectionLabel>All Comments</SectionLabel>
              <span className="ml-auto text-xs text-neutral-400 font-semibold">{reel.commentsArr.length}</span>
            </div>
            <div className="px-5 py-5">
              {reel.commentsArr.length === 0 ? (
                <p className="text-sm text-neutral-400">No comments found</p>
              ) : (
                <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                  {reel.commentsArr.map((c, i) => (
                    <div key={c.comment_id || c._id || i} className="flex flex-col gap-2 rounded-xl border border-neutral-100 p-3 bg-neutral-50/40">
                      <div className="flex gap-2.5 group/comment">
                        <Avatar src={c.user?.avatar_url} alt={c.user?.username} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-neutral-800">@{c.user?.username || 'user'}</span>
                            <span className="text-[10px] text-neutral-300">{c.createdAt ? formatDateTime(c.createdAt) : ''}</span>
                            <button
                              onClick={() => setCommentToDelete(c)}
                              className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{c.text}</p>
                        </div>
                      </div>
                      {c.replies && Array.isArray(c.replies) && c.replies.length > 0 && (
                        <div className="pl-9 space-y-3">
                          {c.replies.map((r, ri) => (
                            <div key={r.reply_id || r._id || ri} className="flex gap-2.5 group/reply relative">
                              <div className="absolute -left-3 top-2 w-2 h-2 border-l border-b border-neutral-200 rounded-bl-sm" />
                              <Avatar src={r.user?.avatar_url} alt={r.user?.username} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-neutral-800">@{r.user?.username || 'user'}</span>
                                  <span className="text-[10px] text-neutral-300">{r.createdAt ? formatDateTime(r.createdAt) : ''}</span>
                                  <button
                                    onClick={() => setReplyToDelete(r)}
                                    className="ml-auto opacity-0 group-hover/reply:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Delete reply"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{r.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
        title="Delete Reel"
        description="Are you sure you want to permanently delete this reel? This cannot be undone."
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
    </div>
  )
}
