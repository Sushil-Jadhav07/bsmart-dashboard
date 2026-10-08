import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertTriangle, ArrowUpRight, Bell, BellRing, Bug, Check, CheckCheck, Coins, Download, Flag, Heart, Inbox, LifeBuoy, Lock, Receipt,
  ShieldCheck, Trash2, Zap,
} from 'lucide-react';
import { Chip, Delta, GradientButton, OutlineButton, Pager, RefreshButton, SearchInput, Select, StatCard } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { deleteNotification, fetchNotifications, markAllRead, markOneRead } from '../store/notificationsSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { prefRows } from '../utils/consolePrefs.js';
import { DAY_MS, downloadCsv, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import {
  ACTION_TYPES, CRITICAL_TYPES, NOTIFICATION_GROUPS, dashboardPathFor, formatNotifTime, getNotificationLabel, groupOf,
} from '../utils/notificationHelpers.js';

const GROUP_STYLE = {
  orders: { icon: Receipt, tile: 'bg-pink-100 text-[#C81345]', dot: 'bg-[#E8194E]' },
  safety: { icon: Flag, tile: 'bg-rose-100 text-rose-600', dot: 'bg-rose-500' },
  support: { icon: LifeBuoy, tile: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-500' },
  vault: { icon: Coins, tile: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
  account: { icon: Lock, tile: 'bg-purple-100 text-[#8E35B5]', dot: 'bg-[#8E35B5]' },
  social: { icon: Heart, tile: 'bg-[#EEF0FA] text-neutral-600', dot: 'bg-neutral-400' },
};
const TYPE_ICON = { bug_report_admin: Bug, bug_report_status: Bug, login_alert: ShieldCheck };
const RANGES = [
  { value: 'all', label: 'All time' },
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

const dayLabel = (iso) => {
  const d = new Date(iso);
  const start = (x) => { const c = new Date(x); c.setHours(0, 0, 0, 0); return c.getTime(); };
  const diff = Math.round((start(Date.now()) - start(d)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Sender = ({ sender }) => {
  const [failed, setFailed] = useState(false);
  const src = sender?.avatar_url ? toAbsoluteMediaUrl(sender.avatar_url) : '';
  const name = sender?.full_name || sender?.username || 'System';
  return src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-5 w-5 rounded-full object-cover" />
    : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-brand text-[9px] font-bold text-white">{name[0]?.toUpperCase()}</span>;
};

export default function Notifications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items = [], unreadCount, status, error } = useSelector((s) => s.notifications);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => prefRows(25));
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => dispatch(fetchNotifications());
  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };

  const rows = useMemo(() => items.map((n) => {
    const t = n.type || 'admin';
    return {
      id: n._id,
      type: t,
      group: groupOf(t),
      title: getNotificationLabel(t),
      message: n.message || 'Notification',
      sender: n.sender && typeof n.sender === 'object' ? n.sender : null,
      link: n.link || null,
      path: dashboardPathFor(n.link),
      isRead: !!n.isRead,
      createdAt: n.createdAt,
      ageMs: Date.now() - new Date(n.createdAt).getTime(),
      critical: CRITICAL_TYPES.has(t),
      action: ACTION_TYPES.has(t),
    };
  }), [items]);

  const stats = useMemo(() => {
    const recent = rows.filter((r) => r.ageMs <= 7 * DAY_MS).length;
    const prior = rows.filter((r) => r.ageMs > 7 * DAY_MS && r.ageMs <= 14 * DAY_MS).length;
    const unread = rows.filter((r) => !r.isRead);
    const today = rows.filter((r) => dayLabel(r.createdAt) === 'Today');
    const typeCounts = new Map();
    today.forEach((r) => typeCounts.set(r.title, (typeCounts.get(r.title) || 0) + 1));
    const busiest = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      growth: prior ? ((recent - prior) / prior) * 100 : null,
      recent,
      unread: unread.length,
      critical: unread.filter((r) => r.critical).length,
      action: unread.filter((r) => r.action).length,
      actionTotal: rows.filter((r) => r.action).length,
      today: today.length,
      busiest,
      readRate: rows.length ? ((rows.length - unread.length) / rows.length) * 100 : null,
    };
  }, [rows]);

  const groupCounts = useMemo(() => {
    const m = {};
    Object.keys(NOTIFICATION_GROUPS).forEach((g) => { m[g] = { total: 0, unread: 0 }; });
    rows.forEach((r) => { m[r.group].total += 1; if (!r.isRead) m[r.group].unread += 1; });
    return m;
  }, [rows]);

  const tabs = [
    { key: 'all', label: 'All Alerts', count: rows.length },
    { key: 'unread', label: 'Unread', count: stats.unread, tone: 'rose' },
    { key: 'action', label: 'Action required', count: stats.actionTotal },
    ...Object.entries(NOTIFICATION_GROUPS).map(([key, g]) => ({ key: `g:${key}`, label: g.label, count: groupCounts[key].total })).filter((t) => t.count > 0),
  ];

  const typeOptions = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.type, (m.get(r.type) || 0) + 1));
    return [{ value: 'all', label: 'All types' }, ...[...m.entries()].sort((a, b) => b[1] - a[1]).map(([value, n]) => ({ value, label: `${getNotificationLabel(value)} (${n})` }))];
  }, [rows]);

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    const maxAge = range === 'all' ? Infinity : Number(range) * DAY_MS;
    return rows.filter((r) => (tab === 'all' || (tab === 'unread' ? !r.isRead : tab === 'action' ? r.action : r.group === tab.slice(2)))
      && (type === 'all' || r.type === type)
      && (range === '1' ? dayLabel(r.createdAt) === 'Today' : r.ageMs <= maxAge)
      && (!q || [r.message, r.title, r.sender?.username, r.sender?.full_name].some((v) => String(v || '').toLowerCase().includes(q))));
  })();

  useEffect(() => { setPage(1); }, [tab, search, type, range]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const groupedVisible = [];
  visible.forEach((r) => {
    const label = dayLabel(r.createdAt);
    const last = groupedVisible[groupedVisible.length - 1];
    if (last && last.label === label) last.rows.push(r);
    else groupedVisible.push({ label, rows: [r] });
  });

  const open = (r) => {
    if (!r.isRead) dispatch(markOneRead(r.id));
    if (r.path) navigate(r.path);
  };

  const bulk = async (kind) => {
    const ids = [...selected];
    setBusy(true);
    let ok = 0;
    for (const id of ids) {
      const r = rows.find((x) => x.id === id);
      if (kind === 'read' && r?.isRead) { ok += 1; continue; }
      try { await dispatch(kind === 'read' ? markOneRead(id) : deleteNotification(id)).unwrap(); ok += 1; } catch { /* counted below */ }
    }
    setBusy(false);
    setSelected(new Set());
    setConfirm(null);
    showToast(`${ok} notification${ok === 1 ? '' : 's'} ${kind === 'read' ? 'marked read' : 'deleted'}`, ok === ids.length ? 'success' : 'error');
  };

  const readAll = async () => {
    try { await dispatch(markAllRead()).unwrap(); showToast('All caught up'); } catch { showToast('Could not mark all read', 'error'); }
  };

  const exportCsv = () => downloadCsv(`notifications-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Received', 'Type', 'Category', 'Message', 'From', 'Read', 'Link'],
    ...filtered.map((r) => [r.createdAt, r.title, NOTIFICATION_GROUPS[r.group].label, r.message, r.sender?.username || '', r.isRead ? 'yes' : 'no', r.link || '']),
  ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest">
              <span className="text-[#E8194E]">System</span><span className="text-neutral-300">·</span><span className="text-neutral-500">Alert Inbox</span>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Real-time</span>
            </p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Notification Center</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">Alerts sent to your admin account: orders and refunds, content and bug reports, support tickets, gift card orders and account security.</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">
            <OutlineButton icon={Download} onClick={exportCsv} disabled={!filtered.length}>Export (CSV)</OutlineButton>
            <GradientButton icon={CheckCheck} onClick={readAll} disabled={!unreadCount} className="!bg-gradient-to-r !from-[#E8194E] !to-[#8E35B5]">Mark all as read</GradientButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Received (7 days)" value={formatNumber(stats.recent)} icon={Inbox} tone="pink" foot={<>{stats.growth !== null && <Delta value={stats.growth} />}{formatNumber(rows.length)} in total</>} />
          <StatCard label="Unread" value={formatNumber(stats.unread)} icon={BellRing} tone="rose" valueClass={stats.critical ? 'text-[#E8194E]' : undefined} foot={stats.critical ? <><Chip tone="rose">{stats.critical} critical</Chip>refund or payment failures</> : <Chip tone="emerald">No critical alerts</Chip>} />
          <StatCard label="Action required" value={formatNumber(stats.action)} icon={Zap} tone="violet" foot={<><Chip tone="purple">Unread</Chip>reports, tickets, gift cards, refunds</>} />
          <StatCard label="Read rate" value={stats.readRate === null ? '—' : `${stats.readRate.toFixed(1)}%`} icon={CheckCheck} tone="emerald" foot={<><Chip tone="lavender">{formatNumber(stats.today)} today</Chip>{stats.busiest ? `mostly ${stats.busiest[0].toLowerCase()}` : 'quiet day'}</>} />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Alert sources</span>
          {Object.entries(NOTIFICATION_GROUPS).map(([key, g]) => {
            const c = groupCounts[key];
            if (!c.total) return null;
            return (
              <button key={key} type="button" onClick={() => setTab(`g:${key}`)} className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F7FD] px-2.5 py-1 text-[11.5px] font-semibold text-neutral-700 transition hover:bg-[#EEF0FA]">
                <span className={clsx('h-1.5 w-1.5 rounded-full', GROUP_STYLE[key].dot)} />{g.label}
                <span className={clsx('rounded-full px-1.5 text-[10px] font-bold', c.unread ? 'bg-[#E8194E] text-white' : 'bg-white text-neutral-500')}>{c.unread ? `${c.unread} new` : formatNumber(c.total)}</span>
              </button>
            );
          })}
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
            <SearchInput value={search} onChange={setSearch} placeholder="Search message, type or sender…" />
            <Select prefix="Type" value={type} onChange={setType} options={typeOptions} className="max-w-[260px]" />
            <Select value={range} onChange={setRange} options={RANGES} />
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] px-3 text-[12.5px] font-semibold text-neutral-700">
              <input type="checkbox" checked={allSelected} onChange={() => setSelected((prev) => { const n = new Set(prev); if (allSelected) visible.forEach((r) => n.delete(r.id)); else visible.forEach((r) => n.add(r.id)); return n; })} className="h-4 w-4 accent-[#E8194E]" />Select page
            </label>
            <RefreshButton onClick={load} spinning={status === 'loading'} />
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-pink-100 bg-pink-50/60 px-4 py-2">
              <p className="text-[12.5px] font-semibold text-neutral-700">{selected.size} selected</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] font-semibold text-neutral-600 hover:underline">Clear</button>
                <button type="button" disabled={busy} onClick={() => bulk('read')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-bold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Mark read</button>
                <button type="button" disabled={busy} onClick={() => setConfirm({ bulk: true })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#C81345] px-3 text-[12px] font-bold text-white hover:bg-[#A50F39] disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
              </div>
            </div>
          )}

          {status === 'loading' && !rows.length ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex animate-pulse items-center gap-3"><div className="h-10 w-10 rounded-full bg-[#F1F3FC]" /><div className="h-10 flex-1 rounded-lg bg-[#F6F7FD]" /></div>)}</div>
          ) : !visible.length ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Bell className="h-9 w-9 text-neutral-200" />
              <p className="text-sm font-semibold text-neutral-600">{error ? `Couldn't load notifications: ${error}` : tab === 'unread' ? "You're all caught up" : 'No notifications match these filters'}</p>
              {error && <button type="button" onClick={load} className="text-[12.5px] font-bold text-[#C81345] hover:underline">Try again</button>}
            </div>
          ) : (
            <div>
              {groupedVisible.map((g) => (
                <div key={g.label}>
                  <p className="sticky top-[52px] z-[1] flex items-center gap-2 border-y border-neutral-100 bg-[#F7F8FD] px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">{g.label}<span className="rounded-full bg-white px-1.5 text-[10px] text-neutral-500">{g.rows.length}</span></p>
                  <ul className="divide-y divide-neutral-100">
                    {g.rows.map((r) => {
                      const style = GROUP_STYLE[r.group];
                      const Icon = TYPE_ICON[r.type] || (r.critical ? AlertTriangle : style.icon);
                      const isSel = selected.has(r.id);
                      return (
                        <li key={r.id} className={clsx('group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#FDF2F6]',
                          !r.isRead && 'bg-pink-50/40', isSel && 'bg-pink-50/70')}>
                          {!r.isRead && <span className={clsx('absolute inset-y-0 left-0 w-[3px]', r.critical ? 'bg-rose-600' : 'bg-[#E8194E]')} />}
                          <input type="checkbox" checked={isSel} onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label="Select notification" className="mt-3 h-4 w-4 flex-shrink-0 accent-[#E8194E]" />
                          <span className={clsx('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', r.critical ? 'bg-rose-100 text-rose-600' : style.tile)}><Icon className="h-[18px] w-[18px]" /></span>
                          <button type="button" onClick={() => open(r)} className="min-w-0 flex-1 text-left">
                            <p className="flex flex-wrap items-center gap-2">
                              <span className={clsx('text-[13.5px]', r.isRead ? 'font-semibold text-neutral-700' : 'font-bold text-neutral-900')}>{r.title}</span>
                              {r.critical && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase text-rose-700">Critical</span>}
                              {r.action && !r.critical && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-[#8E35B5]">Action</span>}
                            </p>
                            <p className={clsx('mt-0.5 line-clamp-2 text-[12.5px]', r.isRead ? 'text-neutral-500' : 'text-neutral-700')}>{r.message}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                              <Sender sender={r.sender} />
                              <span>{r.sender?.username ? `@${r.sender.username}` : 'System'}</span>
                              <span className="text-neutral-300">·</span>
                              <span>{formatNotifTime(r.createdAt)}</span>
                              <span className="text-neutral-300">·</span>
                              <span>{NOTIFICATION_GROUPS[r.group].label}</span>
                            </p>
                          </button>
                          <div className="flex flex-shrink-0 items-center gap-1">
                            {!r.isRead && <span className="mr-1 h-2 w-2 rounded-full bg-[#E8194E] group-hover:hidden" />}
                            <div className="hidden items-center gap-1 group-hover:flex">
                              {r.path && <button type="button" onClick={() => open(r)} title="Open" aria-label="Open" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-white hover:text-[#C81345]"><ArrowUpRight className="h-4 w-4" /></button>}
                              {!r.isRead && <button type="button" onClick={() => dispatch(markOneRead(r.id))} title="Mark read" aria-label="Mark read" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-white hover:text-emerald-600"><Check className="h-4 w-4" /></button>}
                              <button type="button" onClick={() => setConfirm({ id: r.id })} title="Delete" aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-white hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <Pager page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} noun="notifications" />
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => (confirm?.bulk ? bulk('delete') : dispatch(deleteNotification(confirm.id)).unwrap().then(() => { setConfirm(null); showToast('Notification deleted'); }).catch(() => { setConfirm(null); showToast('Delete failed', 'error'); }))}
        title={confirm?.bulk ? `Delete ${selected.size} notifications?` : 'Delete notification?'}
        description="Deleted notifications are removed from your inbox for good."
        confirmText="Delete"
        confirmVariant="danger"
        loading={busy}
      />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
}
