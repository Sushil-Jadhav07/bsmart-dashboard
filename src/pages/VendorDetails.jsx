import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  ChevronLeft, CheckCircle, XCircle, AlertCircle, Building2, RefreshCw,
  TrendingDown, TrendingUp, Wallet, Eye, Heart, MessageCircle, Bookmark,
  Star, ArrowRightLeft, Loader2
} from 'lucide-react'
import Button from '../components/Button.jsx'
import Badge from '../components/Badge.jsx'
import { fetchVendorProfileById, submitVendorProfile, processVendorProfile } from '../store/vendorsSlice.js'
import { fetchVendorWalletHistory, resetVendorHistory } from '../store/walletSlice.js'
import { formatNumber, formatDateTime } from '../utils/helpers.jsx'

const baseUrl = 'https://api.bebsmart.in'

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

const getMissingFields = (profile) => {
  if (!profile) return ['profile']

  // Handle nested structure from API
  const flatProfile = {
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

  const missing = REQUIRED_PROFILE_FIELDS
    .filter((key) => isEmptyValue(flatProfile?.[key]))
    .map((key) => key.replaceAll('_', ' '))

  return missing
}

const toDisplayValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not provided'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not provided'
  if (typeof value === 'object') {
    if (value.fileUrl) return value.fileUrl
    if (value.url) return value.url
    return JSON.stringify(value)
  }
  return String(value)
}

const stringifyLocation = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  const parts = []
  const keys = ['city', 'region', 'state', 'province', 'district', 'country', 'country_code', 'name', 'label', 'address_line1']
  for (const k of keys) {
    const v = value?.[k]
    if (typeof v === 'string' && v.trim()) parts.push(v.trim())
  }
  // include line2 if present
  if (value?.address_line2 && String(value.address_line2).trim()) {
    parts.push(String(value.address_line2).trim())
  }
  return parts.filter(Boolean).join(', ')
}

const pickGender = (...objs) => {
  const candidates = []
  objs.forEach((o) => {
    if (!o) return
    candidates.push(
      o.gender,
      o.sex,
      o.owner_gender,
      o?.representative?.gender,
      o?.personal?.gender,
      o?.profile?.gender,
      o?.profile?.sex
    )
  })
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return ''
}

const pickLocation = (...objs) => {
  const candidates = []
  objs.forEach((o) => {
    if (!o) return
    candidates.push(
      o.location,
      o.location_name,
      o.city,
      o.address,
      o?.online_presence?.address,
      o?.profile?.location,
      o?.profile?.city,
      o?.profile?.address
    )
  })
  for (const c of candidates) {
    const s = stringifyLocation(c)
    if (s) return s
  }
  return ''
}

export default function VendorDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { currentProfile, currentProfileStatus, currentProfileError, items, updating } = useSelector((s) => s.vendors)
  const authUser = useSelector((s) => s.auth.user)
  const token = useSelector((s) => s.auth.token)
  const adminId =
    (authUser && (authUser.id || authUser._id || authUser.uuid || authUser.user_id)) || null
  const isAdmin = String(authUser?.role || '').toLowerCase() === 'admin'

  const [actionError, setActionError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [walletTab, setWalletTab] = useState('balance')

  const { vendorHistory, vendorWallet, vendorStatus, vendorError } = useSelector((s) => s.wallet)
  const walletLoading = vendorStatus === 'loading'

  const vendorListItem = useMemo(
    () => (items || []).find((v) => v?._id === id || v?.user?._id === id || v?.user?.id === id),
    [items, id]
  )

  const resolvedUserId = useMemo(() => {
    return vendorListItem?.user?._id || vendorListItem?.user?.id || id
  }, [vendorListItem, id])

  const fetchWallet = () => {
    if (resolvedUserId) dispatch(fetchVendorWalletHistory(resolvedUserId))
  }

  useEffect(() => {
    if (!resolvedUserId) return
    dispatch(fetchVendorProfileById(resolvedUserId))
  }, [dispatch, resolvedUserId])

  useEffect(() => {
    if (!resolvedUserId || !token) return
    fetchWallet()
    return () => { dispatch(resetVendorHistory()) }
  }, [resolvedUserId, token])

  const profile = useMemo(() => currentProfile || null, [currentProfile])

  useEffect(() => {}, [profile])

  const missingFields = useMemo(() => getMissingFields(profile), [profile])
  const isProfileComplete = missingFields.length === 0
  const isValidated = !!(profile?.validated || profile?.status === 'approved')
  const isRejected = profile?.status === 'rejected'
  const isSubmitted = profile?.status === 'submitted' || profile?.submitted
  
  const handleAdminProcess = async (action) => {
    setActionError('')
    
    // Removed validation block: admins can approve incomplete profiles if needed
    
    try {
      await dispatch(
        processVendorProfile({
          id: resolvedUserId,
          action,
          rejection_reason: action === 'reject' ? 'Admin rejected' : undefined,
        })
      ).unwrap()
    } catch (e) {
      setActionError(e || `Failed to ${action} vendor`)
    }
  }

  const handleSubmit = async () => {
    setActionError('')
    try {
      await dispatch(submitVendorProfile(resolvedUserId)).unwrap()
    } catch (e) {
      setActionError(e || 'Failed to submit profile')
    }
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
      ['Social Media Links', [sm.instagram, sm.facebook, sm.linkedin, sm.twitter].filter(Boolean).join(', ') || (Array.isArray(p.social_media_links) ? p.social_media_links.join(', ') : '')],
      ['Logo URL', p.logo_url || p.logo?.fileUrl || p.logo?.url],
      ['Credits', p.credits],
      ['Credits Expires', p.credits_expires_at ? new Date(p.credits_expires_at).toLocaleDateString() : undefined],
      ['Note', p.note],
      ['Submitted', p.submitted ?? p.is_submitted ?? p.submission_status ?? (p.submitted_at ? 'yes' : undefined)],
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

    const companyName = cd.company_name || p.company_name || p.business_name || vendorListItem?.business_name || 'Vendor Profile'
    const logoUrl = p.logo_url || p.logo?.fileUrl || p.logo?.url || ''

    const walletBalance = vendorWallet?.balance ?? owner?.wallet?.balance ?? p?.wallet?.balance ?? null
    const walletCurrency = vendorWallet?.currency || owner?.wallet?.currency || p?.wallet?.currency || 'Coins'

    return {
      companyName,
      logoUrl,
      owner,
      gender: pickGender(owner, p),
      location: pickLocation(owner, p, addr),
      walletBalance,
      walletCurrency,
      businessEmail: op.company_email || p.business_email || p.email || owner?.email || '',
      businessPhone: op.phone_number || p.business_phone || p.phone || owner?.phone || '',
      website: op.website_url || p.website || '',
      city: addr.city || p.city || '',
      country: addr.country || bd.country || p.country || '',
    }
  }, [profile, vendorListItem, vendorWallet])

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/vendors')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Vendors
        </button>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <Button
                variant={isValidated ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => handleAdminProcess(isValidated ? 'reject' : 'approve')}
                disabled={!adminId || !!updating[id]}
                title={!isProfileComplete && !isValidated ? `Missing: ${missingFields.join(', ')}` : ''}
              >
                {isValidated ? 'Reject' : 'Approve'}
              </Button>
              {!isSubmitted && !isValidated && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!!updating[id]}
                >
                  Submit Profile
                </Button>
              )}
            </>
          ) : null}
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-8">
          <p className="text-neutral-500">Loading vendor profile...</p>
        </div>
      )}

      {!isLoading && currentProfileError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <p className="text-red-600 font-semibold">Could not load vendor profile</p>
          <p className="text-red-400 text-sm mt-1">{currentProfileError}</p>
        </div>
      )}

      {!isLoading && !currentProfileError && profile && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-6 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {derived.logoUrl ? (
                      <img src={derived.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-neutral-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-neutral-900 truncate">{derived.companyName}</h1>
                    <p className="text-sm text-neutral-400 mt-1">Vendor ID: {id}</p>
                    {!!derived.owner?.username && (
                      <p className="text-sm text-neutral-500 mt-1 truncate">@{derived.owner.username}</p>
                    )}
                  </div>
                </div>
                <span
                  className={clsx(
                    'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0',
                    isValidated ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}
                >
                  {isValidated ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {isValidated ? 'Validated' : 'Not Validated'}
                </span>
              </div>
            </div>

            {!isProfileComplete && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-amber-900 text-sm font-semibold">Profile incomplete</p>
                    <p className="text-amber-800 text-sm mt-1 break-words">Missing fields: {missingFields.join(', ')}</p>
                  </div>
                </div>
              </div>
            )}

            {actionError && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-600">
                {actionError}
              </div>
            )}

            {!isAdmin && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm text-neutral-600">
                Admin-only page: approve/reject actions are hidden for non-admin users.
              </div>
            )}

            {saveMessage && (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-sm text-green-700">
                {saveMessage}
              </div>
            )}

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

          <div className="space-y-6 lg:sticky lg:top-6">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setWalletTab('balance')}
                    className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', walletTab === 'balance' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500')}
                  >
                    Balance
                  </button>
                  <button
                    onClick={() => setWalletTab('history')}
                    className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', walletTab === 'history' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500')}
                  >
                    History
                  </button>
                </div>
                <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchWallet} loading={walletLoading} disabled={!resolvedUserId || !token}>
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
                    <div className="py-8 text-center">
                      <p className="text-sm text-red-500">{vendorError}</p>
                    </div>
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

            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-800">Quick Info</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">Gender</span>
                  <span className="text-sm text-neutral-800 truncate">{derived.gender ? derived.gender : 'Not provided'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">Location</span>
                  <span className="text-sm text-neutral-800 truncate">{derived.location ? derived.location : 'Not provided'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">Email</span>
                  <span className="text-sm text-neutral-800 truncate">{derived.businessEmail ? derived.businessEmail : 'Not provided'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">Phone</span>
                  <span className="text-sm text-neutral-800 truncate">{derived.businessPhone ? derived.businessPhone : 'Not provided'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">Website</span>
                  <span className="text-sm text-neutral-800 truncate">{derived.website ? derived.website : 'Not provided'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">City</span>
                  <span className="text-sm text-neutral-800 truncate">{derived.city ? derived.city : 'Not provided'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">Country</span>
                  <span className="text-sm text-neutral-800 truncate">{derived.country ? derived.country : 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
