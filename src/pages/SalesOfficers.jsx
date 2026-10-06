import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  AtSign, ChevronDown, Download, Eye, EyeOff, Info, ListFilter, Lock, Mail, MapPin, MoreVertical, Phone, Plus,
  RotateCw, Search, ShieldAlert, ShieldCheck, Store, TrendingUp, User, UserPlus, Users, Wifi, X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/Modal.jsx';
import { clearCreateError, createSalesOfficer, fetchSalesOfficers } from '../store/salesSlice.js';
import { toggleUserActive } from '../store/usersSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { downloadCsv, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import useSalesPortfolio, { inrCompact, portfolioRevenue } from '../hooks/useSalesPortfolio.js';

const PAGE_SIZE = 8;

const SORT_OPTIONS = [
  { value: 'accounts', label: 'Assigned Accounts' },
  { value: 'revenue', label: 'Revenue (MTD)' },
  { value: 'name', label: 'Name' },
];

const Select = ({ value, options, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 min-w-[130px] items-center justify-between gap-2 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] px-3 text-[12.5px] text-neutral-700 transition hover:border-[#C9CFEC] hover:bg-[#E9EBFA]">
        <span className="font-semibold text-neutral-900">{label ? `${selected?.label}` : selected?.label}</span>
        {label ? <ListFilter className="h-3.5 w-3.5 text-neutral-500" /> : <ChevronDown className={clsx('h-3.5 w-3.5 text-neutral-500 transition-transform', open && 'rotate-180')} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 max-h-72 min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((o) => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={clsx('block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition', o.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50')}>{o.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, iconTone, foot, hoverTone }) => (
  <div className={clsx('group rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1', hoverTone)}>
    <div className="flex items-start justify-between gap-2">
      <p className="pt-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}><Icon className="h-[18px] w-[18px]" /></span>
    </div>
    <p className="mt-3 font-display text-[28px] font-extrabold leading-none tracking-tight text-neutral-900">{value}</p>
    <p className="mt-2 text-[11.5px] text-neutral-500">{foot}</p>
  </div>
);

const Avatar = ({ src, name, size = 'h-9 w-9' }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className={clsx(size, 'flex-shrink-0 rounded-full object-cover')} />;
  return <span className={clsx(size, 'flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8E35B5] to-[#E8194E] text-[11px] font-bold text-white')}>{String(name || '?').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</span>;
};

const RowMenu = ({ row, onView, onToggle }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-label={`Actions for ${row.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-[#EEF0FA] hover:text-neutral-900"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"><Eye className="h-3.5 w-3.5 text-neutral-400" /> View officer</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
              {row.active ? <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}{row.active ? 'Suspend account' : 'Reactivate account'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const EMPTY_OFFICER = { full_name: '', username: '', email: '', phone: '', location: '', password: '' };

export const AddOfficerModal = ({ open, onClose, locations, onCreated }) => {
  const dispatch = useDispatch();
  const { createStatus, createError } = useSelector((s) => s.sales);
  const [form, setForm] = useState(EMPTY_OFFICER);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  if (!open) return null;

  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: key === 'username' ? e.target.value.replace(/^@/, '').replace(/\s+/g, '_') : e.target.value }));
  const close = () => { dispatch(clearCreateError()); setForm(EMPTY_OFFICER); setLocalError(''); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (form.password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    const res = await dispatch(createSalesOfficer(payload));
    if (res.meta.requestStatus === 'fulfilled') { onCreated?.(form.full_name || form.username); close(); }
  };

  const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-neutral-700';
  const shell = 'flex h-11 items-center gap-2 rounded-xl border border-transparent bg-[#F1F3FC] px-3.5 transition focus-within:border-[#E8194E]/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#E8194E]/10';
  const input = 'h-full w-full bg-transparent text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative w-full max-w-[560px] overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-[#E8194E] to-[#8E35B5]" />
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[19px] font-bold text-neutral-900"><UserPlus className="h-5 w-5 text-[#C81345]" /> Add Sales Officer</h2>
            <p className="text-[12.5px] text-neutral-500">Create a new sales representative account and set their region.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-6 pb-5">
          {(localError || createError) && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">{localError || createError}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={label}>Full name <span className="text-rose-500">*</span></label><div className={shell}><User className="h-4 w-4 text-neutral-400" /><input required value={form.full_name} onChange={set('full_name')} placeholder="Anand Verma" className={input} /></div></div>
            <div><label className={label}>Username <span className="text-rose-500">*</span></label><div className={shell}><AtSign className="h-4 w-4 text-neutral-400" /><input required value={form.username} onChange={set('username')} placeholder="anand_sales" className={input} /></div></div>
            <div><label className={label}>Email address <span className="text-rose-500">*</span></label><div className={shell}><Mail className="h-4 w-4 text-neutral-400" /><input required type="email" value={form.email} onChange={set('email')} placeholder="anand.v@company.com" className={input} /></div></div>
            <div><label className={label}>Phone number</label><div className={shell}><Phone className="h-4 w-4 text-neutral-400" /><input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className={input} /></div></div>
            <div>
              <label className={label}>Region / location</label>
              <div className={shell}><MapPin className="h-4 w-4 text-neutral-400" /><input list="sales-regions" value={form.location} onChange={set('location')} placeholder="Mumbai (West Zone)" className={input} /></div>
              <datalist id="sales-regions">{locations.map((l) => <option key={l} value={l} />)}</datalist>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between"><label className="text-[11px] font-bold uppercase tracking-wide text-neutral-700">Password <span className="text-rose-500">*</span></label><span className="text-[10.5px] font-semibold text-neutral-500">Min 6 chars</span></div>
              <div className={shell}>
                <Lock className="h-4 w-4 text-neutral-400" />
                <input required type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="••••••••" className={input} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-neutral-400 hover:text-neutral-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-[#E4E7F5] bg-[#F6F7FD] px-4 py-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-pink-100 text-[#C81345]"><ShieldCheck className="h-4 w-4" /></span>
            <div>
              <p className="text-[13.5px] font-bold text-neutral-900">Active on creation</p>
              <p className="text-[11.5px] text-neutral-500">The officer can sign in to the Sales CRM workspace straight away and be assigned vendors.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-6 py-4">
          <p className="flex items-center gap-1.5 text-[11.5px] text-neutral-500"><Info className="h-3.5 w-3.5" /> Share the login details with the officer securely.</p>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={close} className="h-10 rounded-xl border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-800 transition hover:bg-neutral-50">Cancel</button>
            <button type="submit" disabled={createStatus === 'loading'} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:opacity-60">
              <Plus className="h-4 w-4" />{createStatus === 'loading' ? 'Creating…' : 'Add Sales Officer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const SalesOfficers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { officers, officersStatus, officersError, vendors, userById, vendorsByOfficer, purchasesByVendor, reload } = useSalesPortfolio();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('accounts');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const rows = useMemo(() => officers.map((officer) => {
    const id = String(officer._id || officer.id);
    const account = userById.get(id) || {};
    const assigned = vendorsByOfficer.get(id) || [];
    const validated = assigned.filter((v) => v.validated).length;
    const revenue = portfolioRevenue(assigned, purchasesByVendor);
    return {
      id,
      name: officer.full_name || officer.username || 'Sales Officer',
      username: officer.username || '',
      email: officer.email || '',
      phone: officer.phone || '',
      location: officer.location || '',
      avatar: officer.avatar_url ? toAbsoluteMediaUrl(officer.avatar_url) : '',
      active: account.is_active !== false && !(account.ban_type && account.ban_type !== 'none'),
      assigned: assigned.length,
      validated,
      validatedPct: assigned.length ? (validated / assigned.length) * 100 : 0,
      revenueMonth: revenue.month,
      revenueTotal: revenue.total,
      joined: officer.createdAt,
    };
  }), [officers, userById, vendorsByOfficer, purchasesByVendor]);

  const regions = useMemo(() => [...new Set(rows.map((r) => r.location).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, '');
    const list = rows.filter((r) => {
      if (q && ![r.name, r.username, r.email, r.phone, r.location].some((v) => String(v).toLowerCase().includes(q))) return false;
      if (region !== 'all' && r.location !== region) return false;
      if (statusFilter === 'active' && !r.active) return false;
      if (statusFilter === 'suspended' && r.active) return false;
      return true;
    });
    const by = { accounts: (a, b) => b.assigned - a.assigned, revenue: (a, b) => b.revenueMonth - a.revenueMonth, name: (a, b) => a.name.localeCompare(b.name) };
    return list.sort(by[sort]);
  }, [rows, search, region, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const assigned = rows.reduce((s, r) => s + r.assigned, 0);
    return {
      total: rows.length,
      active: rows.filter((r) => r.active).length,
      assigned,
      coverage: vendors.length ? (assigned / vendors.length) * 100 : 0,
      unassigned: Math.max(0, vendors.length - assigned),
      perRep: rows.length ? assigned / rows.length : 0,
    };
  }, [rows, vendors.length]);

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2800); };

  const runToggle = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await dispatch(toggleUserActive({ id: confirm.id, is_active: !confirm.active })).unwrap();
      showToast(confirm.active ? 'Officer suspended' : 'Officer reactivated');
    } catch (e) {
      showToast(typeof e === 'string' ? e : 'Update failed', 'error');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const exportRoster = () => downloadCsv(`sales-officers-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['ID', 'Name', 'Username', 'Email', 'Phone', 'Region', 'Assigned vendors', 'Validated vendors', 'Revenue this month (INR)', 'Status'],
    ...filtered.map((r) => [r.id, r.name, r.username, r.email, r.phone, r.location, r.assigned, r.validated, Math.round(r.revenueMonth), r.active ? 'Active' : 'Suspended']),
  ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#E8194E]">Sales Operations</p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Sales Officers</h1>
            <p className="mt-0.5 text-[13.5px] text-neutral-500">Manage sales officers, contact details, and vendor assignment coverage.</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <button type="button" onClick={exportRoster} disabled={!filtered.length} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13.5px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><Download className="h-4 w-4" /> Export Roster</button>
            <button type="button" onClick={() => setModalOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105"><UserPlus className="h-4 w-4" /> Add Sales Officer</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Officers" value={formatNumber(stats.total)} icon={Users} iconTone="bg-indigo-50 text-indigo-600" foot={`Sales team across ${regions.length} region${regions.length === 1 ? '' : 's'}`} hoverTone="hover:border-indigo-200 hover:shadow-[0_14px_30px_-14px_rgba(99,102,241,0.4)]" />
          <StatCard label="Active Duty" value={formatNumber(stats.active)} icon={Wifi} iconTone="bg-pink-100 text-[#C81345]" foot={stats.total - stats.active ? `${stats.total - stats.active} suspended account${stats.total - stats.active === 1 ? '' : 's'}` : 'All accounts active'} hoverTone="hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.45)]" />
          <StatCard label="Assigned Vendors" value={formatNumber(stats.assigned)} icon={Store} iconTone="bg-purple-100 text-[#8E35B5]" foot={`${stats.coverage.toFixed(1)}% portfolio coverage · ${formatNumber(stats.unassigned)} unassigned`} hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]" />
          <StatCard label="Avg Accounts / Rep" value={stats.perRep >= 10 ? Math.round(stats.perRep) : stats.perRep.toFixed(1)} icon={TrendingUp} iconTone="bg-rose-100 text-rose-600" foot="Assigned vendors per officer" hoverTone="hover:border-rose-200 hover:shadow-[0_14px_30px_-14px_rgba(225,29,72,0.45)]" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E72A8]" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search officers by name, email, phone, or location…" className="h-10 w-full rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-9 pr-3 text-[13px] text-neutral-800 placeholder-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10" />
            </div>
            <Select value={region} onChange={(v) => { setRegion(v); setPage(1); }} options={[{ value: 'all', label: 'All Regions' }, ...regions.map((r) => ({ value: r, label: r }))]} />
            <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
            <Select label value={sort} onChange={setSort} options={SORT_OPTIONS} />
            <button type="button" onClick={reload} title="Refresh" aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-neutral-700 transition hover:bg-[#E9EBFA]"><RotateCw className={clsx('h-4 w-4', officersStatus === 'loading' && 'animate-spin')} /></button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  {['Officer', 'Email', 'Phone', 'Region / Location', 'Assigned Vendors', 'Revenue (MTD)', 'Status'].map((h) => <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>)}
                  <th className="w-16 px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {officersStatus === 'loading' && !rows.length ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading sales officers…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><Users className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{officersError ? `Error: ${officersError}` : 'No sales officers found'}</p></td></tr>
                ) : visible.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/sales/${row.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', !row.active && 'opacity-75')}>
                    <td className="border-l-2 border-transparent px-4 py-3 transition-colors group-hover:border-[#E8194E]">
                      <div className="flex items-center gap-3">
                        <Avatar src={row.avatar} name={row.name} />
                        <div className="min-w-0">
                          <p className="max-w-[150px] truncate text-[13.5px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">{row.name}</p>
                          {row.username && <p className="max-w-[150px] truncate text-[11.5px] text-neutral-500">@{row.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-[12.5px] text-neutral-600">{row.email || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px] text-neutral-700">{row.phone || '—'}</td>
                    <td className="px-4 py-3">{row.location ? <span className="rounded-md bg-[#E9EBFA] px-2 py-0.5 text-[11.5px] font-semibold text-neutral-800">{row.location}</span> : <span className="text-[12px] text-neutral-400">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3 text-[11.5px]">
                        <span className="font-bold text-neutral-900">{row.assigned} vendor{row.assigned === 1 ? '' : 's'}</span>
                        {row.assigned > 0 && <span className="font-semibold text-neutral-500">{Math.round(row.validatedPct)}% validated</span>}
                      </div>
                      <div className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-[#EEF0FA]">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#E8194E] to-[#8E35B5]" style={{ width: `${row.assigned ? Math.max(4, row.validatedPct) : 0}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13.5px] font-extrabold text-neutral-900">{inrCompact(row.revenueMonth)}</p>
                      {row.revenueTotal > row.revenueMonth && <p className="text-[10.5px] text-neutral-500">{inrCompact(row.revenueTotal)} all-time</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', row.active ? 'bg-pink-50 text-[#C81345]' : 'bg-neutral-100 text-neutral-600')}>
                        <span className={clsx('h-1.5 w-1.5 rounded-full', row.active ? 'bg-[#E8194E]' : 'bg-neutral-400')} />{row.active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><RowMenu row={row} onView={() => navigate(`/sales/${row.id}`)} onToggle={() => setConfirm(row)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-neutral-500">Showing <span className="font-semibold text-neutral-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of {formatNumber(filtered.length)} officers · revenue = package billing from assigned vendors</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
                {pageList(page, totalPages).map((p, i) => (p === '…' ? <span key={`gap-${i}`} className="px-1 text-[12px] text-neutral-400">…</span> : (
                  <button key={p} onClick={() => setPage(p)} className={clsx('h-8 min-w-[32px] rounded-lg px-2 text-[12.5px] font-semibold transition', p === page ? 'bg-[#E8194E] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'text-neutral-700 hover:bg-neutral-100')}>{p}</button>
                )))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddOfficerModal open={modalOpen} onClose={() => setModalOpen(false)} locations={regions} onCreated={(name) => { showToast(`${name} added`); dispatch(fetchSalesOfficers()); }} />
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runToggle}
        title={confirm?.active ? 'Suspend sales officer' : 'Reactivate sales officer'}
        description={confirm?.active ? `${confirm?.name} won't be able to sign in. A suspension lasts 30 days unless lifted.` : `Restore ${confirm?.name}'s access to the Sales CRM.`}
        confirmText={confirm?.active ? 'Suspend' : 'Reactivate'}
        confirmVariant={confirm?.active ? 'danger' : 'primary'}
        note="You can reverse this at any time."
        loading={busy}
      />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
};

export default SalesOfficers;
