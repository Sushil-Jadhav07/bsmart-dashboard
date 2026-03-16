import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchPostById, deletePostById, deleteCommentById, deleteReplyById } from '../store/postsSlice.js'
import { formatDateTime, capitalize } from '../utils/helpers.jsx'
import {
  ChevronLeft, Film, Image as ImageIcon, Heart, MessageCircle,
  MapPin, Tag, Users, Trash2, Calendar, Play
} from 'lucide-react'
import { clsx } from 'clsx'
import { ConfirmModal } from '../components/Modal.jsx'

const AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0Y0RjRGNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTQlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjQTFBMUFBIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+VVM8L3RleHQ+PC9zdmc+'

const getThumbnailUrl = (m) => {
  if (!m) return ''
  if (Array.isArray(m.thumbnail) && m.thumbnail[0]?.fileUrl) return m.thumbnail[0].fileUrl
  if (m.thumbnail?.fileUrl) return m.thumbnail.fileUrl
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

function Divider() {
  return <div className="h-px bg-neutral-100 mx-6" />
}

function SectionLabel({ children }) {
  return <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase mb-3">{children}</p>
}

/* Reel media panel: thumbnail card + video card side by side on wide, stacked on narrow */
function ReelMediaPanel({ item }) {
  const [showVideo, setShowVideo] = useState(false)
  const thumbUrl = getThumbnailUrl(item)
  const videoUrl = item?.fileUrl || ''

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Thumbnail */}
      <div>
        <SectionLabel>Thumbnail</SectionLabel>
        <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-900 shadow-md">
          {thumbUrl ? (
            <img src={thumbUrl} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-8 h-8 text-neutral-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <span className="absolute bottom-2.5 left-2.5 text-[10px] font-semibold text-white/80 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
            Thumbnail
          </span>
        </div>
      </div>

      {/* Video */}
      <div>
        <SectionLabel>Reel Video</SectionLabel>
        <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-900 shadow-md">
          {!showVideo ? (
            <button
              onClick={() => setShowVideo(true)}
              className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 group"
            >
              {thumbUrl && (
                <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
              )}
              <div className="relative z-10 w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/25 transition-all duration-200">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
              <span className="relative z-10 text-white/60 text-[11px]">Tap to play</span>
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
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          {!showVideo && (
            <span className="absolute bottom-2.5 left-2.5 text-[10px] font-semibold text-white/80 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full pointer-events-none">
              Video
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* Post media panel */
function PostMediaPanel({ media }) {
  const item = media?.[0]
  const imgUrl = getThumbnailUrl(item) || item?.fileUrl || ''

  if (!item) {
    return (
      <div className="aspect-square rounded-2xl bg-neutral-100 flex items-center justify-center">
        <ImageIcon className="w-8 h-8 text-neutral-300" />
      </div>
    )
  }

  return (
    <div>
      <SectionLabel>Image</SectionLabel>
      <div className="aspect-square rounded-2xl overflow-hidden shadow-md bg-neutral-100">
        <img src={imgUrl} alt="post" className="w-full h-full object-cover" />
      </div>
      {media.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {media.slice(1).map((m, i) => (
            <div key={i} className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-neutral-200">
              <img src={getThumbnailUrl(m) || m.fileUrl} alt="" className="w-full h-full object-cover" />
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

  const handleDelete = () => {
    setDeleting(true)
    dispatch(deletePostById(post.id))
      .unwrap()
      .then(() => navigate('/posts', { replace: true }))
      .catch(() => setDeleting(false))
      .finally(() => setDeleteModal(false))
  }

  const handleCommentDelete = () => {
    if (!commentToDelete) return
    setDeleting(true)
    dispatch(deleteCommentById(commentToDelete.comment_id || commentToDelete._id || commentToDelete.id))
      .unwrap()
      .catch((e) => console.error('Failed to delete comment', e))
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
      .catch((e) => console.error('Failed to delete reply', e))
      .finally(() => {
        setDeleting(false)
        setReplyToDelete(null)
      })
  }

  const isLoading = currentStatus === 'loading'

  return (
    <div className="max-w-7xl mx-auto pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/posts')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Posts
        </button>
        <div className="flex items-center gap-2">
          <span className={clsx(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full',
            post.type === 'reel' ? 'bg-violet-50 text-violet-600' : 'bg-rose-50 text-rose-500'
          )}>
            {post.type === 'reel' ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
            {capitalize(post.type)}
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

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
            <div className="aspect-[9/16] bg-neutral-100 rounded-2xl animate-pulse" />
          </div>
          <div className="bg-neutral-100 rounded-3xl h-[500px] animate-pulse" />
        </div>
      )}

      {/* ── Error ── */}
      {!isLoading && currentError && (
        <div className="p-10 text-center rounded-3xl border border-red-100 bg-red-50">
          <p className="font-semibold text-red-500">Could not load post</p>
          <p className="text-sm text-red-400 mt-1">{currentError}</p>
        </div>
      )}

      {/* ── Main layout ── */}
      {!isLoading && !currentError && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* LEFT ── media */}
          {post.type === 'reel'
            ? <ReelMediaPanel item={post.media[0]} />
            : <PostMediaPanel media={post.media} />
          }

          {/* RIGHT ── info card */}
          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">

            {/* Author */}
            <div className="flex items-center gap-3 px-5 py-5">
              <Avatar src={post.user.avatar_url} alt={post.user.full_name} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 text-sm leading-tight truncate">
                  {post.user.full_name || 'Unknown'}
                </p>
                {post.user.username && (
                  <p className="text-xs text-neutral-400 mt-0.5">@{post.user.username}</p>
                )}
              </div>
            </div>

            <Divider />

            {/* Stats */}
            <div className="grid grid-cols-2 divide-x divide-neutral-100">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-900 leading-none">{post.likesCount}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Likes</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-900 leading-none">{post.commentsArr.length}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Comments</p>
                </div>
              </div>
            </div>

            <Divider />

            {/* Caption + meta */}
            <div className="px-5 py-4 space-y-3">
              {post.caption ? (
                <p className="text-sm text-neutral-700 leading-relaxed">{post.caption}</p>
              ) : (
                <p className="text-sm text-neutral-300 italic">No caption</p>
              )}
              <div className="space-y-1.5">
                {post.createdAt && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    {formatDateTime(post.createdAt)}
                  </div>
                )}
                {post.location && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    {post.location}
                  </div>
                )}
              </div>
              <p className="text-[10px] font-mono text-neutral-300 break-all">{post.id}</p>
            </div>

            {/* Tags */}
            {(post.tags.length > 0 || post.people_tags.length > 0) && (
              <>
                <Divider />
                <div className="px-5 py-4 space-y-3">
                  {post.tags.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Tag className="w-3 h-3 text-neutral-300" />
                        <SectionLabel>Hashtags</SectionLabel>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((t, i) => (
                          <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-rose-50 text-rose-500 font-medium">#{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {post.people_tags.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Users className="w-3 h-3 text-neutral-300" />
                        <SectionLabel>Tagged</SectionLabel>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {post.people_tags.map((pt, i) => (
                          <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 font-medium">@{pt.username}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Liked by */}
            {post.likesArr.length > 0 && (
              <>
                <Divider />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Heart className="w-3 h-3 text-rose-400" />
                    <SectionLabel>Liked by</SectionLabel>
                  </div>
                  <div className="space-y-2.5 max-h-40 overflow-y-auto">
                    {post.likesArr.map((u, i) => {
                      const usr = u.user_id || u.user || u
                      return (
                        <div key={u._id || i} className="flex items-center gap-2.5">
                          <Avatar src={usr.avatar_url || ''} alt={usr.full_name || usr.username} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-neutral-800 truncate leading-tight">
                              {usr.full_name || usr.name || usr.username || 'User'}
                            </p>
                            {usr.username && (
                              <p className="text-[10px] text-neutral-400">@{usr.username}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Comments */}
            {post.commentsArr.length > 0 && (
              <>
                <Divider />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <MessageCircle className="w-3 h-3 text-blue-400" />
                    <SectionLabel>Comments</SectionLabel>
                    <span className="ml-auto text-[10px] text-neutral-300 font-medium">{post.commentsArr.length}</span>
                  </div>
                  <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                    {post.commentsArr.map((c, i) => (
                      <div key={c.comment_id || c._id || i} className="flex flex-col gap-2">
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
                        {/* Replies */}
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
                </div>
              </>
            )}

          </div>
        </div>
      )}

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
    </div>
  )
}