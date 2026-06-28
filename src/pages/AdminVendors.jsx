import React, { useEffect, useMemo, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import FilterBar from '../components/FilterBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Button from '../components/Button.jsx'
import { CheckCircle2, XCircle, Trash2, Eye, RefreshCw } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { deleteVendorById, fetchVendors, processVendorProfile } from '../store/vendorsSlice.js'

const normalizeVendorStatus = (vendor) => {
  const raw = String(vendor?.status || '').toLowerCase()
  if (raw) return raw
  if (vendor?.validated) return 'approved'
  return 'pending'
}

export default function AdminVendors() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, status: fetchStatus, error } = useSelector((s) => s.vendors)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    dispatch(fetchVendors())
  }, [dispatch])

  const data = useMemo(() => {
    const rows = (items || []).map((vendor) => {
      const user = vendor?.user || {}
      return {
        id: user._id || user.id || vendor._id || vendor.id || '',
        vendor_id: vendor._id || vendor.id || '',
        business_name: vendor.business_name || vendor.company_name || '-',
        owner_name: user.full_name || user.username || '-',
        email: user.email || '-',
        phone: user.phone || user.mobile || '-',
        category: vendor.category || vendor.industry_category || '-',
        address:
          vendor.address ||
          vendor.location ||
          vendor.city ||
          vendor?.online_presence?.address?.address_line1 ||
          '-',
        status: normalizeVendorStatus(vendor),
        rating: vendor.rating || vendor.average_rating || 0,
        sales: vendor.sales || vendor.total_sales || 0,
      }
    })

    return rows.filter((vendor) => {
      if (status !== 'all' && String(vendor.status).toLowerCase() !== status) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        String(vendor.business_name).toLowerCase().includes(q) ||
        String(vendor.owner_name).toLowerCase().includes(q) ||
        String(vendor.id).toLowerCase().includes(q)
      )
    })
  }, [items, search, status])

  const handleProcess = async (id, action) => {
    if (!id || busyId) return
    setBusyId(id)
    try {
      await dispatch(processVendorProfile({ id, action })).unwrap()
    } finally {
      setBusyId('')
    }
  }

  const handleDelete = async (id) => {
    if (!id || busyId) return
    setBusyId(id)
    try {
      await dispatch(deleteVendorById(id)).unwrap()
    } finally {
      setBusyId('')
    }
  }

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
          {row.status !== 'approved' && (
            <Button
              variant="ghost"
              size="sm"
              icon={CheckCircle2}
              className="text-emerald-600"
              disabled={busyId === row.id}
              onClick={() => handleProcess(row.id, 'approve')}
            >
              Approve
            </Button>
          )}
          {row.status !== 'rejected' && (
            <Button
              variant="ghost"
              size="sm"
              icon={XCircle}
              className="text-amber-600"
              disabled={busyId === row.id}
              onClick={() => handleProcess(row.id, 'reject')}
            >
              Reject
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            className="text-red-600"
            disabled={busyId === row.id}
            onClick={() => handleDelete(row.vendor_id)}
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
        <h1 className="text-2xl font-bold text-neutral-900">Vendors</h1>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => dispatch(fetchVendors())}>
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
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </FilterBar>
        {fetchStatus === 'loading' ? (
          <div className="py-16 text-center text-sm text-neutral-400">Loading vendors...</div>
        ) : fetchStatus === 'failed' ? (
          <div className="py-16 text-center text-sm text-red-500">{error || 'Failed to load vendors'}</div>
        ) : (
          <DataTable columns={columns} data={data} emptyMessage="No vendors found" />
        )}
      </div>
    </div>
  )
}
