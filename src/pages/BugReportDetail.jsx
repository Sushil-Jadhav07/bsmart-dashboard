import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertCircle, ArrowLeft, Bug, CheckCircle2, Clock, Copy, Check, CopyX, ExternalLink, FileText, Image as ImageIcon, LifeBuoy, Loader2,
  MessageSquare, Play, RotateCcw, Rocket, Save, ShieldCheck, SlidersHorizontal, Smartphone, Trash2, User, Users, Wifi, X,
} from 'lucide-react';
import { FieldSelect } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { clearCurrent, deleteBugReport, fetchBugReportById, fetchBugReports, updateBugReport } from '../store/bugReportsSlice.js';
import { fetchSalesOfficers } from '../store/salesSlice.js';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import {
  BUG_CATEGORY, BUG_SEVERITY, BUG_STATUS, NETWORK_LABEL, OS_COLOR, OS_LABEL, bugId, bugRef, bugTitle, isOpenBug, platformOf, refOf,
} from '../utils/bugReportMeta.js';

const HOUR = 3600 * 1000;
const duration = (ms) => (!Number.isFinite(ms) ? '—' : ms < HOUR ? `${Math.max(1, Math.round(ms / 60000))} min` : ms < DAY_MS ? `${(ms / HOUR).toFixed(1)} hrs` : `${(ms / DAY_MS).toFixed(1)} days`);
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
const TICKET_STATUS = { open: 'bg-amber-50 text-amber-700', in_progress: 'bg-indigo-50 text-indigo-700', resolved: 'bg-emerald-50 text-emerald-700', closed: 'bg-neutral-100 text-neutral-600' };

const Card = ({ title, icon: Icon, aside, children, bodyClass = 'p-5', tone }) => (
  <section className={clsx('overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]', tone || 'border-neutral-200/70')}>
    <div className="flex items-center justify-between gap-3 px-5 pt-4">
      <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-neutral-900">{Icon && <Icon className="h-4 w-4 text-[#E8194E]" />}{title}</h2>
      {aside}
    </div>
    <div className={bodyClass}>{children}</div>
  </section>
);

const Fact = ({ label, icon: Icon, tone, children }) => (
  <div className="group rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:border-pink-200">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">{label}</p>
      <span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110', tone)}><Icon className="h-4 w-4" /></span>
    </div>
    <div className="mt-1">{children}</div>
  </div>
);

const Attachment = ({ a, index }) => {
  const [failed, setFailed] = useState(false);
  const url = toAbsoluteMediaUrl(a.url);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-video overflow-hidden rounded-xl border border-neutral-200 bg-[#1B1530]">
      {a.type === 'video' ? <video src={url} muted className="h-full w-full object-cover" />
        : !failed ? <img src={url} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-neutral-400"><ImageIcon className="h-6 w-6" /></div>}
      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{a.type === 'video' ? 'Video' : 'Screenshot'} {index + 1}</span>
      {a.type === 'video' && <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90"><Play className="h-4 w-4 text-neutral-900" /></span></span>}
      <span className="absolute right-2 top-2 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"><ExternalLink className="h-3 w-3" /></span>
    </a>
  );
};

export default function BugReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const me = useSelector((s) => s.auth.user);
  const { current: r, currentStatus, currentError, list, listStatus, deleteStatus } = useSelector((s) => s.bugReports);
  const officers = useSelector((s) => s.sales?.officers || []);
  const officersStatus = useSelector((s) => s.sales?.officersStatus);

  const [form, setForm] = useState({ priority: 'medium', status: 'new', assigned_to: '' });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState('');
  const [tickets, setTickets] = useState({ status: 'idle', items: [] });
  const [dupOpen, setDupOpen] = useState(false);
  const [dupOf, setDupOf] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (id) dispatch(fetchBugReportById(id));
    return () => dispatch(clearCurrent());
  }, [dispatch, id]);
  useEffect(() => { if (listStatus === 'idle') dispatch(fetchBugReports({})); }, [listStatus, dispatch]);
  useEffect(() => { if (officersStatus === 'idle') dispatch(fetchSalesOfficers()); }, [officersStatus, dispatch]);
  useEffect(() => {
    if (!r) return;
    setForm({ priority: r.priority || 'medium', status: r.status || 'new', assigned_to: refOf(r.assigned_to) });
    setNote(r.admin_note || '');
  }, [r]);

  const reporterId = refOf(r?.reporter_id);
  useEffect(() => {
    if (!reporterId || !token) return undefined;
    let alive = true;
    setTickets({ status: 'loading', items: [] });
    fetch(`${API_BASE_WITH_PATH}/support-queries/admin/user/${reporterId}?limit=20`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (alive) setTickets({ status: 'done', items: Array.isArray(json?.queries) ? json.queries : [] }); })
      .catch(() => { if (alive) setTickets({ status: 'done', items: [] }); });
    return () => { alive = false; };
  }, [reporterId, token]);

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };

  const related = useMemo(() => {
    if (!r) return { similar: [], users: 0, os: [], versions: [] };
    const sameCat = list.filter((x) => x.category === r.category);
    const similar = sameCat.filter((x) => bugId(x) !== bugId(r)).sort((a, b) => Number(isOpenBug(b)) - Number(isOpenBug(a)) || new Date(b.createdAt) - new Date(a.createdAt));
    const openSame = sameCat.filter(isOpenBug);
    const tally = (key) => {
      const m = new Map();
      sameCat.forEach((x) => { const k = x[key] || ''; m.set(k, (m.get(k) || 0) + 1); });
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ key: k, n, pct: sameCat.length ? (n / sameCat.length) * 100 : 0 }));
    };
    return {
      similar,
      openCount: openSame.length,
      users: new Set(openSame.map((x) => refOf(x.reporter_id))).size,
      total: sameCat.length,
      recent: sameCat.filter((x) => Date.now() - new Date(x.createdAt).getTime() <= 7 * DAY_MS).length,
      os: tally('os_type'),
      versions: tally('app_version').slice(0, 4),
    };
  }, [list, r]);

  const assigneeOptions = useMemo(() => {
    const map = new Map();
    const myId = String(me?._id || me?.id || '');
    if (myId) map.set(myId, { label: `${me?.full_name || me?.username || 'Me'} (you)`, hint: 'Admin' });
    officers.forEach((o) => map.set(String(o._id || o.id), { label: o.full_name || o.username || 'Officer', hint: 'Sales team' }));
    const cur = r?.assigned_to && typeof r.assigned_to === 'object' ? r.assigned_to : null;
    if (cur && !map.has(String(cur._id))) map.set(String(cur._id), { label: cur.full_name || cur.email, hint: 'Current assignee' });
    return [{ value: '', label: 'Unassigned', hint: 'Nobody owns this yet' }, ...[...map.entries()].map(([value, o]) => ({ value, ...o }))];
  }, [officers, me, r]);

  const isLoading = currentStatus === 'idle' || currentStatus === 'loading';
  const crumbs = (cat, ref) => (
    <nav className="flex flex-wrap items-center gap-1.5 text-[12px]">
      <Link to="/reports/bugs" className="inline-flex items-center gap-1 font-bold text-[#C81345] hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Bug Reports</Link>
      {cat && <><span className="text-neutral-300">/</span><span className="text-neutral-500">{cat}</span></>}
      {ref && <><span className="text-neutral-300">/</span><span className="font-bold text-neutral-900">{ref}</span></>}
    </nav>
  );

  if (isLoading || currentError || !r) {
    return (
      <div className="space-y-6">
        {crumbs()}
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-neutral-400">
          {currentError ? <><AlertCircle className="h-8 w-8 text-rose-400" /><p className="font-semibold text-neutral-800">Could not load this bug report</p><p className="text-sm">{currentError}</p></>
            : <><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm font-medium">Loading incident…</p></>}
        </div>
      </div>
    );
  }

  const ref = bugRef(r);
  const sev = BUG_SEVERITY[r.priority] || BUG_SEVERITY.medium;
  const st = BUG_STATUS[r.status] || BUG_STATUS.new;
  const reporter = r.reporter_id && typeof r.reporter_id === 'object' ? r.reporter_id : {};
  const assignee = r.assigned_to && typeof r.assigned_to === 'object' ? r.assigned_to : null;
  const attachments = Array.isArray(r.attachments) ? r.attachments : [];
  const created = new Date(r.createdAt).getTime();
  const openFor = (r.resolved_at ? new Date(r.resolved_at).getTime() : Date.now()) - created;
  const dirty = form.priority !== r.priority || form.status !== r.status || form.assigned_to !== refOf(r.assigned_to);
  const cat = BUG_CATEGORY[r.category] || r.category;

  const save = async (data, kind, message) => {
    setSaving(kind);
    try { await dispatch(updateBugReport({ id: bugId(r), data })).unwrap(); showToast(message); } catch (msg) { showToast(msg || 'Update failed', 'error'); }
    setSaving('');
  };
  const saveTriage = () => {
    const data = {};
    if (form.priority !== r.priority) data.priority = form.priority;
    if (form.status !== r.status) data.status = form.status;
    if (form.assigned_to !== refOf(r.assigned_to)) data.assigned_to = form.assigned_to || null;
    save(data, 'triage', 'Triage saved');
  };
  const markDuplicate = () => {
    const target = related.similar.find((x) => bugId(x) === dupOf);
    if (!target) return;
    const line = `Duplicate of #${bugRef(target)}`;
    save({ status: 'closed', admin_note: [line, (r.admin_note || '').trim()].filter(Boolean).join('\n').slice(0, 1000) }, 'dup', `Closed as duplicate of #${bugRef(target)}`);
    setDupOpen(false);
  };
  const runDelete = () => {
    dispatch(deleteBugReport(bugId(r))).unwrap().then(() => navigate('/reports/bugs')).catch((msg) => { setConfirmDelete(false); showToast(msg || 'Delete failed', 'error'); });
  };

  const audit = [
    { title: 'Reported in-app', note: `${reporter.full_name || reporter.username || 'A member'} filed it from ${platformOf(r) || 'the app'}${r.app_version ? ` (v${r.app_version})` : ''}`, at: r.createdAt, tone: 'bg-[#E8194E]' },
    assignee && { title: 'Assigned', note: `Owned by ${assignee.full_name || assignee.email}`, tone: 'bg-[#8E35B5]' },
    r.status === 'in_progress' && { title: 'Under investigation', note: 'Status set to investigating', tone: 'bg-indigo-500' },
    r.resolved_at && { title: r.status === 'fixed' ? 'Marked fixed' : 'Closed', note: `Resolved after ${duration(openFor)}`, at: r.resolved_at, tone: 'bg-emerald-500' },
    { title: 'Last updated', note: 'Most recent change to this report', at: r.updatedAt, tone: 'bg-neutral-400' },
  ].filter(Boolean);

  return (
    <div className="space-y-5 pb-10">
      {crumbs(cat, ref)}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide', sev.soft)}><span className={clsx('h-1.5 w-1.5 rounded-full', sev.dot, isOpenBug(r) && r.priority === 'critical' && 'animate-pulse')} />{sev.label} · {st.label}</span>
            <span className="rounded-md bg-[#E9EBFA] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{cat}</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-neutral-500"><Clock className="h-3.5 w-3.5" />{isOpenBug(r) ? `Open for ${duration(openFor)}` : `Resolved in ${duration(openFor)}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOpenBug(r) && related.similar.length > 0 && <button type="button" onClick={() => { setDupOf(bugId(related.similar[0])); setDupOpen(true); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md"><CopyX className="h-4 w-4 text-[#8E35B5]" />Mark duplicate</button>}
          {isOpenBug(r) && r.priority !== 'critical' && <button type="button" onClick={() => save({ priority: 'critical' }, 'esc', 'Escalated to P0')} disabled={!!saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[12.5px] font-bold text-[#E8194E] transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:opacity-50"><Rocket className="h-4 w-4" />Escalate to P0</button>}
          {isOpenBug(r)
            ? <button type="button" onClick={() => save({ status: 'fixed' }, 'fix', 'Marked fixed')} disabled={!!saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-3.5 text-[12.5px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:opacity-60">{saving === 'fix' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Mark fixed</button>
            : <button type="button" onClick={() => save({ status: 'in_progress' }, 'reopen', 'Reopened')} disabled={!!saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1F2340] px-3.5 text-[12.5px] font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"><RotateCcw className="h-4 w-4" />Reopen</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Bug ID & source" icon={Bug} tone="bg-pink-100 text-[#C81345]">
          <button type="button" onClick={() => navigator.clipboard?.writeText(ref).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})} className="flex items-center gap-1.5 font-display text-[18px] font-extrabold text-neutral-900">#{ref}{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-neutral-400" />}</button>
          <p className="text-[11.5px] text-neutral-500">{formatDateTime(r.createdAt)}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#8E35B5]"><span className="h-1.5 w-1.5 rounded-full bg-[#8E35B5]" />In-app bug reporter</p>
        </Fact>
        <Fact label="Affected volume" icon={Users} tone="bg-rose-100 text-rose-600">
          <p className={clsx('font-display text-[22px] font-extrabold', related.users > 1 ? 'text-[#C81345]' : 'text-neutral-900')}>{formatNumber(Math.max(1, related.users))} user{Math.max(1, related.users) === 1 ? '' : 's'}</p>
          <p className="text-[11.5px] text-neutral-500">{formatNumber(related.openCount)} open {cat.toLowerCase()} reports</p>
          <p className="mt-1 text-[11px] font-semibold text-rose-600">{formatNumber(related.recent)} reported in 7 days</p>
        </Fact>
        <Fact label="Device & build" icon={Smartphone} tone="bg-purple-100 text-[#8E35B5]">
          <p className="text-[15px] font-extrabold text-neutral-900">{platformOf(r) || 'Unknown OS'}</p>
          <p className="text-[11.5px] text-neutral-500">{r.device_model || 'Unknown device'}</p>
          <p className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-neutral-600">{r.app_version ? `App v${r.app_version}` : 'Version unknown'}{r.network_type && <span className="inline-flex items-center gap-0.5"><Wifi className="h-3 w-3" />{NETWORK_LABEL[r.network_type]}</span>}</p>
        </Fact>
        <Fact label="Assigned owner" icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600">
          <p className="text-[15px] font-extrabold text-neutral-900">{assignee ? assignee.full_name || assignee.email : 'Unassigned'}</p>
          <p className="text-[11.5px] text-neutral-500">{assignee?.email || 'Pick an owner in Triage'}</p>
          <p className={clsx('mt-1 flex items-center gap-1 text-[11px] font-semibold', assignee ? 'text-emerald-600' : 'text-amber-600')}><span className={clsx('h-1.5 w-1.5 rounded-full', assignee ? 'bg-emerald-500' : 'bg-amber-500')} />{assignee ? 'Owner set' : 'Needs an owner'}</p>
        </Fact>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-pink-100 text-[#C81345]"><FileText className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#E8194E]">Reported issue</p>
                  <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">{cat}</span>
                </div>
                <h1 className="mt-0.5 font-display text-[19px] font-bold leading-snug text-neutral-900">{bugTitle(r)}</h1>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-neutral-700">{r.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[['Release', r.app_version ? `v${r.app_version}` : '—'], ['Platform', platformOf(r) || '—'], ['Device', r.device_model || '—'], ['Network', NETWORK_LABEL[r.network_type] || '—']].map(([l, v]) => (
                <span key={l} className="inline-flex items-center gap-1 rounded-lg bg-[#F1F3FC] px-2.5 py-1 text-[11.5px] text-neutral-600">{l}: <b className="text-neutral-900">{v}</b></span>
              ))}
            </div>
          </section>

          <Card title="Evidence & Attachments" icon={ImageIcon} aside={<span className="text-[11px] text-neutral-500">{attachments.length} file{attachments.length === 1 ? '' : 's'}</span>}>
            {attachments.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{attachments.map((a, i) => <Attachment key={i} a={a} index={i} />)}</div>
            ) : <p className="rounded-xl bg-[#F6F7FD] px-4 py-6 text-center text-[12.5px] text-neutral-500">The reporter didn't attach screenshots or video.</p>}
          </Card>

          <Card title={`Platform Distribution · ${cat}`} icon={Smartphone} aside={<span className="text-[11px] text-neutral-500">{formatNumber(related.total)} reports in this category</span>}>
            {related.os.length > 0 && (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
                  {related.os.map((o) => <span key={o.key} className="inline-flex items-center gap-1.5 text-neutral-700"><span className={clsx('h-2 w-2 rounded-full', OS_COLOR[o.key] || 'bg-neutral-300')} />{OS_LABEL[o.key] || 'Unknown'} ({o.pct.toFixed(0)}%)</span>)}
                </div>
                <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-[#EEF0FA]">
                  {related.os.map((o) => <div key={o.key} className={OS_COLOR[o.key] || 'bg-neutral-300'} style={{ width: `${o.pct}%` }} />)}
                </div>
              </>
            )}
            {related.versions.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {related.versions.map((v) => (
                  <div key={v.key} className={clsx('rounded-xl p-2.5', v.key === r.app_version ? 'bg-pink-50 ring-1 ring-pink-200' : 'bg-[#F6F7FD]')}>
                    <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">Build</p>
                    <p className="text-[13px] font-extrabold text-neutral-900">{v.key ? `v${v.key}` : 'Unknown'}</p>
                    <p className="text-[10.5px] text-neutral-500">{v.n} report{v.n === 1 ? '' : 's'}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Similar reports</p>
            {related.similar.length ? (
              <div className="space-y-2">
                {related.similar.slice(0, 5).map((x) => {
                  const xs = BUG_STATUS[x.status] || BUG_STATUS.new;
                  return (
                    <button key={bugId(x)} type="button" onClick={() => navigate(`/reports/bugs/${bugId(x)}`)} className="flex w-full items-center gap-3 rounded-xl bg-[#F6F7FD] px-3 py-2.5 text-left transition hover:bg-[#FDF2F6]">
                      <span className="font-mono text-[11.5px] font-bold text-[#E8194E]">#{bugRef(x)}</span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-neutral-800">{bugTitle(x)}</span>
                      <span className="hidden text-[10.5px] text-neutral-500 sm:inline">{platformOf(x)}</span>
                      <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold', xs.cls)}>{xs.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : <p className="text-[12px] text-neutral-500">No other reports in this category.</p>}
          </Card>

          <Card title={`Reporter's Support Tickets${tickets.items.length ? ` (${tickets.items.length})` : ''}`} icon={LifeBuoy} bodyClass="pt-3" aside={<span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Same member</span>}>
            {tickets.status === 'loading' ? <p className="px-5 pb-5 text-[12.5px] text-neutral-400">Loading tickets…</p>
              : !tickets.items.length ? <p className="px-5 pb-5 text-[12.5px] text-neutral-500">This member hasn't raised any support tickets.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead><tr className="bg-[#F7F8FD]">{['Ticket', 'Subject', 'Category', 'Status', ''].map((h) => <th key={h} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-neutral-100">
                      {tickets.items.map((t) => (
                        <tr key={t._id} className="transition-colors hover:bg-[#FDF2F6]">
                          <td className="px-5 py-3 font-mono text-[12px] font-bold text-[#E8194E]">#TCK-{String(t._id).slice(-5).toUpperCase()}</td>
                          <td className="px-5 py-3"><p className="max-w-[260px] truncate text-[12.5px] font-semibold text-neutral-900">{t.subject}</p><p className="text-[10.5px] text-neutral-500">{formatDateTime(t.createdAt)}</p></td>
                          <td className="px-5 py-3 text-[12px] capitalize text-neutral-600">{t.category}</td>
                          <td className="px-5 py-3"><span className={clsx('rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize', TICKET_STATUS[t.status] || TICKET_STATUS.open)}>{String(t.status || 'open').replace('_', ' ')}</span></td>
                          <td className="px-5 py-3"><button type="button" onClick={() => navigate(`/customer-queries/${t._id}`)} aria-label="Open ticket" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-[#EEF0FA] hover:text-[#C81345]"><ExternalLink className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-[72px]">
          <Card title="Incident Triage & Controls" icon={SlidersHorizontal}>
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Severity level</p>
                <FieldSelect value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={Object.entries(BUG_SEVERITY).map(([value, s]) => ({ value, label: s.label, dot: s.dot }))} />
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Workflow status</p>
                <FieldSelect value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={Object.entries(BUG_STATUS).map(([value, s]) => ({ value, label: s.label, dot: s.dot, hint: s.hint }))} />
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Lead assignee</p>
                <FieldSelect value={form.assigned_to} onChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))} options={assigneeOptions} />
              </div>
              <button type="button" onClick={saveTriage} disabled={!dirty || !!saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-[13px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40">
                {saving === 'triage' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save triage
              </button>
            </div>
          </Card>

          <Card title="Reporter" icon={User}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF0FA] text-[13px] font-bold text-[#8E35B5]">{initials(reporter.full_name || reporter.username)}</span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-neutral-900">{reporter.full_name || reporter.username || 'Unknown user'}</p>
                {reporter.username && <p className="text-[11.5px] text-[#E8194E]">@{reporter.username}</p>}
                {reporter.email && <p className="truncate text-[11px] text-neutral-500">{reporter.email}</p>}
              </div>
            </div>
            <button type="button" disabled={!reporterId} onClick={() => navigate(`/users/${reporterId}`)} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#EEF0FA] text-[12px] font-bold text-neutral-800 hover:bg-[#E2E5F4] disabled:opacity-50">View profile <ExternalLink className="h-3.5 w-3.5" /></button>
          </Card>

          <Card title="Incident Audit Log" icon={Clock}>
            <ol className="relative space-y-4 border-l-2 border-neutral-100 pl-4">
              {audit.map((a, i) => (
                <li key={i} className="relative">
                  <span className={clsx('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white', a.tone)} />
                  {a.at && <p className="font-mono text-[10.5px] text-neutral-500">{formatDateTime(a.at)}</p>}
                  <p className="text-[12.5px] font-bold text-neutral-900">{a.title}</p>
                  <p className="text-[11.5px] text-neutral-500">{a.note}</p>
                </li>
              ))}
            </ol>
            <div className="mt-4">
              <p className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-neutral-600"><span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />Engineering note</span><span className="font-medium normal-case text-neutral-400">{note.length}/1000</span></p>
              <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} rows={4} placeholder="Root cause, workaround, linked PR or release…" className="w-full resize-none rounded-lg border border-transparent bg-[#F1F3FC] px-3 py-2 text-[12.5px] outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10" />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10.5px] text-neutral-400">Internal only, never shown to the reporter</p>
                <button type="button" onClick={() => save({ admin_note: note }, 'note', 'Note saved')} disabled={note === (r.admin_note || '') || !!saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1F2340] px-3 text-[12px] font-bold text-white disabled:opacity-40">{saving === 'note' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save note</button>
              </div>
            </div>
            <button type="button" onClick={() => setConfirmDelete(true)} disabled={deleteStatus === 'loading'} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-[12px] font-bold text-[#E8194E] hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" />Delete report</button>
          </Card>
        </div>
      </div>

      {dupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setDupOpen(false)} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-neutral-900"><CopyX className="h-5 w-5 text-[#8E35B5]" />Mark #{ref} as duplicate</h2>
              <button type="button" onClick={() => setDupOpen(false)} aria-label="Close" className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-1 text-[12.5px] text-neutral-500">This report is closed and the note records which one it duplicates.</p>
            <p className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Original report</p>
            <FieldSelect value={dupOf} onChange={setDupOf} options={related.similar.slice(0, 30).map((x) => ({ value: bugId(x), label: `#${bugRef(x)} · ${bugTitle(x)}`, hint: `${BUG_STATUS[x.status]?.label || x.status} · ${platformOf(x) || 'unknown platform'}`, dot: BUG_SEVERITY[x.priority]?.dot }))} />
            <div className="mt-5 flex gap-2.5">
              <button type="button" onClick={() => setDupOpen(false)} className="h-10 flex-1 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
              <button type="button" onClick={markDuplicate} disabled={!dupOf || !!saving} className="h-10 flex-1 rounded-xl bg-[#8E35B5] text-[13px] font-bold text-white hover:bg-[#7A2C9C] disabled:opacity-50">Close as duplicate</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={runDelete} title={`Delete #${ref}?`} description="The report and its attachments are permanently removed. This can't be undone." confirmText="Delete" confirmVariant="danger" loading={deleteStatus === 'loading'} />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </div>
  );
}
