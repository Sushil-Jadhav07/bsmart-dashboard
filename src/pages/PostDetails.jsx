import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import Card, { CardHeader, CardTitle, CardDescription } from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import { fetchPostById } from '../store/postsSlice.js'
import { formatDateTime, capitalize } from '../utils/helpers.jsx'
import { ChevronLeft } from 'lucide-react'

function PostDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { current, currentStatus, currentError } = useSelector((s) => s.posts)

  useEffect(() => {
    if (id) dispatch(fetchPostById(id))
  }, [dispatch, id])

  const post = useMemo(() => {
    const p = current || {}
    const media = Array.isArray(p.media) ? p.media : []
    const user = p.user_id || p.user || {}
    return {
      id: p.post_id || p._id || p.id || id,
      caption: p.caption || '',
      location: p.location || '',
      createdAt: p.createdAt || p.created_at || '',
      likes: p.likes_count ?? p.likes ?? 0,
      comments: Array.isArray(p.comments) ? p.comments : [],
      media,
      user: {
        username: user.username || '',
        full_name: user.full_name || user.name || '',
        avatar_url: user.avatar_url || '',
      },
      tags: Array.isArray(p.tags) ? p.tags : [],
      people_tags: Array.isArray(p.people_tags) ? p.people_tags : [],
      type: (media[0]?.type === 'video') ? 'reel' : 'post',
    }
  }, [current, id])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            onClick={() => navigate('/posts')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">Post {post.id}</h1>
            <p className="text-neutral-500 mt-1">{post.caption || 'No caption'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <img
            src={
              post.user.avatar_url ||
              'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI0U1RTdFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNkI3MjgwIj5VUzwvdGV4dD48L3N2Zz4='
            }
            alt={post.user.full_name || post.user.username || 'Owner'}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-800 truncate">
              {post.user.full_name || post.user.username || 'Unknown'}
            </p>
            {post.user.username && (
              <p className="text-xs text-neutral-500 truncate">@{post.user.username}</p>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Post metadata and owner</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
          <div>
            <p className="text-sm text-neutral-500">Owner</p>
            <p className="font-medium text-neutral-800">{post.user.full_name || post.user.username}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Type</p>
            <Badge variant="default" className={post.type === 'reel' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}>
              {capitalize(post.type)}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Location</p>
            <p className="font-medium text-neutral-800">{post.location || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Created</p>
            <p className="font-medium text-neutral-800">{post.createdAt ? formatDateTime(post.createdAt) : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Likes</p>
            <p className="font-medium text-neutral-800">{post.likes}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Comments</p>
            <p className="font-medium text-neutral-800">{post.comments.length}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
          <CardDescription>Attached media files</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {post.media.length === 0 && (
            <p className="text-sm text-neutral-500">No media</p>
          )}
          {post.media.map((m, idx) => (
            <div key={idx} className="rounded-lg overflow-hidden border border-neutral-200 bg-white">
              {m.type === 'video' ? (
                <video
                  src={m.fileUrl || ''}
                  poster={m.thumbnail?.fileUrl || ''}
                  className="w-full h-40 object-cover"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={m.thumbnail?.fileUrl || m.fileUrl || ''}
                  alt={m.fileName || `media-${idx}`}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-2 text-xs text-neutral-600">
                <p>Type: {m.type || 'image'}</p>
                {m.filter?.name && <p>Filter: {m.filter.name}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>Hashtags and people</CardDescription>
        </CardHeader>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {post.tags.length ? post.tags.map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs">#{t}</span>
            )) : <span className="text-sm text-neutral-500">No tags</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {post.people_tags.length ? post.people_tags.map((pt, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs">@{pt.username}</span>
            )) : <span className="text-sm text-neutral-500">No people tags</span>}
          </div>
        </div>
      </Card>

      {currentStatus === 'loading' && (
        <Card><div className="p-4 text-sm text-neutral-500">Loading post…</div></Card>
      )}
      {currentError && (
        <Card><div className="p-4 text-sm text-red-600">Error: {currentError}</div></Card>
      )}
    </div>
  )
}

export default PostDetails
