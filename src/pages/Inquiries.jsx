import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertTriangle, CheckCircle2, Clock, Download, Eye, Inbox, Mail, MailCheck, MoreVertical, Phone, Plus, Timer, Trash2, UserCheck, X,
} from 'lucide-react';
import { Chip, Delta, FieldSelect, GradientButton, OutlineButton, Pager, RefreshButton, SearchInput, Select, StatCard, StateRow, Th } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { assignQuery, updateQueryStatus } from '../store/customerQueriesSlice.js';
import { deleteInquiry, fetchAllInquiries, logInquiry } from '../store/inquiriesSlice.js';
import { fetchSalesOfficers } from '../store/salesSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import { prefRows } from '../utils/consolePrefs.js';

const HOUR = 3600 * 1000;
const SLA_HOURS = 24;

const STATUS = {
  open: { label: 'New', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
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
const SOURCE = { bsmart: 'B-smart website', ruvees: 'Ruvees website' };
const DATE_RANGES = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || '') : ref ? String(ref) : '');
const ago = (ms) => (ms < HOUR ? `${Math.max(1, Math.round(ms / 60000))}m` : ms < DAY_MS ? `${Math.round(ms / HOUR)}h` : `${Math.round(ms / DAY_MS)}d`);
const duration = (ms) => (!Number.isFinite(ms) ? '—' : ms < HOUR ? `${Math.round(ms / 60000)} min` : ms < DAY_MS ? `${(ms / HOUR).toFixed(1)} hrs` : `${(ms / DAY_MS).toFixed(1)} days`);
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const Avatar = ({ src, name, size = 'h-7 w-7' }) => {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className={clsx(size, 'flex-shrink-0 rounded-full object-cover')} />
    : <span className={clsx(size, 'flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[10px] font-bold text-white')}>{initials(name)}</span>;
};

const EMPTY_INQUIRY = { name: '', email: '', phone: '', subject: '', message: '', category: 'general', app_source: 'bsmart' };

const LogInquiryModal =({ open, onClose, onDone }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState(EMPTY_INQUIRY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm(EMPTY_INQUIRY); setError(''); } }, [open]);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await dispatch(logInquiry({ ...form, name: form.name.trim(), email: form.email.trim(), subject: form.subject.trim(), message: form.message.trim(), phone: form.phone.trim() })).unwrap();
      onDone(form.name.trim());
      onClose();
    } catch (msg) {
      setError(typeof msg === 'string' ? msg : 'Failed to log inquiry');
    } finally {
      setBusy(false);
    }
  };
  const label = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-neutral-700';
  const field = 'h-10 w-full rounded-lg border border-transparent bg-[#F1F3FC] px-3 text-[13px] text-neutral-900 outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative flex max-h-[92vh] w-full max-w-[540px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-[#E8194E] to-[#8E35B5]" />
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[19px] font-bold text-neutral-900"><Plus className="h-5 w-5 text-[#C81345]" /> Log Direct Inquiry</h2>
            <p className="text-[12.5px] text-neutral-500">Record an inquiry received by phone, email or in person.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-3.5 overflow-y-auto px-6 pb-5">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className={label}>Contact name <span className="text-rose-500">*</span></label><input required value={form.name} onChange={set('name')} maxLength={100} className={field} /></div>
            <div><label className={label}>Email <span className="text-rose-500">*</span></label><input required type="email" value={form.email} onChange={set('email')} className={field} /></div>
            <div><label className={label}>Phone</label><input value={form.phone} onChange={set('phone')} maxLength={20} className={field} /></div>
            <div><label className={label}>Brand</label>
              <FieldSelect value={form.app_source} onChange={(v) => setForm((f) => ({ ...f, app_source: v }))} options={Object.entries(SOURCE).map(([v, l]) => ({ value: v, label: l.replace(' website', '') }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
            <div><label className={label}>Subject <span className="text-rose-500">*</span></label><input required value={form.subject} onChange={set('subject')} maxLength={200} className={field} /></div>
            <div><label className={label}>Category</label>
              <FieldSelect value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={Object.entries(CATEGORY).map(([v, c]) => ({ value: v, label: c.label }))} />
            </div>
          </div>
          <div><label className={label}>Message <span className="text-rose-500">*</span></label><textarea required value={form.message} onChange={set('message')} rows={4} maxLength={2000} className="w-full resize-none rounded-lg border border-transparent bg-[#F1F3FC] px-3 py-2 text-[13px] outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10" /></div>
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800"><MailCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />The contact gets the standard "We received your inquiry" email, and all admins are notified.</p>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-neutral-100 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-800 hover:bg-neutral-50">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white disabled:opacity-60"><Plus className="h-4 w-4" />{busy ? 'Logging…' : 'Log Inquiry'}</button>
        </div>
      </form>
    </div>
  );
};

const RowMenu = ({ row, onView, onStatus, onAssignMe, onDelete }) => {
  const [open, setOpen] = useState(false);
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50';
  const act = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Actions for ${row.ref}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-[#EEF0FA]"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={act(onView)} className={item}><Eye className="h-3.5 w-3.5 text-neutral-400" /> Open & reply</button>
            {row.email && <a href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject}`)}`} onClick={() => setOpen(false)} className={item}><Mail className="h-3.5 w-3.5 text-neutral-400" /> Email contact</a>}
            <button type="button" onClick={act(onAssignMe)} className={item}><UserCheck className="h-3.5 w-3.5 text-neutral-400" /> Assign to me</button>
            {row.status === 'open' && <button type="button" onClick={act(() => onStatus('in_progress'))} className={item}><Clock className="h-3.5 w-3.5 text-neutral-400" /> Mark in progress</button>}
            {row.status !== 'resolved' && <button type="button" onClick={act(() => onStatus('resolved'))} className={clsx(item, 'text-emerald-700')}><CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved</button>}
            {row.status !== 'closed' && <button type="button" onClick={act(() => onStatus('closed'))} className={item}><X className="h-3.5 w-3.5 text-neutral-400" /> Close</button>}
            <button type="button" onClick={act(onDelete)} className={clsx(item, 'text-red-600 hover:bg-red-50')}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>
        </>
      )}
    </div>
  );
};

const Inquiries = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total, status, error } = useSelector((s) => s.inquiries);
  const me = useSelector((s) => s.auth.user);
  const officers = useSelector((s) => s.sales?.officers || []);
  const officersStatus = useSelector((s) => s.sales?.officersStatus);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => prefRows(10));
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => dispatch(fetchAllInquiries());
  useEffect(() => { dispatch(fetchAllInquiries()); }, [dispatch]);
  useEffect(() => { if (officersStatus === 'idle') dispatch(fetchSalesOfficers()); }, [officersStatus, dispatch]);
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2800); };
  const myId = String(me?._id || me?.id || '');

  const rows = useMemo(() => {
    const now = Date.now();
    return (items || []).map((q) => {
      const replies = Array.isArray(q.replies) ? q.replies : [];
      const staff = replies.filter((r) => r.sender_type === 'admin' || r.sender_type === 'sales');
      const created = new Date(q.createdAt).getTime();
      const status = STATUS[q.status] ? q.status : 'open';
      const awaiting = (status === 'open' || status === 'in_progress') && !staff.length;
      const assigned = q.assigned_to && typeof q.assigned_to === 'object' ? q.assigned_to : null;
      return {
        id: String(q._id),
        ref: `#INQ-${String(q._id).slice(-4).toUpperCase()}`,
        name: q.name || 'Unknown contact',
        email: q.email || '',
        phone: q.phone || '',
        subject: q.subject || 'Inquiry',
        message: q.message || '',
        category: CATEGORY[q.category] ? q.category : 'other',
        source: q.app_source || '',
        status,
        staffReplies: staff.length,
        firstResponseMs: staff.length && Number.isFinite(created) ? new Date(staff[0].createdAt).getTime() - created : null,
        awaiting,
        overdue: awaiting && now - created > SLA_HOURS * HOUR,
        ageMs: Number.isFinite(created) ? now - created : 0,
        assigneeId: idOf(q.assigned_to),
        assigneeName: assigned ? assigned.full_name || assigned.username : q.assigned_to ? 'Staff member' : '',
        assigneeAvatar: assigned?.avatar_url ? toAbsoluteMediaUrl(assigned.avatar_url) : '',
        createdAt: q.createdAt,
      };
    });
  }, [items]);

  const stats = useMemo(() => {
    const recent = rows.filter((r) => r.ageMs <= 30 * DAY_MS).length;
    const prior = rows.filter((r) => r.ageMs > 30 * DAY_MS && r.ageMs <= 60 * DAY_MS).length;
    const active = rows.filter((r) => r.status === 'open' || r.status === 'in_progress');
    const responded = rows.filter((r) => r.firstResponseMs !== null && r.firstResponseMs >= 0);
    const avg = responded.length ? responded.reduce((s, r) => s + r.firstResponseMs, 0) / responded.length : null;
    const withinSla = responded.filter((r) => r.firstResponseMs <= SLA_HOURS * HOUR).length;
    return {
      recent,
      growth: prior ? ((recent - prior) / prior) * 100 : null,
      active: active.length,
      overdue: active.filter((r) => r.overdue).length,
      unassigned: active.filter((r) => !r.assigneeId).length,
      responseRate: rows.length ? (rows.filter((r) => r.staffReplies > 0).length / rows.length) * 100 : null,
      responded: rows.filter((r) => r.staffReplies > 0).length,
      resolved: rows.filter((r) => r.status === 'resolved' || r.status === 'closed').length,
      avg,
      withinSla: responded.length ? (withinSla / responded.length) * 100 : null,
    };
  }, [rows]);

  const tabs = [
    { key: 'all', label: 'All Inquiries', test: () => true },
    { key: 'reply', label: 'Needs Reply', test: (r) => r.awaiting, tone: 'rose' },
    { key: 'unassigned', label: 'Unassigned', test: (r) => !r.assigneeId && (r.status === 'open' || r.status === 'in_progress') },
    ...Object.entries(CATEGORY).map(([key, c]) => ({ key: `cat:${key}`, label: c.label, test: (r) => r.category === key })),
  ].map((t) => ({ ...t, count: rows.filter(t.test).length })).filter((t) => t.count > 0 || t.key === 'all' || t.key === 'reply');

  const assigneeOptions = useMemo(() => {
    const map = new Map();
    if (myId) map.set(myId, 'Me');
    officers.forEach((o) => map.set(String(o._id || o.id), o.full_name || o.username || 'Officer'));
    rows.forEach((r) => { if (r.assigneeId && !map.has(r.assigneeId)) map.set(r.assigneeId, r.assigneeName || 'Staff member'); });
    return [{ value: 'all', label: 'All' }, { value: 'unassigned', label: 'Unassigned' }, ...[...map.entries()].map(([value, label]) => ({ value, label }))];
  }, [officers, rows, myId]);

  const filtered = (() => {
    const q = search.trim().toLowerCase().replace(/^#/, '');
    const test = tabs.find((t) => t.key === tab)?.test || (() => true);
    const maxAge = range === 'all' ? Infinity : Number(range) * DAY_MS;
    return rows.filter((r) => test(r)
      && r.ageMs <= maxAge
      && (source === 'all' || r.source === source)
      && (statusFilter === 'all' || r.status === statusFilter)
      && (assignee === 'all' || (assignee === 'unassigned' ? !r.assigneeId : r.assigneeId === assignee))
      && (!q || [r.ref, r.id, r.name, r.email, r.phone, r.subject, r.message].some((v) => String(v).toLowerCase().includes(q))))
      .sort((a, b) => Number(b.overdue) - Number(a.overdue) || new Date(b.createdAt) - new Date(a.createdAt));
  })();

  useEffect(() => { setPage(1); }, [tab, search, source, statusFilter, assignee, range]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const runEach = async (ids, fn, verb) => {
    setBusy(true);
    let ok = 0;
    for (const id of ids) { try { await fn(id); ok += 1; } catch { /* counted below */ } }
    setBusy(false);
    setSelected(new Set());
    showToast(ok === ids.length ? `${ok} inquir${ok === 1 ? 'y' : 'ies'} ${verb}` : `${ok} of ${ids.length} ${verb}`, ok === ids.length ? 'success' : 'error');
  };
  const setStatusFor = (ids, next) => runEach(ids, (id) => dispatch(updateQueryStatus({ id, status: next })).unwrap(), `marked ${STATUS[next].label.toLowerCase()}`);
  const assignTo = (ids, userId) => userId && runEach(ids, (id) => dispatch(assignQuery({ id, assigned_to: userId })).unwrap(), 'assigned');
  const runDelete = () => { const ids = confirm?.ids || []; setConfirm(null); runEach(ids, (id) => dispatch(deleteInquiry(id)).unwrap(), 'deleted'); };

  const exportCsv = () => downloadCsv(`inquiries-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Reference', 'ID', 'Contact', 'Email', 'Phone', 'Source', 'Category', 'Subject', 'Message', 'Status', 'Assigned to', 'Staff replies', 'First response (min)', 'Created'],
    ...(selected.size ? rows.filter((r) => selected.has(r.id)) : filtered).map((r) => [r.ref, r.id, r.name, r.email, r.phone, SOURCE[r.source] || r.source, CATEGORY[r.category].label, r.subject, r.message, STATUS[r.status].label, r.assigneeName, r.staffReplies, r.firstResponseMs !== null ? Math.round(r.firstResponseMs / 60000) : '', r.createdAt ? new Date(r.createdAt).toISOString() : '']),
  ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest">
              <span className="text-[#E8194E]">Help & Ticket</span><span className="text-neutral-300">·</span><span className="text-neutral-500">Website & Direct Inquiries</span>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[9.5px] text-[#8E35B5]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8E35B5]" />Live intake</span>
            </p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Inquiries & Leads</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">Contact-form submissions from the B-smart and Ruvees websites, plus inquiries logged by the team.</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">
            <OutlineButton icon={Download} onClick={exportCsv} disabled={!rows.length}>Export Inquiries (CSV)</OutlineButton>
            <GradientButton icon={Plus} onClick={() => setLogOpen(true)} className="!bg-gradient-to-r !from-[#E8194E] !to-[#8E35B5]">Log Direct Inquiry</GradientButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Inquiries" value={formatNumber(total)} icon={Inbox} tone="pink" foot={<>{stats.growth !== null && <Delta value={stats.growth} />}{formatNumber(stats.recent)} in the last 30 days</>} />
          <StatCard label="Open & Triage" value={formatNumber(stats.active)} icon={Clock} tone="violet"
            foot={<>{stats.overdue > 0 ? <Chip tone="rose">{formatNumber(stats.overdue)} over {SLA_HOURS}h</Chip> : <Chip tone="emerald">On SLA</Chip>}{formatNumber(stats.unassigned)} unassigned</>} />
          <StatCard label="Response Rate" value={stats.responseRate === null ? '—' : `${stats.responseRate.toFixed(1)}%`} icon={MailCheck} tone="emerald"
            foot={<><Chip tone="lavender">{formatNumber(stats.responded)} replied</Chip>{formatNumber(stats.resolved)} resolved or closed</>} />
          <StatCard label="Avg Response Time" value={stats.avg === null ? '—' : duration(stats.avg)} icon={Timer} tone="purple"
            foot={<><Chip tone="purple">Target &lt; {SLA_HOURS}h</Chip>{stats.withinSla !== null && <span className="font-semibold text-emerald-600">{stats.withinSla.toFixed(1)}% on time</span>}</>} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={clsx('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition',
              tab === t.key ? 'bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-white shadow-[0_6px_14px_-8px_rgba(232,25,78,0.7)]' : t.tone === 'rose' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100' : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50')}>
              {t.label} ({formatNumber(t.count)})
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, phone, subject or #INQ…" />
            <Select prefix="Source" value={source} onChange={setSource} options={[{ value: 'all', label: 'All' }, ...Object.entries(SOURCE).map(([value, label]) => ({ value, label }))]} />
            <Select prefix="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
            <Select prefix="Assigned" value={assignee} onChange={setAssignee} options={assigneeOptions} />
            <Select prefix="Date" value={range} onChange={setRange} options={DATE_RANGES} />
            <RefreshButton onClick={load} spinning={status === 'loading'} />
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-pink-100 bg-pink-50/60 px-4 py-2">
              <p className="text-[12.5px] font-semibold text-neutral-700">{selected.size} selected</p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] font-semibold text-neutral-600 hover:underline">Clear</button>
                <button type="button" disabled={busy || !myId} onClick={() => assignTo([...selected], myId)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-bold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"><UserCheck className="h-3.5 w-3.5" /> Assign to me</button>
                <button type="button" disabled={busy} onClick={() => setStatusFor([...selected], 'resolved')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-[12px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</button>
                <button type="button" disabled={busy} onClick={() => setConfirm({ ids: [...selected] })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#C81345] px-3 text-[12px] font-bold text-white hover:bg-[#A50F39] disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  <th className="w-10 py-3 pl-4"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected((prev) => { const n = new Set(prev); if (allVisibleSelected) visible.forEach((r) => n.delete(r.id)); else visible.forEach((r) => n.add(r.id)); return n; })} aria-label="Select page" className="h-4 w-4 rounded accent-[#E8194E]" /></th>
                  {['Inquiry ID', 'Lead & contact', 'Category / source', 'Summary', 'Response & SLA', 'Assigned rep', 'Status'].map((h) => <Th key={h}>{h}</Th>)}
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status === 'loading' && !rows.length ? <StateRow colSpan={9} loading message="Loading inquiries…" />
                  : !visible.length ? <StateRow colSpan={9} icon={Inbox} message={error ? `Error: ${error}` : 'No inquiries match these filters'} />
                    : visible.map((r) => {
                      const st = STATUS[r.status];
                      const cat = CATEGORY[r.category];
                      const isSel = selected.has(r.id);
                      return (
                        <tr key={r.id} onClick={() => navigate(`/customer-queries/${r.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', r.overdue ? 'bg-rose-50/50' : isSel && 'bg-pink-50/60')}>
                          <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={isSel} onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label={`Select ${r.ref}`} className="h-4 w-4 rounded accent-[#E8194E]" /></td>
                          <td className="px-4 py-3">
                            <p className="whitespace-nowrap font-mono text-[12.5px] font-bold text-[#E8194E]">{r.ref}</p>
                            <p className="text-[10.5px] text-neutral-500">{ago(r.ageMs)} ago</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF0FA] text-[11px] font-bold text-[#8E35B5]">{initials(r.name)}</span>
                              <div className="min-w-0">
                                <p className="max-w-[160px] truncate text-[13px] font-bold text-neutral-900 group-hover:text-[#C81345]">{r.name}</p>
                                {r.email && <p className="max-w-[160px] truncate text-[11px] text-neutral-500">{r.email}</p>}
                                {r.phone && <p className="flex items-center gap-1 text-[10.5px] text-neutral-400"><Phone className="h-2.5 w-2.5" />{r.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('rounded-lg px-2 py-1 text-[11px] font-semibold', cat.cls)}>{cat.label}</span>
                            <p className="mt-1 text-[10.5px] font-semibold text-[#8E35B5]">{SOURCE[r.source] || r.source || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="max-w-[300px] truncate text-[13px] font-semibold text-neutral-900">{r.subject}</p>
                            <p className="max-w-[300px] truncate text-[11px] text-neutral-500">{r.message}</p>
                          </td>
                          <td className="px-4 py-3">
                            {r.overdue ? (
                              <><span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-700"><AlertTriangle className="h-3 w-3" />Overdue</span><p className="mt-0.5 text-[10.5px] font-semibold text-rose-600">no reply in {ago(r.ageMs)}</p></>
                            ) : r.awaiting ? (
                              <><span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-700">Reply due in {ago(Math.max(0, SLA_HOURS * HOUR - r.ageMs))}</span><p className="mt-0.5 text-[10.5px] text-neutral-500">no reply yet</p></>
                            ) : r.firstResponseMs !== null ? (
                              <><span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">Replied</span><p className="mt-0.5 text-[10.5px] text-neutral-500">in {duration(r.firstResponseMs)}</p></>
                            ) : <span className="text-[11px] text-neutral-400">Closed without reply</span>}
                          </td>
                          <td className="px-4 py-3">
                            {r.assigneeId ? (
                              <div className="flex items-center gap-2"><Avatar src={r.assigneeAvatar} name={r.assigneeName} /><span className="max-w-[110px] truncate text-[12.5px] font-semibold text-neutral-800">{r.assigneeId === myId ? 'You' : r.assigneeName}</span></div>
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

          <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} noun="inquiries" />
        </div>
      </div>

      <LogInquiryModal open={logOpen} onClose={() => setLogOpen(false)} onDone={(name) => showToast(`Inquiry from ${name} logged`)} />
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runDelete}
        title={`Delete ${confirm?.ids.length === 1 ? 'inquiry' : `${confirm?.ids.length || 0} inquiries`}`}
        description="The inquiry and its conversation will be permanently removed."
        confirmText="Delete"
        confirmVariant="danger"
      />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
};

export default Inquiries;
