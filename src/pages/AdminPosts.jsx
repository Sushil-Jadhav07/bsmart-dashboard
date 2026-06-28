import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Button from '../components/Button.jsx'
import Dropdown from '../components/Dropdown.jsx'
import { deletePostById, fetchPosts } from '../store/postsSlice.js'
import { Eye, Trash2, RefreshCw } from 'lucide-react'

const inferPostType = (post) => {
  const media = Array.isArray(post?.media) ? post.media[0] : null
  return media?.type === 'video' ? 'reel' : 'post'
}

const matchesDateRange = (value, range) => {
  if (range === 'all' || !value) return true
  const createdAt = new Date(value).getTime()
  if (Number.isNaN(createdAt)) return true
  const now = Date.now()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 0
  return days ? createdAt >= now - days * 24 * 60 * 60 * 1000 : true
}

export default function AdminPosts() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, status: fetchStatus, error } = useSelector((s) => s.posts)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    dispatch(fetchPosts())
  }, [dispatch])

  const data = useMemo(() => {
    const rows = (items || []).map((post) => {
      const id = post.post_id || post._id || post.id || post.uuid || ''
      const user = post.user_id || {}
      const comments = Array.isArray(post.comments) ? post.comments.length : post.comments_count || 0
      return {
        id,
        user_name: user.username || user.full_name || post.username || '-',
        type: inferPostType(post),
        caption: post.caption || '-',
        upload_date: post.createdAt || post.created_at || post.upload_date || null,
        views: post.views_count || post.views || 0,
        likes: post.likes_count || post.likes?.length || post.likes || 0,
        comments,
        reports: post.reports_count || post.report_count || 0,
        status: post.status || 'active',
      }
    })

    return rows.filter((post) => {
      if (filter !== 'all' && String(post.type).toLowerCase() !== filter) return false
      if (!matchesDateRange(post.upload_date, dateRange)) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        String(post.id).toLowerCase().includes(q) ||
        String(post.user_name).toLowerCase().includes(q) ||
        String(post.caption).toLowerCase().includes(q)
      )
    })
  }, [items, search, filter, dateRange])

  const handleDelete = async (id) => {
    if (!id || deletingId) return
    setDeletingId(id)
    try {
      await dispatch(deletePostById(id)).unwrap()
    } finally {
      setDeletingId('')
    }
  }

  const columns = [
    { key: 'id', title: 'Post ID' },
    { key: 'user_name', title: 'User Name' },
    { key: 'type', title: 'Type' },
    { key: 'caption', title: 'Caption' },
    { key: 'upload_date', title: 'Upload Date', render: (v) => (v ? new Date(v).toLocaleString() : '-') },
    { key: 'views', title: 'Views' },
    { key: 'likes', title: 'Likes' },
    { key: 'comments', title: 'Comments' },
    { key: 'reports', title: 'Reports' },
    { key: 'status', title: 'Status', render: (v) => <StatusBadge value={v} /> },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Eye} onClick={() => navigate(`/posts/${row.id}`)}>
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            className="text-red-600"
            disabled={deletingId === row.id}
            onClick={() => handleDelete(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Posts</h1>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => dispatch(fetchPosts())}>
          Refresh
        </Button>
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <FilterBar search={search} onSearch={setSearch}>
          <Dropdown
            value={filter}
            onChange={(val) => setFilter(val)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'post', label: 'Posts' },
              { value: 'reel', label: 'Reels' },
            ]}
          />
          <Dropdown
            value={dateRange}
            onChange={(val) => setDateRange(val)}
            options={[
              { value: 'all', label: 'All Dates' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
            ]}
          />
        </FilterBar>
        {fetchStatus === 'loading' ? (
          <div className="py-16 text-center text-sm text-neutral-400">Loading posts...</div>
        ) : fetchStatus === 'failed' ? (
          <div className="py-16 text-center text-sm text-red-500">{error || 'Failed to load posts'}</div>
        ) : (
          <DataTable columns={columns} data={data} emptyMessage="No posts found" />
        )}
      </div>
    </div>
  )
}
