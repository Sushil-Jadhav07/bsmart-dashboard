import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  Download,
  Eye,
  ListChecks,
  ListFilter,
  MoreVertical,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users as UsersIcon,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import { fetchUsers, deleteUserById, toggleUserActive } from '../store/usersSlice.js';
import { fetchAllWallets } from '../store/walletSlice.js';
import { ConfirmModal } from '../components/Modal.jsx';
import { formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, growthOf, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const PAGE_SIZE = 10;

const ROLE_META = {
  admin: { label: 'Admin', cls: 'bg-[#1F2340] text-white' },
  influencer: { label: 'Influencer', cls: 'bg-pink-100 text-[#C81345]' },
  vendor: { label: 'Vendor', cls: 'bg-purple-100 text-[#8E35B5]' },
  sales: { label: 'Sales', cls: 'bg-blue-100 text-blue-700' },
  member: { label: 'Member', cls: 'bg-[#E9EBFA] text-neutral-700' },
};

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  ...Object.entries(ROLE_META).map(([value, meta]) => ({ value, label: meta.label })),
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

const SORT_OPTIONS = [
  { value: 'joined', label: 'Joined Date' },
  { value: 'name', label: 'Name' },
  { value: 'balance', label: 'Balance' },
];

const normalizeRole = (value) => {
  const key = String(value || '').toLowerCase();
  if (key.includes('admin')) return 'admin';
  if (key.includes('influencer')) return 'influencer';
  if (key.includes('vendor')) return 'vendor';
  if (key.includes('sales')) return 'sales';
  return 'member';
};

const walletUserId = (tx) => {
  const ref = tx.user_id || tx.user;
  if (ref && typeof ref === 'object') return String(ref._id || ref.id || '');
  return ref ? String(ref) : '';
};

const LabeledSelect = ({ label, value, options, onChange, icon: Icon = ChevronDown }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] px-3 text-[13px] text-neutral-600 transition hover:border-[#C9CFEC] hover:bg-[#E9EBFA]"
      >
        {label}: <span className="font-bold text-neutral-900">{selected?.label}</span>
        <Icon className={clsx('h-3.5 w-3.5 text-neutral-500 transition-transform', open && Icon === ChevronDown && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 min-w-full overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={clsx('block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition', o.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50')}
              >
                {o.label}
              </button>
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
      <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', iconTone)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
    </div>
    <p className="mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight text-neutral-900">{value}</p>
    <div className="mt-2.5 text-[11.5px] text-neutral-500">{foot}</div>
  </div>
);

const Growth = ({ value, suffix, tone = 'pink' }) => {
  if (value === null || !Number.isFinite(value)) return <span>{suffix}</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={clsx('inline-flex items-center gap-0.5 font-bold', up ? (tone === 'purple' ? 'text-[#8E35B5]' : 'text-[#E8194E]') : 'text-rose-700')}>
        <Icon className="h-3 w-3" />{up ? '+' : ''}{value.toFixed(1)}%
      </span>
      {suffix}
    </span>
  );
};

const UserAvatar = ({ src, name, active }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-10 w-10 flex-shrink-0">
      {src && !failed
        ? <img src={src} alt="" onError={() => setFailed(true)} className="h-10 w-10 rounded-full object-cover" />
        : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white">{String(name || '?')[0]?.toUpperCase()}</div>}
      <span className={clsx('absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white', active ? 'bg-emerald-500' : 'bg-neutral-400')} />
    </div>
  );
};

const RowMenu = ({ user, onView, onToggle, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={`Actions for ${user.name}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF0FA] text-neutral-700 transition hover:bg-[#E2E5F7] hover:text-neutral-900"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50">
              <Eye className="h-3.5 w-3.5 text-neutral-400" /> View profile
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50">
              {user.active ? <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
              {user.active ? 'Suspend user' : 'Reactivate user'}
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete user
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Users = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status, error } = useSelector((s) => s.users);
  const { transactions = [], status: walletStatus } = useSelector((s) => s.wallet) || {};
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('joined');
  const [moreOpen, setMoreOpen] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withBalance, setWithBalance] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'suspend' | 'activate', users: [] }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: '', variant: 'success' });

  useEffect(() => { dispatch(fetchUsers()); }, [dispatch]);
  useEffect(() => { if (walletStatus === 'idle') dispatch(fetchAllWallets()); }, [dispatch, walletStatus]);

  const balances = useMemo(() => {
    const map = new Map();
    transactions.forEach((tx) => {
      const id = walletUserId(tx);
      if (id) map.set(id, (map.get(id) || 0) + (Number(tx.amount) || 0));
    });
    return map;
  }, [transactions]);

  const users = useMemo(() => (items || []).map((u) => {
    const base = u && u.user ? u.user : u || {};
    const id = String(base._id || base.id || '');
    const banned = base.is_active === false || (base.ban_type && base.ban_type !== 'none');
    return {
      id,
      name: base.full_name || base.name || base.username || base.email || 'Unknown',
      handle: base.username || '',
      email: base.email || '',
      avatar: base.avatar_url ? toAbsoluteMediaUrl(base.avatar_url) : '',
      role: normalizeRole(base.role),
      active: !banned,
      tempBan: banned && base.ban_until && new Date(base.ban_until) > new Date(),
      banUntil: base.ban_until,
      verified: !!base.is_email_verified,
      balance: balances.get(id) || 0,
      joined: base.createdAt || base.created_at,
    };
  }), [items, balances]);

  const stats = useMemo(() => {
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const today = users.filter((u) => new Date(u.joined) >= startToday).length;
    const yesterday = users.filter((u) => { const t = new Date(u.joined).getTime(); return t >= startToday.getTime() - DAY_MS && t < startToday.getTime(); }).length;
    const active = users.filter((u) => u.active).length;
    const suspended = users.filter((u) => !u.active);
    return {
      total: users.length,
      growth: growthOf(users, (u) => u.joined),
      active,
      activeShare: users.length ? (active / users.length) * 100 : 0,
      today,
      todayDelta: yesterday ? ((today - yesterday) / yesterday) * 100 : null,
      suspended: suspended.length,
      temporary: suspended.filter((u) => u.tempBan).length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, '');
    const list = users.filter((u) => {
      if (q && ![u.name, u.handle, u.email, u.id].some((v) => String(v).toLowerCase().includes(q))) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.active) return false;
      if (statusFilter === 'suspended' && u.active) return false;
      if (verifiedOnly && !u.verified) return false;
      if (withBalance && !u.balance) return false;
      return true;
    });
    const by = {
      joined: (a, b) => new Date(b.joined || 0) - new Date(a.joined || 0),
      name: (a, b) => a.name.localeCompare(b.name),
      balance: (a, b) => b.balance - a.balance,
    };
    return list.sort(by[sort]);
  }, [users, search, roleFilter, statusFilter, verifiedOnly, withBalance, sort]);

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter, verifiedOnly, withBalance, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allVisibleSelected = visible.length > 0 && visible.every((u) => selected.has(u.id));
  const selectedUsers = users.filter((u) => selected.has(u.id));
  const extraFilters = (verifiedOnly ? 1 : 0) + (withBalance ? 1 : 0);

  const toggleOne = (id) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allVisibleSelected) visible.forEach((u) => next.delete(u.id)); else visible.forEach((u) => next.add(u.id));
    return next;
  });

  const showToast = (message, variant = 'success') => {
    setToast({ message, variant });
    setTimeout(() => setToast({ message: '', variant: 'success' }), 3500);
  };

  const runConfirm = async () => {
    if (!confirm?.users?.length) return;
    setBusy(true);
    const { type, users: targets } = confirm;
    const results = await Promise.allSettled(targets.map((u) => (type === 'delete'
      ? dispatch(deleteUserById(u.id)).unwrap()
      : dispatch(toggleUserActive({ id: u.id, is_active: type === 'activate' })).unwrap())));
    const failed = results.filter((r) => r.status === 'rejected').length;
    const done = targets.length - failed;
    const verb = { delete: 'Deleted', suspend: 'Suspended', activate: 'Reactivated' }[type];
    showToast(failed ? `${verb} ${done}, ${failed} failed` : `${verb} ${done} user${done === 1 ? '' : 's'}`, failed ? 'error' : 'success');
    if (type === 'delete') dispatch(fetchUsers());
    setSelected(new Set());
    setBusy(false);
    setConfirm(null);
  };

  const exportUsers = (list) => {
    downloadCsv(`users-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['ID', 'Name', 'Username', 'Email', 'Role', 'Status', 'Email verified', 'Balance (Bcoins)', 'Joined'],
      ...list.map((u) => [u.id, u.name, u.handle, u.email, ROLE_META[u.role].label, u.active ? 'Active' : 'Suspended', u.verified ? 'Yes' : 'No', u.balance, u.joined]),
    ]);
  };

  const confirmCopy = confirm && {
    delete: { title: confirm.users.length > 1 ? `Delete ${confirm.users.length} users` : 'Delete User', text: 'Delete Account', variant: 'danger' },
    suspend: { title: confirm.users.length > 1 ? `Suspend ${confirm.users.length} users` : 'Suspend User', text: 'Suspend', variant: 'danger' },
    activate: { title: confirm.users.length > 1 ? `Reactivate ${confirm.users.length} users` : 'Reactivate User', text: 'Reactivate', variant: 'primary' },
  }[confirm.type];

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#E8194E]">User Management</p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Users</h1>
            <p className="mt-0.5 text-[13.5px] text-neutral-500">Manage member accounts, influencer profiles, vendor affiliations, and coin wallet balances.</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => exportUsers(filtered)}
              disabled={!filtered.length}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13.5px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Download className="h-4 w-4" /> Export Users
            </button>
            <button
              type="button"
              onClick={() => navigate('/users/create-admin')}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_26px_-8px_rgba(232,25,78,0.7)]"
            >
              <Plus className="h-4 w-4" /> Create Admin
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Users"
            value={formatNumber(stats.total)}
            icon={UsersIcon}
            iconTone="bg-pink-100 text-[#C81345]"
            foot={<Growth value={stats.growth} suffix="vs last 30 days" />}
            hoverTone="hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.45)]"
          />
          <StatCard
            label="Active Accounts"
            value={formatNumber(stats.active)}
            icon={Zap}
            iconTone="bg-indigo-50 text-[#8E35B5]"
            foot={<span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#8E35B5]" /><b className="text-neutral-700">{Math.round(stats.activeShare)}%</b> of all accounts</span>}
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
          />
          <StatCard
            label="New Today"
            value={formatNumber(stats.today)}
            icon={UserPlus}
            iconTone="bg-purple-100 text-[#8E35B5]"
            foot={<Growth value={stats.todayDelta} suffix="vs yesterday" tone="purple" />}
            hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]"
          />
          <StatCard
            label="Suspended"
            value={formatNumber(stats.suspended)}
            icon={ShieldAlert}
            iconTone="bg-rose-100 text-rose-600"
            foot={stats.suspended
              ? <span><b className="text-[#C81345]">Needs review</b> {stats.temporary ? `(${stats.temporary} temporary)` : '(account bans)'}</span>
              : 'No suspended accounts'}
            hoverTone="hover:border-rose-200 hover:shadow-[0_14px_30px_-14px_rgba(225,29,72,0.45)]"
          />
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E72A8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by user name, @handle, email or ID"
                className="h-10 w-full rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-9 pr-3 text-[13px] text-neutral-800 placeholder-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <LabeledSelect label="Role" value={roleFilter} options={ROLE_OPTIONS} onChange={setRoleFilter} />
            <LabeledSelect label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
            <LabeledSelect label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} icon={ListFilter} />

            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                title="More filters"
                aria-label="More filters"
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-neutral-700 transition hover:bg-[#E9EBFA]"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {extraFilters > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E8194E] text-[9px] font-bold text-white">{extraFilters}</span>}
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-11 z-20 w-60 space-y-2.5 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg">
                    <p className="text-[13px] font-bold text-neutral-900">More filters</p>
                    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-neutral-700">
                      <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="h-4 w-4 rounded accent-[#E8194E]" />
                      Email verified only
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-neutral-700">
                      <input type="checkbox" checked={withBalance} onChange={(e) => setWithBalance(e.target.checked)} className="h-4 w-4 rounded accent-[#E8194E]" />
                      Has a coin balance
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setBatchOpen((v) => !v)}
                className={clsx(
                  'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition',
                  selected.size ? 'border-pink-200 bg-pink-50 text-[#C81345]' : 'border-[#E2E5F4] bg-[#EEF0FA] text-neutral-600 hover:bg-[#E9EBFA]'
                )}
              >
                <ListChecks className="h-4 w-4" /> Batch{selected.size ? ` (${selected.size})` : ''}
              </button>
              {batchOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBatchOpen(false)} />
                  <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                    {!selected.size && <p className="px-3 py-2 text-[12px] text-neutral-500">Tick users in the table first.</p>}
                    {[
                      { label: 'Reactivate selected', icon: ShieldCheck, onClick: () => setConfirm({ type: 'activate', users: selectedUsers }) },
                      { label: 'Suspend selected', icon: ShieldAlert, onClick: () => setConfirm({ type: 'suspend', users: selectedUsers }) },
                      { label: 'Export selected', icon: Download, onClick: () => exportUsers(selectedUsers) },
                      { label: 'Clear selection', icon: UserCheck, onClick: () => setSelected(new Set()) },
                    ].map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        disabled={!selected.size}
                        onClick={() => { setBatchOpen(false); action.onClick(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <action.icon className="h-3.5 w-3.5 text-neutral-400" /> {action.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-[#F7F8FD]">
                  <th className="w-12 py-3 pl-5">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all on this page" className="h-4 w-4 rounded accent-[#E8194E]" />
                  </th>
                  {['User Profile', 'Role', 'Balance', 'Status', 'Joined'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>
                  ))}
                  <th className="w-20 px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !users.length ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading users…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><Search className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{error ? `Error: ${error}` : 'No users found'}</p><p className="mt-1 text-xs text-neutral-400">Try changing your search or filters.</p></td></tr>
                ) : visible.map((user) => {
                  const joined = new Date(user.joined);
                  const validJoined = !Number.isNaN(joined.getTime());
                  const isSelected = selected.has(user.id);
                  return (
                    <tr key={user.id} onClick={() => navigate(`/users/${user.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', isSelected && 'bg-pink-50/60')}>
                      <td className="py-3 pl-5" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(user.id)} aria-label={`Select ${user.name}`} className="h-4 w-4 rounded accent-[#E8194E]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar src={user.avatar} name={user.name} active={user.active} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 truncate text-[14px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">
                              {user.name}
                              {user.verified && <BadgeCheck className="h-4 w-4 flex-shrink-0 fill-[#E8194E] text-white" aria-label="Email verified" />}
                            </p>
                            <p className="max-w-[320px] truncate text-[12px] text-neutral-500">
                              {user.handle && `@${user.handle}`}{user.handle && user.email && ' · '}{user.email || (!user.handle && 'No email')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex rounded-md px-2.5 py-1 text-[11.5px] font-bold', ROLE_META[user.role].cls)}>{ROLE_META[user.role].label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-extrabold text-amber-600">B</span>
                          <span className="text-[14px] font-bold text-neutral-900">{formatNumber(Math.round(user.balance))}</span>
                          <span className="text-[11.5px] text-neutral-500">Bcoins</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span title={user.tempBan ? `Until ${new Date(user.banUntil).toLocaleDateString()}` : undefined} className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold', user.tempBan ? 'bg-amber-50 text-amber-700' : 'bg-rose-100 text-rose-700')}>
                            <span className={clsx('h-1.5 w-1.5 rounded-full', user.tempBan ? 'bg-amber-500' : 'bg-rose-500')} /> {user.tempBan ? 'Temp ban' : 'Suspended'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap text-[12.5px] text-neutral-700">{validJoined ? joined.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ',' : '—'}</p>
                        <p className="text-[12.5px] text-neutral-700">{validJoined ? joined.getFullYear() : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <RowMenu
                          user={user}
                          onView={() => navigate(`/users/${user.id}`)}
                          onToggle={() => setConfirm({ type: user.active ? 'suspend' : 'activate', users: [user] })}
                          onDelete={() => setConfirm({ type: 'delete', users: [user] })}
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
                Showing <span className="font-semibold text-neutral-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-neutral-800">{formatNumber(filtered.length)}</span> users
                {selected.size > 0 && <span className="ml-2 font-semibold text-[#C81345]">· {selected.size} selected</span>}
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
                {pageList(page, totalPages).map((p, i) => (p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-[12px] text-neutral-400">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)} className={clsx('h-8 min-w-[32px] rounded-lg px-2 text-[12.5px] font-semibold transition', p === page ? 'bg-[#E8194E] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'text-neutral-700 hover:bg-neutral-100')}>
                    {formatNumber(p)}
                  </button>
                )))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30">›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title={confirmCopy?.title}
        description={confirm?.users?.length === 1
          ? `This applies to ${confirm.users[0].name}.`
          : `This applies to ${confirm?.users?.length || 0} selected users.`}
        confirmText={confirmCopy?.text}
        confirmVariant={confirmCopy?.variant}
        note={confirm?.type === 'delete' ? 'This action cannot be undone.' : 'You can reverse this at any time from the user list.'}
        loading={busy}
      />

      {!!toast.message && (
        <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.variant === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          {toast.message}
        </div>
      )}
    </>
  );
};

export default Users;
