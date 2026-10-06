import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, Film, Heart, MapPin, MessageSquare, Users } from 'lucide-react'
import { fetchPostById, deletePostById, deleteCommentById, deleteReplyById } from '../store/postsSlice.js'
import { formatDateTime, formatNumber, formatCompactNumber } from '../utils/helpers.jsx'
import { getThumbnailUrl, toAbsoluteMediaUrl } from '../utils/contentHelpers.js'
import { ConfirmModal } from '../components/Modal.jsx'
import {
  CaptionPanel, CommunityPanel, DetailTopBar, ErrorState, HashtagsPanel, InfoPanel, LoadingState,
  MediaActions, MetricsPanel, ModerationPanel, Panel, PeoplePanel, Pill, VideoStage, pctLabel, ratio,
} from '../components/ContentDetailKit.jsx'

const durationOf = (media) => {
  if (!media) return 0
  let seconds = Number(media.finallength) || 0
  if (!seconds && media.timing) seconds = (Number(media.timing.end) || 0) - (Number(media.timing.start) || 0)
  if (seconds > 1000) seconds /= 1000
  return seconds > 0 ? seconds : 0
}
const formatDuration = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : null)

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
    const user = p.user_id && typeof p.user_id === 'object' ? p.user_id : (p.user || {})
    return {
      id: String(p.post_id || p._id || p.id || id),
      caption: p.caption || '',
      location: p.location || '',
      createdAt: p.createdAt || p.created_at || '',
      likes: Number(p.likes_count ?? (Array.isArray(p.likes) ? p.likes.length : 0)) || 0,
      views: Number(p.views_count) || 0,
      uniqueViews: Number(p.unique_views_count) || 0,
      completedViews: Number(p.completed_views_count) || 0,
      comments: Array.isArray(p.comments) ? p.comments : [],
      commentsCount: Number(p.comments_count) || (Array.isArray(p.comments) ? p.comments.length : 0),
      media: media[0] || null,
      tags: Array.isArray(p.tags) ? p.tags : [],
      peopleTags: Array.isArray(p.people_tags) ? p.people_tags : [],
      user: {
        id: user._id || user.id || '',
        username: user.username || '',
        name: user.full_name || user.name || user.username || 'Unknown user',
        avatar: user.avatar_url ? toAbsoluteMediaUrl(user.avatar_url) : '',
        followers: Number(user.followers_count) || 0,
      },
      isDeleted: !!p.isDeleted,
    }
  }, [current, id])

  const handleDelete = () => {
    setDeleting(true)
    dispatch(deletePostById(reel.id)).unwrap()
      .then(() => navigate('/reels', { replace: true }))
      .catch(() => setDeleting(false))
      .finally(() => setDeleteModal(false))
  }
  const handleCommentDelete = () => {
    if (!commentToDelete) return
    setDeleting(true)
    dispatch(deleteCommentById(commentToDelete.comment_id || commentToDelete._id || commentToDelete.id)).unwrap()
      .finally(() => { setDeleting(false); setCommentToDelete(null) })
  }
  const handleReplyDelete = () => {
    if (!replyToDelete) return
    setDeleting(true)
    dispatch(deleteReplyById(replyToDelete.reply_id || replyToDelete._id || replyToDelete.id)).unwrap()
      .finally(() => { setDeleting(false); setReplyToDelete(null) })
  }

  const isLoading = currentStatus === 'loading' || currentStatus === 'idle'
  const videoUrl = toAbsoluteMediaUrl(reel.media?.fileUrl || reel.media?.url || reel.media?.fileName)
  const duration = durationOf(reel.media)
  const completion = ratio(reel.completedViews, reel.views)

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-10">
      <DetailTopBar
        backLabel="Back to bSparks"
        onBack={() => navigate('/reels')}
        chips={<Pill tone="purple">bSpark</Pill>}
        onDelete={() => setDeleteModal(true)}
        deleteLabel="Delete bSpark"
      />

      {isLoading && <LoadingState label="Loading bSpark…" />}
      {!isLoading && currentError && <ErrorState title="Could not load bSpark" message={currentError} />}

      {!isLoading && !currentError && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            <Panel
              icon={Film}
              iconClass="text-[#8E35B5]"
              title="bSpark Video"
              badge={duration ? <Pill tone="purple" className="normal-case">{formatDuration(duration)} runtime</Pill> : null}
              actions={<MediaActions url={videoUrl} />}
            >
              <VideoStage videoUrl={videoUrl} posterUrl={getThumbnailUrl(reel.media)} durationLabel={formatDuration(duration)} />
            </Panel>

            <CaptionPanel caption={reel.caption} title="bSpark Caption" />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <HashtagsPanel tags={reel.tags} />
              <PeoplePanel people={reel.peopleTags} />
            </div>

            <CommunityPanel
              comments={reel.comments}
              authorId={reel.user.id}
              authorHandle={reel.user.username}
              onDeleteComment={setCommentToDelete}
              onDeleteReply={setReplyToDelete}
            />
          </div>

          <div className="space-y-5 xl:sticky xl:top-[72px]">
            <InfoPanel
              title="bSpark Info"
              status={reel.isDeleted ? { label: 'Deleted', tone: 'grey' } : { label: 'Published', tone: 'red' }}
              creator={{
                name: reel.user.name,
                handle: reel.user.username,
                avatar: reel.user.avatar,
                meta: reel.user.followers ? `${formatCompactNumber(reel.user.followers)} followers` : null,
              }}
              rows={[
                { label: 'bSpark ID', value: `#BSP-${reel.id.slice(-5).toUpperCase()}`, chip: true },
                { label: 'Created date', value: reel.createdAt ? formatDateTime(reel.createdAt) : '—' },
                { label: 'Location', value: reel.location, icon: MapPin },
                { label: 'Duration', value: formatDuration(duration) },
              ]}
              onViewCreator={reel.user.id ? () => navigate(`/users/${reel.user.id}`) : null}
            />

            <MetricsPanel
              tiles={[
                { label: 'Views', value: formatCompactNumber(reel.views), icon: Eye, tone: 'dark', sub: reel.views ? `${formatCompactNumber(reel.uniqueViews)} unique` : null },
                { label: 'Likes', value: formatNumber(reel.likes), icon: Heart, tone: 'pink', sub: pctLabel(ratio(reel.likes, reel.views), 'of views') },
                { label: 'Comments', value: formatNumber(reel.commentsCount), icon: MessageSquare, tone: 'purple', sub: pctLabel(ratio(reel.commentsCount, reel.likes), 'ratio') },
                { label: 'Unique Reach', value: formatCompactNumber(reel.uniqueViews), icon: Users, tone: 'pink', sub: pctLabel(ratio(reel.uniqueViews, reel.views), 'unique') },
              ]}
              bar={completion === null ? null : {
                label: 'Watch completion',
                value: `${completion.toFixed(1)}% (${formatCompactNumber(reel.completedViews)} full views)`,
                pct: completion,
              }}
            />

            <ModerationPanel contentType="reel" contentId={reel.id} />
          </div>
        </div>
      )}

      <ConfirmModal isOpen={deleteModal} onClose={() => setDeleteModal(false)} onConfirm={handleDelete} title="Delete bSpark" description="Are you sure you want to permanently delete this bSpark? This cannot be undone." confirmText="Delete" confirmVariant="danger" loading={deleting} />
      <ConfirmModal isOpen={!!commentToDelete} onClose={() => setCommentToDelete(null)} onConfirm={handleCommentDelete} title="Delete Comment" description="Are you sure you want to delete this comment? This cannot be undone." confirmText="Delete" confirmVariant="danger" loading={deleting} />
      <ConfirmModal isOpen={!!replyToDelete} onClose={() => setReplyToDelete(null)} onConfirm={handleReplyDelete} title="Delete Reply" description="Are you sure you want to delete this reply? This cannot be undone." confirmText="Delete" confirmVariant="danger" loading={deleting} />
    </div>
  )
}
