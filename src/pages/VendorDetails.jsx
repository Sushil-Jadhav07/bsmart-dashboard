import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, Building2, Pencil, Save, Upload } from 'lucide-react'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import { fetchVendorProfileById, patchVendorProfile, submitVendorProfile, processVendorProfile, uploadVendorProfileLogo } from '../store/vendorsSlice.js'

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

  const [actionError, setActionError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef(null)
  const [formValues, setFormValues] = useState({
    company_name: '',
    legal_business_name: '',
    registration_number: '',
    tax_id_or_vat: '',
    year_established: '',
    company_type: '',
    industry_category: '',
    business_nature: '',
    website: '',
    business_email: '',
    business_phone: '',
    address: '',
    country: '',
    service_coverage: '',
    company_description: '',
    social_media_links: [],
    logo_url: '',
    city: '',
    note: '',
  })

  useEffect(() => {
    if (id) dispatch(fetchVendorProfileById(id))
  }, [dispatch, id])

  const vendorListItem = useMemo(
    () => (items || []).find((v) => v?._id === id || v?.user?._id === id || v?.user?.id === id),
    [items, id]
  )

  const profile = useMemo(() => currentProfile || null, [currentProfile])

  useEffect(() => {
    const p = profile || {}
    setFormValues({
      company_name: p.company_name || p.business_name || '',
      legal_business_name: p.legal_business_name || '',
      registration_number: p.registration_number || '',
      tax_id_or_vat: p.tax_id_or_vat || '',
      year_established: p.year_established ?? '',
      company_type: p.company_type || '',
      industry_category: p.industry_category || '',
      business_nature: p.business_nature || '',
      website: p.website || '',
      business_email: p.business_email || p.email || '',
      business_phone: p.business_phone || p.phone || '',
      address: p.address || '',
      country: p.country || '',
      service_coverage: p.service_coverage || '',
      company_description: p.company_description || p.description || '',
      social_media_links: Array.isArray(p.social_media_links) ? p.social_media_links : [],
      logo_url: p.logo_url || p.logo?.fileUrl || p.logo?.url || '',
      city: p.city || '',
      note: p.note || '',
    })
  }, [profile])

  const missingFields = useMemo(() => getMissingFields(profile), [profile])
  const isProfileComplete = missingFields.length === 0
  const isValidated = !!(profile?.validated || profile?.status === 'approved')
  const isRejected = profile?.status === 'rejected'
  const isSubmitted = profile?.status === 'submitted' || profile?.submitted
  
  const handleApproval = async (status) => {
    setActionError('')
    if (status === 'approved' && !isProfileComplete) {
      setActionError(`Cannot approve. Missing fields: ${missingFields.join(', ')}`)
      return
    }

    try {
      await dispatch(
        processVendorProfile({
          id,
          status,
          rejection_reason: status === 'rejected' ? 'Admin rejected' : undefined,
        })
      ).unwrap()
    } catch (e) {
      setActionError(e || `Failed to ${status} vendor`)
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

  const handleFieldChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveProfile = async () => {
    setActionError('')
    setSaveMessage('')
    try {
      const payload = {
        company_name: formValues.company_name || '',
        legal_business_name: formValues.legal_business_name || '',
        registration_number: formValues.registration_number || '',
        tax_id_or_vat: formValues.tax_id_or_vat || '',
        year_established: formValues.year_established === '' ? 0 : Number(formValues.year_established),
        company_type: formValues.company_type || '',
        industry_category: formValues.industry_category || '',
        business_nature: formValues.business_nature || '',
        website: formValues.website || '',
        business_email: formValues.business_email || '',
        business_phone: formValues.business_phone || '',
        address: formValues.address || '',
        country: formValues.country || '',
        service_coverage: formValues.service_coverage || '',
        company_description: formValues.company_description || '',
        social_media_links: Array.isArray(formValues.social_media_links) ? formValues.social_media_links : [],
        logo_url: formValues.logo_url || '',
        city: formValues.city || '',
        note: formValues.note || '',
      }
      await dispatch(
        patchVendorProfile({
          id,
          payload,
        })
      ).unwrap()
      await dispatch(fetchVendorProfileById(id)).unwrap()
      setEditMode(false)
      setSaveMessage('Vendor profile updated successfully')
    } catch (e) {
      setActionError(e || 'Failed to update vendor profile')
    }
  }

  const handleCancelEdit = () => {
    const p = profile || {}
    setFormValues({
      company_name: p.company_name || p.business_name || '',
      legal_business_name: p.legal_business_name || '',
      registration_number: p.registration_number || '',
      tax_id_or_vat: p.tax_id_or_vat || '',
      year_established: p.year_established ?? '',
      company_type: p.company_type || '',
      industry_category: p.industry_category || '',
      business_nature: p.business_nature || '',
      website: p.website || '',
      business_email: p.business_email || p.email || '',
      business_phone: p.business_phone || p.phone || '',
      address: p.address || '',
      country: p.country || '',
      service_coverage: p.service_coverage || '',
      company_description: p.company_description || p.description || '',
      social_media_links: Array.isArray(p.social_media_links) ? p.social_media_links : [],
      logo_url: p.logo_url || p.logo?.fileUrl || p.logo?.url || '',
      city: p.city || '',
      note: p.note || '',
    })
    setEditMode(false)
  }

  const handleLogoUpload = async (event) => {
    const file = event.target?.files?.[0]
    if (!file) return
    setActionError('')
    setSaveMessage('')
    setUploadingLogo(true)
    try {
      const result = await dispatch(uploadVendorProfileLogo(file)).unwrap()
      const uploadedLogoUrl = result?.logoUrl || ''
      if (uploadedLogoUrl) {
        setFormValues((prev) => ({ ...prev, logo_url: uploadedLogoUrl }))
        setSaveMessage('Logo uploaded. Click Save to persist profile changes.')
      } else {
        setSaveMessage('Logo uploaded. Click Save to persist profile changes.')
      }
    } catch (e) {
      setActionError(e || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      if (event.target) event.target.value = ''
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
          {!editMode ? (
            <Button
              variant="outline"
              size="sm"
              icon={Pencil}
              onClick={() => {
                setSaveMessage('')
                setActionError('')
                setEditMode(true)
              }}
            >
              Edit Fields
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Save}
                onClick={handleSaveProfile}
                disabled={!!updating[id]}
              >
                Save
              </Button>
            </>
          )}
          <Button
            variant={isValidated ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => handleApproval(isValidated ? 'rejected' : 'approved')}
            disabled={!adminId || !!updating[id] || (editMode)}
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
          {saveMessage && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
              {saveMessage}
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-800">Vendor Profile Fields</h2>
            </div>
            {!editMode ? (
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
            ) : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Company Name" value={formValues.company_name} onChange={(e) => handleFieldChange('company_name', e.target.value)} />
                <Input label="Legal Business Name" value={formValues.legal_business_name} onChange={(e) => handleFieldChange('legal_business_name', e.target.value)} />
                <Input label="Registration Number" value={formValues.registration_number} onChange={(e) => handleFieldChange('registration_number', e.target.value)} />
                <Input label="Tax ID / VAT" value={formValues.tax_id_or_vat} onChange={(e) => handleFieldChange('tax_id_or_vat', e.target.value)} />
                <Input label="Year Established" type="number" value={formValues.year_established} onChange={(e) => handleFieldChange('year_established', e.target.value)} />
                <Input label="Company Type" value={formValues.company_type} onChange={(e) => handleFieldChange('company_type', e.target.value)} />
                <Input label="Industry Category" value={formValues.industry_category} onChange={(e) => handleFieldChange('industry_category', e.target.value)} />
                <Input label="Business Nature" value={formValues.business_nature} onChange={(e) => handleFieldChange('business_nature', e.target.value)} />
                <Input label="Website" value={formValues.website} onChange={(e) => handleFieldChange('website', e.target.value)} />
                <Input label="Business Email" type="email" value={formValues.business_email} onChange={(e) => handleFieldChange('business_email', e.target.value)} />
                <Input label="Business Phone" value={formValues.business_phone} onChange={(e) => handleFieldChange('business_phone', e.target.value)} />
                <Input label="Address" value={formValues.address} onChange={(e) => handleFieldChange('address', e.target.value)} />
                <Input label="Country" value={formValues.country} onChange={(e) => handleFieldChange('country', e.target.value)} />
                <Input label="Service Coverage" value={formValues.service_coverage} onChange={(e) => handleFieldChange('service_coverage', e.target.value)} />
                <Input label="City" value={formValues.city} onChange={(e) => handleFieldChange('city', e.target.value)} />
                <Input label="Note" value={formValues.note} onChange={(e) => handleFieldChange('note', e.target.value)} />
                <div>
                  <Input label="Logo URL" value={formValues.logo_url} onChange={(e) => handleFieldChange('logo_url', e.target.value)} />
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Upload}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Company Description</label>
                  <textarea
                    rows={4}
                    value={formValues.company_description}
                    onChange={(e) => handleFieldChange('company_description', e.target.value)}
                    className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors duration-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Social Media Links (comma separated)</label>
                  <textarea
                    rows={3}
                    value={(formValues.social_media_links || []).join(', ')}
                    onChange={(e) =>
                      handleFieldChange(
                        'social_media_links',
                        e.target.value
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean)
                      )
                    }
                    className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors duration-200"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
