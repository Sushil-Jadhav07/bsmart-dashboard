import React, { useMemo, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Button from '../components/Button.jsx'
import { postsMock } from '../data/admin/posts.mock.js'
import { Eye, Trash2, Flag } from 'lucide-react'

export default function AdminPosts() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  const data = useMemo(() => {
    let rows = postsMock
    if (filter !== 'all') rows = rows.filter((p) => String(p.status).toLowerCase() === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((p) => p.id.toLowerCase().includes(q) || p.user_name.toLowerCase().includes(q))
    }
    return rows
  }, [search, filter])

  const columns = [
    { key: 'id', title: 'Post ID' },
    { key: 'user_name', title: 'User Name' },
    { key: 'type', title: 'Type' },
    { key: 'caption', title: 'Caption' },
    { key: 'upload_date', title: 'Upload Date', render: (v) => new Date(v).toLocaleString() },
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
          <Button variant="ghost" size="sm" icon={Eye}>
            View
          </Button>
          <Button variant="ghost" size="sm" icon={Flag} className="text-amber-600">
            Mark
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} className="text-red-600">
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-neutral-900">Posts</h1>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <FilterBar search={search} onSearch={setSearch}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="removed">Removed</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Dates</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </FilterBar>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}

