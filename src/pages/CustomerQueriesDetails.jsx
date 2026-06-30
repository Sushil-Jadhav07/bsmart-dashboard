import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  assignQuery,
  clearCurrent,
  deleteCustomerQuery,
  fetchQueryById,
  replyToQuery,
  updateQueryStatus,
} from '../store/customerQueriesSlice.js';
import { fetchSalesOfficers } from '../store/salesSlice.js';
import { joinSupportRoom } from '../lib/socket.js';
import Dropdown from '../components/Dropdown.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

const avatarInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const statusConfig = {
  open: { label: 'Open', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  resolved: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', color: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
};

const normalizeStatus = (v) => {
  const key = String(v || '').toLowerCase();
  if (['resolved', 'completed', 'done'].includes(key)) return 'resolved';
  if (['in_progress', 'in-progress', 'processing'].includes(key)) return 'in_progress';
  if (key === 'closed') return 'closed';
  return 'open';
};

const StatusBadge = ({ status }) => {
  const s = statusConfig[normalizeStatus(status)] || statusConfig.open;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', s.color)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMins = Math.floor((now - d) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

const UserAvatar = ({ name, avatarUrl, size = 8, gradient = false }) => {
  const [err, setErr] = useState(false);
  return (
    <div className={clsx(`h-${size} w-${size}`, 'shrink-0 rounded-full overflow-hidden border border-neutral-200')}>
      {avatarUrl && !err ? (
        <img src={avatarUrl} alt={name} onError={() => setErr(true)} className="h-full w-full object-cover" />
      ) : (
        <div className={clsx(
          'h-full w-full flex items-center justify-center text-xs font-bold',
          gradient ? 'bg-gradient-brand text-white' : 'bg-neutral-200 text-neutral-600'
        )}>
          {avatarInitial(name)}
        </div>
      )}
    </div>
  );
};

const CustomerQueriesDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { current: item, currentStatus, replyStatus, replyError, assignStatus } = useSelector((s) => s.customerQueries);
  const officers = useSelector((s) => s.sales?.officers || []);
  const officersStatus = useSelector((s) => s.sales?.officersStatus);
  const token = useSelector((s) => s.auth?.token);

  const [replyText, setReplyText] = useState('');
  const [liveReplies, setLiveReplies] = useState([]);
  const [liveStatus, setLiveStatus] = useState(null);
  const [localStatus, setLocalStatus] = useState('');
  const [localAssignee, setLocalAssignee] = useState('');
  const [statusSaved, setStatusSaved] = useState(false);
  const [assignSaved, setAssignSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [connected, setConnected] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Load query
  useEffect(() => {
    if (id) dispatch(fetchQueryById(id));
    return () => dispatch(clearCurrent());
  }, [id, dispatch]);

  // Load officers
  useEffect(() => {
    if (officersStatus === 'idle') dispatch(fetchSalesOfficers());
  }, [officersStatus, dispatch]);

  // Sync local state when query loads
  useEffect(() => {
    if (item) {
      setLocalStatus(item.status || 'open');
      setLiveStatus(null);
      setLiveReplies([]);
      setLocalAssignee(
        typeof item.assigned_to === 'string' ? item.assigned_to : item.assigned_to?._id || ''
      );
    }
  }, [item?._id]);

  // WebSocket — join room
  useEffect(() => {
    if (!id || !token) return;
    const cleanup = joinSupportRoom(token, id, {
      onReply: (reply) => {
        if (!reply) return;
        setConnected(true);
        setLiveReplies((prev) => {
          if (reply._id && prev.some((r) => r._id === reply._id)) return prev;
          return [...prev, reply];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      },
      onStatusChange: (newStatus) => {
        if (newStatus) {
          setLiveStatus(newStatus);
          setLocalStatus(newStatus);
        }
      },
    });
    setConnected(true);
    return cleanup;
  }, [id, token]);

  // Scroll to bottom on load
  useEffect(() => {
    if (currentStatus === 'succeeded') {
      setLiveReplies([]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    }
  }, [currentStatus]);

  // Clear reply input + refresh after sending
  useEffect(() => {
    if (replyStatus === 'succeeded') {
      setReplyText('');
      if (id) dispatch(fetchQueryById(id));
    }
  }, [replyStatus, id, dispatch]);

  // Helpers
  const userObj = item?.user_id || null;
  const userName = userObj?.full_name || userObj?.username || item?.name || 'Unknown';
  const userHandle = userObj?.username || '';
  const avatarUrl = userObj?.avatar_url || null;
  const email = userObj?.email || item?.email || '';
  const phone = item?.phone || '';
  const subject = item?.subject || 'No Subject';
  const message = item?.message || '';
  const category = item?.category || '';
  const appSource = item?.app_source || '';
  const createdAt = item?.createdAt || item?.created_at;
  const serverReplies = Array.isArray(item?.replies) ? item.replies : [];

  // Merge server replies + live socket replies (deduplicated)
  const allReplies = useMemo(() => {
    const merged = [...serverReplies];
    liveReplies.forEach((lr) => {
      if (!merged.some((r) => r._id === lr._id)) merged.push(lr);
    });
    return merged;
  }, [serverReplies, liveReplies]);

  const normalizeReply = useCallback((r, i) => {
    const senderType = (r.sender_type || r.role || r.sender_role || '').toLowerCase();
    const isAdmin = senderType !== 'user';
    const senderObj = r.sender_id && typeof r.sender_id === 'object' ? r.sender_id : {};
    const senderName = senderObj.full_name || senderObj.username || r.sender_name || r.name || (isAdmin ? 'Support' : userName);
    return {
      _id: r._id || `r-${i}`,
      isAdmin,
      senderName,
      avatarUrl: isAdmin ? null : avatarUrl,
      content: r.message || r.content || r.text || '',
      time: r.createdAt || r.created_at,
    };
  }, [userName, avatarUrl]);

  const displayStatus = liveStatus || item?.status || 'open';

  const officerOptions = useMemo(() => [
    { value: '', label: 'Unassigned' },
    ...(officers || []).map((o) => ({
      value: o._id || o.id,
      label: o.full_name || o.username || o.email || 'Officer',
    })),
  ], [officers]);

  const handleSend = () => {
    const text = replyText.trim();
    if (!text || !id || replyStatus === 'loading') return;
    dispatch(replyToQuery({ id, message: text }));
  };

  const handleStatusSave = () => {
    if (!id || !localStatus) return;
    dispatch(updateQueryStatus({ id, status: localStatus })).then(() => {
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 2000);
    });
  };

  const handleAssignSave = () => {
    if (!id || !localAssignee) return;
    dispatch(assignQuery({ id, assigned_to: localAssignee })).then(() => {
      setAssignSaved(true);
      setTimeout(() => setAssignSaved(false), 2000);
    });
  };

  const handleDelete = () => {
    dispatch(deleteCustomerQuery(id)).then(() => navigate('/customer-queries', { replace: true }));
  };

  if (currentStatus === 'loading' || currentStatus === 'idle') {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (currentStatus === 'failed' || !item) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-neutral-500">Failed to load query.</p>
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-primary underline">Go back</button>
      </div>
    );
  }

  return (
    <>
      {/* Page container */}
      <div className="flex flex-col h-[calc(100vh-68px)] -m-6">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-neutral-100 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/customer-queries')}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* User info */}
          <div className="relative flex-shrink-0">
            <UserAvatar name={userName} avatarUrl={avatarUrl} size={9} gradient />
            {connected && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" title="Live" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-neutral-900">{userName}</p>
              {userHandle && <p className="text-xs text-neutral-400">@{userHandle}</p>}
              {email && <p className="text-xs text-neutral-400 hidden sm:block">{email}</p>}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-sm font-medium text-neutral-700 truncate max-w-[260px]">{subject}</p>
              <StatusBadge status={displayStatus} />
              {category && (
                <span className="hidden sm:inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 capitalize">
                  {category}
                </span>
              )}
              {appSource && (
                <span className="hidden sm:inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 capitalize">
                  {appSource}
                </span>
              )}
            </div>
          </div>

          {/* Quick resolve */}
          {normalizeStatus(displayStatus) !== 'resolved' && (
            <button
              type="button"
              onClick={() => dispatch(updateQueryStatus({ id, status: 'resolved' }))}
              title="Mark Resolved"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition flex-shrink-0"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Resolve
            </button>
          )}
        </div>

        {/* ── Main area ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Chat column ── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/40">

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-4">

              {/* Original query bubble */}
              <div className="flex gap-3 items-end">
                <UserAvatar name={userName} avatarUrl={avatarUrl} size={8} />
                <div className="max-w-[70%]">
                  <p className="text-[11px] font-medium text-neutral-500 mb-1 px-1">{userName}</p>
                  <div className="rounded-2xl rounded-bl-sm bg-white border border-neutral-200 px-4 py-3 text-sm text-neutral-800 leading-relaxed shadow-sm">
                    {message || <span className="italic text-neutral-400">No message</span>}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1 px-1">{formatDate(createdAt)}</p>
                </div>
              </div>

              {/* Replies */}
              {allReplies.map((r, i) => {
                const msg = normalizeReply(r, i);
                return (
                  <div
                    key={msg._id}
                    className={clsx('flex gap-3 items-end', msg.isAdmin && 'flex-row-reverse')}
                  >
                    {/* Avatar */}
                    {msg.isAdmin ? (
                      <div className="h-8 w-8 rounded-full bg-gradient-brand flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-sm">
                        {avatarInitial(msg.senderName)}
                      </div>
                    ) : (
                      <UserAvatar name={msg.senderName} avatarUrl={msg.avatarUrl} size={8} />
                    )}

                    {/* Bubble */}
                    <div className={clsx('max-w-[70%]', msg.isAdmin && 'flex flex-col items-end')}>
                      <p className={clsx('text-[11px] font-medium mb-1 px-1', msg.isAdmin ? 'text-primary/70 text-right' : 'text-neutral-500')}>
                        {msg.senderName}
                      </p>
                      <div className={clsx(
                        'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                        msg.isAdmin
                          ? 'bg-gradient-brand text-white rounded-br-sm'
                          : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm'
                      )}>
                        {msg.content || <span className="opacity-60 italic">…</span>}
                      </div>
                      <p className={clsx('text-[10px] mt-1 px-1', msg.isAdmin ? 'text-neutral-400 text-right' : 'text-neutral-400')}>
                        {formatDate(msg.time)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Sending indicator */}
              {replyStatus === 'loading' && (
                <div className="flex gap-3 items-end flex-row-reverse">
                  <div className="h-8 w-8 rounded-full bg-gradient-brand flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                    A
                  </div>
                  <div className="bg-gradient-brand/20 rounded-2xl rounded-br-sm px-4 py-3">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '240ms' }} />
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <div className="px-4 sm:px-8 py-4 bg-white border-t border-neutral-100 flex-shrink-0">
              {replyError && <p className="text-xs text-rose-600 mb-2">{replyError}</p>}
              <div className="flex items-end gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-brand flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                  A
                </div>
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); }}
                    placeholder="Type a reply… (Ctrl+Enter to send)"
                    rows={2}
                    className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 pr-12 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!replyText.trim() || replyStatus === 'loading'}
                    className="absolute right-2 bottom-2 h-8 w-8 flex items-center justify-center rounded-xl bg-gradient-brand text-white hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-64 flex-shrink-0 border-l border-neutral-100 bg-white overflow-y-auto">
            <div className="p-4 space-y-5">

              {/* Status */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Update Status</p>
                <Dropdown
                  value={localStatus}
                  onChange={setLocalStatus}
                  options={STATUS_OPTIONS}
                  fullWidth
                />
                <button
                  type="button"
                  onClick={handleStatusSave}
                  className={clsx(
                    'mt-2 w-full rounded-xl py-2 text-xs font-semibold transition',
                    statusSaved ? 'bg-emerald-50 text-emerald-700' : 'bg-primary text-white hover:bg-primary/90'
                  )}
                >
                  {statusSaved ? '✓ Saved' : 'Save Status'}
                </button>
              </div>

              {/* Assign */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Assign To</p>
                {officersStatus === 'loading' ? (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 py-2">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Loading…
                  </div>
                ) : (
                  <Dropdown
                    value={localAssignee}
                    onChange={setLocalAssignee}
                    options={officerOptions}
                    placeholder="Select officer"
                    fullWidth
                  />
                )}
                <button
                  type="button"
                  onClick={handleAssignSave}
                  disabled={!localAssignee || assignStatus === 'loading'}
                  className={clsx(
                    'mt-2 w-full rounded-xl py-2 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed',
                    assignSaved ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-800 text-white hover:bg-neutral-700'
                  )}
                >
                  {assignStatus === 'loading' ? 'Assigning…' : assignSaved ? '✓ Assigned' : 'Assign'}
                </button>
              </div>

              {/* Current assignee */}
              {item.assigned_to && (
                <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Assigned To</p>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-neutral-500" />
                    </div>
                    <p className="text-xs font-medium text-neutral-700 truncate">
                      {(() => {
                        if (typeof item.assigned_to === 'object' && item.assigned_to !== null) {
                          return item.assigned_to.full_name || item.assigned_to.username || item.assigned_to.email;
                        }
                        const found = officers.find((o) => (o._id || o.id) === item.assigned_to);
                        return found ? (found.full_name || found.username) : `…${String(item.assigned_to).slice(-6)}`;
                      })()}
                    </p>
                  </div>
                </div>
              )}

              {/* Query info */}
              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Details</p>
                {category && (
                  <div>
                    <p className="text-[10px] text-neutral-400">Category</p>
                    <p className="text-xs font-medium text-neutral-700 capitalize mt-0.5">{category}</p>
                  </div>
                )}
                {appSource && (
                  <div>
                    <p className="text-[10px] text-neutral-400">App Source</p>
                    <p className="text-xs font-medium text-neutral-700 capitalize mt-0.5">{appSource}</p>
                  </div>
                )}
                {phone && (
                  <div>
                    <p className="text-[10px] text-neutral-400">Phone</p>
                    <p className="text-xs font-medium text-neutral-700 mt-0.5">{phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-neutral-400">Created</p>
                  <p className="text-xs font-medium text-neutral-700 mt-0.5">{formatDate(createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400">Replies</p>
                  <p className="text-xs font-medium text-neutral-700 mt-0.5">{allReplies.length}</p>
                </div>
              </div>

              {/* Delete */}
              <div className="border-t border-neutral-100 pt-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Query
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Query"
        description="Are you sure you want to delete this query? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default CustomerQueriesDetails;
