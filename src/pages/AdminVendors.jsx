import React, { useMemo, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Button from '../components/Button.jsx'
import { vendorsMock } from '../data/admin/vendors.mock.js'
import { CheckCircle2, XCircle, Trash2, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminVendors() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const data = useMemo(() => {
    let rows = vendorsMock
    if (status !== 'all') rows = rows.filter((v) => String(v.status).toLowerCase() === status)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((v) => v.business_name.toLowerCase().includes(q) || v.id.toLowerCase().includes(q))
    }
    return rows
  }, [search, status])

  const columns = [
    { key: 'id', title: 'Vendor ID' },
    { key: 'business_name', title: 'Business Name' },
    { key: 'owner_name', title: 'Owner Name' },
    { key: 'email', title: 'Email' },
    { key: 'phone', title: 'Phone' },
    { key: 'category', title: 'Category' },
    { key: 'address', title: 'Address' },
    {
      key: 'status',
      title: 'Status',
      render: (v) => <StatusBadge value={v} />,
    },
    { key: 'rating', title: 'Rating' },
    { key: 'sales', title: 'Sales' },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Eye} onClick={() => navigate(`/vendors/${row.id}`)}>
            View
          </Button>
          <Button variant="ghost" size="sm" icon={CheckCircle2} className="text-emerald-600">
            Approve
          </Button>
          <Button variant="ghost" size="sm" icon={XCircle} className="text-amber-600">
            Reject
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
      <h1 className="text-2xl font-bold text-neutral-900">Vendors</h1>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <FilterBar search={search} onSearch={setSearch}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
          </select>
        </FilterBar>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}

