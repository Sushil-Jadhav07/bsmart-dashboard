import React, { useMemo, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Button from '../components/Button.jsx'
import { productsMock } from '../data/admin/products.mock.js'
import { Eye, Trash2, Star } from 'lucide-react'

export default function AdminProducts() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const data = useMemo(() => {
    let rows = productsMock
    if (status !== 'all') rows = rows.filter((p) => String(p.status).toLowerCase() === status)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((p) => p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
    }
    return rows
  }, [search, status])

  const columns = [
    { key: 'id', title: 'Product ID' },
    { key: 'vendor_name', title: 'Vendor Name' },
    { key: 'title', title: 'Title' },
    { key: 'category', title: 'Category' },
    { key: 'price', title: 'Price' },
    { key: 'availability', title: 'Availability' },
    { key: 'status', title: 'Status', render: (v) => <StatusBadge value={v} /> },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Eye}>
            Preview
          </Button>
          <Button variant="ghost" size="sm" icon={Star}>
            Feature
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
      <h1 className="text-2xl font-bold text-neutral-900">Products</h1>
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
            <option value="disabled">Disabled</option>
          </select>
        </FilterBar>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}

