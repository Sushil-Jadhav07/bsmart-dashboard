import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  ChevronLeft,
  Film,
  Image as ImageIcon,
  Trash2,
  Calendar,
  MapPin,
  Tag,
  CheckCircle2,
  PauseCircle,
  Play,
  XCircle,
  MessageCircle,
} from 'lucide-react'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Modal, { ConfirmModal } from '../components/Modal.jsx'
import { formatDateTime, getStatusColor, capitalize, formatNumber } from '../utils/helpers.jsx'
import { fetchAdById, patchAdStatus, deleteAdById, fetchAdComments, deleteAdComment } from '../store/adsSlice.js'

const THUMB_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0U1RTdFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+QWQ8L3RleHQ+PC9zdmc+'

const getThumbnailUrl = (m) => {
  if (!m) return ''
  if (Array.isArray(m.thumbnail) && m.thumbnail[0]?.fileUrl) return m.thumbnail[0].fileUrl
  if (m.thumbnail?.fileUrl) return m.thumbnail.fileUrl
  if (Array.isArray(m.thumbnails) && m.thumbnails[0]?.fileUrl) return m.thumbnails[0].fileUrl
  if (m.thumbnails?.fileUrl) return m.thumbnails.fileUrl
  if (m.thumbnail_url) return m.thumbnail_url
  return ''
}

function Divider() {
  return <div className="h-px bg-neutral-100 mx-6" />
}

function SectionLabel({ children }) {
  return <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase mb-3">{children}</p>
}

function VideoMediaPanel({ item }) {
  const [showVideo, setShowVideo] = useState(false)
  const thumbUrl = getThumbnailUrl(item)
  const videoUrl = item?.fileUrl || item?.url || ''

  return (
    <div className="grid grid-cols-2 gap-4">
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

      <div>
        <SectionLabel>Ad Video</SectionLabel>
        <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-900 shadow-md">
          {!showVideo ? (
            <button
              onClick={() => setShowVideo(true)}
              className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 group"
            >
              {(thumbUrl || videoUrl) && (
                <img src={thumbUrl || THUMB_PLACEHOLDER} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
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

function ImageMediaPanel({ media }) {
  const item = media?.[0]
  const imgUrl = getThumbnailUrl(item) || item?.fileUrl || item?.url || ''

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
        <img src={imgUrl || THUMB_PLACEHOLDER} alt="ad" className="w-full h-full object-cover" />
      </div>
      {media.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {media.slice(1).map((m, i) => (
            <div key={i} className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-neutral-200">
              <img src={getThumbnailUrl(m) || m.fileUrl || m.url || THUMB_PLACEHOLDER} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { current, currentStatus, currentError } = useSelector((s) => s.ads)

  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [commentDeleting, setCommentDeleting] = useState(false)

  useEffect(() => {
    if (id) dispatch(fetchAdById(id))
  }, [dispatch, id])

  useEffect(() => {
    if (!id) return
    setCommentsLoading(true)
    dispatch(fetchAdComments(id))
      .unwrap()
      .then((payload) => setComments(payload?.items || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false))
  }, [dispatch, id])

  const ad = useMemo(() => {
    const a = current || {}
    const media = Array.isArray(a.media) ? a.media : []
    const mediaItem = media[0]
    const mediaType = mediaItem?.media_type || mediaItem?.type || ''
    const isVideo = String(mediaType).toLowerCase().includes('video')
    const categoryRaw = a.category || a.targeting_rules?.category_label || ''
    const category =
      typeof categoryRaw === 'string'
        ? categoryRaw
        : (categoryRaw?.label || categoryRaw?.name || categoryRaw?.title || '')
    const title = a.title || a.headline || a.caption || 'Untitled ad'
    return {
      id: a._id || a.ad_id || a.id || id,
      title,
      caption: a.caption || '',
      location: a.location || a.location_name || '',
      category,
      coinsReward: a.coins_reward ?? a.reward_config?.coins_per_view ?? 0,
      totalBudgetCoins: a.total_budget_coins ?? a.budget?.total_budget_coins ?? 0,
      createdAt: a.createdAt || a.created_at || '',
      status: a.status || 'pending',
      tags: Array.isArray(a.targeting_tags) ? a.targeting_tags : [],
      targeting: a.targeting_rules || a.targeting || {},
      media,
      isVideo,
    }
  }, [current, id])

  const handleDeleteAd = () => {
    setDeleting(true)
    dispatch(deleteAdById(ad.id))
      .unwrap()
      .then(() => navigate('/ads', { replace: true }))
      .catch(() => setDeleting(false))
      .finally(() => setDeleteModal(false))
  }

  const applyStatus = (nextStatus, reason) => {
    setUpdatingStatus(true)
    dispatch(patchAdStatus({ id: ad.id, status: nextStatus, rejection_reason: reason }))
      .unwrap()
      .finally(() => setUpdatingStatus(false))
  }

  const handleApprove = () => applyStatus('active')
  const handlePause = () => applyStatus('paused')
  const handleReject = () => {
    setRejectModal(false)
    applyStatus('rejected', rejectionReason)
    setRejectionReason('')
  }

  const handleDeleteComment = () => {
    if (!commentToDelete) return
    const commentId = commentToDelete.comment_id || commentToDelete._id || commentToDelete.id
    if (!commentId) return
    setCommentDeleting(true)
    dispatch(deleteAdComment(commentId))
      .unwrap()
      .then(() => setComments((prev) => prev.filter((c) => {
        const cid = c.comment_id || c._id || c.id
        return cid !== commentId
      })))
      .catch(() => {})
      .finally(() => {
        setCommentDeleting(false)
        setCommentToDelete(null)
      })
  }

  const isLoading = currentStatus === 'loading'

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/ads')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Ads
        </button>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <span className={clsx(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full',
              getStatusColor(ad.status)
            )}>
              {ad.isVideo ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
              {capitalize(ad.status)}
            </span>
          )}
          <button
            onClick={() => setDeleteModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
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
          <p className="font-semibold text-red-500">Could not load ad</p>
          <p className="text-sm text-red-400 mt-1">{currentError}</p>
        </div>
      )}

      {!isLoading && !currentError && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {ad.isVideo ? <VideoMediaPanel item={ad.media[0]} /> : <ImageMediaPanel media={ad.media} />}

          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-5">
              <p className="text-sm font-semibold text-neutral-900">{ad.title}</p>
              {ad.caption ? (
                <p className="text-sm text-neutral-700 leading-relaxed mt-2">{ad.caption}</p>
              ) : (
                <p className="text-sm text-neutral-300 italic mt-2">No caption</p>
              )}
              <div className="space-y-1.5 mt-3">
                {ad.createdAt && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    {formatDateTime(ad.createdAt)}
                  </div>
                )}
                {ad.location && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    {ad.location}
                  </div>
                )}
                {ad.category && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                    {ad.category}
                  </div>
                )}
              </div>
              <p className="text-[10px] font-mono text-neutral-300 break-all mt-3">{ad.id}</p>
            </div>

            <Divider />

            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Reward coins</p>
                <p className="text-sm font-semibold text-neutral-900">{formatNumber(ad.coinsReward)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Total budget coins</p>
                <p className="text-sm font-semibold text-neutral-900">{formatNumber(ad.totalBudgetCoins)}</p>
              </div>
              {ad.targeting && Object.keys(ad.targeting || {}).length > 0 && (
                <div className="pt-2">
                  <SectionLabel>Targeting</SectionLabel>
                  <div className="space-y-1.5 text-xs text-neutral-600">
                    {ad.targeting.language && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-neutral-400">Language</span>
                        <span className="truncate">{String(ad.targeting.language)}</span>
                      </div>
                    )}
                    {ad.targeting.country && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-neutral-400">Country</span>
                        <span className="truncate">{String(ad.targeting.country)}</span>
                      </div>
                    )}
                    {Array.isArray(ad.targeting.locations) && ad.targeting.locations.length > 0 && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-neutral-400">Locations</span>
                        <span className="truncate">{ad.targeting.locations.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Divider />

            <div className="px-5 py-4">
              <SectionLabel>Moderation</SectionLabel>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={handleApprove}
                  disabled={updatingStatus || ad.status === 'active'}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={PauseCircle}
                  onClick={handlePause}
                  disabled={updatingStatus || ad.status === 'paused'}
                >
                  Pause
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={XCircle}
                  onClick={() => setRejectModal(true)}
                  disabled={updatingStatus || ad.status === 'rejected'}
                >
                  Reject
                </Button>
              </div>
            </div>

            <Divider />

            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <MessageCircle className="w-3 h-3 text-blue-400" />
                <SectionLabel>Comments</SectionLabel>
                <span className="ml-auto text-[10px] text-neutral-300 font-medium">{comments.length}</span>
              </div>

              {commentsLoading ? (
                <div className="space-y-2">
                  <div className="h-10 bg-neutral-100 rounded-xl animate-pulse" />
                  <div className="h-10 bg-neutral-100 rounded-xl animate-pulse" />
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {comments.length === 0 && (
                    <p className="text-sm text-neutral-300 text-center py-6">No comments</p>
                  )}
                  {comments.map((c, i) => {
                    const cid = c.comment_id || c._id || c.id || i
                    const username = c.user?.username || c.username || 'user'
                    const createdAt = c.createdAt || c.created_at || ''
                    return (
                      <div key={cid} className="flex items-start gap-2.5 group/comment">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs text-neutral-500 flex-shrink-0">
                          {(username[0] || 'U').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-neutral-800">@{username}</span>
                            <span className="text-[10px] text-neutral-300">{createdAt ? formatDateTime(createdAt) : ''}</span>
                            <button
                              onClick={() => setCommentToDelete(c)}
                              className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{c.text || c.comment || ''}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDeleteAd}
        title="Delete Ad"
        description="Are you sure you want to permanently delete this ad? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />

      <ConfirmModal
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={commentDeleting}
      />

      <Modal
        isOpen={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Reject Ad"
        description="Provide a reason for rejection (optional)"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectModal(false)} disabled={updatingStatus}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} loading={updatingStatus}>
              Reject
            </Button>
          </>
        }
      >
        <Input
          label="Rejection reason"
          placeholder="Enter rejection reason..."
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          fullWidth
        />
      </Modal>
    </div>
  )
}
