import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ChevronLeft, CheckCircle2, Ban, Clock, Bug, Loader2, AlertCircle,
  User, Smartphone, Monitor, Apple, Save, AlertTriangle, Wifi, Ticket, Trash2,
} from 'lucide-react';
import { fetchBugReportById, updateBugReport, deleteBugReport, clearCurrent, clearUpdateStatus } from '../store/bugReportsSlice.js';
import { formatDateTime } from '../utils/helpers.jsx';
import Button from '../components/Button.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

const STATUS_MAP = {
  new: { label: 'New', cls: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-100', icon: Loader2 },
  fixed: { label: 'Fixed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
  closed: { label: 'Closed', cls: 'bg-neutral-100 text-neutral-500 border-neutral-200', icon: Ban },
};

const PRIORITY_MAP = {
  critical: { label: 'Critical', cls: 'bg-red-50 text-red-700 border-red-100' },
  high: { label: 'High', cls: 'bg-orange-50 text-orange-700 border-orange-100' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  low: { label: 'Low', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
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

const OS_ICON = { android: Smartphone, ios: Apple, web: Monitor };

const formatNetworkType = (value) => {
  if (!value) return '-';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const AttachmentThumb = ({ attachment }) => {
  const [loaded, setLoaded] = useState(false);
  const isVideo = attachment.type === 'video';
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block aspect-video rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100"
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-neutral-300 animate-spin" />
        </div>
      )}
      {isVideo ? (
        <video
          src={attachment.url}
          onLoadedData={() => setLoaded(true)}
          className={clsx('w-full h-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
          muted
        />
      ) : (
        <img
          src={attachment.url}
          alt=""
          onLoad={() => setLoaded(true)}
          className={clsx('w-full h-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </a>
  );
};

export default function BugReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { current, currentStatus, currentError, updateStatus, updateError, deleteStatus } = useSelector((s) => s.bugReports);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [form, setForm] = useState({ status: '', priority: '', assigned_to: '', admin_note: '' });
  const [saveMessage, setSaveMessage] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchBugReportById(id));
    return () => dispatch(clearCurrent());
  }, [dispatch, id]);

  useEffect(() => {
    if (current) {
      setForm({
        status: current.status || 'new',
        priority: current.priority || 'medium',
        assigned_to: current.assigned_to || '',
        admin_note: current.admin_note || '',
      });
    }
  }, [current]);

  useEffect(() => {
    setHeroLoaded(false);
  }, [current?._id]);

  useEffect(() => {
    if (updateStatus === 'succeeded') {
      setSaveMessage('Changes saved successfully');
      dispatch(clearUpdateStatus());
      const t = setTimeout(() => setSaveMessage(''), 2500);
      return () => clearTimeout(t);
    } else if (updateStatus === 'failed') {
      setSaveMessage(updateError || 'Failed to save changes');
      const t = setTimeout(() => setSaveMessage(''), 2500);
      return () => clearTimeout(t);
    }
  }, [updateStatus, updateError, dispatch]);

  const status = useMemo(() => current?.status || 'new', [current]);
  const statusConfig = STATUS_MAP[status] || STATUS_MAP.new;
  const StatusIcon = statusConfig.icon;
  const priorityConfig = PRIORITY_MAP[current?.priority] || PRIORITY_MAP.low;
  const attachments = Array.isArray(current?.attachments) ? current.attachments : [];
  const heroAttachment = attachments.find((a) => a.type === 'image') || attachments[0] || null;
  const reporter = current?.reporter_id || current?.user_id || current?.user || {};
  const OsIcon = OS_ICON[current?.os_type] || Monitor;

  const isLoading = currentStatus === 'idle' || currentStatus === 'loading';

  const handleSave = () => {
    if (!id) return;
    dispatch(updateBugReport({ id, data: form }));
  };

  const handleDelete = () => {
    if (!id) return;
    dispatch(deleteBugReport(id)).then((result) => {
      if (result.error) {
        setConfirmDeleteOpen(false);
        setSaveMessage(result.payload || 'Failed to delete report');
        setTimeout(() => setSaveMessage(''), 2500);
      } else {
        navigate('/reports/bugs');
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/reports/bugs')}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-800 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Bug Reports
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
            Delete
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={updateStatus === 'loading'}>
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading bug report…</p>
        </div>
      )}

      {!isLoading && currentError && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="font-semibold text-neutral-800">Could not load bug report</p>
          <p className="text-sm text-neutral-400">{currentError}</p>
        </div>
      )}

      {!isLoading && !currentError && current && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* LEFT column */}
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              {heroAttachment?.url && heroAttachment.type !== 'video' ? (
                <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-gradient-to-br from-rose-500 to-orange-600">
                  <img
                    src={heroAttachment.url}
                    alt=""
                    aria-hidden="true"
                    className={clsx(
                      'absolute inset-0 w-full h-full object-cover scale-110 blur-2xl transition-opacity duration-300',
                      heroLoaded ? 'opacity-40' : 'opacity-0'
                    )}
                  />
                  {!heroLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
                    </div>
                  )}
                  <img
                    src={heroAttachment.url}
                    alt="Bug attachment"
                    onLoad={() => setHeroLoaded(true)}
                    className={clsx(
                      'relative w-full h-full object-contain transition-opacity duration-300',
                      heroLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </div>
              ) : (
                <div className="relative h-32 w-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center">
                  <AlertTriangle className="w-12 h-12 text-white/30" />
                </div>
              )}
              <div className="px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-primary">
                      <Ticket className="w-4 h-4" />
                      <h1 className="text-xl font-bold text-neutral-900">{current.ticket_id || `#${(current._id || '').slice(-8)}`}</h1>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-neutral-500">
                      <Bug className="w-4 h-4" />
                      {CATEGORY_LABELS[current.category] || current.category || 'Uncategorized'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border', statusConfig.cls)}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </span>
                    <span className={clsx('inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full border', priorityConfig.cls)}>
                      {priorityConfig.label} Priority
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100">
                <h2 className="text-sm font-semibold text-neutral-800">Description</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {current.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-neutral-100">
                  <h2 className="text-sm font-semibold text-neutral-800">
                    Attachments <span className="text-neutral-400 font-normal">({attachments.length})</span>
                  </h2>
                </div>
                <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attachments.map((att, i) => (
                    <AttachmentThumb key={att.url || i} attachment={att} />
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100">
                <h2 className="text-sm font-semibold text-neutral-800">Device Info</h2>
              </div>
              <div className="px-6 py-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3.5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">OS</p>
                  <p className="text-sm text-neutral-800 mt-0.5 inline-flex items-center gap-1.5 capitalize">
                    <OsIcon className="w-3.5 h-3.5 text-neutral-400" /> {current.os_type || '-'} {current.os_version || ''}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3.5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Device Model</p>
                  <p className="text-sm text-neutral-800 mt-0.5">{current.device_model || '-'}</p>
                </div>
                <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3.5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">App Version</p>
                  <p className="text-sm text-neutral-800 mt-0.5">{current.app_version || '-'}</p>
                </div>
                <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3.5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Network</p>
                  <p className="text-sm text-neutral-800 mt-0.5 inline-flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-neutral-400" /> {formatNetworkType(current.network_type)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div className="space-y-6 lg:sticky lg:top-6">
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-800">Reporter</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {(reporter.full_name || reporter.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 truncate">
                      {reporter.full_name || reporter.username || 'Unknown User'}
                    </p>
                    {reporter.username && <p className="text-[11px] text-neutral-400 truncate">@{reporter.username}</p>}
                    {reporter.email && <p className="text-[11px] text-neutral-400 truncate">{reporter.email}</p>}
                  </div>
                </div>
                <div className="pt-2 space-y-2 border-t border-neutral-100">
                  {current.createdAt && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-neutral-500">Reported</span>
                      <span className="text-xs text-neutral-600">{formatDateTime(current.createdAt)}</span>
                    </div>
                  )}
                  {current.updatedAt && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-neutral-500">Updated</span>
                      <span className="text-xs text-neutral-600">{formatDateTime(current.updatedAt)}</span>
                    </div>
                  )}
                  {current.resolved_at && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-neutral-500">Resolved</span>
                      <span className="text-xs text-neutral-600">{formatDateTime(current.resolved_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-800">Manage</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Status</label>
                  <Dropdown
                    value={form.status}
                    onChange={(val) => setForm((f) => ({ ...f, status: val }))}
                    fullWidth
                    options={Object.entries(STATUS_MAP).map(([value, cfg]) => ({ value, label: cfg.label }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Priority</label>
                  <Dropdown
                    value={form.priority}
                    onChange={(val) => setForm((f) => ({ ...f, priority: val }))}
                    fullWidth
                    options={Object.entries(PRIORITY_MAP).map(([value, cfg]) => ({ value, label: cfg.label }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Assigned To</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      value={form.assigned_to || ''}
                      onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                      placeholder="Admin name or ID"
                      className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Admin Note</label>
                  <textarea
                    value={form.admin_note}
                    onChange={(e) => setForm((f) => ({ ...f, admin_note: e.target.value }))}
                    rows={4}
                    placeholder="Internal notes about this bug..."
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={handleSave}
                  loading={updateStatus === 'loading'}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!!saveMessage && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft',
          updateStatus === 'succeeded'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        )}>
          {saveMessage}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Bug Report?"
        description={`Ticket ${current?.ticket_id || ''} will be permanently removed. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteStatus === 'loading'}
      />
    </div>
  );
}
