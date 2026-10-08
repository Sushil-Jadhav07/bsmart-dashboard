import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  AlertOctagon, Bug, CheckCircle2, Download, Eye, Image as ImageIcon, Inbox, Loader2, MoreVertical, ShieldAlert, Smartphone, Timer,
  Trash2, UserCheck, X,
} from 'lucide-react';
import { Chip, Delta, OutlineButton, Pager, RefreshButton, SearchInput, Select, StatCard, StateRow, Th } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { deleteBugReport, fetchBugReports, updateBugReport } from '../store/bugReportsSlice.js';
import { fetchSalesOfficers } from '../store/salesSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv } from '../utils/contentHelpers.js';
import {
  BUG_CATEGORY, BUG_SEVERITY, BUG_STATUS, NETWORK_LABEL, OS_LABEL, bugId, bugRef, bugTitle, isOpenBug, platformOf, refOf,
} from '../utils/bugReportMeta.js';

const HOUR = 3600 * 1000;
const ago = (ms) => (ms < HOUR ? `${Math.max(1, Math.round(ms / 60000))}m ago` : ms < DAY_MS ? `${Math.round(ms / HOUR)}h ago` : `${Math.round(ms / DAY_MS)}d ago`);
const duration = (ms) => (!Number.isFinite(ms) ? '—' : ms < HOUR ? `${Math.round(ms / 60000)} min` : ms < DAY_MS ? `${(ms / HOUR).toFixed(1)} hrs` : `${(ms / DAY_MS).toFixed(1)} days`);
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

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
            <button type="button" onClick={act(onView)} className={item}><Eye className="h-3.5 w-3.5 text-neutral-400" /> Open incident</button>
            <button type="button" onClick={act(onAssignMe)} className={item}><UserCheck className="h-3.5 w-3.5 text-neutral-400" /> Assign to me</button>
            {row.status === 'new' && <button type="button" onClick={act(() => onStatus('in_progress'))} className={item}><Loader2 className="h-3.5 w-3.5 text-neutral-400" /> Start investigating</button>}
            {isOpenBug(row) && <button type="button" onClick={act(() => onStatus('fixed'))} className={clsx(item, 'text-emerald-700')}><CheckCircle2 className="h-3.5 w-3.5" /> Mark fixed</button>}
            {row.status !== 'closed' && <button type="button" onClick={act(() => onStatus('closed'))} className={item}><X className="h-3.5 w-3.5 text-neutral-400" /> Close</button>}
            <button type="button" onClick={act(onDelete)} className={clsx(item, 'text-red-600 hover:bg-red-50')}><Trash2 className="h-3.5 w-3.5" /> Delete report</button>
          </div>
        </>
      )}
    </div>
  );
};

const BugReports = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list = [], listStatus, listError } = useSelector((s) => s.bugReports);
  const me = useSelector((s) => s.auth.user);
  const officers = useSelector((s) => s.sales?.officers || []);
  const officersStatus = useSelector((s) => s.sales?.officersStatus);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [os, setOs] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => dispatch(fetchBugReports({}));
  useEffect(() => { dispatch(fetchBugReports({})); }, [dispatch]);
  useEffect(() => { if (officersStatus === 'idle') dispatch(fetchSalesOfficers()); }, [officersStatus, dispatch]);
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };
  const myId = String(me?._id || me?.id || '');

  const rows = useMemo(() => {
    const now = Date.now();
    const sameCat = new Map();
    list.forEach((r) => { if (isOpenBug(r)) sameCat.set(r.category, (sameCat.get(r.category) || 0) + 1); });
    return list.map((r) => {
      const reporter = r.reporter_id && typeof r.reporter_id === 'object' ? r.reporter_id : {};
      const assigned = r.assigned_to && typeof r.assigned_to === 'object' ? r.assigned_to : null;
      const created = new Date(r.createdAt).getTime();
      return {
        ...r,
        id: bugId(r),
        ref: bugRef(r),
        title: bugTitle(r),
        severity: BUG_SEVERITY[r.priority] ? r.priority : 'medium',
        status: BUG_STATUS[r.status] ? r.status : 'new',
        reporter: reporter.full_name || reporter.username || 'Unknown user',
        reporterHandle: reporter.username || '',
        reporterId: refOf(r.reporter_id),
        assigneeId: refOf(r.assigned_to),
        assigneeName: assigned ? assigned.full_name || assigned.email : r.assigned_to ? 'Staff member' : '',
        platform: platformOf(r),
        files: Array.isArray(r.attachments) ? r.attachments.length : 0,
        similar: Math.max(0, (sameCat.get(r.category) || 0) - (isOpenBug(r) ? 1 : 0)),
        ageMs: Number.isFinite(created) ? now - created : 0,
        resolveMs: r.resolved_at ? new Date(r.resolved_at).getTime() - created : null,
      };
    });
  }, [list]);

  const stats = useMemo(() => {
    const open = rows.filter(isOpenBug);
    const resolved = rows.filter((r) => r.resolveMs !== null && r.resolveMs >= 0);
    const recent = rows.filter((r) => r.ageMs <= 30 * DAY_MS).length;
    const prior = rows.filter((r) => r.ageMs > 30 * DAY_MS && r.ageMs <= 60 * DAY_MS).length;
    const fixed30 = rows.filter((r) => r.status === 'fixed' && r.resolved_at && Date.now() - new Date(r.resolved_at).getTime() <= 30 * DAY_MS).length;
    const crashes = rows.filter((r) => r.category === 'app_crash' && r.ageMs <= 30 * DAY_MS).length;
    return {
      open: open.length,
      critical: open.filter((r) => r.severity === 'critical').length,
      untriaged: open.filter((r) => r.status === 'new' && !r.assigneeId).length,
      recent,
      growth: prior ? ((recent - prior) / prior) * 100 : null,
      crashes,
      mttr: resolved.length ? resolved.reduce((s, r) => s + r.resolveMs, 0) / resolved.length : null,
      fixed30,
      closedRate: rows.length ? (rows.filter((r) => !isOpenBug(r)).length / rows.length) * 100 : null,
    };
  }, [rows]);

  const cats = useMemo(() => {
    const counts = new Map();
    rows.filter(isOpenBug).forEach((r) => counts.set(r.category, (counts.get(r.category) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const tabs = [
    { key: 'all', label: 'All Bugs', test: () => true },
    { key: 'p0', label: 'P0 Critical (open)', test: (r) => r.severity === 'critical' && isOpenBug(r), tone: 'rose' },
    { key: 'untriaged', label: 'Untriaged', test: (r) => r.status === 'new' && !r.assigneeId },
    ...cats.slice(0, 4).map(([c]) => ({ key: `cat:${c}`, label: BUG_CATEGORY[c] || c, test: (r) => r.category === c })),
  ].map((t) => ({ ...t, count: rows.filter(t.test).length }));

  const assigneeOptions = useMemo(() => {
    const map = new Map();
    if (myId) map.set(myId, 'Me');
    officers.forEach((o) => map.set(String(o._id || o.id), o.full_name || o.username || 'Officer'));
    rows.forEach((r) => { if (r.assigneeId && !map.has(r.assigneeId)) map.set(r.assigneeId, r.assigneeName); });
    return [{ value: 'all', label: 'All' }, { value: 'none', label: 'Unassigned' }, ...[...map.entries()].map(([value, label]) => ({ value, label }))];
  }, [officers, rows, myId]);

  const filtered = (() => {
    const q = search.trim().toLowerCase().replace(/^#/, '');
    const test = tabs.find((t) => t.key === tab)?.test || (() => true);
    return rows.filter((r) => test(r)
      && (statusFilter === 'all' || (statusFilter === 'open' ? isOpenBug(r) : r.status === statusFilter))
      && (os === 'all' || (r.os_type || '') === os)
      && (severity === 'all' || r.severity === severity)
      && (assignee === 'all' || (assignee === 'none' ? !r.assigneeId : r.assigneeId === assignee))
      && (!q || [r.ref, r.id, r.description, r.reporter, r.reporterHandle, r.app_version, r.device_model, BUG_CATEGORY[r.category]].some((v) => String(v || '').toLowerCase().includes(q))))
      .sort((a, b) => Number(isOpenBug(b)) - Number(isOpenBug(a)) || BUG_SEVERITY[a.severity].rank - BUG_SEVERITY[b.severity].rank || new Date(b.createdAt) - new Date(a.createdAt));
  })();

  useEffect(() => { setPage(1); }, [tab, search, os, severity, statusFilter, assignee]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const runEach = async (ids, data, verb) => {
    setBusy(true);
    let ok = 0;
    for (const id of ids) { try { await dispatch(updateBugReport({ id, data })).unwrap(); ok += 1; } catch { /* counted below */ } }
    setBusy(false);
    setSelected(new Set());
    showToast(ok === ids.length ? `${ok} report${ok === 1 ? '' : 's'} ${verb}` : `${ok} of ${ids.length} ${verb}`, ok === ids.length ? 'success' : 'error');
  };

  const runDelete = async () => {
    const ids = confirm?.ids || [];
    setConfirm(null);
    let ok = 0;
    for (const id of ids) { try { await dispatch(deleteBugReport(id)).unwrap(); ok += 1; } catch { /* counted below */ } }
    setSelected(new Set());
    showToast(`${ok} report${ok === 1 ? '' : 's'} deleted`, ok === ids.length ? 'success' : 'error');
  };

  const exportCsv = () => downloadCsv(`bug-log-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Ticket', 'ID', 'Created', 'Severity', 'Status', 'Category', 'Description', 'Reporter', 'Platform', 'App version', 'Device', 'Network', 'Attachments', 'Assigned to', 'Resolved at', 'Admin note'],
    ...(selected.size ? rows.filter((r) => selected.has(r.id)) : filtered).map((r) => [r.ref, r.id, r.createdAt, BUG_SEVERITY[r.severity].label, BUG_STATUS[r.status].label, BUG_CATEGORY[r.category] || r.category, r.description, r.reporter, r.platform, r.app_version, r.device_model, NETWORK_LABEL[r.network_type] || '', r.files, r.assigneeName, r.resolved_at || '', r.admin_note || '']),
  ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest">
              <span className="text-[#E8194E]">Help & Ticket</span><span className="text-neutral-300">·</span><span className="text-neutral-500">Engineering & QA Triage</span>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[9.5px] text-rose-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />In-app bug reports</span>
            </p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Bug Reports & Technical Incidents</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">Bugs members report from the app, with device, OS and build captured automatically. Triage, assign and track to resolution.</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">
            <OutlineButton icon={Download} onClick={exportCsv} disabled={!rows.length}>Export Bug Log (CSV)</OutlineButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Open defects" value={formatNumber(stats.open)} icon={Bug} tone="rose" valueClass={stats.critical ? 'text-[#E8194E]' : undefined} foot={<>{stats.critical > 0 ? <Chip tone="rose">{stats.critical} P0 critical</Chip> : <Chip tone="emerald">No P0</Chip>}{formatNumber(stats.untriaged)} untriaged</>} />
          <StatCard label="Reported (30 days)" value={formatNumber(stats.recent)} icon={Inbox} tone="purple" foot={<>{stats.growth !== null && <Delta value={stats.growth} />}{formatNumber(stats.crashes)} app crashes</>} />
          <StatCard label="Mean time to resolve" value={duration(stats.mttr)} icon={Timer} tone="violet" foot={<><Chip tone="emerald">{formatNumber(stats.fixed30)} fixed</Chip>in the last 30 days</>} />
          <StatCard label="Closed rate" value={stats.closedRate === null ? '—' : `${stats.closedRate.toFixed(1)}%`} icon={ShieldAlert} tone="emerald" foot={<><Chip tone="lavender">{formatNumber(rows.length - stats.open)} / {formatNumber(rows.length)}</Chip>fixed or closed</>} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={clsx('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition',
              tab === t.key ? 'bg-[#1F2340] text-white' : t.tone === 'rose' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100' : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50')}>
              {t.tone === 'rose' && tab !== t.key && <span className="h-1.5 w-1.5 rounded-full bg-[#E8194E]" />}
              {t.label}
              <span className={clsx('rounded-full px-1.5 text-[10.5px] font-bold', tab === t.key ? 'bg-white/20 text-white' : t.tone === 'rose' && t.count ? 'bg-[#E8194E] text-white' : 'bg-[#EEF0FA] text-neutral-700')}>{formatNumber(t.count)}</span>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by ticket, description, reporter, build or device…" />
            <Select prefix="Platform" value={os} onChange={setOs} options={[{ value: 'all', label: 'All' }, ...Object.entries(OS_LABEL).map(([value, label]) => ({ value, label }))]} />
            <Select prefix="Severity" value={severity} onChange={setSeverity} options={[{ value: 'all', label: 'All' }, ...Object.entries(BUG_SEVERITY).map(([value, s]) => ({ value, label: s.label }))]} />
            <Select prefix="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }, ...Object.entries(BUG_STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
            <Select prefix="Assignee" value={assignee} onChange={setAssignee} options={assigneeOptions} />
            <RefreshButton onClick={load} spinning={listStatus === 'loading'} />
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-pink-100 bg-pink-50/60 px-4 py-2">
              <p className="text-[12.5px] font-semibold text-neutral-700">{selected.size} selected</p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] font-semibold text-neutral-600 hover:underline">Clear</button>
                <button type="button" disabled={busy || !myId} onClick={() => runEach([...selected], { assigned_to: myId }, 'assigned')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-bold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"><UserCheck className="h-3.5 w-3.5" /> Assign to me</button>
                <button type="button" disabled={busy} onClick={() => runEach([...selected], { status: 'fixed' }, 'marked fixed')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-[12px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Mark fixed</button>
                <button type="button" disabled={busy} onClick={() => runEach([...selected], { status: 'closed' }, 'closed')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Close</button>
                <button type="button" disabled={busy} onClick={() => setConfirm({ ids: [...selected] })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#C81345] px-3 text-[12px] font-bold text-white hover:bg-[#A50F39] disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  <th className="w-10 py-3 pl-4"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected((prev) => { const n = new Set(prev); if (allVisibleSelected) visible.forEach((r) => n.delete(r.id)); else visible.forEach((r) => n.add(r.id)); return n; })} aria-label="Select page" className="h-4 w-4 rounded accent-[#E8194E]" /></th>
                  {['Bug ID & created', 'Issue & category', 'Severity', 'Platform & build', 'Reported by', 'Assigned to', 'Status'].map((h) => <Th key={h}>{h}</Th>)}
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {listStatus === 'loading' && !rows.length ? <StateRow colSpan={9} loading message="Loading bug reports…" />
                  : !visible.length ? <StateRow colSpan={9} icon={Bug} message={listError ? `Error: ${listError}` : 'No bug reports match these filters'} />
                    : visible.map((r) => {
                      const sv = BUG_SEVERITY[r.severity];
                      const st = BUG_STATUS[r.status];
                      const isSel = selected.has(r.id);
                      const urgent = r.severity === 'critical' && isOpenBug(r);
                      return (
                        <tr key={r.id} onClick={() => navigate(`/reports/bugs/${r.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', urgent ? 'bg-rose-50/50' : isSel && 'bg-pink-50/60')}>
                          <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={isSel} onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label={`Select ${r.ref}`} className="h-4 w-4 rounded accent-[#E8194E]" /></td>
                          <td className="px-4 py-3">
                            <p className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[12.5px] font-bold text-[#E8194E]">{urgent && <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />}#{r.ref}</p>
                            <p className="text-[10.5px] text-neutral-500">{ago(r.ageMs)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="max-w-[300px] truncate text-[13px] font-bold text-neutral-900 group-hover:text-[#C81345]">{r.title}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                              <span className="rounded bg-[#E9EBFA] px-1.5 py-0.5 font-semibold text-neutral-700">{BUG_CATEGORY[r.category] || r.category}</span>
                              {r.files > 0 && <span className="inline-flex items-center gap-0.5 text-neutral-500"><ImageIcon className="h-3 w-3" />{r.files}</span>}
                              {r.similar > 0 && isOpenBug(r) && <span className="font-semibold text-[#8E35B5]">+{r.similar} similar open</span>}
                            </p>
                          </td>
                          <td className="px-4 py-3"><span className={clsx('inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-wide', sv.cls)}>{sv.label}</span></td>
                          <td className="px-4 py-3">
                            <p className="flex items-center gap-1 text-[12.5px] font-semibold text-neutral-800"><Smartphone className="h-3.5 w-3.5 text-neutral-400" />{r.platform || 'Unknown'}</p>
                            <p className="max-w-[180px] truncate text-[10.5px] text-neutral-500">{[r.app_version && `v${r.app_version}`, r.device_model].filter(Boolean).join(' · ') || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="max-w-[140px] truncate text-[12.5px] font-semibold text-neutral-800">{r.reporter}</p>
                            {r.reporterHandle && <p className="text-[10.5px] text-neutral-500">@{r.reporterHandle}</p>}
                          </td>
                          <td className="px-4 py-3">
                            {r.assigneeId ? (
                              <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF0FA] text-[10px] font-bold text-[#8E35B5]">{initials(r.assigneeName)}</span><span className="max-w-[110px] truncate text-[12.5px] font-semibold text-neutral-800">{r.assigneeId === myId ? 'You' : r.assigneeName}</span></div>
                            ) : (
                              <button type="button" disabled={!myId || busy} onClick={(e) => { e.stopPropagation(); runEach([r.id], { assigned_to: myId }, 'assigned'); }} className="rounded-lg border border-dashed border-[#C9CFEC] px-2 py-1 text-[11px] font-bold text-[#8E35B5] transition hover:border-[#8E35B5] hover:bg-purple-50 disabled:opacity-50">Unassigned · take it</button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
                            {r.resolveMs !== null && !isOpenBug(r) && <p className="mt-0.5 text-[10.5px] text-neutral-500">in {duration(r.resolveMs)}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <RowMenu row={r} onView={() => navigate(`/reports/bugs/${r.id}`)} onStatus={(s) => runEach([r.id], { status: s }, `marked ${BUG_STATUS[s].label.toLowerCase()}`)} onAssignMe={() => runEach([r.id], { assigned_to: myId }, 'assigned')} onDelete={() => setConfirm({ ids: [r.id] })} />
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} noun="incidents"
            extra={stats.critical > 0 && <span className="inline-flex items-center gap-1 font-semibold text-rose-600">· <AlertOctagon className="h-3.5 w-3.5" />{stats.critical} P0 open</span>} />
        </div>
      </div>

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={runDelete} title={`Delete ${confirm?.ids.length === 1 ? 'bug report' : `${confirm?.ids.length || 0} bug reports`}?`} description="The report and its attachments are permanently removed. This can't be undone." confirmText="Delete" confirmVariant="danger" />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
};

export default BugReports;
