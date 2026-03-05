import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import Table from '../components/Table.jsx'
import Button from '../components/Button.jsx'
import Badge from '../components/Badge.jsx'
import Input from '../components/Input.jsx'
import { fetchVendors, fetchVendorProfiles, patchVendorProfileApproval, setVendorValidatedOptimistic, deleteVendorById, processVendorProfile } from '../store/vendorsSlice.js'
import { capitalize } from '../utils/helpers.jsx'
import { Eye, Trash2 } from 'lucide-react'
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

const REQUIRED_PROFILE_FIELDS = [
  'company_name',
  'legal_business_name',
  'registration_number',
  'tax_id_or_vat',
  'year_established',
  'company_type',
  'industry_category',
  'business_nature',
  'website',
  'business_email',
  'business_phone',
  'address',
  'country',
  'service_coverage',
  'company_description',
  'logo_url',
  'city',
]

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    if ('fileUrl' in value) return !value.fileUrl
    if ('url' in value) return !value.url
  }
  return false
}

const resolveProfileByVendorId = (profileMap, vendor) => {
  if (!vendor) return null
  const vendorId = vendor._id
  const userId = vendor?.user?._id || vendor?.user?.id
  return profileMap[vendorId] || (userId ? profileMap[userId] : null) || null
}

const getProfileMissingFields = (profile) => {
  if (!profile) return ['profile']

  const missing = REQUIRED_PROFILE_FIELDS
    .filter((key) => isEmptyValue(profile?.[key]))
    .map((key) => key.replaceAll('_', ' '))

  return missing
}

function Vendors() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, profilesByVendorId, status, error, updating } = useSelector((s) => s.vendors)
  const authUser = useSelector((s) => s.auth.user)
  const adminId =
    (authUser && (authUser.id || authUser._id || authUser.uuid || authUser.user_id)) || null
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [toast, setToast] = useState('')
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, vendor: null })

  useEffect(() => {
    dispatch(fetchVendors())
    dispatch(fetchVendorProfiles())
  }, [dispatch])

  const data = useMemo(() => {
    const rows = (items || []).map((v) => {
      const id = v._id
      const validated = !!v.validated
      const business = v.business_name || ''
      const user = v.user || {}
      const profile = resolveProfileByVendorId(profilesByVendorId || {}, v)
      const missingFields = getProfileMissingFields(profile)
      const isProfileComplete = missingFields.length === 0
      const username = user.username || ''
      const fullName = user.full_name || ''
      const phone = user.phone || ''
      const role = user.role || 'vendor'
      return { id, validated, business, username, fullName, phone, role, isProfileComplete, missingFields }
    })
    
    // Filter by tab
    let filtered = rows
    if (activeTab === 'validated') filtered = rows.filter(r => r.validated)
    if (activeTab === 'invalidated') filtered = rows.filter(r => !r.validated)

    const q = search.trim().toLowerCase()
    if (!q) return filtered
    return filtered.filter((r) =>
      [r.business, r.username, r.fullName, r.phone, r.role].some((f) => (f || '').toLowerCase().includes(q))
    )
  }, [items, profilesByVendorId, search, activeTab])

  const handleToggle = async (row) => {
    if (!row.isProfileComplete && !row.validated) {
      setToast(`Cannot validate: missing ${row.missingFields.join(', ')}`)
      setTimeout(() => setToast(''), 3000)
      return
    }
    const nextStatus = row.validated ? 'rejected' : 'approved'
    dispatch(setVendorValidatedOptimistic({ id: row.id, validated: !row.validated }))
    try {
      await dispatch(
        processVendorProfile({
          id: row.id,
          status: nextStatus,
          rejection_reason: nextStatus === 'rejected' ? 'Admin unvalidated' : undefined,
        })
      ).unwrap()
      setToast(row.validated ? 'Vendor unvalidated' : 'Vendor validated')
      setTimeout(() => setToast(''), 2500)
    } catch {
      dispatch(setVendorValidatedOptimistic({ id: row.id, validated: row.validated }))
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
            disabled={!adminId || !!updating[row.id] || status === 'loading' || (!row.isProfileComplete && !row.validated)}
            title={!row.isProfileComplete && !row.validated ? `Missing: ${row.missingFields.join(', ')}` : ''}
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
        {['all', 'validated', 'invalidated'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            )}
          >
            {capitalize(tab)}
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
