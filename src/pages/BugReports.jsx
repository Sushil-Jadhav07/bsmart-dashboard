import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  Bug,
  RefreshCw,
  Search,
  X,
  Clock,
  Loader2,
  CheckCircle2,
  Ban,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  AlertTriangle,
  Smartphone,
  Monitor,
  Apple,
  Trash2,
} from 'lucide-react';
import { fetchBugReports, updateBugReport, deleteBugReport } from '../store/bugReportsSlice.js';
import { formatNumber, formatRelativeTime } from '../utils/helpers.jsx';
import Button from '../components/Button.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import RowActionMenu from '../components/RowActionMenu.jsx';

const STATUS_MAP = {
  new: { label: 'New', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  fixed: { label: 'Fixed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  closed: { label: 'Closed', cls: 'bg-neutral-100 text-neutral-500 border-neutral-200', icon: Ban },
};

const PRIORITY_MAP = {
  critical: { label: 'Critical', cls: 'bg-red-50 text-red-700 border-red-200' },
  high: { label: 'High', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Low', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const CATEGORY_LABELS = {
  app_crash: 'App Crash',
  video_not_playing: 'Video Not Playing',
  login_issue: 'Login Issue',
  payment_issue: 'Payment Issue',
  rewards_issue: 'Rewards Issue',
  upload_issue: 'Upload Issue',
  ui_problem: 'UI Problem',
  other: 'Other',
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_MAP[status] || STATUS_MAP.new;
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border', cfg.cls)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const cfg = PRIORITY_MAP[priority] || PRIORITY_MAP.low;
  return (
    <span className={clsx('inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border', cfg.cls)}>
      {cfg.label}
    </span>
  );
};

const OS_ICON = { android: Smartphone, ios: Apple, web: Monitor };

const getReporter = (r) => r.reporter_id || r.user_id || r.user || r.reported_by || r.reporter || {};
const getReporterName = (r) => {
  const user = getReporter(r);
  return user.full_name || user.username || user.email || 'Unknown';
};
const getReporterEmail = (r) => getReporter(r).email || '';

const getFirstAttachment = (r) => (Array.isArray(r.attachments) && r.attachments[0]) || null;

const BugReports = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list = [], listStatus, listError, total, deleteStatus } = useSelector((s) => s.bugReports);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    dispatch(fetchBugReports({ status: filterStatus, page: 1, limit: 100 }));
  };

  useEffect(() => {
    dispatch(fetchBugReports({ status: filterStatus, page: 1, limit: 100 }));
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filterStatus]);

  const handleQuickStatus = (id, status) => {
    dispatch(updateBugReport({ id, data: { status } })).then(() => load());
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      const id = deleteTarget._id || deleteTarget.id;
      dispatch(deleteBugReport(id)).then(() => setDeleteTarget(null));
    }
  };

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return list;
    return list.filter((r) => {
      return (
        (r.description || '').toLowerCase().includes(query) ||
        (r.ticket_id || '').toLowerCase().includes(query) ||
        (CATEGORY_LABELS[r.category] || r.category || '').toLowerCase().includes(query) ||
        getReporterName(r).toLowerCase().includes(query)
      );
    });
  }, [list, searchTerm]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const visibleReports = filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const newCount = list.filter((r) => r.status === 'new').length;
  const inProgressCount = list.filter((r) => r.status === 'in_progress').length;
  const fixedCount = list.filter((r) => r.status === 'fixed').length;

  const emptyMessage = listError
    ? `Error: ${listError}`
    : listStatus === 'loading'
    ? 'Loading bug reports...'
    : 'No bug reports found';

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Reports</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Bug Reports</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Review and triage bugs reported by users.</p>
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={load}>
            Refresh
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Reports', value: formatNumber(total || list.length), color: 'text-primary bg-primary/10' },
            { label: 'New', value: formatNumber(newCount), color: 'text-amber-600 bg-amber-50' },
            { label: 'In Progress', value: formatNumber(inProgressCount), color: 'text-blue-600 bg-blue-50' },
            { label: 'Fixed', value: formatNumber(fixedCount), color: 'text-emerald-600 bg-emerald-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', stat.color)}>
                <Bug className="w-4 h-4" />
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
              placeholder="Search by ticket ID, description or reporter..."
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
            {['all', 'new', 'in_progress', 'fixed', 'closed'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all',
                  filterStatus === s ? 'bg-gradient-brand text-white shadow-soft' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                )}
              >
                {s === 'all' ? 'All' : (STATUS_MAP[s]?.label || s)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Ticket</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Reporter</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Priority</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">OS</th>
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
                      <p className="text-sm font-medium text-neutral-500 mt-2">Loading bug reports...</p>
                    </td>
                  </tr>
                ) : visibleReports.length > 0 ? (
                  visibleReports.map((report) => {
                    const id = report._id || report.id;
                    const OsIcon = OS_ICON[report.os_type] || Monitor;
                    const attachment = getFirstAttachment(report);
                    return (
                      <tr
                        key={id}
                        className="group bg-white transition-colors hover:bg-neutral-50/60 cursor-pointer"
                        onClick={() => navigate(`/reports/bugs/${id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {attachment?.url ? (
                              <img
                                src={attachment.url}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover border border-neutral-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              </div>
                            )}
                            <div className="min-w-0 max-w-[220px]">
                              <p className="text-sm font-mono font-medium text-neutral-800 truncate">{report.ticket_id || `#${(id || '').slice(-8)}`}</p>
                              <p className="text-[11px] text-neutral-400 truncate">{CATEGORY_LABELS[report.category] || report.category || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-neutral-700 truncate max-w-[160px]">{getReporterName(report)}</p>
                          <p className="text-[11px] text-neutral-400 truncate max-w-[160px]">{getReporterEmail(report)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={report.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-neutral-600 capitalize">
                            <OsIcon className="w-3.5 h-3.5 text-neutral-400" /> {report.os_type || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={report.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-neutral-500">{formatRelativeTime(report.createdAt || report.created_at)}</span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowActionMenu
                            ariaLabel={`Actions for bug report ${id}`}
                            actions={[
                              { label: 'View Details', icon: Eye, onClick: () => navigate(`/reports/bugs/${id}`) },
                              report.status === 'new' && {
                                label: 'Mark In Progress',
                                icon: Loader2,
                                onClick: () => handleQuickStatus(id, 'in_progress'),
                              },
                              (report.status === 'new' || report.status === 'in_progress') && {
                                label: 'Mark Fixed',
                                icon: CheckCircle2,
                                onClick: () => handleQuickStatus(id, 'fixed'),
                              },
                              report.status !== 'closed' && {
                                label: 'Close',
                                icon: Ban,
                                onClick: () => handleQuickStatus(id, 'closed'),
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
                      <Bug className="w-6 h-6 text-neutral-300 mx-auto" />
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

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Bug Report?"
        description={`Ticket ${deleteTarget?.ticket_id || ''} will be permanently removed. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteStatus === 'loading'}
      />
    </>
  );
};

export default BugReports;
