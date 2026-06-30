import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Mail,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import { fetchInquiries, fetchInquiryById, deleteInquiry, clearCurrent } from '../store/inquiriesSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import Dropdown from '../components/Dropdown.jsx';
import Button from '../components/Button.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

const PAGE_LIMIT = 20;

const avatarInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

const normalizeStatus = (value) => {
  const key = String(value || '').trim().toLowerCase();
  if (['resolved', 'closed', 'completed', 'done'].includes(key)) return 'resolved';
  if (['in_progress', 'in-progress', 'processing', 'ongoing'].includes(key)) return 'in_progress';
  return 'open';
};

const statusConfig = {
  open: { label: 'Open', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  resolved: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};

const StatusBadge = ({ status }) => {
  const s = statusConfig[normalizeStatus(status)] || statusConfig.open;
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
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
          {avatarInitial(name)}
        </div>
      )}
    </div>
  );
};

const DetailModal = ({ isOpen, onClose, onDelete }) => {
  const dispatch = useDispatch();
  const { current, currentStatus } = useSelector((s) => s.inquiries);

  const item = current;
  const userObj = item?.user_id || null;
  const userName = userObj?.full_name || userObj?.username || item?.name || '-';
  const userHandle = userObj?.username || '';
  const avatarUrl = userObj?.avatar_url || null;
  const email = userObj?.email || item?.email || '';
  const phone = item?.phone || '';
  const subject = item?.subject || 'No Subject';
  const message = item?.message || '-';
  const category = item?.category || '-';
  const appSource = item?.app_source || '-';
  const status = item?.status || '-';
  const createdAt = item?.createdAt || item?.created_at;
  const replies = Array.isArray(item?.replies) ? item.replies : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-neutral-100 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-0.5">Inquiry Detail</p>
            <h2 className="text-base font-bold text-neutral-900 truncate">{subject}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={status} />
              {category !== '-' && (
                <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 capitalize">
                  {category}
                </span>
              )}
              {appSource !== '-' && (
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 capitalize">
                  {appSource}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {currentStatus === 'loading' ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !item ? (
            <p className="text-sm text-neutral-500 text-center py-16">Failed to load inquiry details.</p>
          ) : (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <UserAvatar name={userName} avatarUrl={avatarUrl} size={10} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-800">{userName}</p>
                  {userHandle && <p className="text-[11px] text-neutral-400">@{userHandle}</p>}
                  {email && <p className="text-[11px] text-neutral-500">{email}</p>}
                  {phone && <p className="text-[11px] text-neutral-400">{phone}</p>}
                </div>
                <p className="text-xs text-neutral-400 ml-auto whitespace-nowrap flex-shrink-0">{formatDate(createdAt)}</p>
              </div>

              {/* Message */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Message</p>
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
                  {message}
                </p>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Replies ({replies.length})
                  </p>
                  <div className="space-y-3">
                    {replies.map((reply, i) => {
                      const isAdmin = reply.sender_role === 'admin' || reply.role === 'admin';
                      return (
                        <div
                          key={reply._id || i}
                          className={clsx(
                            'flex gap-2.5',
                            isAdmin && 'flex-row-reverse'
                          )}
                        >
                          <div className={clsx(
                            'h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold',
                            isAdmin ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-600'
                          )}>
                            {avatarInitial(reply.sender_name || reply.name || (isAdmin ? 'A' : 'U'))}
                          </div>
                          <div className={clsx(
                            'rounded-xl px-3 py-2 text-sm max-w-[80%]',
                            isAdmin ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-neutral-700'
                          )}>
                            <p className="leading-relaxed">{reply.message || reply.content || '-'}</p>
                            <p className={clsx('text-[10px] mt-1', isAdmin ? 'text-primary/60' : 'text-neutral-400')}>
                              {formatDate(reply.createdAt || reply.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {item && (
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-neutral-100 flex-shrink-0">
            <button
              type="button"
              onClick={() => onDelete(item._id || item.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const Inquiries = () => {
  const dispatch = useDispatch();
  const { items, total, page: reduxPage, totalPages, status, error } = useSelector((s) => s.inquiries);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(
    (p = 1) => {
      dispatch(fetchInquiries({ page: p, limit: PAGE_LIMIT }));
    },
    [dispatch]
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  const rows = useMemo(() =>
    (items || []).map((item) => {
      const user = item.user_id || null;
      const name = user?.full_name || user?.username || item.name || '-';
      return {
        id: item._id || item.id,
        name,
        username: user?.username || '',
        email: user?.email || item.email || '',
        phone: item.phone || '',
        avatarUrl: user?.avatar_url || null,
        subject: item.subject || 'General Inquiry',
        message: item.message || item.description || '',
        category: item.category || '-',
        appSource: item.app_source || '-',
        status: normalizeStatus(item.status),
        createdAt: item.createdAt || item.created_at,
      };
    }),
  [items]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesSearch = !query ||
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.subject.toLowerCase().includes(query) ||
        row.message.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [rows, searchTerm, statusFilter]);

  const openCount = useMemo(() => rows.filter((r) => r.status === 'open').length, [rows]);
  const inProgressCount = useMemo(() => rows.filter((r) => r.status === 'in_progress').length, [rows]);
  const resolvedCount = useMemo(() => rows.filter((r) => r.status === 'resolved').length, [rows]);

  const statCards = [
    { label: 'Total Inquiries', value: total, icon: Inbox, color: 'text-primary bg-primary/10' },
    { label: 'Open', value: openCount, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'In Progress', value: inProgressCount, icon: Mail, color: 'text-blue-600 bg-blue-50' },
    { label: 'Resolved', value: resolvedCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
  ];

  const handleViewDetail = (id) => {
    dispatch(fetchInquiryById(id));
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    dispatch(clearCurrent());
  };

  const handleDeleteFromDetail = (id) => {
    setDetailOpen(false);
    dispatch(clearCurrent());
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = () => {
    if (confirmModal.id) {
      dispatch(deleteInquiry(confirmModal.id)).then(() => load(page));
    }
    setConfirmModal({ isOpen: false, id: null });
  };

  const emptyMessage = error
    ? `Error: ${error}`
    : status === 'loading'
    ? 'Loading inquiries...'
    : 'No inquiries found';

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Help & Ticket</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Inquiries</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Track and manage website inquiry submissions.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={status === 'loading' ? RefreshCw : RefreshCw}
            onClick={() => load(page)}
          >
            Refresh
          </Button>
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
          {/* Filter bar */}
          <div className="p-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, email, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            <Dropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">User</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Subject</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Message</th>
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
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <RefreshCw className="w-5 h-5 text-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="group bg-white transition-colors hover:bg-neutral-50/60 cursor-pointer"
                      onClick={() => handleViewDetail(row.id)}
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
                        <p className="text-sm font-medium text-neutral-800 truncate max-w-[180px]">{row.subject}</p>
                        {row.category !== '-' && (
                          <p className="text-[11px] text-neutral-400 capitalize mt-0.5">{row.category}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="text-sm text-neutral-600 truncate">{row.message || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-500 whitespace-nowrap">{formatDate(row.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
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
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Inbox className="w-5 h-5 text-neutral-300 mx-auto" />
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

      <DetailModal
        isOpen={detailOpen}
        onClose={handleCloseDetail}
        onDelete={handleDeleteFromDetail}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Inquiry"
        description="Are you sure you want to delete this inquiry? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default Inquiries;
