import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  ArrowRightLeft,
  ChevronDown,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  fetchAllWallets,
  fetchMemberWalletHistory,
  fetchVendorWalletHistory,
} from '../store/walletSlice.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';

const getUserObj = (tx) => {
  if (tx.user_id && typeof tx.user_id === 'object') return tx.user_id;
  if (tx.user && typeof tx.user === 'object') return tx.user;
  return null;
};

const getUserId = (tx) => {
  const obj = getUserObj(tx);
  if (obj) return String(obj._id || obj.id || obj.user_id || '');
  if (typeof tx.user_id === 'string') return tx.user_id;
  if (typeof tx.user === 'string') return tx.user;
  return '';
};

const normalizeTx = (tx) => {
  const amount = Number(tx.amount || 0);
  return {
    id: tx._id || tx.id || Math.random().toString(36).slice(2),
    label: String(tx.type || 'Transaction').replaceAll('_', ' '),
    description: tx.description || '—',
    amount,
    direction: amount >= 0 ? 'credit' : 'debit',
    source: tx.ad_id ? 'ad' : tx.post_id ? 'post' : 'platform',
    createdAt: tx.createdAt || tx.transactionDate || tx.created_at || null,
  };
};

const avatarInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

const SourceBadge = ({ value }) => (
  <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium capitalize text-neutral-600">{value}</span>
);

const DirectionBadge = ({ value }) => (
  <span className={clsx('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium capitalize', value === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
    <span className={clsx('h-1.5 w-1.5 rounded-full', value === 'credit' ? 'bg-emerald-500' : 'bg-rose-500')} />
    {value}
  </span>
);

const WalletDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    transactions = [],
    memberHistory = [],
    memberWallet = null,
    memberStatus = 'idle',
    vendorHistory = [],
    vendorWallet = null,
    vendorStatus = 'idle',
  } = useSelector((state) => state.wallet) || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');

  useEffect(() => {
    if (!transactions.length) dispatch(fetchAllWallets());
    if (id && id !== 'system') {
      dispatch(fetchMemberWalletHistory(id));
      dispatch(fetchVendorWalletHistory(id));
    }
  }, [dispatch, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Transactions belonging to this user from the global list (always consistent with the wallets list)
  const globalForUser = useMemo(
    () => transactions.filter((tx) => (getUserId(tx) || 'system') === id),
    [transactions, id]
  );

  // Prefer the richest source: member history, then vendor history, then global
  const sourceTx = memberHistory.length ? memberHistory : vendorHistory.length ? vendorHistory : globalForUser;
  const txList = useMemo(() => sourceTx.map(normalizeTx).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [sourceTx]);

  // User identity
  const userObj = useMemo(() => {
    const fromGlobal = globalForUser.map(getUserObj).find(Boolean);
    return fromGlobal || memberWallet?.user || vendorWallet?.user || null;
  }, [globalForUser, memberWallet, vendorWallet]);

  const userName = userObj?.full_name || userObj?.username || userObj?.email || (id === 'system' ? 'System / Platform' : 'User');
  const userEmail = userObj?.email || '';
  const userAvatar = userObj?.avatar_url || userObj?.avatar || userObj?.image || '';

  const stats = useMemo(() => {
    const credits = txList.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const debits = txList.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const computedBalance = credits - debits;
    const balance = Number(
      memberWallet?.balance ?? memberWallet?.coins ?? vendorWallet?.balance ?? vendorWallet?.coins ?? computedBalance
    );
    return { credits, debits, balance, count: txList.length };
  }, [txList, memberWallet, vendorWallet]);

  const filteredTx = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return txList.filter((t) => {
      const matchesSearch = !q || [t.label, t.description, t.source].some((v) => String(v || '').toLowerCase().includes(q));
      const matchesDir = directionFilter === 'all' || t.direction === directionFilter;
      return matchesSearch && matchesDir;
    });
  }, [txList, searchTerm, directionFilter]);

  const loading = (memberStatus === 'loading' || vendorStatus === 'loading') && !txList.length;

  const statCards = [
    { label: 'Current Balance', value: formatNumber(stats.balance), icon: Wallet, color: 'text-primary bg-primary/10' },
    { label: 'Total Credits', value: `+${formatNumber(stats.credits)}`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Debits', value: `-${formatNumber(stats.debits)}`, icon: TrendingDown, color: 'text-rose-600 bg-rose-50' },
    { label: 'Transactions', value: formatNumber(stats.count), icon: ArrowRightLeft, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/wallets')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Wallets
      </button>

      {/* User header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full border border-neutral-200 bg-white p-0.5">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="h-full w-full rounded-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-brand text-lg font-bold text-white">
              {avatarInitial(userName)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Wallet Detail</p>
          <h1 className="text-xl font-bold text-neutral-900 mt-0.5 truncate">{userName}</h1>
          <p className="text-sm text-neutral-500 truncate">{userEmail || (id === 'system' ? 'Platform-level transactions' : 'No email available')}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Balance</p>
          <p className={clsx('font-display text-2xl font-bold tracking-tight', stats.balance >= 0 ? 'text-neutral-900' : 'text-rose-600')}>{formatNumber(stats.balance)}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
            <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900 leading-tight">{stat.value}</p>
              <p className="text-[11px] text-neutral-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="p-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-2 sm:items-center">
          <h2 className="text-sm font-semibold text-neutral-800 px-1 sm:flex-1">Transaction History</h2>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            />
          </div>
          <div className="relative">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-8 text-xs font-medium text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            >
              <option value="all">All Directions</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Transaction</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Direction</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Source</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Amount</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm text-neutral-400 mt-3">Loading transactions...</p></td></tr>
              ) : filteredTx.length > 0 ? filteredTx.map((tx) => (
                <tr key={tx.id} className="bg-white hover:bg-neutral-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium capitalize text-neutral-800">{tx.label.toLowerCase()}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-[280px]">{tx.description}</p>
                  </td>
                  <td className="px-4 py-3"><DirectionBadge value={tx.direction} /></td>
                  <td className="px-4 py-3"><SourceBadge value={tx.source} /></td>
                  <td className="px-4 py-3 text-right">
                    <span className={clsx('font-mono text-sm font-bold', tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{tx.amount >= 0 ? '+' : ''}{formatNumber(tx.amount)}</span>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-neutral-500">{tx.createdAt ? formatDateTime(tx.createdAt) : '—'}</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <ArrowRightLeft className="w-5 h-5 text-neutral-300 mx-auto" />
                    <p className="text-sm font-medium text-neutral-500 mt-2">No transactions found</p>
                    <p className="text-xs text-neutral-400 mt-1">This user has no matching wallet activity.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WalletDetails;
