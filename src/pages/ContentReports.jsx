import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  BookOpen, CheckCircle2, Download, Eye, Film, Flag, Gavel, Image, Megaphone, MessageCircle, MessagesSquare, MoreVertical, Paperclip,
  Rocket, ShieldAlert, Timer, Trash2, Undo2, X,
} from 'lucide-react';
import { Chip, OutlineButton, Pager, RefreshButton, SearchInput, Select, StatCard, StateRow, Th } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { deleteContentReport, fetchContentReports, updateContentReport } from '../store/contentReportsSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { prefRows } from '../utils/consolePrefs.js';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import {
  ACTIONS, CONTENT_TYPE, REASON_SEVERITY, REPORT_STATUS, SEVERITY, contentKey, isOpenReport, refOf, reportId, reportRef, severityOf,
} from '../utils/contentReportMeta.js';

const HOUR = 3600 * 1000;
const TYPE_ICON = { post: Image, reel: Film, story: BookOpen, ad: Megaphone, comment: MessageCircle, tweet: MessagesSquare, promote_reel: Rocket };
const ago = (ms) => (ms < HOUR ? `${Math.max(1, Math.round(ms / 60000))}m ago` : ms < DAY_MS ? `${Math.round(ms / HOUR)}h ago` : `${Math.round(ms / DAY_MS)}d ago`);
const duration = (ms) => (!Number.isFinite(ms) ? '—' : ms < HOUR ? `${Math.round(ms / 60000)} min` : ms < DAY_MS ? `${(ms / HOUR).toFixed(1)} hrs` : `${(ms / DAY_MS).toFixed(1)} days`);

const Avatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
    : <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-white">{String(name || '?')[0]?.toUpperCase()}</span>;
};

const RowMenu = ({ row, onReview, onStatus, onDelete, onOpenContent }) => {
  const [open, setOpen] = useState(false);
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50';
  const act = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Actions for ${row.ref}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-[#EEF0FA]"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={act(onReview)} className={item}><Gavel className="h-3.5 w-3.5 text-neutral-400" /> Open review</button>
            {onOpenContent && <button type="button" onClick={act(onOpenContent)} className={item}><Eye className="h-3.5 w-3.5 text-neutral-400" /> View {row.typeLabel.toLowerCase()}</button>}
            {row.status === 'pending' && <button type="button" onClick={act(() => onStatus('reviewed'))} className={item}><CheckCircle2 className="h-3.5 w-3.5 text-neutral-400" /> Mark reviewed (no action)</button>}
            {row.status === 'pending' && <button type="button" onClick={act(() => onStatus('rejected'))} className={item}><X className="h-3.5 w-3.5 text-neutral-400" /> Dismiss (no violation)</button>}
            {row.status !== 'pending' && <button type="button" onClick={act(() => onStatus('pending'))} className={item}><Undo2 className="h-3.5 w-3.5 text-neutral-400" /> Reopen</button>}
            <button type="button" onClick={act(onDelete)} className={clsx(item, 'text-red-600 hover:bg-red-50')}><Trash2 className="h-3.5 w-3.5" /> Delete report</button>
          </div>
        </>
      )}
    </div>
  );
};

const ContentReports = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list = [], listStatus, listError } = useSelector((s) => s.contentReports);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [reason, setReason] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => prefRows(10));
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => dispatch(fetchContentReports({}));
  useEffect(() => { dispatch(fetchContentReports({})); }, [dispatch]);
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };

  const rows = useMemo(() => {
    const now = Date.now();
    const groups = new Map();
    list.forEach((r) => {
      const k = contentKey(r);
      const g = groups.get(k) || { total: 0, open: 0, reporters: new Set() };
      g.total += 1;
      if (isOpenReport(r)) g.open += 1;
      g.reporters.add(refOf(r.reporter_id));
      groups.set(k, g);
    });
    const priorByOwner = new Map();
    list.forEach((r) => { if (r.status === 'action_taken' && r.action_taken && r.action_taken !== 'none') priorByOwner.set(refOf(r.owner_id), (priorByOwner.get(refOf(r.owner_id)) || 0) + 1); });
    return list.map((r) => {
      const owner = r.owner_id && typeof r.owner_id === 'object' ? r.owner_id : {};
      const reporter = r.reporter_id && typeof r.reporter_id === 'object' ? r.reporter_id : {};
      const g = groups.get(contentKey(r));
      const created = new Date(r.createdAt).getTime();
      const meta = CONTENT_TYPE[r.content_type] || { label: r.content_type, path: null };
      return {
        ...r,
        id: reportId(r),
        ref: reportRef(r),
        contentId: refOf(r.content_id),
        typeLabel: meta.label,
        contentPath: meta.path ? meta.path(refOf(r.content_id)) : null,
        severity: severityOf(r.reason),
        owner: owner.username || owner.full_name || 'Unknown',
        ownerName: owner.full_name || '',
        ownerAvatar: owner.avatar_url ? toAbsoluteMediaUrl(owner.avatar_url) : '',
        ownerId: refOf(r.owner_id),
        ownerStrikes: priorByOwner.get(refOf(r.owner_id)) || 0,
        reporter: reporter.username || reporter.full_name || 'Unknown',
        volume: g?.total || 1,
        uniqueReporters: g?.reporters.size || 1,
        openOnContent: g?.open || 0,
        files: Array.isArray(r.attachments) ? r.attachments.length : 0,
        ageMs: Number.isFinite(created) ? now - created : 0,
        tatMs: r.reviewed_at ? new Date(r.reviewed_at).getTime() - created : null,
      };
    });
  }, [list]);

  const stats = useMemo(() => {
    const pending = rows.filter(isOpenReport);
    const closed = rows.filter((r) => !isOpenReport(r));
    const actioned = closed.filter((r) => r.status === 'action_taken');
    const dismissed = closed.filter((r) => r.status === 'rejected');
    const tats = closed.map((r) => r.tatMs).filter((ms) => Number.isFinite(ms) && ms >= 0);
    const today = pending.filter((r) => r.ageMs <= DAY_MS).length;
    return {
      pending: pending.length,
      severe: pending.filter((r) => r.severity === 'critical' || r.severity === 'high').length,
      today,
      contentItems: new Set(pending.map(contentKey)).size,
      actionRate: closed.length ? (actioned.length / closed.length) * 100 : null,
      removed: actioned.filter((r) => r.action_taken === 'content_removed').length,
      banned: actioned.filter((r) => r.action_taken === 'temporary_suspension' || r.action_taken === 'permanent_ban').length,
      tat: tats.length ? tats.reduce((a, b) => a + b, 0) / tats.length : null,
      within24: tats.length ? (tats.filter((ms) => ms <= DAY_MS).length / tats.length) * 100 : null,
      dismissRate: closed.length ? (dismissed.length / closed.length) * 100 : null,
      dismissed: dismissed.length,
    };
  }, [rows]);

  const tabs = [
    { key: 'all', label: 'All Reports', test: () => true },
    { key: 'urgent', label: 'Urgent & Critical', test: (r) => isOpenReport(r) && (r.severity === 'critical' || r.severity === 'high'), tone: 'rose' },
    ...Object.entries(CONTENT_TYPE).map(([k, m]) => ({ key: `type:${k}`, label: m.plural, test: (r) => r.content_type === k })),
  ].map((t) => ({ ...t, count: rows.filter((r) => t.test(r) && (statusFilter === 'all' || r.status === statusFilter)).length }))
    .filter((t) => t.key === 'all' || t.key === 'urgent' || t.count > 0);

  const filtered = (() => {
    const q = search.trim().toLowerCase().replace(/^#/, '');
    const test = tabs.find((t) => t.key === tab)?.test || (() => true);
    return rows.filter((r) => test(r)
      && (statusFilter === 'all' || r.status === statusFilter)
      && (type === 'all' || r.content_type === type)
      && (reason === 'all' || r.reason === reason)
      && (!q || [r.ref, r.id, r.contentId, r.owner, r.ownerName, r.reporter, r.reason, r.details].some((v) => String(v || '').toLowerCase().includes(q))))
      .sort((a, b) => Number(isOpenReport(b)) - Number(isOpenReport(a)) || SEVERITY[a.severity].rank - SEVERITY[b.severity].rank || b.volume - a.volume || new Date(b.createdAt) - new Date(a.createdAt));
  })();

  useEffect(() => { setPage(1); }, [tab, search, type, reason, statusFilter]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const setStatusFor = async (ids, status) => {
    setBusy(true);
    let ok = 0;
    for (const id of ids) {
      const r = rows.find((x) => x.id === id);
      try { await dispatch(updateContentReport({ id, data: { status, admin_note: r?.admin_note || '' } })).unwrap(); ok += 1; } catch { /* counted below */ }
    }
    setBusy(false);
    setSelected(new Set());
    showToast(ok === ids.length ? `${ok} report${ok === 1 ? '' : 's'} ${REPORT_STATUS[status].label.toLowerCase()}` : `${ok} of ${ids.length} updated`, ok === ids.length ? 'success' : 'error');
  };

  const runDelete = async () => {
    const ids = confirm?.ids || [];
    setConfirm(null);
    let ok = 0;
    for (const id of ids) { try { await dispatch(deleteContentReport(id)).unwrap(); ok += 1; } catch { /* counted below */ } }
    setSelected(new Set());
    showToast(`${ok} report${ok === 1 ? '' : 's'} deleted`, ok === ids.length ? 'success' : 'error');
  };

  const exportCsv = () => downloadCsv(`violation-log-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Report', 'Report ID', 'Created', 'Content type', 'Content ID', 'Owner', 'Reporter', 'Reason', 'Severity', 'Details', 'Reports on this content', 'Status', 'Action', 'Reviewed at', 'Admin note'],
    ...(selected.size ? rows.filter((r) => selected.has(r.id)) : filtered).map((r) => [r.ref, r.id, r.createdAt, r.typeLabel, r.contentId, r.owner, r.reporter, r.reason, SEVERITY[r.severity].label, r.details, r.volume, REPORT_STATUS[r.status]?.label || r.status, ACTIONS[r.action_taken]?.label || '', r.reviewed_at || '', r.admin_note || '']),
  ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest">
              <span className="text-[#E8194E]">Content Moderation</span><span className="text-neutral-300">·</span><span className="text-neutral-500">Trust & Safety</span>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[9.5px] text-rose-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />Live queue</span>
            </p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Content Reports & Flagged Media</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">Member reports on Moments, bSparks, Buzz, Spotlights, Campaigns, Stories and Comments. Review, dismiss or enforce.</p>
          </div>
          <OutlineButton icon={Download} onClick={exportCsv} disabled={!rows.length}>Export Violation Log (CSV)</OutlineButton>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pending flagged reports" value={formatNumber(stats.pending)} icon={Flag} tone="rose" valueClass={stats.severe ? 'text-[#E8194E]' : undefined} foot={<>{stats.severe > 0 ? <Chip tone="rose">{stats.severe} high severity</Chip> : <Chip tone="emerald">No high severity</Chip>}{formatNumber(stats.contentItems)} items · {formatNumber(stats.today)} today</>} />
          <StatCard label="Enforcement rate" value={stats.actionRate === null ? '—' : `${stats.actionRate.toFixed(1)}%`} icon={Gavel} tone="purple" foot={<><Chip tone="purple">{formatNumber(stats.removed)} removed</Chip>{formatNumber(stats.banned)} accounts suspended or banned</>} />
          <StatCard label="Avg moderation time" value={duration(stats.tat)} icon={Timer} tone="violet" foot={stats.within24 !== null ? <><Chip tone="emerald">{stats.within24.toFixed(1)}%</Chip>reviewed within 24h</> : 'No reviewed reports yet'} />
          <StatCard label="Dismissal rate" value={stats.dismissRate === null ? '—' : `${stats.dismissRate.toFixed(1)}%`} icon={ShieldAlert} tone="emerald" foot={<><Chip tone="lavender">{formatNumber(stats.dismissed)}</Chip>reports found no violation</>} />
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
            <SearchInput value={search} onChange={setSearch} placeholder="Search by #REP, content ID, creator, reporter or details…" />
            <Select prefix="Type" value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, ...Object.entries(CONTENT_TYPE).map(([value, m]) => ({ value, label: m.plural }))]} />
            <Select prefix="Violation" value={reason} onChange={setReason} options={[{ value: 'all', label: 'All' }, ...Object.keys(REASON_SEVERITY).map((v) => ({ value: v, label: v }))]} />
            <Select prefix="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All' }, ...Object.entries(REPORT_STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
            <RefreshButton onClick={load} spinning={listStatus === 'loading'} />
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-pink-100 bg-pink-50/60 px-4 py-2">
              <p className="text-[12.5px] font-semibold text-neutral-700">{selected.size} selected</p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] font-semibold text-neutral-600 hover:underline">Clear</button>
                <button type="button" disabled={busy} onClick={() => setStatusFor([...selected], 'reviewed')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-bold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Mark reviewed</button>
                <button type="button" disabled={busy} onClick={() => setStatusFor([...selected], 'rejected')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-bold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Dismiss</button>
                <button type="button" disabled={busy} onClick={() => setConfirm({ ids: [...selected] })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#C81345] px-3 text-[12px] font-bold text-white hover:bg-[#A50F39] disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] text-left">
              <thead>
                <tr className="border-y border-neutral-100 bg-[#F7F8FD]">
                  <th className="w-10 py-3 pl-4"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected((prev) => { const n = new Set(prev); if (allVisibleSelected) visible.forEach((r) => n.delete(r.id)); else visible.forEach((r) => n.add(r.id)); return n; })} aria-label="Select page" className="h-4 w-4 rounded accent-[#E8194E]" /></th>
                  {['Report ID & time', 'Flagged content', 'Creator / poster', 'Violation & severity', 'Report volume', 'Status'].map((h) => <Th key={h}>{h}</Th>)}
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {listStatus === 'loading' && !rows.length ? <StateRow colSpan={8} loading message="Loading reports…" />
                  : !visible.length ? <StateRow colSpan={8} icon={Flag} message={listError ? `Error: ${listError}` : 'No reports match these filters'} />
                    : visible.map((r) => {
                      const sv = SEVERITY[r.severity];
                      const st = REPORT_STATUS[r.status] || REPORT_STATUS.pending;
                      const Icon = TYPE_ICON[r.content_type] || Image;
                      const isSel = selected.has(r.id);
                      const urgent = isOpenReport(r) && r.severity === 'critical';
                      return (
                        <tr key={r.id} onClick={() => navigate(`/reports/content/${r.id}`)} className={clsx('group cursor-pointer transition-colors hover:bg-[#FDF2F6]', urgent ? 'bg-rose-50/50' : isSel && 'bg-pink-50/60')}>
                          <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={isSel} onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label={`Select ${r.ref}`} className="h-4 w-4 rounded accent-[#E8194E]" /></td>
                          <td className="px-4 py-3">
                            <p className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[12.5px] font-bold text-[#E8194E]">{urgent && <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />}#{r.ref}</p>
                            <p className="text-[10.5px] text-neutral-500">{ago(r.ageMs)}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-[#8E35B5]"><Icon className="h-3 w-3" />{r.typeLabel}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2A0F2E] to-[#4B1240] text-white"><Icon className="h-5 w-5 opacity-80" /></span>
                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate text-[12.5px] font-semibold text-neutral-900 group-hover:text-[#C81345]">{r.details ? `“${r.details}”` : `${r.typeLabel} reported for ${r.reason.toLowerCase()}`}</p>
                                <p className="font-mono text-[10.5px] text-neutral-500">ID {r.contentId.slice(-8).toUpperCase()}</p>
                                {r.files > 0 && <p className="flex items-center gap-1 text-[10.5px] text-neutral-500"><Paperclip className="h-3 w-3" />{r.files} evidence file{r.files === 1 ? '' : 's'}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar src={r.ownerAvatar} name={r.owner} />
                              <div className="min-w-0">
                                <button type="button" onClick={(e) => { e.stopPropagation(); if (r.ownerId) navigate(`/users/${r.ownerId}`); }} className="max-w-[140px] truncate text-[12.5px] font-bold text-[#E8194E] hover:underline">@{r.owner}</button>
                                {r.ownerName && <p className="max-w-[140px] truncate text-[10.5px] text-neutral-500">{r.ownerName}</p>}
                                {r.ownerStrikes > 0 && <p className="text-[10.5px] font-semibold text-rose-600">{r.ownerStrikes} prior enforcement{r.ownerStrikes === 1 ? '' : 's'}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide', sv.cls)}>{sv.label}</span>
                            <p className="mt-1 text-[12.5px] font-bold text-neutral-900">{r.reason}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className={clsx('text-[13px] font-extrabold', r.volume > 1 ? 'text-[#C81345]' : 'text-neutral-900')}>{formatNumber(r.volume)} report{r.volume === 1 ? '' : 's'}</p>
                            <p className="text-[10.5px] text-neutral-500">{formatNumber(r.uniqueReporters)} member{r.uniqueReporters === 1 ? '' : 's'} · by @{r.reporter}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
                            {r.status === 'action_taken' && r.action_taken && r.action_taken !== 'none' && <p className="mt-0.5 text-[10.5px] font-semibold text-rose-600">{ACTIONS[r.action_taken]?.label}</p>}
                            {r.tatMs !== null && !isOpenReport(r) && <p className="text-[10.5px] text-neutral-500">in {duration(r.tatMs)}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <RowMenu row={r} onReview={() => navigate(`/reports/content/${r.id}`)} onOpenContent={r.contentPath ? () => navigate(r.contentPath) : null} onStatus={(s) => setStatusFor([r.id], s)} onDelete={() => setConfirm({ ids: [r.id] })} />
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} noun="reports" />
        </div>
      </div>

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={runDelete} title={`Delete ${confirm?.ids.length === 1 ? 'report' : `${confirm?.ids.length || 0} reports`}?`} description="Only the report is deleted. The reported content stays as it is." confirmText="Delete" confirmVariant="danger" />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
};

export default ContentReports;
