// Shared vendor-profile helpers for the Vendors list and Vendor Details pages.

const REQUIRED_FIELDS = [
  ['company_name', 'company name'],
  ['legal_business_name', 'registered name'],
  ['registration_number', 'registration number'],
  ['tax_id', 'tax ID / GSTIN'],
  ['year_established', 'year established'],
  ['company_type', 'company type'],
  ['industry_category', 'industry category'],
  ['business_nature', 'business nature'],
  ['website', 'website'],
  ['business_email', 'business email'],
  ['business_phone', 'business phone'],
  ['address', 'address'],
  ['city', 'city'],
  ['country', 'country'],
  ['service_coverage', 'service coverage'],
  ['company_description', 'company description'],
  ['logo_url', 'logo'],
]

const blank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

// Flattens the nested vendor document into the fields the dashboard shows.
export const flattenVendor = (vendor = {}) => {
  const cd = vendor.company_details || {}
  const bd = vendor.business_details || {}
  const op = vendor.online_presence || {}
  const addr = op.address || {}
  return {
    company_name: cd.company_name || vendor.business_name || '',
    legal_business_name: cd.registered_name || '',
    registration_number: cd.registration_number || '',
    tax_id: cd.tax_id || '',
    year_established: cd.year_established || '',
    company_type: cd.company_type || '',
    industry: cd.industry || '',
    industry_category: bd.industry_category || vendor.category || '',
    business_nature: bd.business_nature || '',
    service_coverage: bd.service_coverage || '',
    website: op.website_url || '',
    business_email: op.company_email || '',
    business_phone: op.phone_number || vendor.phone || '',
    address: [addr.address_line1, addr.address_line2].filter(Boolean).join(', ') || vendor.address || '',
    city: addr.city || '',
    state: addr.state || '',
    pincode: addr.pincode || '',
    country: addr.country || bd.country || '',
    company_description: vendor.company_description || vendor.description || '',
    logo_url: vendor.logo_url || '',
    social: vendor.social_media_links || {},
  }
}

export const missingVendorFields = (vendor) => {
  const flat = flattenVendor(vendor)
  return REQUIRED_FIELDS.filter(([key]) => blank(flat[key])).map(([, label]) => label)
}

export const vendorCompleteness = (vendor) => {
  const missing = missingVendorFields(vendor).length
  return Math.round(((REQUIRED_FIELDS.length - missing) / REQUIRED_FIELDS.length) * 100)
}

// draft → submitted/pending_verification → approved | rejected
export const vendorStatus = (vendor = {}) => {
  if (vendor.validated) return 'validated'
  const s = String(vendor.verification_status || vendor.status || '').toLowerCase()
  if (s === 'rejected') return 'rejected'
  if (s === 'submitted' || s === 'pending_verification' || vendor.submitted_for_verification_at) return 'pending'
  return 'draft'
}

export const VENDOR_STATUS_META = {
  validated: { label: 'Validated', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  pending: { label: 'Pending Review', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  draft: { label: 'Not Validated', cls: 'bg-rose-50 text-[#C81345]', dot: 'bg-[#E8194E]' },
}

export const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : ref ? String(ref) : '')
