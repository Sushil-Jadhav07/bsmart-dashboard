import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Button from '../components/Button.jsx'
import { usersMock } from '../data/admin/users.mock.js'
import { Eye, Trash2, ShieldX, LockKeyhole } from 'lucide-react'

export default function AdminUsers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  const data = useMemo(() => {
    let rows = usersMock
    if (status !== 'all') rows = rows.filter((u) => String(u.status).toLowerCase() === status)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
      )
    }
    return rows
  }, [search, status])

  const columns = [
    { key: 'id', title: 'User ID' },
    {
      key: 'full_name',
      title: 'Full Name',
    },
    { key: 'email', title: 'Email' },
    { key: 'phone', title: 'Mobile' },
    {
      key: 'registration_date',
      title: 'Registered',
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      key: 'last_login',
      title: 'Last Login',
      render: (v) => new Date(v).toLocaleString(),
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
          <Button variant="ghost" size="sm" icon={LockKeyhole}>
            Reset
          </Button>
          <Button variant="ghost" size="sm" icon={ShieldX} className="text-amber-600">
            Suspend
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Users</h1>
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
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}

