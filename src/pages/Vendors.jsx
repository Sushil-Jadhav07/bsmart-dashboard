import React, { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  BadgeCheck, Briefcase, CheckCircle2, ChevronDown, ClipboardCheck, Download, Eye, Hourglass, ListChecks,
  MoreVertical, RotateCw, Search, ShieldOff, SlidersHorizontal, Store, Trash2, TrendingDown, TrendingUp,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/Modal.jsx';
import { deleteVendorById, fetchVendors, processVendorProfile, setVendorValidatedOptimistic } from '../store/vendorsSlice.js';
import { fetchUsers } from '../store/usersSlice.js';
import { fetchSalesOfficers } from '../store/salesSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, growthOf, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import { VENDOR_STATUS_META, flattenVendor, idOf, missingVendorFields, vendorCompleteness, vendorStatus } from '../utils/vendorProfile.js';

const PAGE_SIZE = 8;

const VALIDATION_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'validated', label: 'Validated' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'draft', label: 'Not Validated' },
  { value: 'rejected', label: 'Rejected' },
];

const PROFILE_OPTIONS = [
  { value: 'all', label: 'All Profiles' },
  { value: 'complete', label: 'Complete' },
  { value: 'incomplete', label: 'Incomplete' },
];

const Select = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] px-3 text-[12.5px] text-neutral-600 transition hover:border-[#C9CFEC] hover:bg-[#E9EBFA]">
        {label}: <span className="max-w-[140px] truncate font-bold text-neutral-900">{selected?.label}</span>
        <ChevronDown className={clsx('h-3.5 w-3.5 text-neutral-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 max-h-72 min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((o) => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={clsx('block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition', o.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50')}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value, valueClass, icon: Icon, iconTone, foot, hoverTone }) => (
  <div className={clsx('group rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1', hoverTone)}>
    <div className="flex items-start justify-between gap-2">
      <p className="pt-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
    </div>
    <p className={clsx('mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight', valueClass || 'text-neutral-900')}>{value}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-neutral-500">{foot}</div>
  </div>
);

const Logo = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <span className="text-[13px] font-bold text-[#C81345]">{String(name || '?')[0]?.toUpperCase()}</span>}
    </div>
  );
};

const Avatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />;
  return <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-white">{String(name || '?')[0]?.toUpperCase()}</span>;
};

const RowMenu = ({ row, onView, onToggle, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-label={`Actions for ${row.business}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-[#EEF0FA] hover:text-neutral-900">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"><Eye className="h-3.5 w-3.5 text-neutral-400" /> Inspect vendor</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
              {row.validated ? <ShieldOff className="h-3.5 w-3.5 text-amber-500" /> : <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />}
              {row.validated ? 'Revoke validation' : 'Mark as validated'}
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete vendor</button>
          </div>
        </>
      )}
    </div>
  );
};

const Vendors = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status, error, updating } = useSelector((state) => state.vendors);
  const { items: allUsers = [], status: usersStatus } = useSelector((state) => state.users);
  const { officers = [], officersStatus } = useSelector((state) => state.sales);
  const authUser = useSelector((state) => state.auth.user);
  const isAdmin = String(authUser?.role || '').toLowerCase() === 'admin';

  const [search, setSearch] = useState('');
  const [validation, setValidation] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { dispatch(fetchVendors()); }, [dispatch]);
  useEffect(() => { if (usersStatus === 'idle') dispatch(fetchUsers()); }, [dispatch, usersStatus]);
  useEffect(() => { if (officersStatus === 'idle') dispatch(fetchSalesOfficers()); }, [dispatch, officersStatus]);

  const usersById = useMemo(() => {
    const map = new Map();
    (allUsers || []).forEach((u) => { const base = u?.user || u || {}; if (base._id) map.set(String(base._id), base); });
    return map;
  }, [allUsers]);

  const officerNames = useMemo(() => new Map(officers.map((o) => [String(o._id || o.id), o.full_name || o.username || 'Officer'])), [officers]);

  const rows = useMemo(() => (items || []).map((vendor) => {
    const owner = vendor.user || vendor.user_id || {};
    const userId = idOf(owner) || idOf(vendor.user_id);
    const enriched = usersById.get(userId) || {};
    const flat = flattenVendor(vendor);
    const missing = missingVendorFields(vendor);
    const officerId = idOf(vendor.assigned_sales_officer);
    return {
      vendorId: String(vendor._id),
      userId,
      business: flat.company_name || vendor.business_name || 'Vendor',
      username: owner.username || enriched.username || '',
      owner: owner.full_name || enriched.full_name || owner.username || '—',
      ownerAvatar: owner.avatar_url ? toAbsoluteMediaUrl(owner.avatar_url) : '',
      logo: flat.logo_url ? toAbsoluteMediaUrl(flat.logo_url) : '',
      phone: flat.business_phone || owner.phone || enriched.phone || '',
      email: flat.business_email || enriched.email || '',
      taxId: flat.tax_id,
      category: flat.industry_category || flat.industry || '',
      complete: missing.length === 0,
      completeness: vendorCompleteness(vendor),
      status: vendorStatus(vendor),
      validated: !!vendor.validated,
      officerId,
      officer: officerId ? (officerNames.get(officerId) || 'Assigned') : '',
      submittedAt: vendor.submitted_for_verification_at,
      createdAt: vendor.createdAt,
    };
  }), [items, usersById, officerNames]);

  const categoryOptions = useMemo(() => {
    const names = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return [{ value: 'all', label: 'All Industries' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, '');
    return rows.filter((r) => {
      if (q && ![r.business, r.username, r.owner, r.phone, r.email, r.taxId, r.category].some((v) => String(v || '').toLowerCase().includes(q))) return false;
      if (validation !== 'all' && r.status !== validation) return false;
      if (profileFilter === 'complete' && !r.complete) return false;
      if (profileFilter === 'incomplete' && r.complete) return false;
      if (category !== 'all' && r.category !== category) return false;
      return true;
    }).sort((a, b) => (Number(b.status === 'pending') - Number(a.status === 'pending')) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  }, [rows, search, validation, profileFilter, category]);

  useEffect(() => { setPage(1); }, [search, validation, profileFilter, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const validated = rows.filter((r) => r.validated).length;
    const pending = rows.filter((r) => r.status === 'pending');
    const waits = pending.map((r) => (Date.now() - new Date(r.submittedAt || r.createdAt).getTime()) / 3600000).filter((h) => h >= 0);
    const avgWait = waits.length ? waits.reduce((s, h) => s + h, 0) / waits.length : null;
    const complete = rows.filter((r) => r.complete).length;
    const avgCompleteness = rows.length ? rows.reduce((s, r) => s + r.completeness, 0) / rows.length : 0;
    return {
      total: rows.length,
      growth: growthOf(rows, (r) => r.createdAt),
      validated,
      ratio: rows.length ? (validated / rows.length) * 100 : 0,
      pending: pending.length,
      avgWait,
      complete,
      avgCompleteness,
      unassigned: rows.filter((r) => !r.officerId).length,
    };
  }, [rows]);

  const waitLabel = (h) => (h === null ? '' : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2800); };

  const toggleValidation = async (row) => {
    if (!isAdmin || updating?.[row.vendorId]) return;
    if (!row.validated && !row.complete) { showToast('Profile is incomplete. Open the vendor to see what is missing.', 'error'); return; }
    const action = row.validated ? 'reject' : 'approve';
    dispatch(setVendorValidatedOptimistic({ id: row.vendorId, validated: !row.validated }));
    try {
      await dispatch(processVendorProfile({ id: row.userId, action, rejection_reason: action === 'reject' ? 'Validation revoked by admin' : undefined })).unwrap();
      showToast(row.validated ? 'Validation revoked' : 'Vendor validated');
    } catch (e) {
      dispatch(setVendorValidatedOptimistic({ id: row.vendorId, validated: row.validated }));
      showToast(typeof e === 'string' ? e : 'Update failed', 'error');
    }
  };

  const exportDirectory = () => downloadCsv(`vendors-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Vendor ID', 'Business', 'Username', 'Owner', 'Phone', 'Email', 'Tax ID', 'Industry', 'Status', 'Profile %', 'Sales officer', 'Registered'],
    ...filtered.map((r) => [r.vendorId, r.business, r.username, r.owner, r.phone, r.email, r.taxId, r.category, VENDOR_STATUS_META[r.status].label, r.completeness, r.officer || 'Unassigned', r.createdAt]),
  ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#E8194E]">Vendor Operations</p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Vendors</h1>
            <p className="mt-0.5 text-[13.5px] text-neutral-500">Validate vendor readiness, inspect profiles, and manage vendor access from a premium review queue.</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <button type="button" onClick={exportDirectory} disabled={!filtered.length} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13.5px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0">
              <Download className="h-4 w-4" /> Export Directory
            </button>
            <button type="button" onClick={() => setValidation('pending')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105">
              <ListChecks className="h-4 w-4" /> Review Queue <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-bold">{stats.pending}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Registered"
            value={formatNumber(stats.total)}
            icon={Store}
            iconTone="bg-purple-100 text-[#8E35B5]"
            foot={stats.growth === null ? 'Vendor accounts' : (
              <span className="inline-flex items-center gap-1">
                <span className={clsx('inline-flex items-center gap-0.5 font-bold', stats.growth >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {stats.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                </span> vs last 30 days
              </span>
            )}
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
          />
          <StatCard
            label="Validated Accounts"
            value={formatNumber(stats.validated)}
            icon={CheckCircle2}
            iconTone="bg-emerald-100 text-emerald-600"
            foot={<><span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">{stats.ratio.toFixed(1)}% ratio</span> operational</>}
            hoverTone="hover:border-emerald-200 hover:shadow-[0_14px_30px_-14px_rgba(16,185,129,0.45)]"
          />
          <StatCard
            label="Pending Review"
            value={formatNumber(stats.pending)}
            valueClass="text-[#C81345]"
            icon={Hourglass}
            iconTone="bg-rose-100 text-rose-600"
            foot={stats.pending
              ? <><span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-700">Action needed</span>{stats.avgWait !== null && `Avg wait ${waitLabel(stats.avgWait)}`}</>
              : 'Queue is clear'}
            hoverTone="hover:border-rose-200 hover:shadow-[0_14px_30px_-14px_rgba(225,29,72,0.45)]"
          />
          <StatCard
            label="Profile Complete"
            value={formatNumber(stats.complete)}
            icon={ClipboardCheck}
            iconTone="bg-indigo-50 text-indigo-600"
            foot={<><span className="rounded-full bg-[#E9EBFA] px-2 py-0.5 font-bold text-neutral-700">{Math.round(stats.avgCompleteness)}%</span> avg profile completeness</>}
            hoverTone="hover:border-indigo-200 hover:shadow-[0_14px_30px_-14px_rgba(99,102,241,0.4)]"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E72A8]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors, owner, GST / tax ID, phone or email" className="h-10 w-full rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-9 pr-3 text-[13px] text-neutral-800 placeholder-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10" />
            </div>
            <Select label="Validation" value={validation} options={VALIDATION_OPTIONS} onChange={setValidation} />
            <Select label="Profile" value={profileFilter} options={PROFILE_OPTIONS} onChange={setProfileFilter} />
            <Select label="Category" value={category} options={categoryOptions} onChange={setCategory} />
            {(search || validation !== 'all' || profileFilter !== 'all' || category !== 'all') && (
              <button type="button" onClick={() => { setSearch(''); setValidation('all'); setProfileFilter('all'); setCategory('all'); }} title="Clear filters" aria-label="Clear filters" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-[#C81345] transition hover:bg-pink-50">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => dispatch(fetchVendors())} title="Refresh" aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-neutral-700 transition hover:bg-[#E9EBFA]">
              <RotateCw className={clsx('h-4 w-4', status === 'loading' && 'animate-spin')} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  {['Business', 'Owner', 'Phone', 'Role', 'Profile', 'Status', 'Sales Officer'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>
                  ))}
                  <th className="w-16 px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading vendors…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><Briefcase className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{error ? `Error: ${error}` : 'No vendors found'}</p></td></tr>
                ) : visible.map((row) => {
                  const meta = VENDOR_STATUS_META[row.status];
                  return (
                    <tr key={row.vendorId} onClick={() => navigate(`/vendors/${row.userId || row.vendorId}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', row.status === 'pending' && 'bg-amber-50/30')}>
                      <td className="border-l-2 border-transparent px-4 py-3 transition-colors group-hover:border-[#E8194E]">
                        <div className="flex items-center gap-3">
                          <Logo src={row.logo} name={row.business} />
                          <div className="min-w-0">
                            <p className="max-w-[170px] truncate text-[13.5px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">{row.business}</p>
                            {row.username && <p className="max-w-[170px] truncate text-[11.5px] text-neutral-500">@{row.username}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={row.ownerAvatar} name={row.owner} />
                          <p className="max-w-[120px] text-[13px] font-medium leading-tight text-neutral-800">{row.owner}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-neutral-700">{row.phone || '—'}</td>
                      <td className="px-4 py-3"><span className="rounded-md bg-pink-100 px-2 py-0.5 text-[11px] font-bold text-[#C81345]">Vendor</span></td>
                      <td className="px-4 py-3">
                        <span title={`${row.completeness}% complete`} className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', row.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                          <span className={clsx('h-1.5 w-1.5 rounded-full', row.complete ? 'bg-emerald-500' : 'bg-amber-500')} />
                          {row.complete ? 'Complete' : `Incomplete · ${row.completeness}%`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', meta.cls)}>
                          {row.status === 'validated' ? <CheckCircle2 className="h-3 w-3" /> : <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.officer
                          ? <span className="rounded-md bg-[#E9EBFA] px-2 py-0.5 text-[11.5px] font-semibold text-[#4B4F8A]">{row.officer}</span>
                          : <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11.5px] font-semibold text-[#C81345]">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        <RowMenu
                          row={row}
                          onView={() => navigate(`/vendors/${row.userId || row.vendorId}`)}
                          onToggle={() => toggleValidation(row)}
                          onDelete={() => setConfirm(row)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-neutral-500">
                Showing <span className="font-semibold text-[#C81345]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-neutral-800">{formatNumber(filtered.length)}</span> vendors
                {stats.unassigned > 0 && <span className="ml-2 text-neutral-400">· {stats.unassigned} without a sales officer</span>}
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
                {pageList(page, totalPages).map((p, i) => (p === '…' ? <span key={`gap-${i}`} className="px-1 text-[12px] text-neutral-400">…</span> : (
                  <button key={p} onClick={() => setPage(p)} className={clsx('h-8 min-w-[32px] rounded-lg px-2 text-[12.5px] font-semibold transition', p === page ? 'bg-[#E8194E] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'text-neutral-700 hover:bg-neutral-100')}>{formatNumber(p)}</button>
                )))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { if (!confirm) return; dispatch(deleteVendorById(confirm.vendorId)).finally(() => setConfirm(null)); }}
        title="Delete Vendor"
        description={`Delete ${confirm?.business || 'this vendor'}? Their vendor profile will be removed.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Vendors;
