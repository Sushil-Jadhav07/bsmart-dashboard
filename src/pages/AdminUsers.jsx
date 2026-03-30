import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import DataTable from '../components/DataTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Button from '../components/Button.jsx'
import { fetchUsers, deleteUserById } from '../store/usersSlice.js'
import { Eye, Trash2, RefreshCw } from 'lucide-react'

const normalizeStatus = (value) => {
  const key = String(value || '').trim().toLowerCase()
  if (!key) return 'active'
  if (key.includes('suspend')) return 'suspended'
  if (key.includes('ban')) return 'banned'
  if (key.includes('inactive') || key.includes('block') || key.includes('disable')) return 'inactive'
  return 'active'
}

const matchesDateRange = (value, range) => {
  if (range === 'all' || !value) return true
  const createdAt = new Date(value).getTime()
  if (Number.isNaN(createdAt)) return true
  const now = Date.now()
  const days =
    range === '7d' ? 7 :
    range === '30d' ? 30 :
    range === '90d' ? 90 : 0
  return days ? createdAt >= now - days * 24 * 60 * 60 * 1000 : true
}

export default function AdminUsers() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, status: fetchStatus, error } = useSelector((s) => s.users)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    dispatch(fetchUsers())
  }, [dispatch])

  const data = useMemo(() => {
    const rows = (items || []).map((entry) => {
      const user = entry?.user || entry || {}
      const id = user._id || user.id || user.user_id || user.uuid || ''
      const createdAt = user.createdAt || user.created_at || user.registration_date || null
      const lastLogin = user.last_login || user.lastLogin || user.updatedAt || user.updated_at || null
      const totalPosts =
        user.total_posts ||
        user.posts_count ||
        user.post_count ||
        user.posts?.length ||
        0
      const totalReports =
        user.total_reports ||
        user.reports_count ||
        user.report_count ||
        0

      return {
        id,
        full_name:
          user.full_name ||
          user.fullName ||
          [user.first_name, user.last_name].filter(Boolean).join(' ') ||
          user.username ||
          'Unknown',
        email: user.email || '-',
        phone: user.phone || user.mobile || '-',
        registration_date: createdAt,
        last_login: lastLogin,
        status: normalizeStatus(user.status || (user.isDeleted ? 'inactive' : 'active')),
        total_posts: totalPosts,
        total_reports: totalReports,
      }
    })

    return rows.filter((user) => {
      if (status !== 'all' && String(user.status).toLowerCase() !== status) return false
      if (!matchesDateRange(user.registration_date, dateRange)) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        String(user.full_name).toLowerCase().includes(q) ||
        String(user.email).toLowerCase().includes(q) ||
        String(user.id).toLowerCase().includes(q)
      )
    })
  }, [items, search, status, dateRange])

  const handleDelete = async (id) => {
    if (!id || deletingId) return
    setDeletingId(id)
    try {
      await dispatch(deleteUserById(id)).unwrap()
    } finally {
      setDeletingId('')
    }
  }

  const columns = [
    { key: 'id', title: 'User ID' },
    { key: 'full_name', title: 'Full Name' },
    { key: 'email', title: 'Email' },
    { key: 'phone', title: 'Mobile' },
    {
      key: 'registration_date',
      title: 'Registered',
      render: (v) => (v ? new Date(v).toLocaleDateString() : '-'),
    },
    {
      key: 'last_login',
      title: 'Last Login',
      render: (v) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      key: 'status',
      title: 'Status',
      render: (v) => <StatusBadge value={v} />,
    },
    { key: 'total_posts', title: 'Posts' },
    { key: 'total_reports', title: 'Reports' },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Eye} onClick={() => navigate(`/users/${row.id}`)}>
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
        <h1 className="text-2xl font-bold text-neutral-900">Users</h1>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => dispatch(fetchUsers())}>
          Refresh
        </Button>
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <FilterBar search={search} onSearch={setSearch}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Dates</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </FilterBar>
        {fetchStatus === 'loading' ? (
          <div className="py-16 text-center text-sm text-neutral-400">Loading users...</div>
        ) : fetchStatus === 'failed' ? (
          <div className="py-16 text-center text-sm text-red-500">{error || 'Failed to load users'}</div>
        ) : (
          <DataTable columns={columns} data={data} emptyMessage="No users found" />
        )}
      </div>
    </div>
  )
}
