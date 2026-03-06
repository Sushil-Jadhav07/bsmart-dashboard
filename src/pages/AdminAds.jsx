import React, { useMemo, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Button from '../components/Button.jsx'
import { adsMock } from '../data/admin/ads.mock.js'
import { CheckCircle2, XCircle, Pause, Trash2 } from 'lucide-react'

export default function AdminAds() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const data = useMemo(() => {
    let rows = adsMock
    if (status !== 'all') rows = rows.filter((a) => String(a.status).toLowerCase() === status)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((a) => a.id.toLowerCase().includes(q) || a.title.toLowerCase().includes(q))
    }
    return rows
  }, [search, status])

  const columns = [
    { key: 'id', title: 'Ad ID' },
    { key: 'vendor_name', title: 'Vendor Name' },
    { key: 'title', title: 'Title' },
    { key: 'type', title: 'Type' },
    { key: 'audience', title: 'Audience' },
    { key: 'budget', title: 'Budget' },
    { key: 'start', title: 'Start', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'end', title: 'End', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'status', title: 'Status', render: (v) => <StatusBadge value={v} /> },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={CheckCircle2} className="text-emerald-600">
            Approve
          </Button>
          <Button variant="ghost" size="sm" icon={XCircle} className="text-amber-600">
            Reject
          </Button>
          <Button variant="ghost" size="sm" icon={Pause}>
            Pause
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
      <h1 className="text-2xl font-bold text-neutral-900">Ads</h1>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <FilterBar search={search} onSearch={setSearch}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </select>
        </FilterBar>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}

