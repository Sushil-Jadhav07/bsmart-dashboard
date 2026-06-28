import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  ChevronLeft, CheckCircle, XCircle, AlertCircle, Building2, RefreshCw,
  TrendingDown, TrendingUp, Wallet, Loader2, UserCheck, X, CheckCircle2, Mail, Phone, MapPin
} from 'lucide-react'
import Button from '../components/Button.jsx'
import { fetchVendorProfileById, submitVendorProfile, processVendorProfile } from '../store/vendorsSlice.js'
import { fetchVendorWalletHistory, resetVendorHistory } from '../store/walletSlice.js'
import { fetchSalesOfficers, fetchSalesOfficerById, assignSalesOfficer, clearAssignError, resetAssignStatus } from '../store/salesSlice.js'
import { formatNumber, formatDateTime } from '../utils/helpers.jsx'

const REQUIRED_PROFILE_FIELDS = [
  'company_name','legal_business_name','registration_number','tax_id_or_vat',
  'year_established','company_type','industry_category','business_nature',
  'website','business_email','business_phone','address','country',
  'service_coverage','company_description','logo_url','city',
]

const isEmptyValue = (v) => {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') {
    if ('fileUrl' in v) return !v.fileUrl
    if ('url' in v) return !v.url
  }
  return false
}

const getMissingFields = (profile) => {
  if (!profile) return ['profile']
  const flat = {
    ...profile,
    ...(profile.company_details || {}),
    ...(profile.business_details || {}),
    ...(profile.online_presence || {}),
    ...(profile.online_presence?.address || {}),
    website: profile.online_presence?.website_url,
    business_email: profile.online_presence?.company_email,
    business_phone: profile.online_presence?.phone_number,
    address: profile.online_presence?.address?.address_line1,
    registration_number: profile.company_details?.registration_number,
    tax_id_or_vat: profile.company_details?.tax_id,
    company_type: profile.company_details?.company_type,
    year_established: profile.company_details?.year_established,
    legal_business_name: profile.company_details?.registered_name,
    company_name: profile.company_details?.company_name || profile.business_name,
    industry_category: profile.business_details?.industry_category,
    business_nature: profile.business_details?.business_nature,
    service_coverage: profile.business_details?.service_coverage,
    country: profile.business_details?.country || profile.online_presence?.address?.country,
    city: profile.online_presence?.address?.city,
  }
  return REQUIRED_PROFILE_FIELDS.filter((k) => isEmptyValue(flat?.[k])).map((k) => k.replaceAll('_', ' '))
}

const toDisplayValue = (v) => {
  if (v === null || v === undefined || v === '') return 'Not provided'
  if (Array.isArray(v)) return v.length ? v.join(', ') : 'Not provided'
  if (typeof v === 'object') {
    if (v.fileUrl) return v.fileUrl
    if (v.url) return v.url
    return JSON.stringify(v)
  }
  return String(v)
}

const stringifyLocation = (v) => {
  if (!v) return ''
  if (typeof v === 'string') return v
  const parts = []
  for (const k of ['city','region','state','country','name','label','address_line1']) {
    const s = v?.[k]
    if (typeof s === 'string' && s.trim()) parts.push(s.trim())
  }
  if (v?.address_line2) parts.push(String(v.address_line2).trim())
  return parts.filter(Boolean).join(', ')
}

const pickGender = (...objs) => {
  for (const o of objs) {
    if (!o) continue
    for (const k of ['gender','sex','owner_gender']) {
      if (typeof o[k] === 'string' && o[k].trim()) return o[k].trim()
    }
  }
  return ''
}

const pickLocation = (...objs) => {
  for (const o of objs) {
    if (!o) continue
    for (const k of ['location','location_name','city','address']) {
      const s = stringifyLocation(o[k])
      if (s) return s
    }
    const addr = o?.online_presence?.address
    if (addr) { const s = stringifyLocation(addr); if (s) return s }
  }
  return ''
}

// ── Officer initials helper ───────────────────────────────────────────────────
const getInitials = (name) =>
  (name || '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'

// ── Assign Sales Officer Modal ────────────────────────────────────────────────
function AssignSalesModal({ open, onClose, vendorUserId, currentOfficer }) {
  const dispatch = useDispatch()
  const { officers, officersStatus, assignStatus, assignError } = useSelector((s) => s.sales)
  const [selected, setSelected] = useState(null)
  const [success, setSuccess] = useState(false)

  // Load officers list when modal opens
  useEffect(() => {
    if (open && officersStatus === 'idle') dispatch(fetchSalesOfficers())
  }, [open, officersStatus, dispatch])

  // Reset selection when modal opens
  useEffect(() => {
    if (open) setSelected(null)
  }, [open])

  const handleAssign = async () => {
    if (!selected) return
    const res = await dispatch(assignSalesOfficer({ vendor_user_id: vendorUserId, sales_user_id: selected }))
    if (res.meta.requestStatus === 'fulfilled') {
      // Re-fetch vendor profile so assigned_sales_officer ID is fresh
      dispatch(fetchVendorProfileById(vendorUserId))
      // Fetch the officer's merged user details using GET /api/sales/users/{id}
      dispatch(fetchSalesOfficerById(selected))
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setSelected(null)
        dispatch(resetAssignStatus())
        onClose()
      }, 1500)
    }
  }

  const handleClose = () => {
    dispatch(clearAssignError())
    dispatch(resetAssignStatus())
    setSelected(null)
    setSuccess(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Assign Sales Officer</h2>
              <p className="text-xs text-neutral-400">Select an officer to assign to this vendor</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Current assignment banner */}
        {currentOfficer && (
          <div className="px-6 py-3 bg-violet-50 border-b border-violet-100 flex-shrink-0">
            <p className="text-xs text-violet-600 font-medium">
              Currently assigned: <span className="font-bold">{currentOfficer.full_name || currentOfficer.username || 'Unknown'}</span>
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">Sales officer assigned successfully!</p>
            </div>
          )}
          {assignError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{assignError}</p>
            </div>
          )}
          {officersStatus === 'loading' && (
            <div className="flex items-center justify-center py-10 gap-2 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading sales officers…</span>
            </div>
          )}
          {officersStatus === 'succeeded' && officers.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-8">No sales officers available</p>
          )}
          {officersStatus === 'succeeded' && officers.map((officer) => {
            const name = officer.full_name || officer.username || 'Officer'
            const isSelected = selected === (officer._id || officer.id)
            const isCurrent = currentOfficer && (String(currentOfficer._id || currentOfficer.id) === String(officer._id || officer.id))
            return (
              <button
                key={officer._id || officer.id}
                onClick={() => setSelected(isSelected ? null : (officer._id || officer.id))}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left',
                  isSelected ? 'border-violet-500 bg-violet-50' : 'border-neutral-200 bg-white hover:border-violet-200 hover:bg-violet-50/50'
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  {officer.avatar_url
                    ? <img src={officer.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    : <span className="text-white text-sm font-bold">{getInitials(name)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{name}</p>
                    {isCurrent && (
                      <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-md font-medium flex-shrink-0">Current</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 truncate">{officer.email}</p>
                  {officer.phone && <p className="text-xs text-neutral-300 truncate">{officer.phone}</p>}
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-violet-600 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex gap-3 flex-shrink-0">
          <button onClick={handleClose} className="flex-1 h-10 border border-neutral-200 text-neutral-600 text-sm font-medium rounded-xl hover:bg-neutral-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selected || assignStatus === 'loading' || success}
            className="flex-1 h-10 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {assignStatus === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" />Assigning…</> : 'Assign Officer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VendorDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentProfile, currentProfileStatus, currentProfileError, items, updating } = useSelector((s) => s.vendors)
  const authUser = useSelector((s) => s.auth.user)
  const token = useSelector((s) => s.auth.token)
  const adminId = (authUser && (authUser.id || authUser._id || authUser.uuid || authUser.user_id)) || null
  const isAdmin = String(authUser?.role || '').toLowerCase() === 'admin'

  const [actionError, setActionError] = useState('')
  const [walletTab, setWalletTab] = useState('balance')
  const [showAssignModal, setShowAssignModal] = useState(false)

  const { vendorHistory, vendorWallet, vendorStatus, vendorError } = useSelector((s) => s.wallet)
  const walletLoading = vendorStatus === 'loading'

  // Sales state
  const officerById = useSelector((s) => s.sales.officerById)
  const officerByIdStatus = useSelector((s) => s.sales.officerByIdStatus)
  const officers = useSelector((s) => s.sales.officers)
  const officersStatus = useSelector((s) => s.sales.officersStatus)

  const vendorListItem = useMemo(
    () => (items || []).find((v) => v?._id === id || v?.user?._id === id || v?.user?.id === id),
    [items, id]
  )

  const resolvedUserId = useMemo(
    () => vendorListItem?.user?._id || vendorListItem?.user?.id || id,
    [vendorListItem, id]
  )

  const walletUserId = useMemo(() => {
    const p = currentProfile || {}
    return (
      p?.user?._id ||
      p?.user?.id ||
      p?.user_id?._id ||
      p?.user_id?.id ||
      p?.user_id ||
      vendorListItem?.user?._id ||
      vendorListItem?.user?.id ||
      resolvedUserId
    )
  }, [currentProfile, vendorListItem, resolvedUserId])

  const fetchWallet = () => { if (walletUserId) dispatch(fetchVendorWalletHistory(walletUserId)) }

  useEffect(() => {
    if (!resolvedUserId) return
    dispatch(fetchVendorProfileById(resolvedUserId))
  }, [dispatch, resolvedUserId])

  useEffect(() => {
    if (!walletUserId || !token) return
    fetchWallet()
    return () => { dispatch(resetVendorHistory()) }
  }, [walletUserId, token])

  // Pre-load officers list (needed for the assign modal)
  useEffect(() => {
    if (officersStatus === 'idle') dispatch(fetchSalesOfficers())
  }, [officersStatus, dispatch])

  const profile = useMemo(() => currentProfile || null, [currentProfile])

  // ── Resolve assigned officer ──────────────────────────────────────────────
  // The vendor profile's assigned_sales_officer field is a plain MongoDB ObjectId string
  // We fetch the merged user+sales data via GET /api/sales/users/{id}
  const assignedOfficerRaw = profile?.assigned_sales_officer || null

  // Extract the user ID string regardless of whether it's an ObjectId string or an object
  const assignedOfficerId = useMemo(() => {
    if (!assignedOfficerRaw) return null
    if (typeof assignedOfficerRaw === 'object') {
      return String(assignedOfficerRaw._id || assignedOfficerRaw.id || '')
    }
    return String(assignedOfficerRaw)
  }, [assignedOfficerRaw])

  // Fetch officer details when we have an ID and it's not already cached
  useEffect(() => {
    if (!assignedOfficerId) return
    const status = officerByIdStatus[assignedOfficerId]
    if (status === 'loading' || status === 'succeeded') return
    dispatch(fetchSalesOfficerById(assignedOfficerId))
  }, [assignedOfficerId, officerByIdStatus, dispatch])

  // Resolve the display object — try cache first, then officers list fallback
  const assignedOfficer = useMemo(() => {
    if (!assignedOfficerId) return null
    // Use cached result from GET /api/sales/users/{id} (has full_name, username, email, phone, location)
    const cached = officerById[assignedOfficerId]
    if (cached && (cached.username || cached.full_name || cached.email)) return cached
    // Fallback: match from the officers list (loaded via GET /api/sales/officers)
    const fromList = officers.find((o) => String(o._id || o.id) === assignedOfficerId)
    if (fromList) return fromList
    return null
  }, [assignedOfficerId, officerById, officers])

  const missingFields = useMemo(() => getMissingFields(profile), [profile])
  const isProfileComplete = missingFields.length === 0
  const isValidated = !!(profile?.validated || profile?.status === 'approved')
  const isSubmitted = profile?.status === 'submitted' || profile?.submitted

  const handleAdminProcess = async (action) => {
    setActionError('')
    try {
      await dispatch(processVendorProfile({
        id: resolvedUserId, action,
        rejection_reason: action === 'reject' ? 'Admin rejected' : undefined,
      })).unwrap()
    } catch (e) { setActionError(e || `Failed to ${action} vendor`) }
  }

  const handleSubmit = async () => {
    setActionError('')
    try { await dispatch(submitVendorProfile(resolvedUserId)).unwrap() }
    catch (e) { setActionError(e || 'Failed to submit profile') }
  }

  const fields = useMemo(() => {
    const p = profile || {}
    const cd = p.company_details || {}
    const bd = p.business_details || {}
    const op = p.online_presence || {}
    const addr = op.address || {}
    const sm = p.social_media_links || {}
    return [
      ['Company Name', cd.company_name || p.company_name || p.business_name],
      ['Legal Business Name', cd.registered_name || p.legal_business_name],
      ['Registration Number', cd.registration_number || p.registration_number],
      ['Tax ID / VAT', cd.tax_id || p.tax_id_or_vat],
      ['Year Established', cd.year_established || p.year_established],
      ['Company Type', cd.company_type || p.company_type],
      ['Industry', cd.industry],
      ['Industry Category', bd.industry_category || p.industry_category],
      ['Business Nature', bd.business_nature || p.business_nature],
      ['Website', op.website_url || p.website],
      ['Business Email', op.company_email || p.business_email || p.email],
      ['Business Phone', op.phone_number || p.business_phone || p.phone],
      ['Address', addr.address_line1 ? `${addr.address_line1}${addr.address_line2 ? ', ' + addr.address_line2 : ''}` : p.address],
      ['City', addr.city || p.city],
      ['State', addr.state],
      ['Pincode', addr.pincode],
      ['Country', addr.country || bd.country || p.country],
      ['Service Coverage', bd.service_coverage || p.service_coverage],
      ['Company Description', p.company_description || p.description],
      ['Social Media Links', [sm.instagram, sm.facebook, sm.linkedin, sm.twitter].filter(Boolean).join(', ')],
      ['Logo URL', p.logo_url || p.logo?.fileUrl || p.logo?.url],
      ['Credits', p.credits],
      ['Credits Expires', p.credits_expires_at ? new Date(p.credits_expires_at).toLocaleDateString() : undefined],
      ['Note', p.note],
      ['Submitted', p.submitted ?? p.is_submitted ?? (p.submitted_at ? 'yes' : undefined)],
    ]
  }, [profile])

  const isLoading = currentProfileStatus === 'loading'

  const derived = useMemo(() => {
    const p = profile || {}
    const cd = p.company_details || {}
    const bd = p.business_details || {}
    const op = p.online_presence || {}
    const addr = op.address || {}
    const owner = vendorListItem?.user || p.user || {}
    return {
      companyName: cd.company_name || p.company_name || p.business_name || vendorListItem?.business_name || 'Vendor Profile',
      logoUrl: p.logo_url || p.logo?.fileUrl || p.logo?.url || '',
      owner,
      gender: pickGender(owner, p),
      location: pickLocation(owner, p, addr),
      walletBalance:
        vendorWallet?.balance ??
        vendorWallet?.new_balance ??
        vendorWallet?.wallet_balance ??
        owner?.wallet?.balance ??
        p?.wallet?.balance ??
        p?.credits ??
        null,
      walletCurrency: vendorWallet?.currency || owner?.wallet?.currency || p?.wallet?.currency || 'Coins',
      businessEmail: op.company_email || p.business_email || p.email || owner?.email || '',
      businessPhone: op.phone_number || p.business_phone || p.phone || owner?.phone || '',
      website: op.website_url || p.website || '',
      city: addr.city || p.city || '',
      country: addr.country || bd.country || p.country || '',
    }
  }, [profile, vendorListItem, vendorWallet])

  return (
    <>
      <div className="max-w-7xl mx-auto pb-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/vendors')}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Vendors
          </button>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setShowAssignModal(true)}>
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  {assignedOfficer ? 'Reassign Officer' : 'Assign Sales Officer'}
                </Button>
                {isValidated ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                    >
                      Approved
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAdminProcess('reject')}
                      disabled={!adminId || !!updating[id]}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAdminProcess('approve')}
                    disabled={!adminId || !!updating[id]}
                  >
                    Approve
                  </Button>
                )}
                {!isSubmitted && !isValidated && (
                  <Button variant="secondary" size="sm" onClick={handleSubmit} disabled={!!updating[id]}>
                    Submit Profile
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Loading vendor profile…</p>
          </div>
        )}

        {!isLoading && currentProfileError && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="font-semibold text-neutral-800">Could not load vendor profile</p>
            <p className="text-sm text-neutral-400">{currentProfileError}</p>
          </div>
        )}

        {!isLoading && !currentProfileError && profile && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

            {/* LEFT column */}
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-6 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {derived.logoUrl
                        ? <img src={derived.logoUrl} alt="" className="w-full h-full object-cover" />
                        : <Building2 className="w-6 h-6 text-neutral-400" />
                      }
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-xl font-bold text-neutral-900 truncate">{derived.companyName}</h1>
                      <p className="text-sm text-neutral-400 mt-1">Vendor ID: {id}</p>
                      {!!derived.owner?.username && (
                        <p className="text-sm text-neutral-500 mt-1 truncate">@{derived.owner.username}</p>
                      )}
                    </div>
                  </div>
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0',
                    isValidated ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {isValidated ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {isValidated ? 'Approved' : 'Not Approved'}
                  </span>
                </div>
              </div>

              {/* Incomplete warning */}
              {!isProfileComplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-amber-900 text-sm font-semibold">Profile incomplete</p>
                      <p className="text-amber-800 text-sm mt-1 break-words">Missing: {missingFields.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {actionError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-600">{actionError}</div>
              )}

              {!isAdmin && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm text-neutral-600">
                  Admin-only page: approve/reject actions are hidden for non-admin users.
                </div>
              )}

              {/* Profile fields */}
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-neutral-100">
                  <h2 className="text-sm font-semibold text-neutral-800">Vendor Profile Fields</h2>
                </div>
                <div className="divide-y divide-neutral-100">
                  {fields.map(([label, value]) => {
                    const empty = value === null || value === undefined || value === ''
                    return (
                      <div key={label} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2 px-6 py-3">
                        <p className="text-sm text-neutral-500">{label}</p>
                        <p className={clsx('text-sm break-all', empty ? 'text-red-500 italic' : 'text-neutral-800')}>
                          {toDisplayValue(value)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT column */}
            <div className="space-y-6 lg:sticky lg:top-6">

              {/* Wallet card */}
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                  <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5">
                    {['balance', 'history'].map((tab) => (
                      <button key={tab} onClick={() => setWalletTab(tab)}
                        className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                          walletTab === tab ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
                        )}
                      >{tab}</button>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchWallet} loading={walletLoading} disabled={!walletUserId || !token}>
                    Refresh
                  </Button>
                </div>

                {walletTab === 'balance' && (
                  <div className="px-6 py-6">
                    <p className="text-xs text-neutral-400">Balance</p>
                    <p className="text-2xl font-bold text-neutral-900 mt-1">
                      {derived.walletBalance === null || derived.walletBalance === undefined
                        ? (walletLoading ? 'Loading…' : 'Not provided')
                        : formatNumber(derived.walletBalance)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">{derived.walletCurrency}</p>
                    {vendorHistory.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-orange-50 rounded-xl p-3">
                          <p className="text-[10px] text-orange-500 font-medium mb-1">Total Spent</p>
                          <p className="text-lg font-bold text-orange-700">
                            {formatNumber(vendorHistory.filter(t => (t.amount ?? 0) < 0).reduce((s, t) => s + Math.abs(t.amount ?? 0), 0))}
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-[10px] text-blue-500 font-medium mb-1">Transactions</p>
                          <p className="text-lg font-bold text-blue-700">{vendorHistory.length}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {walletTab === 'history' && (
                  <div>
                    {walletLoading && (
                      <div className="flex items-center justify-center py-12 gap-2">
                        <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                        <span className="text-sm text-neutral-400">Loading…</span>
                      </div>
                    )}
                    {!walletLoading && vendorError && (
                      <div className="py-8 text-center"><p className="text-sm text-red-500">{vendorError}</p></div>
                    )}
                    {!walletLoading && !vendorError && vendorHistory.length === 0 && (
                      <div className="py-12 text-center">
                        <Wallet className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                        <p className="text-sm text-neutral-300">No transactions yet</p>
                      </div>
                    )}
                    {!walletLoading && vendorHistory.length > 0 && (
                      <div className="divide-y divide-neutral-50 max-h-72 overflow-y-auto">
                        {vendorHistory.map((tx, i) => {
                          const isDeduction = (tx.amount ?? 0) < 0
                          return (
                            <div key={tx._id || i} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 transition-colors">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDeduction ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                {isDeduction ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-neutral-700 truncate">{String(tx.type || 'Transaction').replace(/_/g, ' ')}</p>
                                <p className="text-[10px] text-neutral-400">{formatDateTime(tx.createdAt || tx.transactionDate)}</p>
                              </div>
                              <p className={`text-sm font-bold flex-shrink-0 ${isDeduction ? 'text-red-500' : 'text-green-600'}`}>
                                {isDeduction ? '' : '+'}{formatNumber(tx.amount ?? 0)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Info card */}
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-neutral-100">
                  <p className="text-sm font-semibold text-neutral-800">Quick Info</p>
                </div>
                <div className="px-6 py-5 space-y-3">
                  {[
                    ['Gender', derived.gender],
                    ['Location', derived.location],
                    ['Email', derived.businessEmail],
                    ['Phone', derived.businessPhone],
                    ['Website', derived.website],
                    ['City', derived.city],
                    ['Country', derived.country],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-neutral-500">{label}</span>
                      <span className="text-sm text-neutral-800 truncate">{value || 'Not provided'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sales Officer card */}
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-800">Sales Officer</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="text-xs text-violet-600 font-medium hover:text-violet-800 transition-colors"
                    >
                      {assignedOfficer ? 'Reassign' : 'Assign'}
                    </button>
                  )}
                </div>
                <div className="px-6 py-5">
                  {/* Loading state */}
                  {assignedOfficerId && !assignedOfficer && officerByIdStatus[assignedOfficerId] === 'loading' && (
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Loading officer…</span>
                    </div>
                  )}

                  {/* Officer found */}
                  {assignedOfficer && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        {assignedOfficer.avatar_url
                          ? <img src={assignedOfficer.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                          : <span className="text-white text-sm font-bold">{getInitials(assignedOfficer.full_name || assignedOfficer.username)}</span>
                        }
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-neutral-800 truncate">
                          {assignedOfficer.full_name || assignedOfficer.username || 'Sales Officer'}
                        </p>
                        {assignedOfficer.username && assignedOfficer.full_name && (
                          <p className="text-xs text-neutral-400">@{assignedOfficer.username}</p>
                        )}
                        {assignedOfficer.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-neutral-300 flex-shrink-0" />
                            <p className="text-xs text-neutral-500 truncate">{assignedOfficer.email}</p>
                          </div>
                        )}
                        {assignedOfficer.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-neutral-300 flex-shrink-0" />
                            <p className="text-xs text-neutral-500 truncate">{assignedOfficer.phone}</p>
                          </div>
                        )}
                        {assignedOfficer.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-neutral-300 flex-shrink-0" />
                            <p className="text-xs text-neutral-500 truncate">{assignedOfficer.location}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No officer assigned */}
                  {!assignedOfficerId && (
                    <div className="flex flex-col items-center gap-2 py-2 text-center">
                      <UserCheck className="w-7 h-7 text-neutral-200" />
                      <p className="text-xs text-neutral-400">No sales officer assigned</p>
                      {isAdmin && (
                        <button
                          onClick={() => setShowAssignModal(true)}
                          className="mt-1 text-xs text-violet-600 font-medium bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
                        >
                          + Assign Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <AssignSalesModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        vendorUserId={resolvedUserId}
        currentOfficer={assignedOfficer}
      />
    </>
  )
}
