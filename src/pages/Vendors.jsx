import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Card from '../components/Card.jsx'
import Table from '../components/Table.jsx'
import Button from '../components/Button.jsx'
import Badge from '../components/Badge.jsx'
import Input from '../components/Input.jsx'
import { fetchVendors, patchVendorValidation, setVendorValidatedOptimistic, deleteVendorById } from '../store/vendorsSlice.js'
import { getStatusColor, capitalize } from '../utils/helpers.jsx'
import { Trash2, Eye } from 'lucide-react'
import { ConfirmModal } from '../components/Modal.jsx'
import { clsx } from 'clsx'

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 px-4 py-3 bg-green-600 text-white rounded-lg shadow-soft">
    <div className="flex items-center gap-3">
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="text-white/80 hover:text-white text-xs">Close</button>
    </div>
  </div>
)

function Vendors() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, status, error, updating } = useSelector((s) => s.vendors)
  const authUser = useSelector((s) => s.auth.user)
  const adminId =
    (authUser && (authUser.id || authUser._id || authUser.uuid || authUser.user_id)) || null
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, vendor: null })
  const [activeTab, setActiveTab] = useState('all') // all | validated | unvalidated

  useEffect(() => {
    dispatch(fetchVendors())
  }, [dispatch])

  const data = useMemo(() => {
    const rows = (items || []).map((v) => {
      const id = v._id
      const validated = !!v.validated
      const business = v.business_name || ''
      const user = v.user || {}
      const username = user.username || ''
      const fullName = user.full_name || ''
      const phone = user.phone || ''
      const role = user.role || 'vendor'
      return { id, validated, business, username, fullName, phone, role }
    })
    
    // 1. Filter by search
    const q = search.trim().toLowerCase()
    let filtered = rows
    if (q) {
      filtered = filtered.filter((r) =>
        [r.business, r.username, r.fullName, r.phone, r.role].some((f) => (f || '').toLowerCase().includes(q))
      )
    }

    // 2. Filter by tab
    if (activeTab === 'validated') {
      filtered = filtered.filter((r) => r.validated)
    } else if (activeTab === 'unvalidated') {
      filtered = filtered.filter((r) => !r.validated)
    }
    
    return filtered
  }, [items, search, activeTab])

  const handleToggle = async (row) => {
    const next = !row.validated
    dispatch(setVendorValidatedOptimistic({ id: row.id, validated: next }))
    try {
      await dispatch(
        patchVendorValidation({
          id: row.id,
          admin_user_id: adminId,
          validated: next,
        })
      ).unwrap()
      setToast(next ? 'Vendor validated' : 'Vendor unvalidated')
      setTimeout(() => setToast(''), 2500)
    } catch {
      dispatch(setVendorValidatedOptimistic({ id: row.id, validated: !next }))
    }
  }

  const handleDeleteClick = (row) => {
    setConfirmModal({ isOpen: true, vendor: row })
  }

  const handleConfirmDelete = () => {
    const { vendor } = confirmModal
    if (vendor) {
      dispatch(deleteVendorById(vendor.id))
        .unwrap()
        .then(() => {
          setToast('Vendor deleted successfully')
          setTimeout(() => setToast(''), 2500)
        })
        .catch((err) => {
          console.error('Failed to delete vendor:', err)
          // Optional: handle error UI
        })
    }
    setConfirmModal({ isOpen: false, vendor: null })
  }

  const columns = [
    {
      key: 'business',
      title: 'Business Name',
    },
    {
      key: 'username',
      title: 'Username',
    },
    {
      key: 'fullName',
      title: 'Full Name',
    },
    {
      key: 'phone',
      title: 'Phone',
    },
    {
      key: 'role',
      title: 'Role',
      render: (value) => <Badge variant="default" className="bg-neutral-100 text-neutral-700">{capitalize(value)}</Badge>,
    },
    {
      key: 'validated',
      title: 'Status',
      render: (value) => (
        <Badge variant="default" className={value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
          {value ? 'Validated' : 'Not Validated'}
        </Badge>
      ),
    },
    {
      key: 'action',
      title: 'Action',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={() => navigate(`/vendors/${row.id}`)}
          >
            View
          </Button>
          <Button
            variant={row.validated ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => handleToggle(row)}
            disabled={!adminId || !!updating[row.id] || status === 'loading'}
          >
            {row.validated ? 'Unvalidate' : 'Validate'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => handleDeleteClick(row)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Vendors</h1>
          <p className="text-neutral-500 mt-1">Manage vendor validation</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200">
        {[
          { id: 'all', label: 'All Vendors' },
          { id: 'validated', label: 'Validated' },
          { id: 'unvalidated', label: 'Unvalidated' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card padding="small">
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />
      </Card>

      <Card>
        <Table
          columns={columns}
          data={data}
          searchable={false}
          pagination={true}
          pageSize={10}
          emptyMessage={
            status === 'loading' ? 'Loading vendors…' : error ? `Error: ${error}` : 'No vendors found'
          }
        />
      </Card>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, vendor: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Vendor"
        description={`Are you sure you want to delete ${confirmModal.vendor?.business || 'this vendor'}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}

export default Vendors
