import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertTriangle, CheckCheck, CheckCircle2, Clock, Download, Eye, Inbox, Layers, MessageSquare, MoreVertical, Timer, Trash2, UserCheck, X, Zap,
} from 'lucide-react';
import { Chip, OutlineButton, Pager, RefreshButton, SearchInput, Select, StatCard, StateRow, Th } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { assignQuery, deleteCustomerQuery, fetchAllCustomerQueries, updateQueryStatus } from '../store/customerQueriesSlice.js';
import { fetchSalesOfficers } from '../store/salesSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import { prefRows } from '../utils/consolePrefs.js';

const HOUR = 3600 * 1000;
const SLA_HOURS = 24;
const FIRST_RESPONSE_TARGET_H = 4;

const STATUS = {
  open: { label: 'Open', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  in_progress: { label: 'In Progress', cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', cls: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
};
const CATEGORY = {
  account: { label: 'Account', cls: 'bg-purple-100 text-[#8E35B5]' },
  payment: { label: 'Payment', cls: 'bg-pink-100 text-[#C81345]' },
  technical: { label: 'Technical', cls: 'bg-indigo-50 text-indigo-700' },
  general: { label: 'General', cls: 'bg-[#E9EBFA] text-neutral-700' },
  other: { label: 'Other', cls: 'bg-amber-50 text-amber-700' },
};
const SOURCE = { bsmart: 'B-smart app', ruvees: 'Ruvees app' };

const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || '') : ref ? String(ref) : '');
const ticketNo = (id) => `#TCK-${String(id).slice(-5).toUpperCase()}`;
const ago = (ms) => {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60000))}m`;
  if (ms < DAY_MS) return `${Math.round(ms / HOUR)}h`;
  return `${Math.round(ms / DAY_MS)}d`;
};
const duration = (ms) => {
  if (!Number.isFinite(ms)) return '—';
  if (ms < HOUR) return `${Math.round(ms / 60000)} min`;
  if (ms < DAY_MS) return `${(ms / HOUR).toFixed(1)} hrs`;
  return `${(ms / DAY_MS).toFixed(1)} days`;
};

const Avatar = ({ src, name, size = 'h-8 w-8' }) => {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className={clsx(size, 'flex-shrink-0 rounded-full object-cover')} />
    : <span className={clsx(size, 'flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-white')}>{String(name || '?').trim()[0]?.toUpperCase() || '?'}</span>;
};

const RowMenu = ({ row, onView, onStatus, onAssignMe, onDelete }) => {
  const [open, setOpen] = useState(false);
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50';
  const act = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Actions for ${row.ticket}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-[#EEF0FA]"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={act(onView)} className={item}><Eye className="h-3.5 w-3.5 text-neutral-400" /> Open ticket</button>
            <button type="button" onClick={act(onAssignMe)} className={item}><UserCheck className="h-3.5 w-3.5 text-neutral-400" /> Assign to me</button>
            {row.status !== 'in_progress' && row.status !== 'closed' && <button type="button" onClick={act(() => onStatus('in_progress'))} className={item}><Clock className="h-3.5 w-3.5 text-neutral-400" /> Mark in progress</button>}
            {row.status !== 'resolved' && <button type="button" onClick={act(() => onStatus('resolved'))} className={clsx(item, 'text-emerald-700')}><CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved</button>}
            {row.status !== 'closed' && <button type="button" onClick={act(() => onStatus('closed'))} className={item}><X className="h-3.5 w-3.5 text-neutral-400" /> Close ticket</button>}
            <button type="button" onClick={act(onDelete)} className={clsx(item, 'text-red-600 hover:bg-red-50')}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>
        </>
      )}
    </div>
  );
};

const CustomerQueries = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total, status, error } = useSelector((s) => s.customerQueries);
  const me = useSelector((s) => s.auth.user);
  const officers = useSelector((s) => s.sales?.officers || []);
  const officersStatus = useSelector((s) => s.sales?.officersStatus);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [source, setSource] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => prefRows(10));
  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // { ids: [] }
  const [toast, setToast] = useState(null);

  const load = () => dispatch(fetchAllCustomerQueries());
  useEffect(() => { dispatch(fetchAllCustomerQueries()); }, [dispatch]);
  useEffect(() => { if (officersStatus === 'idle') dispatch(fetchSalesOfficers()); }, [officersStatus, dispatch]);

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2800); };

  const rows = useMemo(() => {
    const now = Date.now();
    return (items || []).map((q) => {
      const user = q.user_id && typeof q.user_id === 'object' ? q.user_id : null;
      const replies = Array.isArray(q.replies) ? q.replies : [];
      const staffReplies = replies.filter((r) => r.sender_type === 'admin' || r.sender_type === 'sales');
      const created = new Date(q.createdAt).getTime();
      const firstStaff = staffReplies.length ? new Date(staffReplies[0].createdAt).getTime() : null;
      const last = replies.length ? replies[replies.length - 1] : null;
      const status = STATUS[q.status] ? q.status : 'open';
      const awaitingStaff = (status === 'open' || status === 'in_progress') && (!last || last.sender_type === 'user');
      const waitingSince = last && last.sender_type === 'user' ? new Date(last.createdAt).getTime() : created;
      const assigned = q.assigned_to && typeof q.assigned_to === 'object' ? q.assigned_to : null;
      return {
        id: String(q._id),
        ticket: ticketNo(q._id),
        name: user?.full_name || q.name || user?.username || 'Guest',
        username: user?.username || '',
        contact: q.email || q.phone || '',
        avatar: user?.avatar_url ? toAbsoluteMediaUrl(user.avatar_url) : '',
        userId: user?._id ? String(user._id) : '',
        guest: !user,
        subject: q.subject || 'General query',
        message: q.message || '',
        category: q.category || 'other',
        source: q.app_source || '',
        status,
        replies: replies.length,
        staffReplies: staffReplies.length,
        firstResponseMs: firstStaff && Number.isFinite(created) ? firstStaff - created : null,
        awaitingStaff,
        waitingMs: Number.isFinite(waitingSince) ? now - waitingSince : 0,
        overdue: awaitingStaff && now - waitingSince > SLA_HOURS * HOUR,
        assigneeId: idOf(q.assigned_to),
        assigneeName: assigned ? assigned.full_name || assigned.username : q.assigned_to ? 'Staff member' : '',
        assigneeAvatar: assigned?.avatar_url ? toAbsoluteMediaUrl(assigned.avatar_url) : '',
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        ageMs: Number.isFinite(created) ? now - created : 0,
      };
    });
  }, [items]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === 'open' || r.status === 'in_progress');
    const done = rows.filter((r) => r.status === 'resolved' || r.status === 'closed');
    const firstTouch = done.filter((r) => r.staffReplies <= 1).length;
    const responded = rows.filter((r) => r.firstResponseMs !== null && r.firstResponseMs >= 0);
    const avgFirst = responded.length ? responded.reduce((s, r) => s + r.firstResponseMs, 0) / responded.length : null;
    const withinTarget = responded.filter((r) => r.firstResponseMs <= FIRST_RESPONSE_TARGET_H * HOUR).length;
    const recent = rows.filter((r) => r.ageMs <= 30 * DAY_MS);
    const recentDone = recent.filter((r) => r.status === 'resolved' || r.status === 'closed').length;
    return {
      active: active.length,
      overdue: active.filter((r) => r.overdue).length,
      unassigned: active.filter((r) => !r.assigneeId).length,
      fcr: done.length ? (firstTouch / done.length) * 100 : null,
      firstTouch,
      avgFirst,
      withinTarget: responded.length ? (withinTarget / responded.length) * 100 : null,
      resolutionRate: recent.length ? (recentDone / recent.length) * 100 : null,
      recent: recent.length,
      recentDone,
    };
  }, [rows]);

  const tabs = [
    { key: 'all', label: 'All Queries', test: () => true },
    { key: 'urgent', label: 'Needs Urgent Attention', test: (r) => r.overdue, tone: 'rose' },
    { key: 'unassigned', label: 'Unassigned', test: (r) => !r.assigneeId && (r.status === 'open' || r.status === 'in_progress') },
    ...Object.entries(CATEGORY).map(([key, c]) => ({ key: `cat:${key}`, label: c.label, test: (r) => r.category === key })),
  ].map((t) => ({ ...t, count: rows.filter(t.test).length })).filter((t) => t.key === 'all' || t.key === 'urgent' || t.count > 0);

  const assigneeOptions = useMemo(() => {
    const map = new Map();
    if (me?._id || me?.id) map.set(String(me._id || me.id), 'Me');
    officers.forEach((o) => map.set(String(o._id || o.id), o.full_name || o.username || 'Officer'));
    rows.forEach((r) => { if (r.assigneeId && !map.has(r.assigneeId)) map.set(r.assigneeId, r.assigneeName || 'Staff member'); });
    return [{ value: 'all', label: 'All Agents' }, { value: 'unassigned', label: 'Unassigned' }, ...[...map.entries()].map(([value, label]) => ({ value, label }))];
  }, [officers, rows, me]);

  const filtered = (() => {
    const q = search.trim().toLowerCase().replace(/^#/, '');
    const test = tabs.find((t) => t.key === tab)?.test || (() => true);
    return rows.filter((r) => test(r)
      && (statusFilter === 'all' || r.status === statusFilter)
      && (source === 'all' || r.source === source)
      && (assignee === 'all' || (assignee === 'unassigned' ? !r.assigneeId : r.assigneeId === assignee))
      && (!q || [r.ticket, r.id, r.name, r.username, r.contact, r.subject, r.message].some((v) => String(v).toLowerCase().includes(q))))
      .sort((a, b) => Number(b.overdue) - Number(a.overdue) || new Date(b.createdAt) - new Date(a.createdAt));
  })();

  useEffect(() => { setPage(1); }, [tab, search, statusFilter, source, assignee]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const setStatusFor = async (ids, next) => {
    setBusy(true);
    let ok = 0;
    for (const id of ids) {
      try { await dispatch(updateQueryStatus({ id, status: next })).unwrap(); ok += 1; } catch { /* counted below */ }
    }
    setBusy(false);
    setSelected(new Set());
    showToast(ok === ids.length ? `${ok} ticket${ok === 1 ? '' : 's'} marked ${STATUS[next].label.toLowerCase()}` : `${ok} of ${ids.length} updated`, ok === ids.length ? 'success' : 'error');
  };

  const assignTo = async (ids, userId) => {
    if (!userId) return;
    setBusy(true);
    let ok = 0;
    for (const id of ids) {
      try { await dispatch(assignQuery({ id, assigned_to: userId })).unwrap(); ok += 1; } catch { /* counted below */ }
    }
    setBusy(false);
    setSelected(new Set());
    showToast(ok === ids.length ? `${ok} ticket${ok === 1 ? '' : 's'} assigned` : `${ok} of ${ids.length} assigned`, ok === ids.length ? 'success' : 'error');
    load();
  };

  const runDelete = async () => {
    const ids = confirm?.ids || [];
    setConfirm(null);
    let ok = 0;
    for (const id of ids) {
      try { await dispatch(deleteCustomerQuery(id)).unwrap(); ok += 1; } catch { /* counted below */ }
    }
    setSelected(new Set());
    showToast(`${ok} ticket${ok === 1 ? '' : 's'} deleted`, ok === ids.length ? 'success' : 'error');
  };

  const myId = String(me?._id || me?.id || '');
  const selectedIds = [...selected];

  const exportCsv = () => downloadCsv(`support-tickets-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Ticket', 'ID', 'Customer', 'Username', 'Contact', 'Channel', 'Category', 'Subject', 'Message', 'Status', 'Assigned to', 'Replies', 'First response (min)', 'Awaiting staff', 'Overdue', 'Created'],
    ...(selected.size ? rows.filter((r) => selected.has(r.id)) : filtered).map((r) => [r.ticket, r.id, r.name, r.username, r.contact, SOURCE[r.source] || r.source, CATEGORY[r.category]?.label || r.category, r.subject, r.message, STATUS[r.status].label, r.assigneeName, r.replies, r.firstResponseMs !== null ? Math.round(r.firstResponseMs / 60000) : '', r.awaitingStaff ? 'yes' : 'no', r.overdue ? 'yes' : 'no', r.createdAt ? new Date(r.createdAt).toISOString() : '']),
  ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest"><span className="text-[#E8194E]">Help & Ticket</span><span className="text-neutral-300">·</span><span className="text-neutral-500">Support Operations Desk</span></p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{formatNumber(total)} tickets synced · {formatNumber(officers.length)} sales agents</span>
            </div>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Customer Queries & Support Desk</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">Tickets from the B-smart and Ruvees apps: triage, assign, reply and track response time.</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">
            <div className="relative">
              <OutlineButton icon={Layers} onClick={() => setBulkOpen((v) => !v)} disabled={!selected.size || busy}>Bulk Actions{selected.size > 0 && ` (${selected.size})`}</OutlineButton>
              {bulkOpen && selected.size > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBulkOpen(false)} />
                  <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                    {[
                      ['Assign to me', UserCheck, () => assignTo(selectedIds, myId), !myId],
                      ['Mark in progress', Clock, () => setStatusFor(selectedIds, 'in_progress')],
                      ['Mark resolved', CheckCircle2, () => setStatusFor(selectedIds, 'resolved')],
                      ['Close tickets', X, () => setStatusFor(selectedIds, 'closed')],
                    ].map(([label, Icon, fn, disabled]) => (
                      <button key={label} type="button" disabled={disabled} onClick={() => { setBulkOpen(false); fn(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"><Icon className="h-3.5 w-3.5 text-neutral-400" />{label}</button>
                    ))}
                    {officers.length > 0 && <p className="border-t border-neutral-100 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Assign to agent</p>}
                    <div className="max-h-40 overflow-y-auto">
                      {officers.map((o) => (
                        <button key={o._id || o.id} type="button" onClick={() => { setBulkOpen(false); assignTo(selectedIds, String(o._id || o.id)); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50">{o.full_name || o.username}</button>
                      ))}
                    </div>
                    <button type="button" onClick={() => { setBulkOpen(false); setConfirm({ ids: selectedIds }); }} className="flex w-full items-center gap-2 border-t border-neutral-100 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Delete selected</button>
                  </div>
                </>
              )}
            </div>
            <OutlineButton icon={Download} onClick={exportCsv} disabled={!rows.length}>Export Tickets (CSV)</OutlineButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Tickets" value={formatNumber(stats.active)} icon={Inbox} tone="pink"
            foot={stats.overdue ? <><Chip tone="rose">{formatNumber(stats.overdue)} over {SLA_HOURS}h</Chip> awaiting a reply</> : <>{formatNumber(stats.unassigned)} unassigned · none overdue</>} />
          <StatCard label="First Contact Resolution" value={stats.fcr === null ? '—' : `${stats.fcr.toFixed(1)}%`} icon={Zap} tone="emerald"
            foot={<><Chip tone="emerald">{formatNumber(stats.firstTouch)}</Chip> closed with one staff reply or less</>} />
          <StatCard label="Avg First Response" value={stats.avgFirst === null ? '—' : duration(stats.avgFirst)} icon={Timer} tone="purple"
            foot={<><Chip tone="purple">Target &lt; {FIRST_RESPONSE_TARGET_H}h</Chip>{stats.withinTarget !== null && <span className="font-semibold text-emerald-600">{stats.withinTarget.toFixed(1)}% on time</span>}</>} />
          <StatCard label="Resolution Rate (30d)" value={stats.resolutionRate === null ? '—' : `${stats.resolutionRate.toFixed(1)}%`} icon={CheckCheck} tone="indigo"
            foot={<><Chip tone="lavender">{formatNumber(stats.recentDone)} / {formatNumber(stats.recent)}</Chip> resolved or closed</>} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={clsx('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition',
              tab === t.key ? 'bg-[#1F2340] text-white' : t.tone === 'rose' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100' : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50')}>
              {t.label}
              <span className={clsx('rounded-full px-1.5 text-[10.5px] font-bold', tab === t.key ? 'bg-white/20 text-white' : t.tone === 'rose' ? 'bg-[#E8194E] text-white' : 'bg-[#EEF0FA] text-neutral-700')}>{formatNumber(t.count)}</span>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by ticket #, customer name, email or subject…" />
            <Select prefix="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
            <Select prefix="Channel" value={source} onChange={setSource} options={[{ value: 'all', label: 'All' }, ...Object.entries(SOURCE).map(([value, label]) => ({ value, label }))]} />
            <Select prefix="Assignee" value={assignee} onChange={setAssignee} options={assigneeOptions} />
            <RefreshButton onClick={load} spinning={status === 'loading'} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  <th className="w-10 py-3 pl-4"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected((prev) => { const n = new Set(prev); if (allVisibleSelected) visible.forEach((r) => n.delete(r.id)); else visible.forEach((r) => n.add(r.id)); return n; })} aria-label="Select page" className="h-4 w-4 rounded accent-[#E8194E]" /></th>
                  {['Ticket & channel', 'Customer', 'Category', 'Query subject', 'SLA & age', 'Assigned agent', 'Status'].map((h) => <Th key={h}>{h}</Th>)}
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? <StateRow colSpan={9} loading message="Loading tickets…" />
                  : !visible.length ? <StateRow colSpan={9} icon={MessageSquare} message={error ? `Error: ${error}` : 'No tickets match these filters'} />
                    : visible.map((r) => {
                      const st = STATUS[r.status];
                      const cat = CATEGORY[r.category] || CATEGORY.other;
                      const isSel = selected.has(r.id);
                      return (
                        <tr key={r.id} onClick={() => navigate(`/customer-queries/${r.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', r.overdue ? 'bg-rose-50/50' : isSel && 'bg-pink-50/60')}>
                          <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={isSel} onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label={`Select ${r.ticket}`} className="h-4 w-4 rounded accent-[#E8194E]" /></td>
                          <td className="px-4 py-3">
                            <p className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[12.5px] font-bold text-neutral-900 group-hover:text-[#C81345]">{r.overdue && <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />}{r.ticket}</p>
                            <p className="mt-0.5 text-[10.5px] font-semibold text-[#8E35B5]">{SOURCE[r.source] || r.source || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Avatar src={r.avatar} name={r.name} />
                              <div className="min-w-0">
                                <p className="max-w-[140px] truncate text-[13px] font-bold text-neutral-900">{r.name}</p>
                                {r.guest ? <span className="rounded bg-[#E9EBFA] px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-neutral-600">Guest</span>
                                  : <p className="max-w-[140px] truncate text-[11px] text-neutral-500">@{r.username}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className={clsx('rounded-lg px-2 py-1 text-[11px] font-semibold', cat.cls)}>{cat.label}</span></td>
                          <td className="px-4 py-3">
                            <p className="max-w-[300px] truncate text-[13px] font-semibold text-neutral-900">{r.subject}</p>
                            <p className="max-w-[300px] truncate text-[11px] text-neutral-500">{r.message}</p>
                            <p className="mt-0.5 text-[10.5px] font-semibold">
                              {r.awaitingStaff ? <span className="text-amber-600">Awaiting staff reply</span> : r.staffReplies ? <span className="text-emerald-600">Staff replied</span> : <span className="text-neutral-400">No replies</span>}
                              <span className="text-neutral-400"> · {r.replies} message{r.replies === 1 ? '' : 's'}</span>
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {r.overdue ? (
                              <><span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-700"><AlertTriangle className="h-3 w-3" />Overdue</span><p className="mt-0.5 text-[10.5px] font-semibold text-rose-600">waiting {ago(r.waitingMs)}</p></>
                            ) : r.awaitingStaff ? (
                              <><span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-700">Due in {ago(Math.max(0, SLA_HOURS * HOUR - r.waitingMs))}</span><p className="mt-0.5 text-[10.5px] text-neutral-500">waiting {ago(r.waitingMs)}</p></>
                            ) : (
                              <><span className="rounded-md bg-[#E9EBFA] px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-600">Opened {ago(r.ageMs)} ago</span>
                                {r.firstResponseMs !== null && <p className="mt-0.5 text-[10.5px] text-neutral-500">1st reply in {duration(r.firstResponseMs)}</p>}</>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {r.assigneeId ? (
                              <div className="flex items-center gap-2"><Avatar src={r.assigneeAvatar} name={r.assigneeName} size="h-7 w-7" /><span className="max-w-[110px] truncate text-[12.5px] font-semibold text-neutral-800">{r.assigneeId === myId ? 'You' : r.assigneeName}</span></div>
                            ) : (
                              <button type="button" disabled={!myId || busy} onClick={(e) => { e.stopPropagation(); assignTo([r.id], myId); }} className="rounded-lg border border-dashed border-[#C9CFEC] px-2 py-1 text-[11px] font-bold text-[#8E35B5] transition hover:border-[#8E35B5] hover:bg-purple-50 disabled:opacity-50">Unassigned · take it</button>
                            )}
                          </td>
                          <td className="px-4 py-3"><span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span></td>
                          <td className="px-4 py-3">
                            <RowMenu row={r} onView={() => navigate(`/customer-queries/${r.id}`)} onStatus={(next) => setStatusFor([r.id], next)} onAssignMe={() => assignTo([r.id], myId)} onDelete={() => setConfirm({ ids: [r.id] })} />
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} noun="tickets"
            extra={selected.size > 0 && <span>· <b className="text-[#C81345]">{selected.size} selected</b> <button type="button" onClick={() => setSelected(new Set())} className="ml-1 font-semibold hover:underline">Clear</button></span>} />
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runDelete}
        title={`Delete ${confirm?.ids.length === 1 ? 'ticket' : `${confirm?.ids.length || 0} tickets`}`}
        description="The ticket and its full conversation will be permanently removed."
        confirmText="Delete"
        confirmVariant="danger"
      />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
};

export default CustomerQueries;
