import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Search,
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { fetchRazorpayPayments } from '../store/razorpaySlice.js';
import { fetchUsers } from '../store/usersSlice.js';
import { formatNumber } from '../utils/helpers.jsx';

const RAZORPAY_PAGE_SIZE = 20;

const avatarInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

const Avatar = ({ name, src }) => (
  <div className="relative h-9 w-9 shrink-0 rounded-full border border-neutral-200 bg-white p-0.5">
    {src ? (
      <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
        {avatarInitial(name)}
      </div>
    )}
  </div>
);

const pad2 = (n) => String(n).padStart(2, '0');
const toDateInput = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const fmtDatePart = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTimePart = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const DATE_PRESETS = [
  {
    label: 'Today',
    get: () => {
      const d = new Date();
      return { start: toDateInput(d), end: toDateInput(d) };
    },
  },
  {
    label: 'Last 7 days',
    get: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return { start: toDateInput(start), end: toDateInput(end) };
    },
  },
  {
    label: 'Last 30 days',
    get: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return { start: toDateInput(start), end: toDateInput(end) };
    },
  },
  {
    label: 'This month',
    get: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: toDateInput(start), end: toDateInput(end) };
    },
  },
  { label: 'All time', get: () => ({ start: '', end: '' }) },
];

const DateRangeButton = ({ range, onChange }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(range);
  const ref = useRef(null);

  useEffect(() => setDraft(range), [range, open]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = range.start && range.end
    ? `${fmtDatePart(range.start)} - ${fmtDatePart(range.end)}`
    : 'All time';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium text-neutral-700 outline-none transition hover:border-neutral-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
      >
        <Calendar className="h-3.5 w-3.5 text-neutral-400" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown className={clsx('h-3 w-3 text-neutral-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const next = preset.get();
                  onChange(next);
                  setOpen(false);
                }}
                className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-primary/40 hover:text-primary"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">From</label>
              <input
                type="date"
                value={draft.start}
                max={draft.end || undefined}
                onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                className="h-8 w-full rounded-md border border-neutral-200 px-2 text-xs outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">To</label>
              <input
                type="date"
                value={draft.end}
                min={draft.start || undefined}
                onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                className="h-8 w-full rounded-md border border-neutral-200 px-2 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              className="rounded-md bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-105"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TransactionHistory = () => {
  const dispatch = useDispatch();
  const { items: allUsers = [] } = useSelector((s) => s.users);
  const {
    payments: rzpPayments = [],
    skip: rzpSkip = 0,
    limit: rzpLimit = RAZORPAY_PAGE_SIZE,
    hasMore: rzpHasMore = false,
    count: rzpCount = 0,
    status: rzpStatus = 'idle',
    error: rzpError = null,
  } = useSelector((s) => s.razorpay) || {};

  const [rzpSearchInput, setRzpSearchInput] = useState('');
  const [rzpDateRange, setRzpDateRange] = useState({ start: '', end: '' });
  const [rzpSkipCursor, setRzpSkipCursor] = useState(0);
  const [detailPayment, setDetailPayment] = useState(null);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    setRzpSkipCursor(0);
  }, [rzpDateRange]);

  const rzpQueryParams = useMemo(() => ({
    count: RAZORPAY_PAGE_SIZE,
    skip: rzpSkipCursor,
    from: rzpDateRange.start || undefined,
    to: rzpDateRange.end || undefined,
  }), [rzpSkipCursor, rzpDateRange]);

  useEffect(() => {
    dispatch(fetchRazorpayPayments(rzpQueryParams));
  }, [dispatch, rzpQueryParams]);

  const usersMap = useMemo(() => {
    const map = new Map();
    (allUsers || []).forEach((u) => {
      const base = u && u.user ? u.user : u || {};
      const id = base._id || base.id || base.user_id || '';
      if (id) {
        map.set(String(id), {
          name: base.full_name || base.fullName || base.name || base.username || base.email || '',
          email: base.email || '',
          avatar: base.avatar_url || base.avatar || base.image || base.photo || '',
        });
      }
    });
    return map;
  }, [allUsers]);

  const rzpEnriched = useMemo(() => rzpPayments.map((p) => {
    const enriched = usersMap.get(String(p.notes?.user_id || '')) || {};
    return {
      ...p,
      amountRupees: Number(p.amount || 0) / 100,
      userName: enriched.name || p.email || p.contact || 'Unknown',
      userEmail: enriched.email || p.email || '',
      userAvatar: enriched.avatar || '',
    };
  }), [rzpPayments, usersMap]);

  const rzpFilteredRows = useMemo(() => {
    const query = rzpSearchInput.trim().toLowerCase();
    if (!query) return rzpEnriched;
    return rzpEnriched.filter((p) => [p.id, p.order_id, p.email, p.contact, p.userName]
      .some((v) => String(v || '').toLowerCase().includes(query)));
  }, [rzpEnriched, rzpSearchInput]);

  const rzpKpis = useMemo(() => {
    const capturedRows = rzpEnriched.filter((p) => p.status === 'captured');
    const failedCount = rzpEnriched.filter((p) => p.status === 'failed').length;
    const capturedAmount = capturedRows.reduce((sum, p) => sum + p.amountRupees, 0);
    const successRate = rzpEnriched.length ? Math.round((capturedRows.length / rzpEnriched.length) * 100) : 0;
    return [
      { label: 'Payments Loaded', value: formatNumber(rzpEnriched.length), detail: 'Current batch', icon: CreditCard, color: 'text-violet-600 bg-violet-50' },
      { label: 'Captured Amount', value: `Rs. ${formatNumber(Math.round(capturedAmount))}`, detail: 'Captured payments total', icon: ArrowDown, color: 'text-emerald-600 bg-emerald-50' },
      { label: 'Failed Payments', value: formatNumber(failedCount), detail: 'Current batch', icon: ArrowUp, color: 'text-rose-600 bg-rose-50' },
      { label: 'Success Rate', value: `${successRate}%`, detail: 'Captured vs loaded', icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
    ];
  }, [rzpEnriched]);

  const rzpEmptyMessage = rzpError ? `Error: ${rzpError}` : rzpStatus === 'loading' ? 'Loading payments...' : 'No Razorpay payments found';

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Razorpay</p>
            <h1 className="mt-1 text-xl font-bold text-neutral-900">Payment History</h1>
            <p className="mt-0.5 text-sm text-neutral-500">View Razorpay payments across users.</p>
          </div>
          <button
            type="button"
            onClick={() => dispatch(fetchRazorpayPayments(rzpQueryParams))}
            className="hidden h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 transition hover:border-neutral-300 sm:inline-flex"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {rzpKpis.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
              <div className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold leading-tight text-neutral-900">{stat.value}</p>
                <p className="text-[11px] font-medium text-neutral-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-neutral-100 p-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search loaded payments by user, email, order ID..."
                value={rzpSearchInput}
                onChange={(e) => setRzpSearchInput(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangeButton range={rzpDateRange} onChange={setRzpDateRange} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Payment ID</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">User</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Method</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Date &amp; Time</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Recharge</th>
                  <th className="w-8 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rzpFilteredRows.length > 0 ? rzpFilteredRows.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setDetailPayment(p)}
                    className="group cursor-pointer bg-white transition-colors hover:bg-neutral-50/60"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-neutral-800">{p.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.userName} src={p.userAvatar} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-800">{p.userName}</p>
                          <p className="truncate text-[11px] text-neutral-400">{p.userEmail || p.contact || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium uppercase text-neutral-600">
                        {p.method || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-neutral-800">Rs. {formatNumber(p.amountRupees)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize',
                        p.status === 'captured' && 'bg-emerald-50 text-emerald-600',
                        p.status === 'authorized' && 'bg-amber-50 text-amber-600',
                        p.status === 'failed' && 'bg-rose-50 text-rose-600',
                        p.status === 'refunded' && 'bg-violet-50 text-violet-600',
                        p.status === 'created' && 'bg-neutral-100 text-neutral-500',
                        !['captured', 'authorized', 'failed', 'refunded', 'created'].includes(p.status) && 'bg-neutral-100 text-neutral-500'
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-700">{fmtDatePart(p.created_at * 1000)}</p>
                      <p className="text-[11px] text-neutral-400">{fmtTimePart(p.created_at * 1000)}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-sm text-neutral-600">
                        {p.notes?.coins_to_credit ? `${formatNumber(p.notes.coins_to_credit)} coins` : '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="inline-block h-4 w-4 text-neutral-300 transition-colors group-hover:text-primary" />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Search className="mx-auto h-5 w-5 text-neutral-300" />
                      <p className="mt-2 text-sm font-medium text-neutral-500">{rzpEmptyMessage}</p>
                      <p className="mt-1 text-xs text-neutral-400">Try changing your search or date range.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {rzpFilteredRows.length > 0 && (
            <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3">
              <p className="text-xs text-neutral-500">
                Showing {rzpSkip + 1} to {rzpSkip + rzpPayments.length}
                {rzpHasMore ? '' : ' (last page)'} of {formatNumber(rzpCount || rzpPayments.length)} payments
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRzpSkipCursor((s) => Math.max(0, s - rzpLimit))}
                  disabled={rzpSkip === 0}
                  className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRzpSkipCursor((s) => s + rzpLimit)}
                  disabled={!rzpHasMore}
                  className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!detailPayment} onClose={() => setDetailPayment(null)} title="Razorpay Payment Details" size="md">
        {detailPayment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-neutral-800">{detailPayment.id}</span>
              <span className={clsx(
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize',
                detailPayment.status === 'captured' && 'bg-emerald-50 text-emerald-600',
                detailPayment.status === 'authorized' && 'bg-amber-50 text-amber-600',
                detailPayment.status === 'failed' && 'bg-rose-50 text-rose-600',
                detailPayment.status === 'refunded' && 'bg-violet-50 text-violet-600',
                detailPayment.status === 'created' && 'bg-neutral-100 text-neutral-500',
                !['captured', 'authorized', 'failed', 'refunded', 'created'].includes(detailPayment.status) && 'bg-neutral-100 text-neutral-500'
              )}>
                {detailPayment.status}
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <Avatar name={detailPayment.userName} src={detailPayment.userAvatar} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-800">{detailPayment.userName}</p>
                <p className="truncate text-xs text-neutral-500">{detailPayment.userEmail || detailPayment.contact || ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Amount</p>
                <p className="text-base font-bold text-neutral-800">₹{formatNumber(detailPayment.amountRupees)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Method</p>
                <p className="text-sm font-medium uppercase text-neutral-700">{detailPayment.method || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Contact</p>
                <p className="text-sm font-medium text-neutral-700">{detailPayment.contact || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Currency</p>
                <p className="text-sm font-medium text-neutral-700">{detailPayment.currency || 'INR'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Date &amp; time</p>
                <p className="text-sm font-medium text-neutral-700">
                  {fmtDatePart(detailPayment.created_at * 1000)} | {fmtTimePart(detailPayment.created_at * 1000)}
                </p>
              </div>
              {detailPayment.notes && (detailPayment.notes.recharge_amount || detailPayment.notes.coins_to_credit) && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Recharge details</p>
                  <p className="text-sm text-neutral-700">
                    {detailPayment.notes.recharge_amount ? `Rs. ${formatNumber(detailPayment.notes.recharge_amount)} recharged` : ''}
                    {detailPayment.notes.recharge_amount && detailPayment.notes.coins_to_credit ? ' -> ' : ''}
                    {detailPayment.notes.coins_to_credit ? `${formatNumber(detailPayment.notes.coins_to_credit)} coins` : ''}
                  </p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Order ID</p>
                <p className="break-all font-mono text-xs text-neutral-500">{detailPayment.order_id || '-'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default TransactionHistory;
