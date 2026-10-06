import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  ArrowLeft, ArrowRightLeft, BadgeCheck, Calendar, CheckCircle2, Clock, Gauge, Loader2, Mail, MapPin, Pencil,
  Phone, Search, ShieldCheck, Store, Target, UserCheck, X,
} from 'lucide-react'
import Modal from '../components/Modal.jsx'
import Button from '../components/Button.jsx'
import { assignSalesOfficer, fetchSalesOfficerById } from '../store/salesSlice.js'
import { fetchVendors } from '../store/vendorsSlice.js'
import { fetchUsers } from '../store/usersSlice.js'
import { API_BASE_WITH_PATH } from '../lib/apiBase.js'
import { formatDateTime, formatNumber, formatRelativeTime } from '../utils/helpers.jsx'
import { pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js'
import { VENDOR_STATUS_META, flattenVendor, idOf, vendorStatus } from '../utils/vendorProfile.js'
import useSalesPortfolio, { inrCompact, portfolioRevenue } from '../hooks/useSalesPortfolio.js'

const PAGE_SIZE = 6
const card = 'rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_10px_28px_-18px_rgba(16,24,40,0.3)]'
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'

const TIER_PILL = {
  enterprise: 'bg-purple-100 text-[#8E35B5]',
  premium: 'bg-pink-100 text-[#C81345]',
  standard: 'bg-blue-100 text-blue-700',
  basic: 'bg-[#E9EBFA] text-neutral-700',
}

const Metric = ({ label, value, sub, icon: Icon, tone, bar }) => (
  <div className="group rounded-xl bg-[#F1F3FC] p-3.5 transition hover:-translate-y-0.5 hover:bg-[#E9EBFA]">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <Icon className={clsx('h-4 w-4 transition-transform group-hover:scale-110', tone)} />
    </div>
    <p className="mt-1 font-display text-[24px] font-extrabold leading-tight text-neutral-900">{value}</p>
    {bar !== undefined && (
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-[#E8194E] to-[#8E35B5]" style={{ width: `${Math.max(2, Math.min(100, bar))}%` }} /></div>
    )}
    {sub && <p className="mt-1 text-[10.5px] font-semibold text-neutral-500">{sub}</p>}
  </div>
)

export default function SalesOfficerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const token = useSelector((s) => s.auth.token)
  const { officerById, officerByIdStatus } = useSelector((s) => s.sales)
  const { officers, userById, vendorsByOfficer, purchases, purchasesByVendor, reload } = useSalesPortfolio()

  const [search, setSearch] = useState('')
  const [vendorStatusFilter, setVendorStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', username: '', email: '', phone: '' })
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [transferIds, setTransferIds] = useState(() => new Set())
  const [transferProgress, setTransferProgress] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => { if (id) dispatch(fetchSalesOfficerById(id)) }, [dispatch, id])

  const record = officerById?.[id] || officers.find((o) => String(o._id) === id) || null
  const account = userById.get(id) || record || {}
  const salesProfile = record?.sales_profile || {}
  const active = account.is_active !== false && !(account.ban_type && account.ban_type !== 'none')
  const name = record?.full_name || record?.username || 'Sales officer'
  const assigned = useMemo(() => vendorsByOfficer.get(id) || [], [vendorsByOfficer, id])
  const revenue = portfolioRevenue(assigned, purchasesByVendor)
  const validated = assigned.filter((v) => v.validated).length
  const pending = assigned.filter((v) => vendorStatus(v) === 'pending').length
  const target = Number(salesProfile.target) || 0
  const otherOfficers = officers.filter((o) => String(o._id) !== id)

  const vendorRows = useMemo(() => assigned.map((v) => {
    const flat = flattenVendor(v)
    const vendorPurchases = purchasesByVendor.get(String(v._id)) || []
    const now = Date.now()
    const activePkg = vendorPurchases
      .filter((p) => !p.expires_at || new Date(p.expires_at).getTime() > now)
      .sort((a, b) => new Date(b.purchased_at || b.createdAt) - new Date(a.purchased_at || a.createdAt))[0]
    return {
      id: String(v._id),
      userId: idOf(v.user_id) || idOf(v.user),
      name: flat.company_name || v.business_name || 'Vendor',
      code: `#VND-${String(v._id).slice(-5).toUpperCase()}`,
      logo: flat.logo_url ? toAbsoluteMediaUrl(flat.logo_url) : '',
      category: flat.industry_category || flat.industry || '',
      spend: vendorPurchases.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0),
      tier: activePkg?.package_snapshot?.tier || '',
      packageName: activePkg?.package_snapshot?.name || '',
      status: vendorStatus(v),
    }
  }), [assigned, purchasesByVendor])

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vendorRows.filter((r) => (!q || [r.name, r.code, r.category].some((v) => v.toLowerCase().includes(q)))
      && (vendorStatusFilter === 'all' || r.status === vendorStatusFilter))
      .sort((a, b) => b.spend - a.spend)
  }, [vendorRows, search, vendorStatusFilter])
  useEffect(() => { setPage(1) }, [search, vendorStatusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / PAGE_SIZE))
  const visibleVendors = filteredVendors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Real events from this officer's portfolio: validations, submissions, purchases.
  const activity = useMemo(() => {
    const events = []
    assigned.forEach((v) => {
      const vname = flattenVendor(v).company_name || v.business_name || 'Vendor'
      if (v.approved_at) events.push({ key: `a-${v._id}`, date: v.approved_at, tone: 'bg-emerald-500', title: `${vname} validated`, text: 'Vendor profile approved by an admin' })
      if (v.rejected_at) events.push({ key: `r-${v._id}`, date: v.rejected_at, tone: 'bg-rose-500', title: `${vname} rejected`, text: v.rejection_reason || 'Verification rejected' })
      if (v.submitted_for_verification_at) events.push({ key: `s-${v._id}`, date: v.submitted_for_verification_at, tone: 'bg-amber-500', title: `${vname} submitted for review`, text: 'Profile sent for verification' })
      ;(purchasesByVendor.get(String(v._id)) || []).forEach((p) => events.push({
        key: `p-${p._id}`, date: p.purchased_at || p.createdAt, tone: 'bg-[#E8194E]',
        title: `${vname} bought ${p.package_snapshot?.name || 'a package'}`, text: `${inrCompact(p.amount_paid)}${p.package_snapshot?.tier ? ` · ${p.package_snapshot.tier} tier` : ''}`,
      }))
    })
    return events.filter((e) => e.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6)
  }, [assigned, purchasesByVendor])

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 3000) }

  const patchUser = async (body) => {
    const res = await fetch(`${API_BASE_WITH_PATH}/users/${id}`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Update failed')
  }

  const toggleActive = async () => {
    setBusy(true)
    try {
      await patchUser({ is_active: !active })
      dispatch(fetchUsers())
      dispatch(fetchSalesOfficerById(id))
      showToast(active ? 'Officer suspended for 30 days' : 'Officer reactivated')
    } catch (e) { showToast(e.message, 'error') } finally { setBusy(false) }
  }

  const openEdit = () => {
    setForm({ full_name: record?.full_name || '', username: record?.username || '', email: record?.email || '', phone: record?.phone || '' })
    setFormError('')
    setEditOpen(true)
  }

  const saveEdit = async () => {
    const changes = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v !== (record?.[k] || '')))
    if (!Object.keys(changes).length) { setEditOpen(false); return }
    setBusy(true)
    try {
      await patchUser(changes)
      dispatch(fetchSalesOfficerById(id))
      reload()
      setEditOpen(false)
      showToast('Profile updated')
    } catch (e) { setFormError(e.message) } finally { setBusy(false) }
  }

  const openTransfer = () => {
    setTransferTo('')
    setTransferIds(new Set(vendorRows.map((r) => r.userId).filter(Boolean)))
    setTransferProgress(null)
    setTransferOpen(true)
  }

  const runTransfer = async () => {
    if (!transferTo || !transferIds.size) return
    const ids = [...transferIds]
    setTransferProgress({ done: 0, failed: 0, total: ids.length })
    let done = 0
    let failed = 0
    for (const vendorUserId of ids) {
      const res = await dispatch(assignSalesOfficer({ vendor_user_id: vendorUserId, sales_user_id: transferTo }))
      if (res.meta.requestStatus === 'fulfilled') done += 1; else failed += 1
      setTransferProgress({ done, failed, total: ids.length })
    }
    dispatch(fetchVendors())
    showToast(failed ? `Moved ${done}, ${failed} failed` : `Moved ${done} vendor${done === 1 ? '' : 's'}`, failed ? 'error' : 'success')
    setTransferOpen(false)
  }

  const loading = !record && officerByIdStatus?.[id] !== 'failed'
  const targetObj = officers.find((o) => String(o._id) === transferTo)

  return (
    <div className="mx-auto max-w-[1400px] pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate('/sales')} className="group inline-flex items-center gap-1.5 text-[13.5px] font-bold text-neutral-700 hover:text-[#C81345]">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Sales Officers
        </button>
        {record && (
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={openTransfer} disabled={!assigned.length || !otherOfficers.length} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">
              <ArrowRightLeft className="h-4 w-4" /> Reassign Vendors
            </button>
            <button type="button" onClick={openEdit} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#B3122F] px-4 text-[13px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#9A0F28]">
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
          </div>
        )}
      </div>

      {loading && <div className="flex flex-col items-center justify-center gap-4 py-24 text-neutral-400"><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm">Loading officer…</p></div>}
      {!loading && !record && <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center font-semibold text-red-600">Sales officer not found</div>}

      {record && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            <section className={clsx(card, 'p-5')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {record.avatar_url
                      ? <img src={toAbsoluteMediaUrl(record.avatar_url)} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                      : <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8E35B5] to-[#E8194E] text-[22px] font-bold text-white">{initials(name)}</span>}
                    {active && <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#E8194E] ring-2 ring-white"><BadgeCheck className="h-3.5 w-3.5 text-white" /></span>}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h1 className="font-display text-[24px] font-bold tracking-tight text-neutral-900">{name}</h1>
                      {record.username && <span className="text-[14px] font-semibold text-neutral-500">@{record.username}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-pink-100 px-2 py-0.5 text-[11px] font-bold text-[#C81345]">Sales Officer</span>
                      <span className={clsx('inline-flex items-center gap-1 text-[11.5px] font-bold', active ? 'text-emerald-600' : 'text-rose-600')}><span className={clsx('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-rose-500')} />{active ? 'Active Duty' : 'Suspended'}</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-neutral-500">ID: #SLS-{id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>
                {salesProfile.territory && (
                  <div className="rounded-xl bg-[#F1F3FC] px-4 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Territory</p>
                    <p className="text-[14px] font-bold text-neutral-900">{salesProfile.territory}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Mail, label: 'Email', value: record.email, href: record.email ? `mailto:${record.email}` : null },
                  { icon: Phone, label: 'Phone', value: record.phone, href: record.phone ? `tel:${record.phone}` : null },
                  { icon: MapPin, label: 'Base hub', value: record.location },
                  { icon: Calendar, label: 'Joined', value: record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '' },
                ].map((c) => (
                  <a key={c.label} href={c.href || undefined} className={clsx('flex min-w-0 items-center gap-2.5 rounded-xl bg-[#F1F3FC] px-3 py-2.5 transition hover:bg-[#E9EBFA]', !c.href && 'pointer-events-none')}>
                    <c.icon className="h-4 w-4 flex-shrink-0 text-[#6E72A8]" />
                    <span className="min-w-0"><span className="block text-[9.5px] font-bold uppercase tracking-wide text-neutral-600">{c.label}</span><span className="block truncate text-[12.5px] font-semibold text-neutral-900">{c.value || '—'}</span></span>
                  </a>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <Metric label="Assigned vendors" value={formatNumber(assigned.length)} icon={Store} tone="text-[#C81345]" sub={`${pending} pending review`} />
                <Metric label="Portfolio revenue" value={inrCompact(revenue.month)} icon={Gauge} tone="text-[#8E35B5]" sub={`${inrCompact(revenue.total)} all-time`} />
                <Metric label="Validated rate" value={`${validated} / ${assigned.length}`} icon={CheckCircle2} tone="text-emerald-600" bar={assigned.length ? (validated / assigned.length) * 100 : 0} sub={assigned.length ? `${Math.round((validated / assigned.length) * 100)}% fully validated` : 'No vendors yet'} />
                <Metric label="Packages sold" value={formatNumber(assigned.reduce((s, v) => s + (purchasesByVendor.get(String(v._id)) || []).length, 0))} icon={BadgeCheck} tone="text-orange-500" sub="by assigned vendors" />
              </div>
            </section>

            <section className={clsx(card, 'p-5')}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">This month</p>
                  <h2 className="font-display text-[16px] font-bold text-neutral-900">Sales target tracker</h2>
                </div>
                {target > 0 && <p className="text-right"><span className="block text-[20px] font-extrabold text-[#C81345]">{Math.round((revenue.month / target) * 100)}%</span><span className="text-[11px] text-neutral-500">of target</span></p>}
              </div>
              {target > 0 ? (
                <>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#EEF0FA]"><div className="h-full rounded-full bg-gradient-to-r from-[#E8194E] to-[#8E35B5] transition-all duration-700" style={{ width: `${Math.min(100, (revenue.month / target) * 100)}%` }} /></div>
                  <div className="mt-1.5 flex justify-between text-[11.5px] font-semibold text-neutral-600">
                    <span>Package revenue MTD: {inrCompact(revenue.month)}</span>
                    <span>Target: {inrCompact(target)}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-neutral-500">Target comes from the officer's sales profile; revenue is package billing from their assigned vendors.</p>
                </>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#F1F3FC] px-4 py-3">
                  <Target className="h-5 w-5 text-neutral-400" />
                  <p className="text-[12.5px] text-neutral-600">No target set. Officers set their target in their own sales profile. Package revenue this month: <b className="text-neutral-900">{inrCompact(revenue.month)}</b>.</p>
                </div>
              )}
            </section>

            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
                <div>
                  <h2 className="font-display text-[15px] font-bold text-neutral-900">Assigned Vendor Accounts ({assigned.length})</h2>
                  <p className="text-[11.5px] text-neutral-500">Sorted by package spend</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E72A8]" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assigned vendors…" className="h-9 w-56 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-8 pr-2 text-[12.5px] outline-none focus:border-primary/40 focus:bg-white" />
                  </div>
                  <select value={vendorStatusFilter} onChange={(e) => setVendorStatusFilter(e.target.value)} aria-label="Filter by status" className="h-9 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] px-2 text-[12.5px] font-semibold text-neutral-800 outline-none">
                    <option value="all">All status</option>
                    {Object.entries(VENDOR_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                      {['Vendor business', 'Category', 'Package spend', 'Package tier', 'Status'].map((h) => <th key={h} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visibleVendors.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-12 text-center text-[12.5px] text-neutral-400">{assigned.length ? 'No vendors match' : 'No vendors assigned to this officer'}</td></tr>
                    ) : visibleVendors.map((r) => {
                      const meta = VENDOR_STATUS_META[r.status]
                      return (
                        <tr key={r.id} onClick={() => navigate(`/vendors/${r.userId || r.id}`)} className="group cursor-pointer transition-colors hover:bg-[#FDF2F6]">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
                                {r.logo ? <img src={r.logo} alt="" className="h-full w-full object-cover" /> : <span className="text-[12px] font-bold text-[#C81345]">{r.name[0]}</span>}
                              </span>
                              <div className="min-w-0">
                                <p className="max-w-[200px] truncate text-[13px] font-bold text-neutral-900 group-hover:text-[#C81345]">{r.name}</p>
                                <p className="font-mono text-[10.5px] text-neutral-500">{r.code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-[140px] px-5 py-3 text-[12px] text-neutral-700">{r.category || '—'}</td>
                          <td className="px-5 py-3 text-[13px] font-bold text-neutral-900">{r.spend ? inrCompact(r.spend) : '—'}</td>
                          <td className="px-5 py-3">{r.tier ? <span title={r.packageName} className={clsx('rounded-md px-2 py-0.5 text-[10.5px] font-bold capitalize', TIER_PILL[r.tier] || TIER_PILL.basic)}>{r.tier}</span> : <span className="text-[11.5px] text-neutral-400">None</span>}</td>
                          <td className="px-5 py-3"><span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold', meta.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />{meta.label}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {filteredVendors.length > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
                  <p className="text-[11.5px] text-neutral-500">Showing {visibleVendors.length} of {filteredVendors.length} assigned accounts</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-2 py-1 text-[12px] font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-30">Previous</button>
                    {pageList(page, totalPages).map((p, i) => (p === '…' ? <span key={`g${i}`} className="px-1 text-neutral-400">…</span> : (
                      <button key={p} onClick={() => setPage(p)} className={clsx('h-7 min-w-[28px] rounded-lg text-[12px] font-semibold', p === page ? 'bg-[#E8194E] text-white' : 'text-neutral-700 hover:bg-neutral-100')}>{p}</button>
                    )))}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg px-2 py-1 text-[12px] font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-30">Next</button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-5 xl:sticky xl:top-[72px]">
            <section className={clsx(card, 'p-5')}>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">Operational control</p>
              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
                <span>
                  <span className="block text-[13.5px] font-bold text-neutral-900">Account active</span>
                  <span className="block text-[11.5px] text-neutral-500">{active ? 'Can sign in and receive vendor assignments' : `Suspended${account.ban_until ? ` until ${new Date(account.ban_until).toLocaleDateString()}` : ''}`}</span>
                </span>
                <span className="relative">
                  <input type="checkbox" checked={active} disabled={busy} onChange={toggleActive} className="peer sr-only" />
                  <span className="block h-6 w-11 rounded-full bg-neutral-300 transition peer-checked:bg-emerald-500 peer-disabled:opacity-50" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
              </label>
              <div className="mt-4 border-t border-neutral-100 pt-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">Territory coverage</p>
                <p className="mt-0.5 text-[13px] font-bold text-neutral-900">{salesProfile.territory || record.location || 'Not set'}</p>
                {salesProfile.bio && <p className="mt-1 text-[12px] leading-relaxed text-neutral-600">{salesProfile.bio}</p>}
              </div>
            </section>

            <section className={clsx(card, 'p-5')}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[15px] font-bold text-neutral-900">Recent Activity</h2>
                <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Portfolio</span>
              </div>
              {purchases.status === 'loading' && !activity.length ? <div className="mt-3 h-24 animate-pulse rounded-xl bg-neutral-100" /> : activity.length === 0 ? (
                <p className="mt-3 text-[12.5px] text-neutral-400">No activity in this officer's portfolio yet.</p>
              ) : (
                <ol className="mt-3 space-y-3 border-l-2 border-neutral-100 pl-4">
                  {activity.map((e) => (
                    <li key={e.key} className="relative">
                      <span className={clsx('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white', e.tone)} />
                      <p className="text-[12.5px] font-bold text-neutral-900">{e.title}</p>
                      <p className="text-[11.5px] text-neutral-600">{e.text}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-neutral-400"><Clock className="h-3 w-3" />{formatRelativeTime(e.date)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className={clsx(card, 'p-5')}>
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-neutral-900"><ArrowRightLeft className="h-4 w-4 text-[#C81345]" /> Desk Reassignment</h2>
              <p className="mt-1 text-[12px] text-neutral-600">Move {assigned.length ? `all ${assigned.length} vendors` : 'vendors'} to another sales officer, for example during leave.</p>
              <button type="button" onClick={openTransfer} disabled={!assigned.length || !otherOfficers.length} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-pink-200 bg-pink-50 text-[13px] font-bold text-[#C81345] transition hover:-translate-y-0.5 hover:bg-pink-100 disabled:opacity-50">
                <UserCheck className="h-4 w-4" /> Bulk Transfer Accounts
              </button>
            </section>
          </div>
        </div>
      )}

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit officer profile" description="Updates the officer's login account." footer={(
        <><Button variant="ghost" onClick={() => setEditOpen(false)} disabled={busy}>Cancel</Button><Button variant="primary" onClick={saveEdit} loading={busy}>Save changes</Button></>
      )}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[['full_name', 'Full name'], ['username', 'Username'], ['email', 'Email'], ['phone', 'Phone']].map(([k, l]) => (
            <div key={k}>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-neutral-600">{l}</label>
              <input value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/10" />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-neutral-500">Territory, bio and target are managed by the officer in their sales profile.</p>
        {formError && <p className="mt-2 text-[12.5px] font-semibold text-rose-600">{formError}</p>}
      </Modal>

      <Modal isOpen={transferOpen} onClose={() => !transferProgress && setTransferOpen(false)} title="Reassign vendors" description={`Move vendors from ${name} to another officer.`} size="lg" footer={(
        <><Button variant="ghost" onClick={() => setTransferOpen(false)} disabled={!!transferProgress}>Cancel</Button><Button variant="primary" onClick={runTransfer} disabled={!transferTo || !transferIds.size} loading={!!transferProgress}>Move {transferIds.size} vendor{transferIds.size === 1 ? '' : 's'}</Button></>
      )}>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-neutral-600">New sales officer</label>
        <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-primary/50">
          <option value="">Choose an officer…</option>
          {otherOfficers.map((o) => <option key={o._id} value={String(o._id)}>{o.full_name || o.username}{o.location ? ` · ${o.location}` : ''} ({(vendorsByOfficer.get(String(o._id)) || []).length} vendors)</option>)}
        </select>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-600">Vendors to move</p>
          <button type="button" onClick={() => setTransferIds((prev) => prev.size === vendorRows.length ? new Set() : new Set(vendorRows.map((r) => r.userId).filter(Boolean)))} className="text-[11.5px] font-bold text-[#C81345]">
            {transferIds.size === vendorRows.length ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-1.5">
          {vendorRows.map((r) => (
            <label key={r.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-neutral-50">
              <input type="checkbox" checked={transferIds.has(r.userId)} onChange={() => setTransferIds((prev) => { const n = new Set(prev); if (n.has(r.userId)) n.delete(r.userId); else n.add(r.userId); return n })} className="h-4 w-4 accent-[#E8194E]" />
              <span className="flex-1 truncate text-[13px] text-neutral-800">{r.name}</span>
              <span className={clsx('rounded px-1.5 text-[10px] font-bold', VENDOR_STATUS_META[r.status].cls)}>{VENDOR_STATUS_META[r.status].label}</span>
            </label>
          ))}
        </div>
        {transferProgress && <p className="mt-3 text-[12.5px] text-neutral-600">Moving… {transferProgress.done + transferProgress.failed} / {transferProgress.total}{targetObj ? ` to ${targetObj.full_name || targetObj.username}` : ''}</p>}
      </Modal>

      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </div>
  )
}
