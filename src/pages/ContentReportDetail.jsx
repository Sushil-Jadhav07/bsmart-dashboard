import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  AlertCircle, AlertTriangle, ArrowLeft, Ban, BookOpen, Check, CheckCircle2, Clock, Copy, Download, ExternalLink, Eye, Film, Flag, Gavel,
  Image, Loader2, Megaphone, MessageCircle, MessagesSquare, Paperclip, Rocket, ShieldAlert, ShieldCheck, Trash2, Undo2, User, Users, X,
} from 'lucide-react';
import { FieldSelect } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { deleteContentReport, fetchContentReports, updateContentReport } from '../store/contentReportsSlice.js';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';
import { formatDateTime, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, getThumbnailUrl, toAbsoluteMediaUrl } from '../utils/contentHelpers.js';
import {
  ACTIONS, CONTENT_TYPE, REPORT_STATUS, SEVERITY, contentKey, isOpenReport, refOf, reportId, reportRef, severityOf,
} from '../utils/contentReportMeta.js';

const HOUR = 3600 * 1000;
const TYPE_ICON = { post: Image, reel: Film, story: BookOpen, ad: Megaphone, comment: MessageCircle, tweet: MessagesSquare, promote_reel: Rocket };
const duration = (ms) => (!Number.isFinite(ms) ? '—' : ms < HOUR ? `${Math.max(1, Math.round(ms / 60000))} min` : ms < DAY_MS ? `${(ms / HOUR).toFixed(1)} hrs` : `${(ms / DAY_MS).toFixed(1)} days`);
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
const isVideoUrl = (url) => /\.(mp4|mov|webm|m3u8|mkv)(\?|$)/i.test(url || '');

// GET endpoints the dashboard already uses for each content type.
const CONTENT_ENDPOINTS = {
  post: (id) => [`/posts/${id}`, `/posts/reels/${id}`],
  reel: (id) => [`/posts/reels/${id}`, `/posts/${id}`],
  tweet: (id) => [`/tweets/${id}`],
  ad: (id) => [`/ads/${id}`],
  promote_reel: (id) => [`/promote-reels/${id}`],
};

const normalizeContent = (json) => {
  const o = json?.data?.post || json?.data?.tweet || json?.data?.ad || json?.data || json?.post || json?.tweet || json?.ad || json?.reel || json;
  if (!o || typeof o !== 'object') return null;
  const mediaList = [o.media, o.media_files, o.mediaFiles, o.images].find(Array.isArray) || (o.media && typeof o.media === 'object' ? [o.media] : []);
  const media = mediaList.map((m) => {
    const url = toAbsoluteMediaUrl(m?.fileUrl || m?.url || m?.fileName || (typeof m === 'string' ? m : ''));
    const video = m?.type === 'video' || m?.media_type === 'video' || isVideoUrl(url);
    return url ? { url, video, poster: video ? getThumbnailUrl(m) : '' } : null;
  }).filter(Boolean);
  return {
    text: o.caption || o.content || o.text || o.description || o.title || '',
    title: o.title || o.headline || '',
    media,
    likes: o.likes_count ?? (Array.isArray(o.likes) ? o.likes.length : o.likes) ?? null,
    comments: o.comments_count ?? o.comment_count ?? null,
    views: o.views_count ?? o.view_count ?? o.views ?? null,
    createdAt: o.createdAt,
    hashtags: Array.isArray(o.hashtags) ? o.hashtags : [],
    deleted: !!o.isDeleted,
  };
};

const Card = ({ title, icon: Icon, aside, children, bodyClass = 'p-5' }) => (
  <section className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
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

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 text-[12.5px]">
    <span className="flex-shrink-0 text-neutral-500">{label}</span>
    <span className="min-w-0 break-words text-right font-semibold text-neutral-800">{children ?? '—'}</span>
  </div>
);

export default function ContentReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const { list, listStatus, listError, deleteStatus } = useSelector((s) => s.contentReports);
  const [content, setContent] = useState({ status: 'idle', item: null });
  const [owner, setOwner] = useState(null);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [form, setForm] = useState({ action: 'content_removed', note: '', all: true });
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { if (listStatus === 'idle') dispatch(fetchContentReports({})); }, [listStatus, dispatch]);
  const report = list.find((r) => reportId(r) === String(id)) || null;

  const contentId = refOf(report?.content_id);
  const ownerId = refOf(report?.owner_id);
  useEffect(() => {
    if (!report || !token) return undefined;
    let alive = true;
    const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
    const urls = CONTENT_ENDPOINTS[report.content_type]?.(contentId) || [];
    setContent({ status: urls.length ? 'loading' : 'unsupported', item: null });
    setMediaIdx(0);
    (async () => {
      for (const path of urls) {
        const res = await fetch(`${API_BASE_WITH_PATH}${path}`, { headers }).catch(() => null);
        if (res?.ok) {
          const json = await res.json().catch(() => null);
          if (alive) setContent({ status: 'done', item: normalizeContent(json) });
          return;
        }
      }
      if (alive && urls.length) setContent({ status: 'missing', item: null });
    })();
    fetch(`${API_BASE_WITH_PATH}/users/${ownerId}`, { headers }).then((r) => (r.ok ? r.json() : null)).then((u) => { if (alive) setOwner(u?.user || u?.data || (u?._id ? u : null)); }).catch(() => {});
    return () => { alive = false; };
    // Refetch only when the reported item changes, not on every list update.
  }, [report?._id, contentId, ownerId, token]);

  const ctx = useMemo(() => {
    if (!report) return null;
    const key = contentKey(report);
    const sameContent = list.filter((r) => contentKey(r) === key).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const ownerReports = list.filter((r) => refOf(r.owner_id) === ownerId);
    const enforcements = ownerReports.filter((r) => r.status === 'action_taken' && r.action_taken && r.action_taken !== 'none');
    const reasons = new Map();
    sameContent.forEach((r) => reasons.set(r.reason, (reasons.get(r.reason) || 0) + 1));
    return {
      sameContent,
      openSame: sameContent.filter(isOpenReport),
      reporters: new Set(sameContent.map((r) => refOf(r.reporter_id))).size,
      reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
      ownerTotal: ownerReports.length,
      enforcements,
      otherContent: new Set(ownerReports.map(contentKey)).size - 1,
    };
  }, [list, report, ownerId]);

  useEffect(() => {
    if (!report) return;
    const sev = severityOf(report.reason);
    setForm({ action: sev === 'critical' ? 'content_removed' : sev === 'low' ? 'none' : 'warning_issued', note: report.admin_note || '', all: true });
  }, [report?._id]);

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2800); };

  const crumbs = (ref) => (
    <nav className="flex flex-wrap items-center gap-1.5 text-[12px]">
      <Link to="/reports/content" className="inline-flex items-center gap-1 font-bold text-[#C81345] hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Content Reports</Link>
      <span className="text-neutral-300">/</span><span className="text-neutral-500">Trust & Safety</span>
      {ref && <><span className="text-neutral-300">/</span><span className="font-bold text-neutral-900">#{ref}</span></>}
    </nav>
  );

  if (!report) {
    const loading = listStatus === 'idle' || listStatus === 'loading';
    return (
      <div className="space-y-6">
        {crumbs()}
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-neutral-400">
          {loading ? <><Loader2 className="h-8 w-8 animate-spin" /><p className="text-sm font-medium">Loading report…</p></>
            : <><AlertCircle className="h-8 w-8 text-rose-400" /><p className="font-semibold text-neutral-800">Report not found</p><p className="text-sm">{listError || 'It may have been deleted.'}</p></>}
        </div>
      </div>
    );
  }

  const ref = reportRef(report);
  const sevKey = severityOf(report.reason);
  const sev = SEVERITY[sevKey];
  const st = REPORT_STATUS[report.status] || REPORT_STATUS.pending;
  const meta = CONTENT_TYPE[report.content_type] || { label: report.content_type, path: null };
  const TypeIcon = TYPE_ICON[report.content_type] || Image;
  const ownerObj = report.owner_id && typeof report.owner_id === 'object' ? report.owner_id : {};
  const ownerName = owner?.username || ownerObj.username || 'unknown';
  const ownerAvatar = toAbsoluteMediaUrl(owner?.avatar_url || ownerObj.avatar_url || '');
  const accountAgeDays = owner?.createdAt ? Math.floor((Date.now() - new Date(owner.createdAt).getTime()) / DAY_MS) : null;
  const ownerBanned = owner && owner.is_active === false;
  const strikes = ctx.enforcements.length;
  const risk = Math.min(100, strikes * 25 + Math.min(40, ctx.ownerTotal * 5) + (accountAgeDays !== null && accountAgeDays < 30 ? 15 : 0));
  const media = content.item?.media || [];
  const current = media[mediaIdx];
  const evidence = Array.isArray(report.attachments) ? report.attachments : [];
  const isOpen = isOpenReport(report);
  const contentPath = meta.path ? meta.path(contentId) : null;

  const applyDecision = async (status, action) => {
    setBusy(status);
    const note = form.note.trim();
    const targets = form.all ? ctx.openSame.filter((r) => reportId(r) !== reportId(report)) : [];
    try {
      await dispatch(updateContentReport({ id: reportId(report), data: { status, admin_note: note, ...(action ? { action_taken: action } : {}) } })).unwrap();
      for (const r of targets) {
        // Only the primary report carries the action, so the owner is penalised and notified once.
        await dispatch(updateContentReport({ id: reportId(r), data: { status, admin_note: [`Resolved with #${ref}`, note].filter(Boolean).join(' · ').slice(0, 1000) } })).unwrap().catch(() => {});
      }
      const extra = targets.length ? ` + ${targets.length} linked report${targets.length === 1 ? '' : 's'}` : '';
      showToast(status === 'rejected' ? `Dismissed${extra}` : status === 'action_taken' ? `${ACTIONS[action]?.label || 'Action'} applied${extra}` : `Marked reviewed${extra}`);
    } catch (msg) {
      showToast(msg || 'Update failed', 'error');
    }
    setBusy('');
    setConfirm(null);
  };

  const severeAction = ['content_removed', 'temporary_suspension', 'permanent_ban'].includes(form.action);
  const audit = [
    ...ctx.sameContent.slice().reverse().map((r) => ({ at: r.createdAt, title: `Reported for ${r.reason}`, note: `by @${r.reporter_id?.username || 'member'}${r.details ? ` — “${r.details.slice(0, 80)}${r.details.length > 80 ? '…' : ''}”` : ''}`, tone: SEVERITY[severityOf(r.reason)].dot })),
    report.reviewed_at && { at: report.reviewed_at, title: `Decision: ${st.label}`, note: report.action_taken && report.action_taken !== 'none' ? ACTIONS[report.action_taken]?.label : 'No penalty applied', tone: report.status === 'action_taken' ? 'bg-rose-500' : 'bg-emerald-500' },
  ].filter(Boolean);

  return (
    <div className="space-y-5 pb-10">
      {crumbs(ref)}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[24px] font-bold tracking-tight text-neutral-900">Report Review: #{ref}</h1>
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot, isOpen && 'animate-pulse')} />{st.label}</span>
          </div>
          <p className="mt-1 text-[12px] text-neutral-500">{meta.label} · reported {formatDateTime(report.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOpen ? (
            <>
              <button type="button" onClick={() => applyDecision('rejected')} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><X className="h-4 w-4 text-[#8E35B5]" />Dismiss (no violation)</button>
              <button type="button" onClick={() => setConfirm({ action: 'content_removed' })} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E8194E] px-3.5 text-[12.5px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 hover:bg-[#C81345] disabled:opacity-50"><Ban className="h-4 w-4" />Take down content</button>
            </>
          ) : (
            <button type="button" onClick={() => applyDecision('pending')} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1F2340] px-3.5 text-[12.5px] font-bold text-white disabled:opacity-50"><Undo2 className="h-4 w-4" />Reopen review</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Report ID & source" icon={Flag} tone="bg-pink-100 text-[#C81345]">
          <button type="button" onClick={() => navigator.clipboard?.writeText(reportId(report)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})} className="flex items-center gap-1.5 font-display text-[18px] font-extrabold text-neutral-900">#{ref}{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-neutral-400" />}</button>
          <p className="text-[11.5px] text-neutral-500">{formatDateTime(report.createdAt)}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#8E35B5]">Member report · {meta.label}</p>
        </Fact>
        <Fact label="Aggregate report volume" icon={Users} tone="bg-purple-100 text-[#8E35B5]">
          <p className={clsx('font-display text-[22px] font-extrabold', ctx.sameContent.length > 1 ? 'text-[#C81345]' : 'text-neutral-900')}>{formatNumber(ctx.sameContent.length)} report{ctx.sameContent.length === 1 ? '' : 's'}</p>
          <p className="text-[11.5px] text-neutral-500">{formatNumber(ctx.reporters)} member{ctx.reporters === 1 ? '' : 's'} · {formatNumber(ctx.openSame.length)} still open</p>
        </Fact>
        <Fact label="Severity" icon={AlertTriangle} tone="bg-rose-100 text-rose-600">
          <span className={clsx('inline-flex rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase', sev.cls)}>{sev.label}</span>
          <p className="mt-1 text-[15px] font-extrabold text-neutral-900">{report.reason}</p>
          <p className="text-[11px] text-neutral-500">{ctx.reasons.length > 1 ? `Also: ${ctx.reasons.filter(([r]) => r !== report.reason).map(([r, n]) => `${r} (${n})`).join(', ')}` : 'Single violation type'}</p>
        </Fact>
        <Fact label="Content reach" icon={Eye} tone="bg-emerald-50 text-emerald-600">
          <p className="font-display text-[22px] font-extrabold text-neutral-900">{content.item?.views != null ? formatNumber(content.item.views) : content.item?.likes != null ? formatNumber(content.item.likes) : '—'}</p>
          <p className="text-[11.5px] text-neutral-500">{content.item?.views != null ? 'views' : content.item?.likes != null ? 'likes' : 'No engagement data'}{content.item?.comments != null && ` · ${formatNumber(content.item.comments)} comments`}</p>
          <p className={clsx('mt-0.5 text-[11px] font-semibold', content.item?.deleted || content.status === 'missing' ? 'text-rose-600' : 'text-emerald-600')}>{content.item?.deleted || content.status === 'missing' ? 'Content already removed' : content.status === 'done' ? 'Content is live' : content.status === 'loading' ? 'Checking…' : 'Not viewable here'}</p>
        </Fact>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card title="Flagged Media & Inspector" icon={TypeIcon} aside={<span className="rounded-md bg-[#E9EBFA] px-2 py-0.5 font-mono text-[10px] font-bold text-neutral-600">{meta.label.toUpperCase()} ID: {contentId.slice(-8).toUpperCase()}</span>}>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-[#14101F]">
              {content.status === 'loading' && <Loader2 className="h-7 w-7 animate-spin text-white/60" />}
              {current && (current.video
                ? <video key={current.url} src={current.url} poster={current.poster || undefined} controls className="h-full w-full object-contain" />
                : <img src={current.url} alt="" className="h-full w-full object-contain" />)}
              {content.status !== 'loading' && !current && (
                <div className="px-6 text-center">
                  <TypeIcon className="mx-auto h-9 w-9 text-white/30" />
                  <p className="mt-2 text-[12.5px] font-semibold text-white/70">{content.status === 'missing' ? 'This content no longer exists or was already taken down.' : content.status === 'unsupported' ? `${meta.plural} can't be previewed from the dashboard.` : 'No media on this item.'}</p>
                </div>
              )}
              <span className={clsx('absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase', sev.cls)}><ShieldAlert className="h-3 w-3" />{report.reason}</span>
            </div>
            {media.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {media.map((m, i) => (
                  <button key={i} type="button" onClick={() => setMediaIdx(i)} className={clsx('relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2', i === mediaIdx ? 'border-[#E8194E]' : 'border-transparent opacity-70 hover:opacity-100')}>
                    {m.video ? <span className="flex h-full w-full items-center justify-center bg-[#2A0F2E]"><Film className="h-4 w-4 text-white" /></span> : <img src={m.url} alt="" className="h-full w-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {contentPath && <button type="button" onClick={() => navigate(contentPath)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-[12px] font-semibold text-neutral-800 hover:bg-neutral-50"><ExternalLink className="h-3.5 w-3.5" />Open full {meta.label.toLowerCase()}</button>}
              {current && <a href={current.url} target="_blank" rel="noopener noreferrer" download className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-[12px] font-semibold text-neutral-800 hover:bg-neutral-50"><Download className="h-3.5 w-3.5" />Download raw asset</a>}
            </div>
            {content.item && (
              <div className="mt-4 space-y-3">
                {content.item.title && <p className="text-[15px] font-bold text-neutral-900">{content.item.title}</p>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#F6F7FD] px-3 py-2"><p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">Uploaded</p><p className="text-[12.5px] font-bold text-neutral-900">{content.item.createdAt ? formatDateTime(content.item.createdAt) : '—'}</p></div>
                  <div className="rounded-xl bg-[#F6F7FD] px-3 py-2"><p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">Media</p><p className="text-[12.5px] font-bold text-neutral-900">{media.length ? `${media.length} file${media.length === 1 ? '' : 's'}` : 'Text only'}</p></div>
                </div>
                {content.item.text && (
                  <div className="rounded-xl bg-[#F1F3FC] p-3">
                    <p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">Caption / text</p>
                    <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-neutral-800">{content.item.text}</p>
                    {content.item.hashtags.length > 0 && <p className="mt-1.5 text-[12px] font-semibold text-[#E8194E]">{content.item.hashtags.map((h) => `#${String(h).replace(/^#/, '')}`).join(' ')}</p>}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Reporter Grievance & Evidence Stream" icon={MessageCircle} aside={<span className="text-[11px] font-semibold text-[#8E35B5]">{formatNumber(ctx.sameContent.length)} report{ctx.sameContent.length === 1 ? '' : 's'} on this item</span>}>
            <div className="space-y-2.5">
              {ctx.sameContent.map((r) => {
                const rep = r.reporter_id && typeof r.reporter_id === 'object' ? r.reporter_id : {};
                const rs = SEVERITY[severityOf(r.reason)];
                const files = Array.isArray(r.attachments) ? r.attachments : [];
                return (
                  <div key={reportId(r)} className={clsx('rounded-xl p-3.5', reportId(r) === reportId(report) ? 'bg-pink-50/70 ring-1 ring-pink-200' : 'bg-[#F6F7FD]')}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#8E35B5]">{initials(rep.full_name || rep.username)}</span>
                        <p className="truncate text-[12.5px] font-bold text-neutral-900">@{rep.username || 'member'}</p>
                        <span className={clsx('rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase', rs.soft)}>{r.reason}</span>
                      </div>
                      <button type="button" onClick={() => navigate(`/reports/content/${reportId(r)}`)} className="flex-shrink-0 font-mono text-[10.5px] font-bold text-[#E8194E] hover:underline">#{reportRef(r)}</button>
                    </div>
                    <p className="mt-1.5 text-[12.5px] italic text-neutral-700">{r.details ? `“${r.details}”` : 'No extra details given.'}</p>
                    {files.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {files.map((f, i) => (
                          <a key={i} href={toAbsoluteMediaUrl(f.url)} target="_blank" rel="noopener noreferrer" className="relative block h-16 w-24 overflow-hidden rounded-lg border border-neutral-200 bg-[#1B1530]">
                            {f.type === 'video' ? <span className="flex h-full items-center justify-center"><Film className="h-4 w-4 text-white" /></span> : <img src={toAbsoluteMediaUrl(f.url)} alt="" className="h-full w-full object-cover" />}
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="mt-1.5 text-[10.5px] text-neutral-500">{formatDateTime(r.createdAt)} · {(REPORT_STATUS[r.status] || REPORT_STATUS.pending).label}</p>
                  </div>
                );
              })}
            </div>
            {evidence.length === 0 && ctx.sameContent.every((r) => !(r.attachments || []).length) && <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-neutral-500"><Paperclip className="h-3.5 w-3.5" />No reporter attached screenshots.</p>}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-[72px]">
          <Card title="Offending Creator Dossier" icon={User} aside={strikes > 0 && <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">Repeat offender</span>}>
            <div className="flex items-center gap-3 rounded-xl bg-[#F6F7FD] p-3">
              {ownerAvatar ? <img src={ownerAvatar} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-[14px] font-bold text-white">{initials(ownerName)}</span>}
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-[14px] font-bold text-neutral-900">@{ownerName}{strikes > 0 && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />}</p>
                <p className="truncate text-[11.5px] text-neutral-500">{owner?.full_name || ownerObj.full_name || ''}{owner?.role && ` · ${owner.role}`}</p>
                <p className="font-mono text-[10.5px] text-neutral-400">UID {ownerId.slice(-8).toUpperCase()}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[['Account age', accountAgeDays === null ? '—' : `${formatNumber(accountAgeDays)} d`], ['Followers', owner?.followers_count != null ? formatNumber(owner.followers_count) : '—'], ['Reports', formatNumber(ctx.ownerTotal)]].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-neutral-100 px-2 py-2"><p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">{l}</p><p className="text-[14px] font-extrabold text-neutral-900">{v}</p></div>
              ))}
            </div>
            <div className="mt-3 divide-y divide-neutral-100">
              <Row label="Prior enforcements"><span className={strikes ? 'text-amber-600' : 'text-emerald-600'}>{strikes ? `${strikes} (${[...new Set(ctx.enforcements.map((r) => ACTIONS[r.action_taken]?.label))].join(', ')})` : 'None'}</span></Row>
              <Row label="Other reported items">{formatNumber(Math.max(0, ctx.otherContent))}</Row>
              <Row label="Account status">{owner ? (ownerBanned ? <span className="text-rose-600">{owner.ban_type === 'permanent' ? 'Banned' : `Suspended${owner.ban_until ? ` until ${new Date(owner.ban_until).toLocaleDateString('en-IN')}` : ''}`}</span> : <span className="text-emerald-600">Active</span>) : '—'}</Row>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px]"><span className="font-bold uppercase tracking-wide text-neutral-600">Risk score</span><span className={clsx('font-extrabold', risk >= 60 ? 'text-rose-600' : risk >= 30 ? 'text-amber-600' : 'text-emerald-600')}>{risk} / 100 {risk >= 60 ? 'High' : risk >= 30 ? 'Medium' : 'Low'}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EEF0FA]"><div className={clsx('h-full rounded-full', risk >= 60 ? 'bg-rose-500' : risk >= 30 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${risk}%` }} /></div>
              <p className="mt-1 text-[10.5px] text-neutral-400">From prior enforcements, report count and account age.</p>
            </div>
            <button type="button" onClick={() => navigate(`/users/${ownerId}`)} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#EEF0FA] text-[12px] font-bold text-neutral-800 hover:bg-[#E2E5F4]">Open creator profile <ExternalLink className="h-3.5 w-3.5" /></button>
          </Card>

          <Card title="Enforcement Decision Center" icon={Gavel} aside={<span className={clsx('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase', sev.soft)}>{sev.label.split(' · ')[0]}</span>}>
            {isOpen ? (
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Enforcement action</p>
                  <FieldSelect value={form.action} onChange={(v) => setForm((f) => ({ ...f, action: v }))} options={Object.entries(ACTIONS).map(([value, a]) => ({ value, label: a.label, hint: a.hint, dot: value === 'none' ? 'bg-neutral-300' : value === 'warning_issued' ? 'bg-amber-500' : value === 'content_removed' ? 'bg-[#E8194E]' : 'bg-rose-700' }))} />
                </div>
                <div>
                  <p className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-neutral-600"><span>Moderator note</span><span className="font-medium normal-case text-neutral-400">{form.note.length}/1000</span></p>
                  <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value.slice(0, 1000) }))} rows={3} placeholder={form.action === 'temporary_suspension' || form.action === 'permanent_ban' ? 'Used as the ban reason shown to the creator' : 'Internal reasoning for this decision'} className="w-full resize-none rounded-lg border border-transparent bg-[#F1F3FC] px-3 py-2 text-[12.5px] outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10" />
                </div>
                {ctx.openSame.length > 1 && (
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-[#F6F7FD] px-3 py-2 text-[12px] text-neutral-700">
                    <input type="checkbox" checked={form.all} onChange={(e) => setForm((f) => ({ ...f, all: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#E8194E]" />
                    <span>Also resolve the other <b>{ctx.openSame.length - 1}</b> open report{ctx.openSame.length - 1 === 1 ? '' : 's'} on this item</span>
                  </label>
                )}
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800"><b>Automated notices:</b> the reporter is told the outcome. {form.action !== 'none' && `@${ownerName} is notified: “${{ content_removed: 'Content you posted was removed for violating our guidelines.', warning_issued: 'You received a warning regarding content you posted.', temporary_suspension: 'Your account has been temporarily suspended following a content report.', permanent_ban: 'Your account has been permanently banned following a content report.' }[form.action]}”`}</p>
                {form.action === 'none' ? (
                  <button type="button" onClick={() => applyDecision('reviewed')} disabled={!!busy} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1F2340] text-[13px] font-bold text-white disabled:opacity-50">{busy === 'reviewed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Mark reviewed, no action</button>
                ) : (
                  <button type="button" onClick={() => (severeAction ? setConfirm({ action: form.action }) : applyDecision('action_taken', form.action))} disabled={!!busy} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#C81345] text-[13px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:opacity-50">{busy === 'action_taken' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}Confirm: {ACTIONS[form.action].label}</button>
                )}
                <button type="button" onClick={() => applyDecision('rejected')} disabled={!!busy} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"><Undo2 className="h-4 w-4" />Keep content (false flag)</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className={clsx('rounded-xl p-3', report.status === 'action_taken' ? 'bg-rose-50' : 'bg-emerald-50')}>
                  <p className={clsx('flex items-center gap-1.5 text-[13px] font-bold', report.status === 'action_taken' ? 'text-rose-700' : 'text-emerald-700')}>{report.status === 'action_taken' ? <Gavel className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{st.label}{report.action_taken && report.action_taken !== 'none' && `: ${ACTIONS[report.action_taken]?.label}`}</p>
                  <p className="mt-0.5 text-[11.5px] text-neutral-600">Decided {report.reviewed_at ? formatDateTime(report.reviewed_at) : ''}{report.reviewed_at && ` · ${duration(new Date(report.reviewed_at) - new Date(report.createdAt))} after the report`}</p>
                </div>
                {report.admin_note && <p className="rounded-xl bg-[#F6F7FD] p-3 text-[12px] text-neutral-700"><b className="text-neutral-900">Note:</b> {report.admin_note}</p>}
                <p className="text-[11px] text-neutral-500">Reopening sends it back to the queue. Penalties already applied (removal, bans) stay in place; restore them from the content or user page.</p>
              </div>
            )}
          </Card>

          <Card title="Audit Trail" icon={Clock} aside={<span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />From reports</span>}>
            <ol className="relative space-y-3 border-l-2 border-neutral-100 pl-4">
              {audit.map((a, i) => (
                <li key={i} className="relative">
                  <span className={clsx('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white', a.tone)} />
                  <p className="font-mono text-[10.5px] text-neutral-500">{formatDateTime(a.at)}</p>
                  <p className="text-[12.5px] font-bold text-neutral-900">{a.title}</p>
                  <p className="text-[11.5px] text-neutral-500">{a.note}</p>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setConfirm({ del: true })} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-[12px] font-bold text-[#E8194E] hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" />Delete this report</button>
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => (confirm?.del
          ? dispatch(deleteContentReport(reportId(report))).unwrap().then(() => navigate('/reports/content')).catch((m) => { setConfirm(null); showToast(m || 'Delete failed', 'error'); })
          : applyDecision('action_taken', confirm.action))}
        title={confirm?.del ? `Delete #${ref}?` : `${ACTIONS[confirm?.action]?.label || 'Apply action'}?`}
        description={confirm?.del ? 'Only the report is deleted. The content stays as it is.' : confirm?.action === 'content_removed' ? `The ${meta.label.toLowerCase()} is taken down for everyone and @${ownerName} is notified.` : `@${ownerName}'s account is ${confirm?.action === 'permanent_ban' ? 'banned permanently' : 'suspended for 30 days'} and they're notified. The content itself stays up unless you remove it separately.`}
        confirmText={confirm?.del ? 'Delete' : 'Confirm'}
        confirmVariant="danger"
        loading={!!busy || deleteStatus === 'loading'}
      />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </div>
  );
}
