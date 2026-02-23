import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Card from '../components/Card.jsx'
import Table from '../components/Table.jsx'
import Button from '../components/Button.jsx'
import Badge from '../components/Badge.jsx'
import Input from '../components/Input.jsx'
import { fetchVendors, patchVendorValidation, setVendorValidatedOptimistic } from '../store/vendorsSlice.js'
import { getStatusColor, capitalize } from '../utils/helpers.jsx'

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
  const { items, status, error, updating } = useSelector((s) => s.vendors)
  const authUser = useSelector((s) => s.auth.user)
  const adminId =
    (authUser && (authUser.id || authUser._id || authUser.uuid || authUser.user_id)) || null
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

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
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.business, r.username, r.fullName, r.phone, r.role].some((f) => (f || '').toLowerCase().includes(q))
    )
  }, [items, search])

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
        <Button
          variant={row.validated ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => handleToggle(row)}
          disabled={!adminId || !!updating[row.id] || status === 'loading'}
        >
          {row.validated ? 'Unvalidate' : 'Validate'}
        </Button>
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
    </div>
  )
}

export default Vendors
