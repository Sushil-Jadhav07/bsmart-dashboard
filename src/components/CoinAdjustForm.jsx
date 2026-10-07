import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { clsx } from 'clsx';
import { CircleMinus, CirclePlus, Search, ShieldCheck, Zap } from 'lucide-react';
import { adminAdjustCoins, rechargeVendorWallet } from '../store/walletSlice.js';
import { formatNumber } from '../utils/helpers.jsx';

const REASONS = [
  { value: 'adjustment', label: 'Manual correction' },
  { value: 'promo', label: 'Promotional bonus', credit: true },
  { value: 'refund', label: 'Refund / goodwill credit', credit: true },
  { value: 'recharge', label: 'Vendor recharge', credit: true, vendorOnly: true },
  { value: 'penalty', label: 'Penalty / clawback', debit: true },
];

// Credits or debits a user's coin wallet. Vendor recharges go through the
// recharge endpoint (logged as VENDOR_RECHARGE); everything else is an admin
// adjustment with the reason written into the description.
export default function CoinAdjustForm({ wallet, wallets, onDone, compact = false }) {
  const dispatch = useDispatch();
  const [picked, setPicked] = useState(null);
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('adjustment');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const target = wallet || picked;
  const role = String(target?.user?.role || '').toLowerCase();
  const coins = Math.floor(Number(amount) || 0);
  const signed = direction === 'credit' ? coins : -coins;
  const nextBalance = (Number(target?.balance) || 0) + signed;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q || !wallets) return [];
    return wallets.filter((w) => [w.user?.full_name, w.user?.username, w.user?.email, w.user?._id].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 6);
  }, [query, wallets]);

  const reasons = REASONS.filter((r) => (direction === 'credit' ? !r.debit : !r.credit) && (!r.vendorOnly || role === 'vendor'));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!target?.user?._id) { setError('Choose a wallet first.'); return; }
    if (!coins || coins < 1) { setError('Enter a whole number of coins above zero.'); return; }
    if (direction === 'debit' && nextBalance < 0) { setError(`This would take the balance below zero (${formatNumber(nextBalance)}).`); return; }
    const label = REASONS.find((r) => r.value === reason)?.label || 'Admin adjustment';
    const description = note.trim() ? `${label}: ${note.trim()}` : label;
    setBusy(true);
    try {
      const userId = String(target.user._id);
      if (reason === 'recharge') await dispatch(rechargeVendorWallet({ userId, amount: coins, description })).unwrap();
      else await dispatch(adminAdjustCoins({ userId, amount: signed, description })).unwrap();
      setAmount('');
      setNote('');
      onDone?.({ name: target.user.full_name || target.user.username, amount: signed });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Adjustment failed');
    } finally {
      setBusy(false);
    }
  };

  const label = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-neutral-600';
  const field = 'h-10 w-full rounded-lg border border-transparent bg-[#F1F3FC] px-3 text-[13.5px] font-semibold text-neutral-900 outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10';

  return (
    <form onSubmit={submit} className="space-y-3.5">
      {!wallet && (
        <div className="relative">
          <label className={label}>Wallet holder</label>
          {picked ? (
            <div className="flex items-center justify-between rounded-lg bg-[#F1F3FC] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-neutral-900">{picked.user?.full_name || picked.user?.username}</p>
                <p className="text-[11px] text-neutral-500">{picked.user?.role} · balance {formatNumber(picked.balance)}</p>
              </div>
              <button type="button" onClick={() => { setPicked(null); setQuery(''); }} className="text-[11.5px] font-bold text-[#C81345]">Change</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, @username or email" className={clsx(field, 'pl-9 font-normal')} />
              </div>
              {matches.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                  {matches.map((w) => (
                    <button key={w.wallet_id} type="button" onClick={() => { setPicked(w); setQuery(''); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-neutral-50">
                      <span className="truncate font-semibold text-neutral-900">{w.user?.full_name || w.user?.username}<span className="ml-1.5 font-normal text-neutral-500">@{w.user?.username}</span></span>
                      <span className="text-[11.5px] text-neutral-500">{formatNumber(w.balance)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <label className={label}>Adjustment type</label>
        <div className="grid grid-cols-2 gap-2">
          {[['credit', 'Credit (+)', CirclePlus, 'border-emerald-300 bg-emerald-50 text-emerald-700'], ['debit', 'Debit (−)', CircleMinus, 'border-rose-300 bg-rose-50 text-rose-700']].map(([value, text, Icon, on]) => (
            <button key={value} type="button" onClick={() => { setDirection(value); setReason('adjustment'); }} className={clsx('inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border text-[13px] font-bold transition', direction === value ? on : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50')}>
              <Icon className="h-4 w-4" />{text}
            </button>
          ))}
        </div>
      </div>

      <div className={clsx('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        <div>
          <label className={label}>Amount (Bcoins)</label>
          <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" className={field} />
        </div>
        <div>
          <label className={label}>Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={clsx(field, 'cursor-pointer')}>
            {reasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Note (saved on the ledger)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Approved by ops for payout delay" className="w-full resize-none rounded-lg border border-transparent bg-[#F1F3FC] px-3 py-2 text-[13px] text-neutral-800 outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10" />
      </div>

      {target && coins > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[#E4E7F5] bg-[#F6F7FD] px-3 py-2 text-[12px]">
          <span className="text-neutral-600">New balance</span>
          <span className={clsx('font-extrabold', nextBalance < 0 ? 'text-rose-600' : 'text-neutral-900')}>{formatNumber(target.balance)} → {formatNumber(nextBalance)}</span>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        Applied instantly and logged as a ledger entry. The user is notified.
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] font-semibold text-rose-700">{error}</p>}

      <button type="submit" disabled={busy || !target || !coins} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-[13.5px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50">
        <Zap className="h-4 w-4" />{busy ? 'Applying…' : 'Execute Ledger Adjustment'}
      </button>
    </form>
  );
}
