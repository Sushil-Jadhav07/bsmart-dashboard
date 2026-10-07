import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  ArrowDownLeft, ArrowLeft, ArrowRightLeft, ArrowUpRight, Calendar, Copy, Check, Download, ExternalLink, Search, Store,
  TrendingDown, TrendingUp, User, Wallet,
} from 'lucide-react';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import CoinAdjustForm from '../components/CoinAdjustForm.jsx';
import { formatCompactNumber, formatNumber, formatRelativeTime } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, pageList, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';

const PAGE_LIMIT = 200;
const MAX_PAGES = 5;
const ROWS_PER_PAGE = 10;
const card = 'rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_10px_28px_-18px_rgba(16,24,40,0.3)]';

const ROLE_PILL = {
  member: 'bg-[#E9EBFA] text-neutral-700',
  influencer: 'bg-pink-100 text-[#C81345]',
  vendor: 'bg-purple-100 text-[#8E35B5]',
  sales: 'bg-blue-100 text-blue-700',
  admin: 'bg-[#1F2340] text-white',
};

// Enriched ledger entries carry the date as created_at.
const txDate = (t) => t.created_at || t.createdAt || t.transactionDate || null;

const typeLabel = (t) => String(t || 'Transaction').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const channelOf = (tx) => {
  const type = String(tx.type || '').toUpperCase();
  if (type.startsWith('ADMIN')) return { label: 'Admin', cls: 'bg-[#1F2340] text-white' };
  if (type.includes('RECHARGE') || type.includes('REGISTRATION')) return { label: 'Recharge', cls: 'bg-amber-100 text-amber-700' };
  if (type.includes('PACKAGE')) return { label: 'Package', cls: 'bg-purple-100 text-[#8E35B5]' };
  if (type.includes('MARKETPLACE') || tx.order_id) return { label: 'Marketplace', cls: 'bg-blue-100 text-blue-700' };
  if (tx.ad_id || type.startsWith('AD_')) return { label: 'Spotlight ad', cls: 'bg-pink-100 text-[#C81345]' };
  if (type.includes('REEL')) return { label: 'bSpark', cls: 'bg-purple-100 text-[#8E35B5]' };
  return { label: 'Platform', cls: 'bg-neutral-100 text-neutral-600' };
};

const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const WalletDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useSelector((s) => s.auth.token);
  const [state, setState] = useState({ status: 'idle', txs: [], wallet: null, complete: true, error: null });
  const [direction, setDirection] = useState('all');
  const [range, setRange] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  // GET /wallet?userId= works for every role (the member/vendor history routes are role-specific).
  const load = useCallback(async () => {
    if (!token || !id) return;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const txs = [];
      let wallet = null;
      let complete = true;
      for (let p = 1; p <= MAX_PAGES; p += 1) {
        const res = await fetch(`${API_BASE_WITH_PATH}/wallet?userId=${id}&limit=${PAGE_LIMIT}&page=${p}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || 'Failed to load wallet');
        txs.push(...(json?.transactions || []));
        if (!wallet) wallet = (json?.wallets || []).find((w) => String(w.user?._id) === String(id)) || null;
        const pages = json?.pagination?.pages || 1;
        if (p >= pages) break;
        if (p === MAX_PAGES) complete = false;
      }
      setState({ status: 'succeeded', txs, wallet, complete, error: null });
    } catch (e) {
      setState({ status: 'failed', txs: [], wallet: null, complete: true, error: e.message });
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  const user = useMemo(() => {
    const fromWallet = state.wallet?.user;
    const fromTx = state.txs.map((t) => (typeof t.user_id === 'object' ? t.user_id : null)).find(Boolean);
    return fromWallet || fromTx || {};
  }, [state.wallet, state.txs]);

  const name = user.full_name || user.username || 'Wallet holder';
  const role = String(user.role || 'member').toLowerCase();
  const balance = Number(state.wallet?.balance ?? 0);

  // Newest first, with the balance after each entry worked back from the current balance.
  const ledger = useMemo(() => {
    const sorted = [...state.txs].sort((a, b) => (new Date(txDate(b)).getTime() || 0) - (new Date(txDate(a)).getTime() || 0));
    let running = balance;
    return sorted.map((t) => {
      const amount = Number(t.amount) || 0;
      const ok = String(t.status || 'SUCCESS').toUpperCase() === 'SUCCESS';
      const row = { ...t, amount, ok, balanceAfter: running, date: txDate(t) };
      if (ok) running -= amount;
      return row;
    });
  }, [state.txs, balance]);

  const filtered = useMemo(() => {
    const since = range === 'all' ? 0 : Date.now() - Number(range) * DAY_MS;
    const q = search.trim().toLowerCase();
    return ledger.filter((t) => {
      if (direction === 'credit' && t.amount < 0) return false;
      if (direction === 'debit' && t.amount >= 0) return false;
      if (since && new Date(t.date).getTime() < since) return false;
      if (q && ![t._id, t.type, t.description, channelOf(t).label].some((v) => String(v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [ledger, direction, range, search]);

  useEffect(() => { setPage(1); }, [direction, range, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const visible = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const totals = useMemo(() => {
    const credited = state.wallet?.total_credited ?? ledger.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const debited = state.wallet?.total_debited ?? ledger.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const last30 = ledger.filter((t) => new Date(t.date).getTime() > Date.now() - 30 * DAY_MS);
    return {
      credited,
      debited,
      count: state.wallet?.tx_count ?? ledger.length,
      net30: last30.reduce((s, t) => s + (t.ok ? t.amount : 0), 0),
    };
  }, [state.wallet, ledger]);

  const sources = useMemo(() => {
    const by = {};
    ledger.forEach((t) => {
      if (!t.ok) return;
      const key = typeLabel(t.type);
      by[key] = by[key] || { label: key, credit: 0, debit: 0 };
      if (t.amount >= 0) by[key].credit += t.amount; else by[key].debit += Math.abs(t.amount);
    });
    return Object.values(by).sort((a, b) => (b.credit + b.debit) - (a.credit + a.debit)).slice(0, 6);
  }, [ledger]);
  const sourceMax = Math.max(1, ...sources.map((s) => s.credit + s.debit));

  const exportLedger = () => downloadCsv(`ledger-${user.username || id}.csv`, [
    ['Transaction ID', 'Date', 'Type', 'Description', 'Channel', 'Amount', 'Balance after', 'Status'],
    ...filtered.map((t) => [t._id, t.date, typeLabel(t.type), t.description || '', channelOf(t).label, t.amount, t.balanceAfter, t.status || '']),
  ]);

  const copyId = async () => { try { await navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* blocked */ } };

  return (
    <div className="mx-auto max-w-[1400px] pb-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={() => navigate('/wallets')} className="group inline-flex items-center gap-1.5 text-[13px] font-bold text-[#C81345]">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Vault & Wallets
          </button>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-[24px] font-bold tracking-tight text-neutral-900">{name} <span className="text-neutral-400">—</span> Wallet</h1>
            <span className={clsx('rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase', ROLE_PILL[role] || ROLE_PILL.member)}>{role}</span>
            <span className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold', user.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
              <span className={clsx('h-1.5 w-1.5 rounded-full', user.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500')} />{user.is_active !== false ? 'Account active' : 'Account suspended'}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-neutral-500">
            <span>User ID:</span>
            <button type="button" onClick={copyId} className="inline-flex items-center gap-1 font-mono text-neutral-700 hover:text-[#C81345]">{id}{copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}</button>
            <span>· Currency: <b className="text-neutral-700">{state.wallet?.currency || 'Bcoins'}</b></span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => navigate(role === 'vendor' ? `/vendors/${id}` : `/users/${id}`)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:shadow-md">
            <ExternalLink className="h-4 w-4" /> {role === 'vendor' ? 'Vendor Profile' : 'User Profile'}
          </button>
          <button type="button" onClick={exportLedger} disabled={!filtered.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export Ledger
          </button>
        </div>
      </div>

      {state.status === 'failed' && <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-sm font-semibold text-red-600">{state.error}</div>}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Available balance', value: formatNumber(balance), sub: state.wallet ? 'Live wallet balance' : 'No wallet yet', icon: Wallet, tone: 'bg-pink-100 text-[#C81345]', valueCls: balance < 0 ? 'text-rose-600' : 'text-neutral-900' },
              { label: 'Lifetime credited', value: formatCompactNumber(totals.credited), sub: 'Rewards, recharges & credits', icon: ArrowDownLeft, tone: 'bg-emerald-100 text-emerald-600' },
              { label: 'Lifetime debited', value: formatCompactNumber(totals.debited), sub: 'Spends, deductions & debits', icon: ArrowUpRight, tone: 'bg-rose-100 text-rose-600' },
              { label: 'Net last 30 days', value: `${totals.net30 >= 0 ? '+' : ''}${formatCompactNumber(totals.net30)}`, sub: `${formatNumber(totals.count)} ledger entries`, icon: totals.net30 >= 0 ? TrendingUp : TrendingDown, tone: 'bg-purple-100 text-[#8E35B5]', valueCls: totals.net30 >= 0 ? 'text-emerald-600' : 'text-rose-600' },
            ].map((s) => (
              <div key={s.label} className={clsx(card, 'group p-4 hover:-translate-y-0.5')}>
                <div className="flex items-start justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-700">{s.label}</p>
                  <span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110', s.tone)}><s.icon className="h-4 w-4" /></span>
                </div>
                <p className={clsx('mt-1 font-display text-[24px] font-extrabold leading-tight', s.valueCls || 'text-neutral-900')}>{s.value} <span className="text-[11px] font-semibold text-neutral-500">Bcoins</span></p>
                <p className="text-[10.5px] font-semibold text-neutral-500">{s.sub}</p>
              </div>
            ))}
          </div>

          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-neutral-900">Transaction Audit Ledger <span className="rounded-md bg-[#E9EBFA] px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700">{formatNumber(filtered.length)}</span></h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg bg-[#F1F3FC] p-0.5">
                  {[['all', 'All'], ['credit', 'Credits'], ['debit', 'Debits']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setDirection(v)} className={clsx('rounded-md px-3 py-1 text-[12px] font-semibold transition', direction === v ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-600 hover:text-neutral-900')}>{l}</button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E72A8]" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries…" className="h-8 w-44 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-8 pr-2 text-[12px] outline-none focus:border-primary/40 focus:bg-white" />
                </div>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                  <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range" className="h-8 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-8 pr-2 text-[12px] font-semibold text-neutral-800 outline-none">
                    {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {!state.complete && <p className="mx-5 mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11.5px] text-amber-800">Showing the latest {formatNumber(ledger.length)} entries. Balance-after figures cover these entries only.</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                    {['TXN ID', 'Date & time', 'Type & description', 'Channel', 'Amount', 'Balance after', 'Status'].map((h) => <th key={h} className={clsx('px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-700', ['Amount', 'Balance after'].includes(h) && 'text-right')}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {state.status === 'loading' && !ledger.length ? (
                    <tr><td colSpan={7} className="px-4 py-14 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading ledger…</p></td></tr>
                  ) : visible.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-14 text-center"><ArrowRightLeft className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-sm text-neutral-500">No ledger entries match</p></td></tr>
                  ) : visible.map((t) => {
                    const ch = channelOf(t);
                    const d = new Date(t.date);
                    const validDate = !Number.isNaN(d.getTime());
                    return (
                      <tr key={t._id} className="transition-colors hover:bg-[#FDF2F6]">
                        <td className="px-4 py-3 font-mono text-[11.5px] font-bold text-[#C81345]">#TXN-{String(t._id).slice(-6).toUpperCase()}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="text-[12px] font-semibold text-neutral-800">{validDate ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                          <p className="text-[11px] text-neutral-500">{validDate ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-bold text-neutral-900">{typeLabel(t.type)}</p>
                          {t.description && <p className="max-w-[260px] truncate text-[11.5px] text-neutral-500" title={t.description}>{t.description}</p>}
                        </td>
                        <td className="px-4 py-3"><span className={clsx('rounded-md px-2 py-0.5 text-[10.5px] font-bold', ch.cls)}>{ch.label}</span></td>
                        <td className={clsx('whitespace-nowrap px-4 py-3 text-right text-[13px] font-extrabold', t.amount >= 0 ? 'text-emerald-600' : 'text-[#C81345]')}>{t.amount >= 0 ? '+' : ''}{formatNumber(t.amount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-[12.5px] font-semibold text-neutral-700">{formatNumber(t.balanceAfter)}</td>
                        <td className="px-4 py-3"><span className={clsx('rounded-md px-2 py-0.5 text-[10.5px] font-bold', t.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{t.ok ? 'Settled' : (t.status || 'Failed')}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > ROWS_PER_PAGE && (
              <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
                <p className="text-[11.5px] text-neutral-500">Showing {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} of {formatNumber(filtered.length)} entries</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30">‹</button>
                  {pageList(page, totalPages).map((p, i) => (p === '…' ? <span key={`g${i}`} className="px-1 text-neutral-400">…</span> : (
                    <button key={p} onClick={() => setPage(p)} className={clsx('h-7 min-w-[28px] rounded-lg text-[12px] font-semibold', p === page ? 'bg-[#E8194E] text-white' : 'text-neutral-700 hover:bg-neutral-100')}>{p}</button>
                  )))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30">›</button>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5 xl:sticky xl:top-[72px]">
          <section className={clsx(card, 'p-5')}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-[15px] font-bold text-neutral-900">Quick Balance Adjustment</h2>
                <p className="text-[11.5px] text-neutral-500">Credit or debit this wallet</p>
              </div>
              <span className="rounded-md bg-pink-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-[#C81345]">Admin only</span>
            </div>
            {state.status === 'succeeded' && (
              <CoinAdjustForm
                compact
                wallet={{ balance, user: { ...user, _id: id, role } }}
                onDone={({ amount }) => { setToast(`${amount > 0 ? '+' : ''}${formatNumber(amount)} coins applied`); setTimeout(() => setToast(null), 3000); load(); }}
              />
            )}
          </section>

          <section className={clsx(card, 'p-5')}>
            <h2 className="font-display text-[15px] font-bold text-neutral-900">Where coins come from & go</h2>
            <p className="text-[11.5px] text-neutral-500">Top ledger types by volume</p>
            {sources.length === 0 ? <p className="mt-3 text-[12.5px] text-neutral-400">No settled entries yet</p> : (
              <div className="mt-3 space-y-2.5">
                {sources.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="truncate font-semibold text-neutral-800">{s.label}</span>
                      <span className="flex-shrink-0 font-bold">
                        {s.credit > 0 && <span className="text-emerald-600">+{formatCompactNumber(s.credit)}</span>}
                        {s.credit > 0 && s.debit > 0 && <span className="text-neutral-300"> / </span>}
                        {s.debit > 0 && <span className="text-[#C81345]">−{formatCompactNumber(s.debit)}</span>}
                      </span>
                    </div>
                    <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[#EEF0FA]">
                      <div className="h-full bg-emerald-500" style={{ width: `${(s.credit / sourceMax) * 100}%` }} />
                      <div className="h-full bg-[#E8194E]" style={{ width: `${(s.debit / sourceMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={clsx(card, 'p-5')}>
            <h2 className="font-display text-[15px] font-bold text-neutral-900">Linked Account</h2>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#F1F3FC] p-3">
              {user.avatar_url
                ? <img src={toAbsoluteMediaUrl(user.avatar_url)} alt="" className="h-10 w-10 rounded-full object-cover" />
                : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-[13px] font-bold text-white">{name[0]?.toUpperCase()}</span>}
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-neutral-900">{name}</p>
                <p className="truncate text-[11.5px] text-neutral-500">{user.username ? `@${user.username}` : ''}{user.email ? ` · ${user.email}` : ''}</p>
              </div>
            </div>
            <dl className="mt-3 space-y-2 text-[12px]">
              <div className="flex justify-between"><dt className="text-neutral-500">Last transaction</dt><dd className="font-semibold text-neutral-800">{state.wallet?.last_tx_at ? formatRelativeTime(state.wallet.last_tx_at) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Wallet ID</dt><dd className="font-mono text-neutral-700">{state.wallet?.wallet_id ? `#W-${String(state.wallet.wallet_id).slice(-6).toUpperCase()}` : '—'}</dd></div>
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigate(`/users/${id}`)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#E9EBFA] text-[12px] font-semibold text-neutral-900 transition hover:bg-[#DFE2F7]"><User className="h-3.5 w-3.5" /> User</button>
              <button type="button" disabled={role !== 'vendor'} onClick={() => navigate(`/vendors/${id}`)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#E9EBFA] text-[12px] font-semibold text-neutral-900 transition hover:bg-[#DFE2F7] disabled:opacity-40"><Store className="h-3.5 w-3.5" /> Vendor</button>
            </div>
          </section>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-soft">{toast}</div>}
    </div>
  );
};

export default WalletDetails;
