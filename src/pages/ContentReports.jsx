import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  Flag,
  RefreshCw,
  Search,
  X,
  Clock,
  Eye,
  CheckCircle2,
  Ban,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Image,
  Film,
  BookOpen,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Loader2,
  Trash2,
} from 'lucide-react';
import { fetchContentReports, updateContentReport, deleteContentReport, clearUpdateStatus } from '../store/contentReportsSlice.js';
import { formatDateTime, formatNumber, formatRelativeTime, capitalize } from '../utils/helpers.jsx';
import Button from '../components/Button.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import RowActionMenu from '../components/RowActionMenu.jsx';

const PAGE_SIZE = 10;

const STATUS_MAP = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  reviewed: { label: 'Reviewed', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Eye },
  action_taken: { label: 'Action Taken', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', cls: 'bg-neutral-100 text-neutral-500 border-neutral-200', icon: Ban },
};

const CONTENT_TYPE_ICON = { post: Image, reel: Film, story: BookOpen, ad: Megaphone, comment: MessageCircle, tweet: MessagesSquare };
const CONTENT_TYPES = ['all', 'post', 'reel', 'story', 'ad', 'comment', 'tweet'];

const StatusBadge = ({ status }) => {
  const cfg = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border', cfg.cls)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
};

const Avatar = ({ name, avatarUrl, size = 8 }) => {
  const [imgError, setImgError] = useState(false);
  const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  const sizeClass = size === 10 ? 'w-10 h-10' : size === 9 ? 'w-9 h-9' : 'w-8 h-8';
  return (
    <div className={clsx(sizeClass, 'rounded-full flex-shrink-0 overflow-hidden')}>
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
          {initial}
        </div>
      )}
    </div>
  );
};

const DetailModal = ({ report, onClose, onSaved, onDelete }) => {
  const dispatch = useDispatch();
  const { updateStatus, updateError } = useSelector((s) => s.contentReports);
  const [form, setForm] = useState({
    status: report.status || 'pending',
    admin_note: report.admin_note || '',
    action_taken: report.action_taken || 'none',
  });

  useEffect(() => {
    if (updateStatus === 'succeeded') {
      onSaved();
      dispatch(clearUpdateStatus());
    }
  }, [updateStatus, dispatch, onSaved]);

  const ContentIcon = CONTENT_TYPE_ICON[report.content_type] || Image;

  const handleSave = () => {
    dispatch(updateContentReport({ id: report._id || report.id, data: form }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-neutral-100 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-0.5">Content Report</p>
            <h2 className="text-base font-bold text-neutral-900 truncate capitalize">
              {report.content_type} — {report.reason || 'No reason given'}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={report.status} />
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 capitalize">
                <ContentIcon className="w-3 h-3" /> {report.content_type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Reported By</p>
              <div className="flex items-center gap-2">
                <Avatar name={report.reporter_id?.full_name} avatarUrl={report.reporter_id?.avatar_url} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{report.reporter_id?.full_name || 'Unknown'}</p>
                  <p className="text-[11px] text-neutral-400 truncate">@{report.reporter_id?.username}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-red-50/60 border border-red-100 px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">Content Owner</p>
              <div className="flex items-center gap-2">
                <Avatar name={report.owner_id?.full_name} avatarUrl={report.owner_id?.avatar_url} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{report.owner_id?.full_name || 'Unknown'}</p>
                  <p className="text-[11px] text-neutral-400 truncate">@{report.owner_id?.username}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Reason</p>
            <p className="text-sm text-neutral-700 leading-relaxed rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
              {report.reason || '-'}
            </p>
          </div>

          {report.details && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Additional Details</p>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
                {report.details}
              </p>
            </div>
          )}

          <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Content ID</p>
            <p className="text-sm font-mono text-neutral-800 mt-0.5 truncate">{report.content_id || '-'}</p>
          </div>

          <p className="text-xs text-neutral-400">Reported on {formatDateTime(report.createdAt)}</p>

          <div className="pt-2 border-t border-neutral-100 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Review</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-neutral-500">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                >
                  {Object.entries(STATUS_MAP).map(([value, cfg]) => (
                    <option key={value} value={value}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-neutral-500">Action Taken</label>
                <input
                  type="text"
                  value={form.action_taken}
                  onChange={(e) => setForm((f) => ({ ...f, action_taken: e.target.value }))}
                  placeholder="none"
                  className="w-full h-9 px-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-neutral-500">Admin Note</label>
              <textarea
                value={form.admin_note}
                onChange={(e) => setForm((f) => ({ ...f, admin_note: e.target.value }))}
                rows={3}
                placeholder="Internal notes about this report..."
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
              />
            </div>
            {updateStatus === 'failed' && (
              <p className="text-xs text-red-600">{updateError || 'Failed to save changes'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-3 border-t border-neutral-100 flex-shrink-0 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => onDelete(report)}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-500" /> Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={updateStatus === 'loading'}>
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> Save Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContentReports = () => {
  const dispatch = useDispatch();
  const { list = [], listStatus, listError, total, deleteStatus } = useSelector((s) => s.contentReports);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [detailReport, setDetailReport] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    dispatch(fetchContentReports({ status: filterStatus, content_type: filterType, page: 1, limit: 100 }));
  };

  useEffect(() => {
    dispatch(fetchContentReports({ status: filterStatus, content_type: filterType, page: 1, limit: 100 }));
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filterStatus, filterType]);

  const handleQuickStatus = (id, status) => {
    dispatch(updateContentReport({ id, data: { status } })).then(() => load());
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      const id = deleteTarget._id || deleteTarget.id;
      dispatch(deleteContentReport(id)).then(() => setDeleteTarget(null));
    }
  };

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return list;
    return list.filter((r) => {
      return (
        (r.reason || '').toLowerCase().includes(query) ||
        (r.details || '').toLowerCase().includes(query) ||
        (r.reporter_id?.full_name || r.reporter_id?.username || '').toLowerCase().includes(query) ||
        (r.owner_id?.full_name || r.owner_id?.username || '').toLowerCase().includes(query) ||
        (r.content_id || '').toLowerCase().includes(query)
      );
    });
  }, [list, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const visibleReports = filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = list.filter((r) => r.status === 'pending').length;
  const reviewedCount = list.filter((r) => r.status === 'reviewed').length;
  const actionedCount = list.filter((r) => r.status === 'action_taken').length;

  const emptyMessage = listError
    ? `Error: ${listError}`
    : listStatus === 'loading'
    ? 'Loading content reports...'
    : 'No content reports found';

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Reports</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Content Reports</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Review content flagged by users for moderation.</p>
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={load}>
            Refresh
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Reports', value: formatNumber(total || list.length), color: 'text-primary bg-primary/10' },
            { label: 'Pending', value: formatNumber(pendingCount), color: 'text-amber-600 bg-amber-50' },
            { label: 'Reviewed', value: formatNumber(reviewedCount), color: 'text-blue-600 bg-blue-50' },
            { label: 'Action Taken', value: formatNumber(actionedCount), color: 'text-emerald-600 bg-emerald-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', stat.color)}>
                <Flag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 leading-tight">{stat.value}</p>
                <p className="text-[11px] text-neutral-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by reason, details, reporter or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-1.5 py-1.5 flex-shrink-0 flex-wrap">
            {CONTENT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all',
                  filterType === t ? 'bg-gradient-brand text-white shadow-soft' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                )}
              >
                {t === 'all' ? 'All Types' : capitalize(t)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-1.5 py-1.5 flex-shrink-0 flex-wrap w-fit">
          {['all', 'pending', 'reviewed', 'action_taken', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all',
                filterStatus === s ? 'bg-gradient-brand text-white shadow-soft' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
              )}
            >
              {s === 'all' ? 'All Status' : (STATUS_MAP[s]?.label || s)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Content</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Reason</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Reported By</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Content Owner</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Reported</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {listStatus === 'loading' ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Loader2 className="w-6 h-6 text-neutral-300 mx-auto animate-spin" />
                      <p className="text-sm font-medium text-neutral-500 mt-2">Loading content reports...</p>
                    </td>
                  </tr>
                ) : visibleReports.length > 0 ? (
                  visibleReports.map((report) => {
                    const id = report._id || report.id;
                    const ContentIcon = CONTENT_TYPE_ICON[report.content_type] || Image;
                    return (
                      <tr
                        key={id}
                        className="group bg-white transition-colors hover:bg-neutral-50/60 cursor-pointer"
                        onClick={() => setDetailReport(report)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                              <ContentIcon className="w-4 h-4 text-neutral-400" />
                            </div>
                            <div className="min-w-0 max-w-[180px]">
                              <p className="text-sm font-medium text-neutral-800 truncate capitalize">{report.content_type}</p>
                              <p className="text-[11px] text-neutral-400 font-mono truncate">{report.content_id || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-sm text-neutral-700 truncate">{report.reason || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={report.reporter_id?.full_name} avatarUrl={report.reporter_id?.avatar_url} size={8} />
                            <p className="text-sm text-neutral-700 truncate max-w-[110px]">{report.reporter_id?.full_name || 'Unknown'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={report.owner_id?.full_name} avatarUrl={report.owner_id?.avatar_url} size={8} />
                            <p className="text-sm text-neutral-700 truncate max-w-[110px]">{report.owner_id?.full_name || 'Unknown'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={report.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-neutral-500">{formatRelativeTime(report.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowActionMenu
                            ariaLabel={`Actions for content report ${id}`}
                            actions={[
                              { label: 'Review', icon: Eye, onClick: () => setDetailReport(report) },
                              report.status === 'pending' && {
                                label: 'Mark Reviewed',
                                icon: Eye,
                                onClick: () => handleQuickStatus(id, 'reviewed'),
                              },
                              (report.status !== 'rejected' && report.status !== 'action_taken') && {
                                label: 'Reject',
                                icon: Ban,
                                onClick: () => handleQuickStatus(id, 'rejected'),
                              },
                              report.status !== 'action_taken' && {
                                label: 'Mark Action Taken',
                                icon: ShieldAlert,
                                tone: 'rose',
                                onClick: () => handleQuickStatus(id, 'action_taken'),
                              },
                              { divider: true },
                              { label: 'Delete Report', icon: Trash2, tone: 'rose', onClick: () => setDeleteTarget(report) },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Flag className="w-6 h-6 text-neutral-300 mx-auto" />
                      <p className="text-sm font-medium text-neutral-500 mt-2">{emptyMessage}</p>
                      <p className="text-xs text-neutral-400 mt-1">Try changing your search or filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredReports.length > 0 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredReports.length)} of{' '}
                {formatNumber(filteredReports.length)} reports
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-neutral-700 px-2">{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {detailReport && (
        <DetailModal
          report={detailReport}
          onClose={() => setDetailReport(null)}
          onSaved={() => { setDetailReport(null); load(); }}
          onDelete={(report) => { setDetailReport(null); setDeleteTarget(report); }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Content Report?"
        description="This report will be permanently removed. This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteStatus === 'loading'}
      />
    </>
  );
};

export default ContentReports;
