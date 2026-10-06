import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, Heart, Images, MapPin, MessageSquare, Radar } from 'lucide-react'
import { fetchPostById, deletePostById, deleteCommentById, deleteReplyById } from '../store/postsSlice.js'
import { formatDateTime, formatNumber, formatCompactNumber } from '../utils/helpers.jsx'
import { getThumbnailUrl, toAbsoluteMediaUrl } from '../utils/contentHelpers.js'
import { ConfirmModal } from '../components/Modal.jsx'
import {
  CaptionPanel, CommunityPanel, DetailTopBar, ErrorState, HashtagsPanel, InfoPanel, Lightbox,
  LoadingState, MediaActions, MediaCarousel, MetricsPanel, ModerationPanel, Panel, PeoplePanel, Pill,
  VideoStage, pctLabel, ratio,
} from '../components/ContentDetailKit.jsx'

const fullUrl = (m) => toAbsoluteMediaUrl(m?.fileUrl || m?.url || m?.fileName)

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
    const user = p.user_id && typeof p.user_id === 'object' ? p.user_id : (p.user || {})
    const isVideo = String(media[0]?.type || '').includes('video')
    return {
      id: String(p.post_id || p._id || p.id || id),
      caption: p.caption || '',
      location: p.location || '',
      createdAt: p.createdAt || p.created_at || '',
      likes: Number(p.likes_count ?? (Array.isArray(p.likes) ? p.likes.length : 0)) || 0,
      views: Number(p.views_count) || 0,
      uniqueViews: Number(p.unique_views_count) || 0,
      comments: Array.isArray(p.comments) ? p.comments : [],
      commentsCount: Number(p.comments_count) || (Array.isArray(p.comments) ? p.comments.length : 0),
      media,
      user: {
        id: user._id || user.id || '',
        username: user.username || '',
        name: user.full_name || user.name || user.username || 'Unknown user',
        avatar: user.avatar_url ? toAbsoluteMediaUrl(user.avatar_url) : '',
        followers: Number(user.followers_count) || 0,
      },
      tags: Array.isArray(p.tags) ? p.tags : [],
      peopleTags: Array.isArray(p.people_tags) ? p.people_tags : [],
      isVideo,
      isDeleted: !!p.isDeleted,
    }
  }, [current, id])

  const images = useMemo(() => post.media.map((m) => getThumbnailUrl(m) || fullUrl(m)).filter(Boolean), [post.media])
  const isReel = post.isVideo
  const backPath = isReel ? '/reels' : '/posts'
  const code = `#${isReel ? 'SPK' : 'MMT'}-${post.id.slice(-5).toUpperCase()}`

  const handleDelete = () => {
    setDeleting(true)
    dispatch(deletePostById(post.id)).unwrap()
      .then(() => navigate(backPath, { replace: true }))
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
  const engagementRate = ratio(post.likes + post.commentsCount, post.uniqueViews || post.views)

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-10">
      <DetailTopBar
        backLabel={isReel ? 'Back to bSparks' : 'Back to Moments'}
        onBack={() => navigate(backPath)}
        chips={<Pill tone={isReel ? 'purple' : 'pink'}>{isReel ? 'bSpark' : 'Moment'}</Pill>}
        onDelete={() => setDeleteModal(true)}
        deleteLabel="Delete Post"
      />

      {isLoading && <LoadingState label="Loading post details…" />}
      {!isLoading && currentError && <ErrorState title="Could not load post" message={currentError} />}

      {!isLoading && !currentError && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            <Panel
              icon={Images}
              title={isReel ? 'bSpark Video' : 'Moment Assets'}
              badge={!isReel && images.length > 0 ? <Pill tone="lavender" className="normal-case">{images.length} file{images.length === 1 ? '' : 's'}</Pill> : null}
              actions={<MediaActions url={fullUrl(post.media[0])} onExpand={!isReel && images.length ? () => setViewerIndex(0) : null} />}
            >
              {isReel
                ? <VideoStage videoUrl={fullUrl(post.media[0])} posterUrl={getThumbnailUrl(post.media[0])} />
                : <MediaCarousel images={images} onExpand={setViewerIndex} />}
            </Panel>

            <CaptionPanel caption={post.caption} />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <HashtagsPanel tags={post.tags} />
              <PeoplePanel people={post.peopleTags} />
            </div>

            <CommunityPanel
              comments={post.comments}
              authorId={post.user.id}
              authorHandle={post.user.username}
              onDeleteComment={setCommentToDelete}
              onDeleteReply={setReplyToDelete}
            />
          </div>

          <div className="space-y-5 xl:sticky xl:top-[72px]">
            <InfoPanel
              title={isReel ? 'bSpark Info' : 'Moment Info'}
              status={post.isDeleted ? { label: 'Deleted', tone: 'grey' } : { label: 'Published', tone: 'red' }}
              creator={{
                name: post.user.name,
                handle: post.user.username,
                avatar: post.user.avatar,
                meta: post.user.followers ? `${formatCompactNumber(post.user.followers)} followers` : null,
              }}
              rows={[
                { label: 'Post ID', value: code, chip: true },
                { label: 'Created date', value: post.createdAt ? formatDateTime(post.createdAt) : '—' },
                { label: 'Location', value: post.location, icon: MapPin },
                { label: 'Media', value: `${post.media.length} ${isReel ? 'video' : post.media.length === 1 ? 'image' : 'images'}` },
              ]}
              onViewCreator={post.user.id ? () => navigate(`/users/${post.user.id}`) : null}
            />

            <MetricsPanel
              tiles={[
                { label: 'Likes', value: formatNumber(post.likes), icon: Heart, tone: 'pink', sub: pctLabel(ratio(post.likes, post.views), 'of views') },
                { label: 'Comments', value: formatNumber(post.commentsCount), icon: MessageSquare, tone: 'purple', sub: pctLabel(ratio(post.commentsCount, post.likes), 'ratio') },
                { label: 'Views', value: formatCompactNumber(post.views), icon: Eye, tone: 'dark', sub: post.views ? `${formatCompactNumber(post.uniqueViews)} unique` : null },
                { label: 'Reach', value: formatCompactNumber(post.uniqueViews), icon: Radar, tone: 'pink', sub: pctLabel(ratio(post.uniqueViews, post.views), 'unique') },
              ]}
              bar={engagementRate === null ? null : {
                label: 'Engagement rate',
                value: `${engagementRate.toFixed(1)}% (${formatNumber(post.likes + post.commentsCount)} interactions)`,
                pct: engagementRate,
              }}
            />

            <ModerationPanel contentType={isReel ? 'reel' : 'post'} contentId={post.id} />
          </div>
        </div>
      )}

      <ConfirmModal isOpen={deleteModal} onClose={() => setDeleteModal(false)} onConfirm={handleDelete} title="Delete Post" description={`Are you sure you want to permanently delete this ${isReel ? 'bSpark' : 'moment'}? This cannot be undone.`} confirmText="Delete" confirmVariant="danger" loading={deleting} />
      <ConfirmModal isOpen={!!commentToDelete} onClose={() => setCommentToDelete(null)} onConfirm={handleCommentDelete} title="Delete Comment" description="Are you sure you want to delete this comment? This cannot be undone." confirmText="Delete" confirmVariant="danger" loading={deleting} />
      <ConfirmModal isOpen={!!replyToDelete} onClose={() => setReplyToDelete(null)} onConfirm={handleReplyDelete} title="Delete Reply" description="Are you sure you want to delete this reply? This cannot be undone." confirmText="Delete" confirmVariant="danger" loading={deleting} />

      <Lightbox images={images} index={viewerIndex} onClose={() => setViewerIndex(-1)} onIndex={setViewerIndex} />
    </div>
  )
}
