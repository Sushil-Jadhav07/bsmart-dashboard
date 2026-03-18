import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchSalesOfficers,
  fetchVendorsByOfficer,
  createSalesOfficer,
  clearCreateError,
} from '../store/salesSlice.js'
import {
  UserPlus, ChevronDown, ChevronUp, Loader2, X, Building2,
  Users, TrendingUp, Mail, Phone, MapPin, CheckCircle, AlertCircle
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
const initials = (name) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'

// ── Create Officer Modal ──────────────────────────────────────────────────────
function CreateOfficerModal({ open, onClose }) {
  const dispatch = useDispatch()
  const { createStatus, createError } = useSelector((s) => s.sales)
  const [form, setForm] = useState({
    username: '', email: '', password: '', full_name: '', phone: '', location: '',
  })
  const [success, setSuccess] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(createSalesOfficer(form))
    if (res.meta.requestStatus === 'fulfilled') {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm({ username: '', email: '', password: '', full_name: '', phone: '', location: '' })
        onClose()
      }, 1500)
    }
  }

  const handleClose = () => {
    dispatch(clearCreateError())
    setSuccess(false)
    setForm({ username: '', email: '', password: '', full_name: '', phone: '', location: '' })
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Add Sales Officer</h2>
              <p className="text-xs text-neutral-400">Create a new sales role account</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">Sales officer created!</p>
            </div>
          )}

          {/* Error */}
          {createError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{createError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" value={form.full_name} onChange={set('full_name')} placeholder="John Doe" />
            <Field label="Username" value={form.username} onChange={set('username')} placeholder="john_sales" required />
          </div>
          <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" required />
          <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91..." />
            <Field label="Location" value={form.location} onChange={set('location')} placeholder="Mumbai, India" />
          </div>

          <button
            type="submit"
            disabled={createStatus === 'loading' || success}
            className="w-full h-10 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
          >
            {createStatus === 'loading' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
            ) : 'Create Sales Officer'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-600 mb-1">{label}</label>
      <input
        {...props}
        className="w-full h-9 px-3 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors"
      />
    </div>
  )
}

// ── Vendor Chip ───────────────────────────────────────────────────────────────
function VendorChip({ vendor }) {
  const name = vendor?.business_name || vendor?.user_id?.username || 'Vendor'
  return (
    <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
      <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-3 h-3 text-violet-600" />
      </div>
      <span className="text-xs font-medium text-neutral-700 truncate">{name}</span>
    </div>
  )
}

// ── Officer Row ───────────────────────────────────────────────────────────────
function OfficerRow({ officer }) {
  const dispatch = useDispatch()
  const [expanded, setExpanded] = useState(false)
  const vendorData = useSelector((s) => s.sales.vendorsByOfficer[officer._id])
  const loadStatus = useSelector((s) => s.sales.vendorsByOfficerStatus[officer._id])

  const toggle = () => {
    if (!expanded && !vendorData) {
      dispatch(fetchVendorsByOfficer(officer._id))
    }
    setExpanded((v) => !v)
  }

  const name = officer.full_name || officer.username || 'Sales Officer'
  const vendorCount = vendorData?.total ?? '—'

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:border-violet-200 transition-colors">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          {officer.avatar_url ? (
            <img src={officer.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <span className="text-white text-sm font-bold">{initials(name)}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 truncate">{name}</p>
            <p className="text-xs text-neutral-400 truncate">@{officer.username}</p>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Mail className="w-3 h-3 text-neutral-300 flex-shrink-0" />
            <span className="text-xs text-neutral-500 truncate">{officer.email || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-neutral-300 flex-shrink-0" />
            <span className="text-xs text-neutral-500">{officer.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-neutral-300 flex-shrink-0" />
            <span className="text-xs text-neutral-500 truncate">{officer.location || '—'}</span>
          </div>
        </div>

        {/* Vendor count + expand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-violet-50 px-2.5 py-1 rounded-lg">
            <Building2 className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-semibold text-violet-700">{vendorCount}</span>
          </div>
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-700"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded vendors */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-neutral-100 pt-4">
          {loadStatus === 'loading' && (
            <div className="flex items-center gap-2 text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading assigned vendors…</span>
            </div>
          )}
          {loadStatus === 'failed' && (
            <p className="text-xs text-red-500">Failed to load vendors</p>
          )}
          {loadStatus === 'succeeded' && vendorData?.vendors?.length === 0 && (
            <p className="text-xs text-neutral-400 italic">No vendors assigned yet</p>
          )}
          {loadStatus === 'succeeded' && vendorData?.vendors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
                Assigned Vendors ({vendorData.total})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {vendorData.vendors.map((v) => (
                  <VendorChip key={v._id} vendor={v} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SalesOfficers() {
  const dispatch = useDispatch()
  const { officers, officersStatus, officersError } = useSelector((s) => s.sales)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    dispatch(fetchSalesOfficers())
  }, [dispatch])

  const filtered = officers.filter((o) => {
    const q = search.toLowerCase()
    return (
      !q ||
      (o.full_name || '').toLowerCase().includes(q) ||
      (o.username || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q) ||
      (o.location || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Sales Officers</h1>
          <p className="text-neutral-500 mt-1">Manage sales team and vendor assignments</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Sales Officer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{officers.length}</p>
              <p className="text-xs text-neutral-400">Total Officers</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">
                {Object.values(useSelector((s) => s.sales.vendorsByOfficer)).reduce((sum, d) => sum + (d?.total || 0), 0)}
              </p>
              <p className="text-xs text-neutral-400">Assigned Vendors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, location…"
          className="w-full h-10 pl-4 pr-4 text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors"
        />
      </div>

      {/* List */}
      {officersStatus === 'loading' && (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
          <span className="text-sm text-neutral-400">Loading sales officers…</span>
        </div>
      )}

      {officersStatus === 'failed' && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-sm text-red-600">
          {officersError || 'Failed to load sales officers'}
        </div>
      )}

      {officersStatus === 'succeeded' && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">{search ? 'No officers match your search' : 'No sales officers yet'}</p>
        </div>
      )}

      {officersStatus === 'succeeded' && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((officer) => (
            <OfficerRow key={officer._id} officer={officer} />
          ))}
        </div>
      )}

      <CreateOfficerModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
