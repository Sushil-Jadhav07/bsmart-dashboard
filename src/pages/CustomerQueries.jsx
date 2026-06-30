import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  deleteCustomerQuery,
  fetchCustomerQueries,
  updateQueryStatus,
} from '../store/customerQueriesSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import Dropdown from '../components/Dropdown.jsx';
import Button from '../components/Button.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

const PAGE_LIMIT = 20;

const avatarInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

const normalizeStatus = (value) => {
  const key = String(value || '').trim().toLowerCase();
  if (['resolved', 'completed', 'done'].includes(key)) return 'resolved';
  if (['in_progress', 'in-progress', 'processing', 'ongoing'].includes(key)) return 'in_progress';
  if (key === 'closed') return 'closed';
  return 'open';
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const APP_SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'bsmart', label: 'B-smart' },
  { value: 'ruvees', label: 'Ruvees' },
];

const statusConfig = {
  open: { label: 'Open', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  resolved: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', color: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
};

const StatusBadge = ({ status }) => {
  const key = normalizeStatus(status);
  const s = statusConfig[key] || statusConfig.open;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium', s.color)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

const UserAvatar = ({ name, avatarUrl, size = 9 }) => {
  const [imgError, setImgError] = useState(false);
  const sizeClass = `h-${size} w-${size}`;
  return (
    <div className={clsx(sizeClass, 'shrink-0 rounded-full border border-neutral-200 bg-white p-0.5')}>
      {avatarUrl && !imgError ? (
        <img src={avatarUrl} alt={name} onError={() => setImgError(true)} className="h-full w-full rounded-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
          {avatarInitial(name)}
        </div>
      )}
    </div>
  );
};

/* ───────── Main Page ───────── */
const CustomerQueries = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total, page: reduxPage, totalPages, status, error } = useSelector((s) => s.customerQueries);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appSourceFilter, setAppSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const categories = useMemo(() => {
    const set = new Set((items || []).map((i) => i.category).filter(Boolean));
    return [
      { value: 'all', label: 'All Categories' },
      ...[...set].map((c) => ({ value: c, label: c })),
    ];
  }, [items]);

  const load = useCallback(
    (p = 1) => {
      dispatch(
        fetchCustomerQueries({
          page: p,
          limit: PAGE_LIMIT,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          app_source: appSourceFilter !== 'all' ? appSourceFilter : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
        })
      );
    },
    [dispatch, statusFilter, appSourceFilter, categoryFilter]
  );

  useEffect(() => {
    setPage(1);
    load(1);
  }, [statusFilter, appSourceFilter, categoryFilter]);

  useEffect(() => {
    load(page);
  }, [page]);

  const rows = useMemo(() =>
    (items || []).map((item) => {
      const user = item.user_id || null;
      const fullName = user?.full_name || item.name || '';
      const username = user?.username || '';
      return {
        id: item._id || item.id,
        name: fullName || username || '-',
        username,
        email: user?.email || item.email || '',
        phone: item.phone || '',
        avatarUrl: user?.avatar_url || null,
        subject: item.subject || 'General Query',
        message: item.message || item.description || '',
        category: item.category || '-',
        appSource: item.app_source || '-',
        status: normalizeStatus(item.status),
        rawStatus: item.status,
        createdAt: item.createdAt || item.created_at,
        replyCount: Array.isArray(item.replies) ? item.replies.length : 0,
      };
    }),
  [items]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.username.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.subject.toLowerCase().includes(query) ||
        row.message.toLowerCase().includes(query) ||
        row.category.toLowerCase().includes(query)
    );
  }, [rows, searchTerm]);

  const openCount = useMemo(() => rows.filter((r) => r.status === 'open').length, [rows]);
  const inProgressCount = useMemo(() => rows.filter((r) => r.status === 'in_progress').length, [rows]);
  const resolvedCount = useMemo(() => rows.filter((r) => r.status === 'resolved').length, [rows]);

  const statCards = [
    { label: 'Total Queries', value: total, icon: MessageSquare, color: 'text-primary bg-primary/10' },
    { label: 'Open', value: openCount, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
    { label: 'In Progress', value: inProgressCount, icon: Clock, color: 'text-blue-600 bg-blue-50' },
    { label: 'Resolved', value: resolvedCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
  ];

  const confirmDelete = () => {
    if (confirmModal.id) dispatch(deleteCustomerQuery(confirmModal.id)).then(() => load(page));
    setConfirmModal({ isOpen: false, id: null });
  };

  const emptyMessage = error
    ? `Error: ${error}`
    : status === 'loading'
    ? 'Loading queries…'
    : 'No customer queries found';

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Help & Ticket</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Customer Queries</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Manage support tickets, respond to customers, and track resolution.</p>
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => load(page)}>Refresh</Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 leading-tight">{formatNumber(stat.value)}</p>
                <p className="text-[11px] text-neutral-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {/* Filters */}
          <div className="p-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, username, subject…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Dropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
              <Dropdown value={appSourceFilter} onChange={setAppSourceFilter} options={APP_SOURCE_OPTIONS} />
              {categories.length > 1 && (
                <Dropdown value={categoryFilter} onChange={setCategoryFilter} options={categories} />
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Customer</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Subject</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Message</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Source</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Date</th>
                  <th className="px-4 py-2.5 text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <RefreshCw className="w-5 h-5 text-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="group bg-white transition-colors hover:bg-neutral-50/60 cursor-pointer"
                      onClick={() => navigate(`/customer-queries/${row.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={row.name} avatarUrl={row.avatarUrl} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-800">{row.name}</p>
                            <p className="truncate text-[11px] text-neutral-400">
                              {row.username ? `@${row.username}` : row.email || row.phone || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-neutral-800 truncate max-w-[160px]">{row.subject}</p>
                        {row.category !== '-' && (
                          <p className="text-[11px] text-neutral-400 capitalize mt-0.5">{row.category}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-sm text-neutral-600 truncate">{row.message || '-'}</p>
                        {row.replyCount > 0 && (
                          <p className="text-[11px] text-primary mt-0.5">{row.replyCount} {row.replyCount === 1 ? 'reply' : 'replies'}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.appSource !== '-' ? (
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 capitalize">
                            {row.appSource}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.rawStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-500 whitespace-nowrap">{formatDate(row.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {row.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => dispatch(updateQueryStatus({ id: row.id, status: 'resolved' }))}
                              title="Mark Resolved"
                              className="p-1.5 rounded-md text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setConfirmModal({ isOpen: true, id: row.id })}
                            title="Delete"
                            className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <MessageSquare className="w-5 h-5 text-neutral-300 mx-auto" />
                      <p className="text-sm font-medium text-neutral-500 mt-2">{emptyMessage}</p>
                      <p className="text-xs text-neutral-400 mt-1">Try changing your search or filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                Page {reduxPage} of {totalPages} &middot; {formatNumber(total)} total
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                  disabled={page === 1 || status === 'loading'}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-neutral-700 px-2">{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                  disabled={page === totalPages || status === 'loading'}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Query"
        description="Are you sure you want to delete this query? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default CustomerQueries;
