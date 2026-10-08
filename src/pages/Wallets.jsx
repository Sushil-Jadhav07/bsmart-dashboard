import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  ArrowRightLeft, ChevronDown, Coins, Download, Megaphone, Plus, RotateCw, Search, Sparkles, Wallet, X,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchAllWallets } from '../store/walletSlice.js';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import CoinAdjustForm from '../components/CoinAdjustForm.jsx';
import { formatCompactNumber, formatNumber, formatRelativeTime } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const PAGE_SIZE = 8;
const FLOW_DAYS = 7;
const FLOW_PAGE_LIMIT = 200;
const FLOW_MAX_PAGES = 5;

const ROLE_META = {
  member: { label: 'Member', pill: 'bg-[#E9EBFA] text-neutral-700', color: '#8E35B5' },
  influencer: { label: 'Influencer', pill: 'bg-pink-100 text-[#C81345]', color: '#E8194E' },
  vendor: { label: 'Vendor', pill: 'bg-purple-100 text-[#8E35B5]', color: '#F59E0B' },
  sales: { label: 'Sales', pill: 'bg-blue-100 text-blue-700', color: '#3B82F6' },
  admin: { label: 'Admin', pill: 'bg-[#1F2340] text-white', color: '#1F2340' },
};

const BALANCE_OPTIONS = [
  { value: 'all', label: 'All Balances' },
  { value: 'high', label: '10K+ coins' },
  { value: 'positive', label: 'Has coins' },
  { value: 'zero', label: 'Empty (0)' },
  { value: 'negative', label: 'Negative' },
];

const SORT_OPTIONS = [
  { value: 'balance', label: 'Sort: Balance' },
  { value: 'recent', label: 'Sort: Recent activity' },
  { value: 'transactions', label: 'Sort: Transactions' },
  { value: 'name', label: 'Sort: Name' },
];

const Select = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 min-w-[130px] items-center justify-between gap-2 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:border-[#C9CFEC] hover:bg-[#E9EBFA]">
        {selected?.label}<ChevronDown className={clsx('h-3.5 w-3.5 text-neutral-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 min-w-full overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((o) => <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={clsx('block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition', o.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50')}>{o.label}</button>)}
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
    <p className="mt-2 font-display text-[26px] font-extrabold leading-none tracking-tight text-neutral-900">{value} <span className="text-[12px] font-semibold text-neutral-500">Bcoins</span></p>
    <p className="mt-2.5 text-[11.5px] text-neutral-500">{foot}</p>
  </div>
);

const Avatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />;
  return <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-white">{String(name || '?')[0]?.toUpperCase()}</span>;
};

const chartTooltip = { backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '12px' };

const Wallets = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((s) => s.auth.token);
  const { wallets = [], summary, total, status, error } = useSelector((s) => s.wallet) || {};
  const [flow, setFlow] = useState({ status: 'idle', items: [] });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [sort, setSort] = useState('balance');
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { dispatch(fetchAllWallets()); }, [dispatch]);

  // Last 7 days of ledger entries for the flow chart.
  const loadFlow = useCallback(async () => {
    if (!token) return;
    setFlow((f) => ({ ...f, status: 'loading' }));
    const since = new Date(Date.now() - (FLOW_DAYS - 1) * DAY_MS);
    since.setHours(0, 0, 0, 0);
    try {
      const all = [];
      for (let p = 1; p <= FLOW_MAX_PAGES; p += 1) {
        const res = await fetch(`${API_BASE_WITH_PATH}/wallet?startDate=${since.toISOString()}&limit=${FLOW_PAGE_LIMIT}&page=${p}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        all.push(...(json?.transactions || []));
        if (p >= (json?.pagination?.pages || 1)) break;
      }
      setFlow({ status: 'succeeded', items: all });
    } catch {
      setFlow({ status: 'failed', items: [] });
    }
  }, [token]);
  useEffect(() => { loadFlow(); }, [loadFlow]);

  const refresh = () => { dispatch(fetchAllWallets()); loadFlow(); };

  const rows = useMemo(() => wallets.map((w) => ({
    id: String(w.user?._id || ''),
    walletId: w.wallet_id,
    name: w.user?.full_name || w.user?.username || 'Unknown user',
    username: w.user?.username || '',
    email: w.user?.email || '',
    avatar: w.user?.avatar_url ? toAbsoluteMediaUrl(w.user.avatar_url) : '',
    role: ROLE_META[w.user?.role] ? w.user.role : 'member',
    active: w.user?.is_active !== false,
    balance: Number(w.balance) || 0,
    credited: Number(w.total_credited) || 0,
    debited: Number(w.total_debited) || 0,
    txCount: Number(w.tx_count) || 0,
    lastTx: w.last_tx_at,
    raw: w,
  })), [wallets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, '');
    const list = rows.filter((r) => {
      if (q && ![r.name, r.username, r.email, r.id].some((v) => String(v).toLowerCase().includes(q))) return false;
      if (roleFilter !== 'all' && r.role !== roleFilter) return false;
      if (balanceFilter === 'high' && r.balance < 10000) return false;
      if (balanceFilter === 'positive' && r.balance <= 0) return false;
      if (balanceFilter === 'zero' && r.balance !== 0) return false;
      if (balanceFilter === 'negative' && r.balance >= 0) return false;
      return true;
    });
    const by = {
      balance: (a, b) => b.balance - a.balance,
      recent: (a, b) => new Date(b.lastTx || 0) - new Date(a.lastTx || 0),
      transactions: (a, b) => b.txCount - a.txCount,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(by[sort]);
  }, [rows, search, roleFilter, balanceFilter, sort]);

  useEffect(() => { setPage(1); }, [search, roleFilter, balanceFilter, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const circulation = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const activeWallets = rows.filter((r) => r.lastTx && new Date(r.lastTx).getTime() > Date.now() - 30 * DAY_MS).length;

  const flowData = useMemo(() => {
    const days = Array.from({ length: FLOW_DAYS }, (_, i) => {
      const d = new Date(Date.now() - (FLOW_DAYS - 1 - i) * DAY_MS);
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { weekday: 'short' }), credited: 0, spent: 0 };
    });
    const byKey = new Map(days.map((d) => [d.key, d]));
    flow.items.forEach((t) => {
      // Enriched ledger entries carry the date as created_at.
      const time = new Date(t.created_at || t.createdAt || t.transactionDate).getTime();
      if (Number.isNaN(time)) return;
      const day = byKey.get(new Date(time).toISOString().slice(0, 10));
      if (!day) return;
      const amount = Number(t.amount) || 0;
      if (amount >= 0) day.credited += amount; else day.spent += Math.abs(amount);
    });
    return days;
  }, [flow.items]);
  const flowTotals = flowData.reduce((acc, d) => ({ credited: acc.credited + d.credited, spent: acc.spent + d.spent }), { credited: 0, spent: 0 });

  const roleMix = useMemo(() => {
    const totals = {};
    rows.forEach((r) => { totals[r.role] = (totals[r.role] || 0) + Math.max(0, r.balance); });
    return Object.entries(totals).filter(([, v]) => v > 0).map(([role, value]) => ({ role, name: ROLE_META[role].label, value, color: ROLE_META[role].color })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const roleOptions = [{ value: 'all', label: 'All Wallets' }, ...Object.entries(ROLE_META).filter(([k]) => rows.some((r) => r.role === k)).map(([k, m]) => ({ value: k, label: `${m.label}s` }))];

  const exportLedger = () => downloadCsv(`vault-wallets-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['User ID', 'Name', 'Username', 'Email', 'Wallet type', 'Balance', 'Total credited', 'Total debited', 'Transactions', 'Last transaction'],
    ...filtered.map((r) => [r.id, r.name, r.username, r.email, ROLE_META[r.role].label, r.balance, r.credited, r.debited, r.txCount, r.lastTx || '']),
  ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest"><span className="text-[#E8194E]">Financial Operations</span><span className="text-neutral-400">•</span><span className="text-neutral-500">Vault & Ledger</span></p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Vault & Wallets</h1>
            <p className="mt-0.5 text-[13.5px] text-neutral-500">Platform coin balances, reward minting, ad spend and vendor recharges, with a full ledger per wallet.</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2.5">
            <button type="button" onClick={exportLedger} disabled={!filtered.length} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><Download className="h-4 w-4" /> Export Wallets CSV</button>
            <button type="button" onClick={() => setAdjustOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 hover:brightness-105"><Plus className="h-4 w-4" /> Manual Coin Adjustment</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Coins in circulation" value={formatCompactNumber(circulation)} icon={Wallet} iconTone="bg-indigo-50 text-indigo-600" foot={`Held across ${formatNumber(rows.length)} wallets · ${formatNumber(activeWallets)} active in 30 days`} hoverTone="hover:border-indigo-200 hover:shadow-[0_14px_30px_-14px_rgba(99,102,241,0.4)]" />
          <StatCard label="Rewards minted" value={formatCompactNumber(summary?.total_coins_minted || 0)} icon={Sparkles} iconTone="bg-pink-100 text-[#C81345]" foot={`${formatCompactNumber(summary?.total_coins_from_ads || 0)} from ads · ${formatCompactNumber(summary?.total_coins_from_reels || 0)} from reels`} hoverTone="hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.45)]" />
          <StatCard label="Ad coins spent" value={formatCompactNumber(summary?.total_ad_coins_spent || 0)} icon={Megaphone} iconTone="bg-purple-100 text-[#8E35B5]" foot="Deducted from vendor ad budgets" hoverTone="hover:border-purple-200 hover:shadow-[0_14px_30px_-14px_rgba(142,53,181,0.45)]" />
          <StatCard label="Vendor recharges" value={formatCompactNumber(summary?.total_vendor_coins_recharged || 0)} icon={Coins} iconTone="bg-amber-100 text-amber-600" foot={`${formatNumber(summary?.total_transactions ?? total ?? 0)} ledger entries in total`} hoverTone="hover:border-amber-200 hover:shadow-[0_14px_30px_-14px_rgba(245,158,11,0.45)]" />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[16px] font-bold text-neutral-900">Coin Flow</h2>
                <p className="text-[12px] text-neutral-500">Coins credited vs spent per day, last {FLOW_DAYS} days</p>
              </div>
              <div className="flex items-center gap-3 text-[12px] font-semibold text-neutral-700">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#E8194E]" />Credited {formatCompactNumber(flowTotals.credited)}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#8E35B5]" />Spent {formatCompactNumber(flowTotals.spent)}</span>
              </div>
            </div>
            <div className="mt-3 h-56">
              {flow.status === 'loading' && !flow.items.length ? <div className="h-full animate-pulse rounded-xl bg-neutral-100" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 4" stroke="#EEF0F4" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#9CA3AF' }} tickFormatter={formatCompactNumber} />
                    <Tooltip contentStyle={chartTooltip} formatter={(v) => formatNumber(v)} cursor={{ fill: '#F5F6FA' }} />
                    <Bar dataKey="credited" name="Credited" fill="#E8194E" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="spent" name="Spent" fill="#8E35B5" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {flow.status === 'failed' && <p className="mt-2 text-[11.5px] text-rose-600">Couldn't load recent ledger entries.</p>}
          </section>

          <section className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="font-display text-[16px] font-bold text-neutral-900">Where coins sit</h2>
            <p className="text-[12px] text-neutral-500">Share of circulating balance by wallet type</p>
            <div className="relative mt-2 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleMix.length ? roleMix : [{ name: 'Empty', value: 1, color: '#EEF0F4' }]} innerRadius={52} outerRadius={70} dataKey="value" stroke="none" startAngle={90} endAngle={-270} paddingAngle={roleMix.length > 1 ? 2 : 0}>
                    {(roleMix.length ? roleMix : [{ name: 'Empty', color: '#EEF0F4' }]).map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  {roleMix.length > 0 && <Tooltip contentStyle={chartTooltip} formatter={(v) => `${formatNumber(v)} coins`} />}
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-display text-[20px] font-extrabold text-neutral-900">{formatCompactNumber(circulation)}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Bcoins</p>
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              {roleMix.map((e) => (
                <div key={e.role} className="flex items-center justify-between text-[12.5px]">
                  <span className="flex items-center gap-2 text-neutral-700"><span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />{e.name}s</span>
                  <span className="font-bold text-neutral-900">{formatCompactNumber(e.value)} <span className="font-normal text-neutral-500">({circulation ? Math.round((e.value / circulation) * 100) : 0}%)</span></span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E72A8]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search wallet by name, @handle, email or user ID…" className="h-10 w-full rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-9 pr-3 text-[13px] text-neutral-800 placeholder-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10" />
            </div>
            <Select value={roleFilter} options={roleOptions} onChange={setRoleFilter} />
            <Select value={balanceFilter} options={BALANCE_OPTIONS} onChange={setBalanceFilter} />
            <Select value={sort} options={SORT_OPTIONS} onChange={setSort} />
            <button type="button" onClick={refresh} title="Refresh" aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-neutral-700 transition hover:bg-[#E9EBFA]"><RotateCw className={clsx('h-4 w-4', status === 'loading' && 'animate-spin')} /></button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  {['Wallet & identity', 'Wallet type', 'Balance', 'Credited / Debited', 'Transactions', 'Last transaction', 'Account'].map((h) => <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>)}
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading wallets…</p></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><Wallet className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm font-medium text-neutral-500">{error ? `Error: ${error}` : 'No wallets found'}</p></td></tr>
                ) : visible.map((r) => (
                  <tr key={r.walletId || r.id} onClick={() => navigate(`/wallets/${r.id}`)} className="group cursor-pointer transition-colors hover:bg-[#FDF2F6]">
                    <td className="border-l-2 border-transparent px-4 py-3 transition-colors group-hover:border-[#E8194E]">
                      <div className="flex items-center gap-3">
                        <Avatar src={r.avatar} name={r.name} />
                        <div className="min-w-0">
                          <p className="max-w-[190px] truncate text-[13.5px] font-bold text-neutral-900 transition-colors group-hover:text-[#C81345]">{r.name}</p>
                          <p className="max-w-[190px] truncate text-[11px] text-neutral-500">{r.username ? `@${r.username}` : ''}{r.username && r.email ? ' · ' : ''}{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={clsx('rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase', ROLE_META[r.role].pill)}>{ROLE_META[r.role].label}</span></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-white">₿</span>
                        <span className={clsx('text-[14px] font-extrabold', r.balance < 0 ? 'text-rose-600' : 'text-neutral-900')}>{formatNumber(r.balance)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      <p className="font-bold text-emerald-600">+{formatCompactNumber(r.credited)}</p>
                      <p className="font-bold text-[#C81345]">−{formatCompactNumber(r.debited)}</p>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-neutral-800">{formatNumber(r.txCount)}</td>
                    <td className="px-4 py-3">
                      <p className="text-[12.5px] font-semibold text-neutral-800">{r.lastTx ? formatRelativeTime(r.lastTx) : 'Never'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', r.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                        <span className={clsx('h-1.5 w-1.5 rounded-full', r.active ? 'bg-emerald-500' : 'bg-rose-500')} />{r.active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#E9EBFA] px-3 text-[12px] font-bold text-neutral-900 transition group-hover:bg-[#C81345] group-hover:text-white"><ArrowRightLeft className="h-3.5 w-3.5" /> Ledger</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-neutral-500">Showing <span className="font-semibold text-neutral-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of {formatNumber(filtered.length)} wallets</p>
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

      {adjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setAdjustOpen(false)} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
          <div className="relative w-full max-w-[460px] overflow-visible rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-[18px] font-bold text-neutral-900">Manual coin adjustment</h2>
                <p className="text-[12.5px] text-neutral-500">Credit or debit any wallet. Every change is written to the ledger.</p>
              </div>
              <button type="button" onClick={() => setAdjustOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
            </div>
            <CoinAdjustForm wallets={wallets} onDone={({ name, amount }) => { setAdjustOpen(false); setToast(`${amount > 0 ? '+' : ''}${formatNumber(amount)} coins applied to ${name}`); setTimeout(() => setToast(null), 3000); refresh(); }} />
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-soft">{toast}</div>}
    </>
  );
};

export default Wallets;
