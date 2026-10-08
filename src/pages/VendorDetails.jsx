import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Building2, Calendar, Check, CheckCircle2, ChevronDown, Circle,
  Copy, Crown, Globe, Loader2, Mail, MapPin, Megaphone, Package, Phone, RefreshCw, ShieldCheck, ShieldOff, Trash2,
  TrendingDown, TrendingUp, UserCheck, UserMinus, Wallet, XCircle,
} from 'lucide-react'
import { ConfirmModal } from '../components/Modal.jsx'
import { deleteVendorById, fetchVendorProfileById, fetchVendors, processVendorProfile } from '../store/vendorsSlice.js'
import { fetchVendorWalletHistory, resetVendorHistory } from '../store/walletSlice.js'
import { assignSalesOfficer, fetchSalesOfficerById, fetchSalesOfficers, resetAssignStatus, unassignSalesOfficer } from '../store/salesSlice.js'
import { fetchAdsAdmin } from '../store/adsSlice.js'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'
import { formatDateTime, formatNumber } from '../utils/helpers.jsx'
import { toAbsoluteMediaUrl } from '../utils/contentHelpers.js'
import { VENDOR_STATUS_META, flattenVendor, idOf, missingVendorFields, vendorCompleteness, vendorStatus } from '../utils/vendorProfile.js'

const card = 'rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_10px_28px_-18px_rgba(16,24,40,0.3)]'
const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'

const Head = ({ icon: Icon, title, right }) => (
  <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
    <h2 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight text-neutral-900">
      {Icon && <Icon className="h-4 w-4 text-[#C81345]" />}{title}
    </h2>
    {right}
  </div>
)

const Tile = ({ label, value, wide, mono, copy, badge }) => {
  const [copied, setCopied] = useState(false)
  const empty = value === null || value === undefined || value === ''
  return (
    <div className={clsx('group min-w-0 rounded-xl bg-[#F1F3FC] px-3.5 py-2.5 transition hover:bg-[#E9EBFA]', wide && 'sm:col-span-2 lg:col-span-3')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">{label}</p>
        {badge}
        {copy && !empty && (
          <button
            type="button"
            title="Copy"
            aria-label={`Copy ${label}`}
            onClick={async () => { try { await navigator.clipboard.writeText(String(value)); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* blocked */ } }}
            className="text-neutral-400 opacity-0 transition hover:text-[#C81345] group-hover:opacity-100"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <p className={clsx('mt-0.5 break-words text-[13.5px] font-bold', empty ? 'italic font-medium text-rose-500' : 'text-neutral-900', mono && !empty && 'font-mono text-[12.5px]')}>
        {empty ? 'Not provided' : value}
      </p>
    </div>
  )
}

export default function VendorDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const token = useSelector((s) => s.auth.token)
  const authUser = useSelector((s) => s.auth.user)
  const isAdmin = String(authUser?.role || '').toLowerCase() === 'admin'
  const { currentProfile, currentProfileStatus, currentProfileError, items, updating } = useSelector((s) => s.vendors)
  const { vendorHistory, vendorWallet, vendorStatus: walletStatus, vendorError } = useSelector((s) => s.wallet)
  const { officers, officersStatus, officerById, officerByIdStatus, assignStatus, assignError } = useSelector((s) => s.sales)
  const { items: ads, status: adsStatus } = useSelector((s) => s.ads)

  const [purchases, setPurchases] = useState({ status: 'idle', items: [] })
  const [selectedOfficer, setSelectedOfficer] = useState('')
  const [officerMenu, setOfficerMenu] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'delete' | 'validate' | 'revoke' | 'unassign'
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)

  const listItem = useMemo(() => (items || []).find((v) => [v?._id, idOf(v?.user), idOf(v?.user_id)].includes(id)), [items, id])
  const userId = idOf(listItem?.user) || idOf(listItem?.user_id) || idOf(currentProfile?.user_id) || id

  useEffect(() => { if (!items?.length) dispatch(fetchVendors()) }, [dispatch, items?.length])
  useEffect(() => { if (userId) dispatch(fetchVendorProfileById(userId)) }, [dispatch, userId])
  useEffect(() => {
    if (!userId || !token) return undefined
    dispatch(fetchVendorWalletHistory(userId))
    return () => { dispatch(resetVendorHistory()) }
  }, [dispatch, userId, token])
  useEffect(() => { if (officersStatus === 'idle') dispatch(fetchSalesOfficers()) }, [dispatch, officersStatus])
  useEffect(() => { if (adsStatus === 'idle') dispatch(fetchAdsAdmin({ limit: 100 })) }, [dispatch, adsStatus])

  const vendor = useMemo(() => ({ ...(listItem || {}), ...(currentProfile || {}) }), [listItem, currentProfile])
  const vendorDocId = String(vendor._id || listItem?._id || '')

  // Package purchases for this vendor only (kept local so other pages' data isn't replaced).
  useEffect(() => {
    if (!token || !vendorDocId) return undefined
    let cancelled = false
    setPurchases((p) => ({ ...p, status: 'loading' }))
    fetch(`${API_BASE_WITH_PATH}/vendor-packages/admin/purchases?vendorId=${vendorDocId}&limit=50`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => { if (!cancelled) setPurchases({ status: ok ? 'succeeded' : 'failed', items: ok ? (json?.purchases || json?.data || []) : [] }) })
      .catch(() => { if (!cancelled) setPurchases({ status: 'failed', items: [] }) })
    return () => { cancelled = true }
  }, [token, vendorDocId])

  const flat = useMemo(() => flattenVendor(vendor), [vendor])
  const missing = useMemo(() => missingVendorFields(vendor), [vendor])
  const completeness = vendorCompleteness(vendor)
  const status = vendorStatus(vendor)
  const statusMeta = VENDOR_STATUS_META[status]
  const owner = vendor.user || (typeof vendor.user_id === 'object' ? vendor.user_id : null) || {}

  const officerId = idOf(vendor.assigned_sales_officer)
  const officer = useMemo(() => {
    if (!officerId) return null
    const cached = officerById?.[officerId]
    if (cached && (cached.full_name || cached.username || cached.email)) return cached
    return officers.find((o) => String(o._id || o.id) === officerId) || null
  }, [officerId, officerById, officers])
  useEffect(() => {
    if (!officerId) return
    const s = officerByIdStatus?.[officerId]
    if (s !== 'loading' && s !== 'succeeded') dispatch(fetchSalesOfficerById(officerId))
  }, [dispatch, officerId, officerByIdStatus])

  const vendorAds = useMemo(() => (ads || []).filter((ad) => idOf(ad.vendor_id) === vendorDocId), [ads, vendorDocId])
  const activeAds = vendorAds.filter((ad) => String(ad.status).toLowerCase() === 'active').length

  const activePackage = useMemo(() => {
    const now = Date.now()
    return [...purchases.items]
      .filter((p) => !p.expires_at || new Date(p.expires_at).getTime() > now)
      .sort((a, b) => new Date(b.purchased_at || b.createdAt) - new Date(a.purchased_at || a.createdAt))[0] || null
  }, [purchases.items])

  const wallet = useMemo(() => {
    const spent = vendorHistory.filter((t) => (t.amount ?? 0) < 0).reduce((s, t) => s + Math.abs(t.amount ?? 0), 0)
    const credited = vendorHistory.filter((t) => (t.amount ?? 0) > 0).reduce((s, t) => s + (t.amount ?? 0), 0)
    const balance = vendorWallet?.balance ?? vendorWallet?.new_balance ?? vendorWallet?.wallet_balance ?? (credited - spent)
    return { balance: Number(balance) || 0, spent, credited }
  }, [vendorHistory, vendorWallet])

  const packageSpend = purchases.items.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0)

  // Package purchases (₹) and coin movements, newest first.
  const activity = useMemo(() => {
    const fromPackages = purchases.items.map((p) => ({
      key: `pkg-${p._id}`,
      ref: `#PKG-${String(p._id || '').slice(-5).toUpperCase()}`,
      title: p.package_snapshot?.name || 'Vendor package',
      sub: [p.package_snapshot?.tier, p.coins_credited ? `${formatNumber(p.coins_credited)} coins credited` : null].filter(Boolean).join(' · '),
      amount: `${inr(p.amount_paid)}`,
      tone: 'text-neutral-900',
      icon: Package,
      iconTone: 'bg-purple-100 text-[#8E35B5]',
      status: p.expires_at && new Date(p.expires_at) < new Date() ? 'Expired' : 'Active',
      date: p.purchased_at || p.createdAt,
    }))
    const fromWallet = vendorHistory.map((t) => {
      const amount = Number(t.amount) || 0
      return {
        key: `tx-${t._id}`,
        ref: `#TXN-${String(t._id || '').slice(-5).toUpperCase()}`,
        title: String(t.type || 'Coin transaction').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        sub: t.description || '',
        amount: `${amount >= 0 ? '+' : ''}${formatNumber(amount)} coins`,
        tone: amount >= 0 ? 'text-emerald-600' : 'text-[#C81345]',
        icon: amount >= 0 ? TrendingUp : TrendingDown,
        iconTone: amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-pink-100 text-[#C81345]',
        status: String(t.status || '').toUpperCase() === 'SUCCESS' ? 'Settled' : (t.status || 'Pending'),
        date: t.createdAt || t.transactionDate,
      }
    })
    return [...fromPackages, ...fromWallet].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [purchases.items, vendorHistory])

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 3000) }

  const runConfirm = async () => {
    setBusy(true)
    try {
      if (confirm === 'delete') {
        await dispatch(deleteVendorById(vendorDocId || userId)).unwrap()
        navigate('/vendors', { replace: true })
        return
      }
      if (confirm === 'validate' || confirm === 'revoke') {
        await dispatch(processVendorProfile({ id: userId, action: confirm === 'validate' ? 'approve' : 'reject', rejection_reason: confirm === 'revoke' ? 'Validation revoked by admin' : undefined })).unwrap()
        dispatch(fetchVendorProfileById(userId))
        showToast(confirm === 'validate' ? 'Vendor validated' : 'Validation revoked')
      }
      if (confirm === 'unassign') {
        await dispatch(unassignSalesOfficer(userId)).unwrap()
        dispatch(fetchVendorProfileById(userId))
        showToast('Sales officer removed')
      }
    } catch (e) {
      showToast(typeof e === 'string' ? e : 'Action failed', 'error')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const assign = async () => {
    if (!selectedOfficer) return
    const res = await dispatch(assignSalesOfficer({ vendor_user_id: userId, sales_user_id: selectedOfficer }))
    if (res.meta.requestStatus === 'fulfilled') {
      dispatch(fetchVendorProfileById(userId))
      dispatch(fetchSalesOfficerById(selectedOfficer))
      showToast('Sales officer assigned')
      setSelectedOfficer('')
    }
    dispatch(resetAssignStatus())
  }

  const isLoading = currentProfileStatus === 'loading' && !currentProfile
  const selectedOfficerObj = officers.find((o) => String(o._id || o.id) === selectedOfficer)
  const locationLine = [flat.city, flat.state, flat.country].filter(Boolean).join(', ')
  const logo = flat.logo_url ? toAbsoluteMediaUrl(flat.logo_url) : ''

  const confirmCopy = {
    delete: ['Delete Vendor', 'Delete', 'danger', `Delete ${flat.company_name || 'this vendor'}? Their vendor profile will be removed.`, 'This action cannot be undone.'],
    validate: ['Mark as Validated', 'Validate', 'primary', `Approve ${flat.company_name || 'this vendor'} for running ads and campaigns?`, 'You can revoke validation later.'],
    revoke: ['Revoke Validation', 'Revoke', 'danger', `Revoke validation for ${flat.company_name || 'this vendor'}?`, 'The vendor will need to be validated again.'],
    unassign: ['Remove Sales Officer', 'Remove', 'danger', `Remove ${officer?.full_name || 'the assigned officer'} from this vendor?`, 'You can assign an officer again at any time.'],
  }[confirm] || []

  return (
    <div className="mx-auto max-w-[1400px] pb-10">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate('/vendors')} className="group inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#C81345]">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Vendors
          </button>
          <p className="mt-1 text-[10.5px] font-bold uppercase tracking-widest text-neutral-600">Business / Vendors / <span className="text-neutral-900">Vendor Inspection</span></p>
        </div>
        {isAdmin && !isLoading && (
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => setConfirm('delete')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-[13px] font-bold text-[#C81345] transition hover:-translate-y-0.5 hover:bg-rose-100">
              <Trash2 className="h-4 w-4" /> Delete Vendor
            </button>
            {status === 'validated' ? (
              <button type="button" onClick={() => setConfirm('revoke')} disabled={!!updating?.[vendorDocId]} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">
                <ShieldOff className="h-4 w-4 text-amber-600" /> Revoke Validation
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm('validate')}
                disabled={missing.length > 0}
                title={missing.length ? 'Complete the profile before validating' : undefined}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:translate-y-0 disabled:opacity-50"
              >
                <BadgeCheck className="h-4 w-4" /> Mark as Validated
              </button>
            )}
          </div>
        )}
      </div>

      {isLoading && <div className="flex flex-col items-center justify-center gap-4 py-24 text-neutral-400"><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm font-medium">Loading vendor profile…</p></div>}
      {!isLoading && currentProfileError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center">
          <p className="font-semibold text-red-600">Could not load vendor profile</p>
          <p className="mt-1 text-sm text-red-400">{currentProfileError}</p>
        </div>
      )}

      {!isLoading && !currentProfileError && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            {/* Identity header */}
            <section className={clsx(card, 'p-5')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                      {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-8 w-8 text-neutral-300" />}
                    </div>
                    {status === 'validated' && <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#E8194E] ring-2 ring-white"><Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /></span>}
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate font-display text-[22px] font-bold tracking-tight text-neutral-900">{flat.company_name || 'Vendor profile'}</h1>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold', statusMeta.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', statusMeta.dot)} />{statusMeta.label}</span>
                      <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold', completeness === 100 ? 'bg-purple-100 text-[#8E35B5]' : 'bg-amber-50 text-amber-700')}>
                        <ShieldCheck className="h-3 w-3" /> Profile {completeness}% complete
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] text-neutral-700">
                      <span className="font-semibold text-neutral-500">Owner:</span> <span className="font-bold">{owner.full_name || owner.username || '—'}</span>
                      {owner.username && <span className="text-neutral-500"> (@{owner.username})</span>}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-500">
                      {flat.year_established && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Est. {flat.year_established}</span>}
                      {locationLine && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#C81345]" />{locationLine}</span>}
                      {flat.industry_category && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{flat.industry_category}</span>}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-pink-100 bg-gradient-to-br from-pink-50 to-purple-50 px-4 py-3 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Merchant tier</p>
                  {purchases.status === 'loading' ? <p className="mt-1 text-[12px] text-neutral-400">Loading…</p> : activePackage ? (
                    <>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[16px] font-extrabold text-[#C81345]"><Crown className="h-4 w-4" />{activePackage.package_snapshot?.tier || activePackage.package_snapshot?.name || 'Active package'}</p>
                      {activePackage.expires_at && <p className="text-[11px] text-neutral-500">until {new Date(activePackage.expires_at).toLocaleDateString()}</p>}
                    </>
                  ) : <p className="mt-0.5 text-[14px] font-bold text-neutral-500">No active package</p>}
                </div>
              </div>
            </section>

            {missing.length > 0 && (
              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-[13px] font-bold text-amber-900">Profile incomplete. It can't be validated yet.</p>
                  <p className="mt-0.5 text-[12.5px] text-amber-800">Missing: {missing.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Corporate identity */}
            <section className={card}>
              <Head icon={Building2} title="Registered Corporate Identity" right={<span className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">{17 - missing.length}/17 fields filled</span>} />
              <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
                <Tile label="Company name" value={flat.company_name} />
                <Tile label="Registered name" value={flat.legal_business_name} />
                <Tile label="Industry" value={[flat.industry_category, flat.industry].filter(Boolean).join(' · ')} />
                <Tile label="Registration number (CIN)" value={flat.registration_number} mono copy />
                <Tile label="GSTIN / Tax ID" value={flat.tax_id} mono copy />
                <Tile label="Year established" value={flat.year_established} />
                <Tile label="Company structure" value={flat.company_type} />
                <Tile label="Business email" value={flat.business_email} copy />
                <Tile label="Business phone" value={flat.business_phone} copy />
                <Tile label="Registered operating address" value={[flat.address, flat.city, flat.state, flat.pincode, flat.country].filter(Boolean).join(', ')} wide />
                <Tile label="Website" value={flat.website} />
                <Tile label="Business nature" value={flat.business_nature} />
                <Tile label="Service coverage" value={flat.service_coverage} />
              </div>
              {(flat.company_description || Object.values(flat.social).some(Boolean)) && (
                <div className="border-t border-neutral-100 px-5 py-4">
                  {flat.company_description && <p className="text-[13px] leading-relaxed text-neutral-700">{flat.company_description}</p>}
                  {Object.values(flat.social).some(Boolean) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(flat.social).filter(([, v]) => v).map(([k, v]) => (
                        <a key={k} href={/^https?:/.test(v) ? v : `https://${v}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-[#E9EBFA] px-2 py-0.5 text-[11.5px] font-semibold capitalize text-neutral-700 transition hover:bg-pink-100 hover:text-[#C81345]">
                          <Globe className="h-3 w-3" />{k}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Activity */}
            <section className={card}>
              <Head
                icon={Wallet}
                title="Recent Vendor Transactions & Packages"
                right={(
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">Last {Math.min(activity.length, 8)} events</span>
                    <button type="button" onClick={() => dispatch(fetchVendorWalletHistory(userId))} aria-label="Refresh" className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100">
                      <RefreshCw className={clsx('h-3.5 w-3.5', walletStatus === 'loading' && 'animate-spin')} />
                    </button>
                  </div>
                )}
              />
              {walletStatus === 'loading' && !activity.length ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading activity…</div>
              ) : activity.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10"><Wallet className="h-7 w-7 text-neutral-200" /><p className="text-[12.5px] text-neutral-400">{vendorError || 'No transactions or package purchases yet'}</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left">
                    <thead>
                      <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                        {['Reference', 'Item / description', 'Amount', 'Status'].map((h) => <th key={h} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {activity.slice(0, 8).map((row) => (
                        <tr key={row.key} className="transition-colors hover:bg-[#FDF2F6]">
                          <td className="px-5 py-3">
                            <p className="font-mono text-[12px] font-bold text-neutral-900">{row.ref}</p>
                            <p className="text-[11px] text-neutral-500">{row.date ? formatDateTime(row.date) : '—'}</p>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className={clsx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', row.iconTone)}><row.icon className="h-4 w-4" /></span>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-bold text-neutral-900">{row.title}</p>
                                {row.sub && <p className="max-w-[260px] truncate text-[11px] text-neutral-500">{row.sub}</p>}
                              </div>
                            </div>
                          </td>
                          <td className={clsx('whitespace-nowrap px-5 py-3 text-[13px] font-bold', row.tone)}>{row.amount}</td>
                          <td className="px-5 py-3">
                            <span className={clsx('rounded-md px-2 py-0.5 text-[10.5px] font-bold', ['Settled', 'Active'].includes(row.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{row.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
                    <p className="text-[11.5px] text-neutral-500">Coin movements from the Vault and package purchases</p>
                    <button type="button" onClick={() => navigate(`/wallets/${userId}`)} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#C81345] hover:underline">
                      View full ledger <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Side column */}
          <div className="space-y-5 xl:sticky xl:top-[72px]">
            <section className={card}>
              <Head title="Financial Snapshot" right={<Wallet className="h-4 w-4 text-[#8E35B5]" />} />
              <div className="space-y-2.5 px-5 pb-5">
                <div className="rounded-xl bg-gradient-to-br from-[#F1F3FC] to-pink-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-700">Vault coin balance</p>
                    <span className="rounded bg-rose-100 px-1.5 text-[9.5px] font-bold uppercase text-rose-600">Live</span>
                  </div>
                  <p className="mt-1 font-display text-[28px] font-extrabold leading-tight text-neutral-900">{formatNumber(wallet.balance)} <span className="text-[13px] font-semibold text-neutral-500">coins</span></p>
                  {vendor.credits ? <p className="text-[11.5px] text-neutral-500">{formatNumber(vendor.credits)} ad credits{vendor.credits_expires_at ? ` · expire ${new Date(vendor.credits_expires_at).toLocaleDateString()}` : ''}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-[#F1F3FC] px-3 py-2.5 transition hover:bg-[#E9EBFA]">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Package spend</p>
                    <p className="text-[16px] font-extrabold text-neutral-900">{inr(packageSpend)}</p>
                    <p className="text-[10.5px] font-semibold text-neutral-500">{purchases.items.length} purchase{purchases.items.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="rounded-xl bg-[#F1F3FC] px-3 py-2.5 transition hover:bg-[#E9EBFA]">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Coins spent</p>
                    <p className="text-[16px] font-extrabold text-[#C81345]">{formatNumber(wallet.spent)}</p>
                    <p className="text-[10.5px] font-semibold text-neutral-500">{vendorHistory.length} transactions</p>
                  </div>
                </div>
                <button type="button" onClick={() => navigate('/ads')} className="flex w-full items-center justify-between rounded-xl border border-pink-100 bg-pink-50/70 px-3.5 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-pink-50">
                  <span className="flex items-center gap-2.5">
                    <Megaphone className="h-4 w-4 text-[#C81345]" />
                    <span>
                      <span className="block text-[13px] font-bold text-neutral-900">Spotlight ads</span>
                      <span className="block text-[11px] text-neutral-500">{activeAds} active of {vendorAds.length}</span>
                    </span>
                  </span>
                  <span className="rounded-lg bg-[#C81345] px-2.5 py-1 text-[12px] font-bold text-white">{vendorAds.length} Ads</span>
                </button>
              </div>
            </section>

            <section className={card}>
              <Head title="Assigned Sales Officer" right={officer ? <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Current</span> : null} />
              <div className="px-5 pb-5">
                {officerId && !officer ? (
                  <div className="flex items-center gap-2 text-[12.5px] text-neutral-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading officer…</div>
                ) : officer ? (
                  <>
                    <div className="flex items-center gap-3">
                      {officer.avatar_url
                        ? <img src={toAbsoluteMediaUrl(officer.avatar_url)} alt="" className="h-11 w-11 rounded-full object-cover" />
                        : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#8E35B5] to-[#E8194E] text-[13px] font-bold text-white">{initials(officer.full_name || officer.username)}</span>}
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-neutral-900">{officer.full_name || officer.username}</p>
                        {officer.username && <p className="text-[12px] text-[#C81345]">@{officer.username}</p>}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 text-[12.5px] text-neutral-700">
                      {officer.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-neutral-400" />{officer.phone}</p>}
                      {officer.email && <a href={`mailto:${officer.email}`} className="flex items-center gap-2 hover:text-[#C81345]"><Mail className="h-3.5 w-3.5 text-neutral-400" />{officer.email}</a>}
                      {officer.location && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-neutral-400" />{officer.location}</p>}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-2 text-center"><UserCheck className="h-7 w-7 text-neutral-200" /><p className="text-[12.5px] text-neutral-500">No sales officer assigned</p></div>
                )}
              </div>
            </section>

            {isAdmin && (
              <section className={card}>
                <Head title={officer ? 'Reassign Sales Officer' : 'Assign Sales Officer'} right={officer ? (
                  <button type="button" onClick={() => setConfirm('unassign')} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-neutral-500 hover:text-[#C81345]"><UserMinus className="h-3.5 w-3.5" /> Remove</button>
                ) : null} />
                <div className="px-5 pb-5">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Select new representative</p>
                  <div className="relative">
                    <button type="button" onClick={() => setOfficerMenu((v) => !v)} className="flex h-10 w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 text-left text-[13px] text-neutral-800 transition hover:border-neutral-300">
                      <span className="truncate">{selectedOfficerObj ? `${selectedOfficerObj.full_name || selectedOfficerObj.username}${selectedOfficerObj.location ? ` (${selectedOfficerObj.location})` : ''}` : officersStatus === 'loading' ? 'Loading officers…' : 'Choose an officer'}</span>
                      <ChevronDown className={clsx('h-4 w-4 text-neutral-500 transition-transform', officerMenu && 'rotate-180')} />
                    </button>
                    {officerMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOfficerMenu(false)} />
                        <div className="absolute left-0 right-0 top-11 z-20 max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                          {officers.length === 0 && <p className="px-3 py-2 text-[12.5px] text-neutral-500">No sales officers available</p>}
                          {officers.map((o) => {
                            const oid = String(o._id || o.id)
                            const current = oid === officerId
                            return (
                              <button key={oid} type="button" disabled={current} onClick={() => { setSelectedOfficer(oid); setOfficerMenu(false) }} className={clsx('flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition', oid === selectedOfficer ? 'bg-pink-50 font-semibold text-[#C81345]' : 'text-neutral-700 hover:bg-neutral-50', current && 'cursor-default opacity-50')}>
                                <span className="truncate">{o.full_name || o.username}{o.location ? <span className="text-neutral-400"> · {o.location}</span> : null}</span>
                                {current && <span className="text-[10px] font-bold uppercase">Current</span>}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {assignError && <p className="mt-2 text-[12px] text-rose-600">{assignError}</p>}
                  <button type="button" onClick={assign} disabled={!selectedOfficer || assignStatus === 'loading'} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#C81345] text-[13px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#A50F39] disabled:translate-y-0 disabled:opacity-40">
                    {assignStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                    {officer ? 'Reassign Sales Officer' : 'Assign Sales Officer'}
                  </button>
                </div>
              </section>
            )}

            <section className={card}>
              <Head title="Verification & Compliance" right={<span className={clsx('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase', statusMeta.cls)}>{statusMeta.label}</span>} />
              <ol className="space-y-2 px-5 pb-5">
                {[
                  { label: 'Profile created', date: vendor.createdAt, done: true },
                  { label: 'Profile completed', note: `${completeness}% of required fields`, done: missing.length === 0 },
                  { label: 'Submitted for verification', date: vendor.submitted_for_verification_at, done: !!vendor.submitted_for_verification_at || status === 'validated' },
                  status === 'rejected'
                    ? { label: 'Rejected', date: vendor.rejected_at, note: vendor.rejection_reason, done: true, bad: true }
                    : { label: 'Validated by admin', date: vendor.approved_at, done: status === 'validated' },
                ].map((step) => (
                  <li key={step.label} className="flex items-start gap-2.5 rounded-xl bg-[#F1F3FC] px-3 py-2.5 transition hover:bg-[#E9EBFA]">
                    {step.bad ? <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
                      : step.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                        : <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-300" />}
                    <div className="min-w-0">
                      <p className={clsx('text-[12.5px] font-bold', step.done ? 'text-neutral-900' : 'text-neutral-500')}>{step.label}</p>
                      {(step.date || step.note) && <p className="text-[11px] text-neutral-500">{[step.date ? formatDateTime(step.date) : null, step.note].filter(Boolean).join(' · ')}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title={confirmCopy[0]}
        confirmText={confirmCopy[1]}
        confirmVariant={confirmCopy[2]}
        description={confirmCopy[3]}
        note={confirmCopy[4]}
        loading={busy}
      />

      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </div>
  )
}
