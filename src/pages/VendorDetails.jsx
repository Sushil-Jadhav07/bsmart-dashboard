import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, Building2 } from 'lucide-react'
import Button from '../components/Button.jsx'
import { fetchVendorProfileById, submitVendorProfile, processVendorProfile } from '../store/vendorsSlice.js'

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

  const missing = REQUIRED_PROFILE_FIELDS
    .filter((key) => isEmptyValue(profile?.[key]))
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

export default function VendorDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { currentProfile, currentProfileStatus, currentProfileError, items, updating } = useSelector((s) => s.vendors)
  const authUser = useSelector((s) => s.auth.user)
  const adminId =
    (authUser && (authUser.id || authUser._id || authUser.uuid || authUser.user_id)) || null
  const isAdmin = String(authUser?.role || '').toLowerCase() === 'admin'

  const [actionError, setActionError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (id) dispatch(fetchVendorProfileById(id))
  }, [dispatch, id])

  const vendorListItem = useMemo(
    () => (items || []).find((v) => v?._id === id || v?.user?._id === id || v?.user?.id === id),
    [items, id]
  )

  const profile = useMemo(() => currentProfile || null, [currentProfile])

  useEffect(() => {}, [profile])

  const missingFields = useMemo(() => getMissingFields(profile), [profile])
  const isProfileComplete = missingFields.length === 0
  const isValidated = !!(profile?.validated || profile?.status === 'approved')
  const isRejected = profile?.status === 'rejected'
  const isSubmitted = profile?.status === 'submitted' || profile?.submitted
  
  const handleAdminProcess = async (action) => {
    setActionError('')
    if (action === 'approve' && !isProfileComplete) {
      setActionError(`Cannot approve. Missing fields: ${missingFields.join(', ')}`)
      return
    }

    try {
      await dispatch(
        processVendorProfile({
          id,
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
      await dispatch(submitVendorProfile(id)).unwrap()
    } catch (e) {
      setActionError(e || 'Failed to submit profile')
    }
  }

  const fields = useMemo(() => {
    const p = profile || {}
    return [
      ['Company Name', p.company_name || p.business_name],
      ['Legal Business Name', p.legal_business_name],
      ['Registration Number', p.registration_number],
      ['Tax ID / VAT', p.tax_id_or_vat],
      ['Year Established', p.year_established],
      ['Company Type', p.company_type],
      ['Industry Category', p.industry_category],
      ['Business Nature', p.business_nature],
      ['Website', p.website],
      ['Business Email', p.business_email || p.email],
      ['Business Phone', p.business_phone || p.phone],
      ['Address', p.address],
      ['Country', p.country],
      ['Service Coverage', p.service_coverage],
      ['Company Description', p.company_description || p.description],
      ['Social Media Links', Array.isArray(p.social_media_links) ? p.social_media_links.join(', ') : ''],
      ['Logo URL', p.logo_url || p.logo?.fileUrl || p.logo?.url],
      ['City', p.city],
      ['Note', p.note],
      ['Submitted', p.submitted ?? p.is_submitted ?? p.submission_status ?? (p.submitted_at ? 'yes' : undefined)],
    ]
  }, [profile])

  const isLoading = currentProfileStatus === 'loading'

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-6">
      <div className="flex items-center justify-between">
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
        <>
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-neutral-900">
                  <Building2 className="w-5 h-5" />
                  <h1 className="text-xl font-bold">{profile.company_name || profile.business_name || vendorListItem?.business_name || 'Vendor Profile'}</h1>
                </div>
                <p className="text-sm text-neutral-500 mt-1">Vendor ID: {id}</p>
              </div>
              <span className={clsx(
                'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
                isValidated ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {isValidated ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {isValidated ? 'Validated' : 'Not Validated'}
              </span>
            </div>
          </div>

          {!isProfileComplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-amber-800 text-sm font-semibold">Profile incomplete. Validation is blocked.</p>
                  <p className="text-amber-700 text-sm mt-1">Missing fields: {missingFields.join(', ')}</p>
                </div>
              </div>
            </div>
          )}

          {actionError && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
              {actionError}
            </div>
          )}
          {!isAdmin && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-600">
              Admin-only page: approve/reject actions are hidden for non-admin users.
            </div>
          )}
          {saveMessage && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
              {saveMessage}
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
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
        </>
      )}
    </div>
  )
}
