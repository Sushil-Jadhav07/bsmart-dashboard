import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users as UsersIcon,
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import Button from '../components/Button.jsx';
import { adminAdjustCoins, fetchAllWallets, rechargeVendorWallet } from '../store/walletSlice.js';
import { fetchUsers } from '../store/usersSlice.js';
import Dropdown from '../components/Dropdown.jsx';
import { formatDate, formatNumber } from '../utils/helpers.jsx';

const PAGE_SIZE = 10;

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

const avatarInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

const Avatar = ({ name, src }) => (
  <div className="relative h-10 w-10 shrink-0 rounded-full border border-neutral-200 bg-white p-0.5">
    {src ? (
      <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white">
        {avatarInitial(name)}
      </div>
    )}
  </div>
);

const Wallets = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { transactions = [], summary = null, total = 0, status = 'idle', error = null } = useSelector((state) => state.wallet) || {};
  const { items: allUsers = [], status: usersStatus } = useSelector((state) => state.users);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('balance');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ userId: '', amount: '', description: '', type: 'admin' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (status === 'idle') dispatch(fetchAllWallets());
    if (usersStatus === 'idle') dispatch(fetchUsers());
  }, [dispatch, status, usersStatus]);

  const usersMap = useMemo(() => {
    const map = new Map();
    (allUsers || []).forEach((u) => {
      const base = u && u.user ? u.user : u || {};
      const id = base._id || base.id || base.user_id || base.uuid || '';
      if (id) {
        map.set(id, {
          name: base.full_name || base.fullName || base.name || base.username || base.email || '',
          email: base.email || '',
          avatar: base.avatar_url || base.avatar || base.image || base.photo || '',
        });
      }
    });
    return map;
  }, [allUsers]);

  // Group transactions per user
  const userRows = useMemo(() => {
    const map = new Map();
    transactions.forEach((tx) => {
      const id = getUserId(tx) || 'system';
      const obj = getUserObj(tx) || {};
      const enriched = usersMap.get(id) || {};
      const amount = Number(tx.amount || 0);
      const createdAt = tx.createdAt || tx.transactionDate || tx.created_at || null;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: enriched.name || obj.full_name || obj.username || obj.email || (id === 'system' ? 'System / Platform' : 'Unknown user'),
          email: enriched.email || obj.email || '',
          avatar: enriched.avatar || obj.avatar_url || obj.avatar || obj.image || '',
          credits: 0,
          debits: 0,
          balance: 0,
          count: 0,
          lastActivity: null,
        });
      }
      const entry = map.get(id);
      entry.count += 1;
      entry.balance += amount;
      if (amount >= 0) entry.credits += amount; else entry.debits += Math.abs(amount);
      const ts = createdAt ? new Date(createdAt).getTime() : 0;
      if (ts && (!entry.lastActivity || ts > entry.lastActivity)) entry.lastActivity = ts;
    });
    return Array.from(map.values());
  }, [transactions, usersMap]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const rows = userRows.filter((row) =>
      !query || [row.name, row.email, row.id].some((value) => String(value || '').toLowerCase().includes(query))
    );
    const sorted = [...rows].sort((a, b) => {
      if (sortBy === 'name') return String(a.name).localeCompare(String(b.name));
      if (sortBy === 'transactions') return b.count - a.count;
      if (sortBy === 'recent') return (b.lastActivity || 0) - (a.lastActivity || 0);
      return b.balance - a.balance; // balance (default)
    });
    return sorted;
  }, [userRows, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchTerm, sortBy]);

  const credits = userRows.reduce((sum, r) => sum + r.credits, 0);
  const debits = userRows.reduce((sum, r) => sum + r.debits, 0);

  const statCards = [
    { label: 'Wallet Holders', value: formatNumber(userRows.length), icon: UsersIcon, color: 'text-primary bg-primary/10' },
    { label: 'Transactions', value: formatNumber(summary?.total_transactions ?? total ?? transactions.length), icon: ArrowRightLeft, color: 'text-violet-600 bg-violet-50' },
    { label: 'Total Credits', value: formatNumber(credits), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Debits', value: formatNumber(debits), icon: TrendingDown, color: 'text-rose-600 bg-rose-50' },
  ];

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setMessage('');
    try {
      const payload = { userId: form.userId.trim(), amount: Number(form.amount), description: form.description.trim() };
      const thunk = form.type === 'recharge' ? rechargeVendorWallet : adminAdjustCoins;
      await dispatch(thunk(payload)).unwrap();
      setMessage('Wallet balance updated successfully');
      setModalOpen(false);
      setForm({ userId: '', amount: '', description: '', type: 'admin' });
      dispatch(fetchAllWallets());
      setTimeout(() => setMessage(''), 2500);
    } catch (e) {
      setFormError(String(e || 'Failed to update wallet balance'));
    } finally {
      setSubmitting(false);
    }
  };

  const emptyMessage = error ? `Error: ${error}` : status === 'loading' ? 'Loading wallets...' : 'No wallet holders found';
console.log(filteredRows)
  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Wallet Operations</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Wallets</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Coin balances per user — open a user to see their full transaction history.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => dispatch(fetchAllWallets())}>Refresh</Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>Adjust Coins</Button>
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

        {/* Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            <Dropdown
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              options={[
                { value: 'balance', label: 'Sort: Balance' },
                { value: 'transactions', label: 'Sort: Transactions' },
                { value: 'recent', label: 'Sort: Recent activity' },
                { value: 'name', label: 'Sort: Name' },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">User</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-center">Transactions</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Credits</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Debits</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Balance</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Last activity</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visibleRows.length > 0 ? visibleRows.map((row) => (
                  
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/wallets/${row.id}`)}
                    className="group bg-white transition-colors hover:bg-neutral-50/60 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.name} src={row.avatar} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate group-hover:text-primary transition-colors">{row.name}</p>
                          {/* <p className="text-[11px] text-neutral-400 truncate">{row.email || 'No email'}</p> */}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="text-sm font-medium text-neutral-700">{formatNumber(row.count)}</span></td>
                    <td className="px-4 py-3 text-right"><span className="text-sm font-semibold text-emerald-600">+{formatNumber(row.credits)}</span></td>
                    <td className="px-4 py-3 text-right"><span className="text-sm font-semibold text-rose-600">-{formatNumber(row.debits)}</span></td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx('font-mono text-sm font-bold', row.balance >= 0 ? 'text-neutral-900' : 'text-rose-600')}>{formatNumber(row.balance)}</span>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs text-neutral-500">{row.lastActivity ? formatDate(new Date(row.lastActivity).toISOString()) : '—'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-primary transition-colors inline-block" />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Search className="w-5 h-5 text-neutral-300 mx-auto" />
                      <p className="text-sm font-medium text-neutral-500 mt-2">{emptyMessage}</p>
                      <p className="text-xs text-neutral-400 mt-1">Try changing your search.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 0 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {formatNumber(filteredRows.length)} users</p>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-medium text-neutral-700 px-2">{page} / {totalPages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!!message && <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-soft">{message}</div>}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Adjust Wallet Balance" size="md">
        <form onSubmit={submitAdjustment} className="space-y-4">
          <Dropdown
            label="Operation"
            value={form.type}
            onChange={(val) => setForm((v) => ({ ...v, type: val }))}
            options={[
              { value: 'admin', label: 'Admin adjustment' },
              { value: 'recharge', label: 'Vendor recharge' },
            ]}
            size="lg"
            fullWidth
          />
          {['userId', 'amount', 'description'].map((key) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">{key === 'userId' ? 'User ID' : key}</label>
              <input
                value={form[key]}
                type={key === 'amount' ? 'number' : 'text'}
                onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))}
                required
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          ))}
          {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{formError}</div>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={submitting}>Submit</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default Wallets;