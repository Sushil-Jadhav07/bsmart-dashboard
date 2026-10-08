import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  BadgeCheck, Clock, Eye, FileArchive, FilePenLine, Globe, LayoutGrid, Link2, List, MoreVertical, Pencil, Plus, Scale,
  ShieldCheck, Trash2, Users, X,
} from 'lucide-react';
import { Chip, GradientButton, OutlineButton, RefreshButton, SearchInput, Select, StatCard } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import PolicyPreview from '../components/PolicyPreview.jsx';
import {
  clearCreateStatus, createPolicy, deletePolicyMeta, fetchPolicies, togglePolicyStatus, updatePolicyMeta,
} from '../store/policiesSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv } from '../utils/contentHelpers.js';
import {
  AUDIENCE, CORE_TYPES, POLICY_STATUS, SLUG_RE, appEndpoints, audienceIncludes, plainText, policyVisuals, readMinutes, wordCount,
} from '../utils/policyMeta.js';

const HOUR = 3600 * 1000;
const SUGGESTED = ['shipping', 'disclaimer', 'community-guidelines', 'cookies', 'seller-agreement'];
const SORTS = [
  { value: 'updated', label: 'Last updated' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'version', label: 'Most revised' },
];
const relTime = (iso) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '—';
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60000))} min ago`;
  if (ms < DAY_MS) return `${Math.round(ms / HOUR)} hours ago`;
  return `${Math.round(ms / DAY_MS)} days ago`;
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const titleFromSlug = (slug) => slug.split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const AudienceSwitch = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#F1F3FC] p-1">
    {Object.entries(AUDIENCE).map(([v, a]) => (
      <button key={v} type="button" onClick={() => onChange(v)} className={clsx('h-8 rounded-md text-[12px] font-bold transition', value === v ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-500 hover:text-neutral-800')}>{a.short}</button>
    ))}
  </div>
);

const ModalShell = ({ title, icon: Icon, subtitle, onClose, children, footer, onSubmit }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
    <form onSubmit={onSubmit} className="relative flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="h-1.5 bg-gradient-to-r from-[#E8194E] to-[#8E35B5]" />
      <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[19px] font-bold text-neutral-900"><Icon className="h-5 w-5 text-[#C81345]" />{title}</h2>
          <p className="text-[12.5px] text-neutral-500">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-5">{children}</div>
      <div className="flex items-center justify-end gap-2.5 border-t border-neutral-100 px-6 py-4">{footer}</div>
    </form>
  </div>
);

const label = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-neutral-700';
const field = 'h-10 w-full rounded-lg border border-transparent bg-[#F1F3FC] px-3 text-[13px] text-neutral-900 outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10';

const CreateModal = ({ existing, onClose, onCreated }) => {
  const dispatch = useDispatch();
  const { createStatus, createError } = useSelector((s) => s.policies);
  const [form, setForm] = useState({ title: '', type: '', app_source: 'both', draft: true });
  const [touchedSlug, setTouchedSlug] = useState(false);
  const slug = form.type.trim().toLowerCase();
  const slugTaken = existing.includes(slug);
  const slugBad = slug && !SLUG_RE.test(slug);

  useEffect(() => () => { dispatch(clearCreateStatus()); }, [dispatch]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !slug || slugBad || slugTaken) return;
    try {
      await dispatch(createPolicy({ type: slug, title: form.title.trim(), app_source: form.app_source, status: form.draft ? 'draft' : 'published' })).unwrap();
      onCreated(slug);
    } catch { /* error shown from slice */ }
  };

  return (
    <ModalShell title="New Legal Document" icon={Scale} subtitle="Create a custom policy page. You write the content in the editor next." onClose={onClose} onSubmit={submit}
      footer={<><button type="button" onClick={onClose} className="h-10 rounded-xl border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-800 hover:bg-neutral-50">Cancel</button>
        <button type="submit" disabled={createStatus === 'loading' || !form.title.trim() || !slug || slugBad || slugTaken} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{createStatus === 'loading' ? 'Creating…' : 'Create & open editor'}</button></>}>
      {createError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">{createError}</div>}
      <div>
        <label className={label}>Document title <span className="text-rose-500">*</span></label>
        <input required value={form.title} onChange={(e) => { const t = e.target.value; setForm((f) => ({ ...f, title: t, type: touchedSlug ? f.type : t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^[^a-z]+/, '') })); }} placeholder="Cookie Policy" className={clsx(field, 'font-semibold')} />
      </div>
      <div>
        <label className={label}>Type slug <span className="text-rose-500">*</span></label>
        <input value={form.type} onChange={(e) => { setTouchedSlug(true); setForm((f) => ({ ...f, type: e.target.value })); }} placeholder="cookies" className={clsx(field, 'font-mono')} />
        {slugTaken ? <p className="mt-1 text-[11.5px] font-semibold text-rose-600">A document with this slug already exists.</p>
          : slugBad ? <p className="mt-1 text-[11.5px] font-semibold text-rose-600">Lowercase letters, numbers, - or _ only, starting with a letter.</p>
            : <p className="mt-1 text-[11px] text-neutral-500">Used by the apps to load this page. Can't be changed later.</p>}
        {slug && !slugBad && <span className="mt-1.5 inline-flex rounded-md bg-[#E9EBFA] px-2 py-0.5 font-mono text-[11px] text-neutral-700">/policies/app/member?type={slug}</span>}
      </div>
      <div><label className={label}>Audience</label><AudienceSwitch value={form.app_source} onChange={(v) => setForm((f) => ({ ...f, app_source: v }))} /></div>
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#F6F7FD] px-3.5 py-3">
        <span><span className="block text-[13px] font-bold text-neutral-900">Save as draft</span><span className="block text-[11.5px] text-neutral-500">Drafts stay hidden until you publish. New documents are empty, so draft is safest.</span></span>
        <button type="button" role="switch" aria-checked={form.draft} onClick={() => setForm((f) => ({ ...f, draft: !f.draft }))} className={clsx('relative h-6 w-11 flex-shrink-0 rounded-full transition', form.draft ? 'bg-[#E8194E]' : 'bg-neutral-300')}><span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', form.draft ? 'left-[22px]' : 'left-0.5')} /></button>
      </label>
      <div className="rounded-xl bg-[#F1F3FC] p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">Common types</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SUGGESTED.filter((s) => !existing.includes(s)).map((s) => (
            <button key={s} type="button" onClick={() => { setTouchedSlug(true); setForm((f) => ({ ...f, type: s, title: f.title || `${titleFromSlug(s)}${/policy|agreement|guidelines|disclaimer/.test(s) ? '' : ' Policy'}` })); }} className="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-[#8E35B5] ring-1 ring-[#E2E5F4] hover:ring-[#8E35B5]">{s}</button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};

const MetaModal = ({ policy, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ title: policy.title, app_source: policy.app_source || 'both' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await dispatch(updatePolicyMeta({ type: policy.type, title: form.title.trim(), app_source: form.app_source })).unwrap(); onSaved(); }
    catch (msg) { setError(msg || 'Update failed'); }
    setBusy(false);
  };
  return (
    <ModalShell title="Rename & Audience" icon={Pencil} subtitle="Update the title and which app shows this document." onClose={onClose} onSubmit={submit}
      footer={<><button type="button" onClick={onClose} className="h-10 rounded-xl border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-800 hover:bg-neutral-50">Cancel</button>
        <button type="submit" disabled={busy || !form.title.trim()} className="h-10 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button></>}>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">{error}</div>}
      <div><label className={label}>Document title</label><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={clsx(field, 'font-semibold')} /></div>
      <div><label className={label}>Type slug</label><input value={policy.type} readOnly className={clsx(field, 'cursor-not-allowed font-mono text-neutral-500')} /><p className="mt-1 text-[11px] text-neutral-500">The slug can't be changed because the apps load the document by it.</p></div>
      <div><label className={label}>Audience</label><AudienceSwitch value={form.app_source} onChange={(v) => setForm((f) => ({ ...f, app_source: v }))} /></div>
    </ModalShell>
  );
};

const CardMenu = ({ p, onMeta, onCopy, onToggle, onDelete }) => {
  const [open, setOpen] = useState(false);
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50';
  const act = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`More for ${p.title}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-[#EEF0FA] hover:text-neutral-900"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={act(onMeta)} className={item}><Pencil className="h-3.5 w-3.5 text-neutral-400" /> Rename & audience</button>
            <button type="button" onClick={act(onCopy)} className={item}><Link2 className="h-3.5 w-3.5 text-neutral-400" /> Copy app API link</button>
            <button type="button" onClick={act(onToggle)} className={item}>{p.status === 'published' ? <><FilePenLine className="h-3.5 w-3.5 text-neutral-400" /> Unpublish (move to draft)</> : <><Globe className="h-3.5 w-3.5 text-neutral-400" /> Publish now</>}</button>
            <button type="button" onClick={act(onDelete)} className={clsx(item, 'text-red-600 hover:bg-red-50')}><Trash2 className="h-3.5 w-3.5" /> Delete document</button>
          </div>
        </>
      )}
    </div>
  );
};

export default function Policies() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items = {}, listStatus, listError, deleteStatus } = useSelector((s) => s.policies);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [audience, setAudience] = useState('all');
  const [sort, setSort] = useState('updated');
  const [view, setView] = useState('grid');
  const [createOpen, setCreateOpen] = useState(false);
  const [metaTarget, setMetaTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => dispatch(fetchPolicies());
  useEffect(() => { dispatch(fetchPolicies()); }, [dispatch]);
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };

  const docs = useMemo(() => Object.values(items).filter(Boolean).map((p) => {
    const words = wordCount(p.content);
    return { ...p, words, excerpt: plainText(p.content).slice(0, 220), visuals: policyVisuals(p.type), editor: p.updated_by?.full_name || p.updated_by?.email || '' };
  }), [items]);

  const stats = useMemo(() => {
    const published = docs.filter((d) => d.status === 'published');
    const quarterStart = (() => { const d = new Date(); d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    const latest = [...docs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    const corePublished = CORE_TYPES.filter((t) => docs.some((d) => d.type === t && d.status === 'published'));
    const coverage = (app) => CORE_TYPES.filter((t) => docs.some((d) => d.type === t && d.status === 'published' && audienceIncludes(d.app_source, app))).length;
    return {
      published: published.length,
      newThisQuarter: docs.filter((d) => new Date(d.createdAt).getTime() >= quarterStart).length,
      drafts: docs.length - published.length,
      emptyDrafts: docs.filter((d) => d.status === 'draft' && !d.words).length,
      latest,
      corePct: Math.round(((coverage('member') + coverage('vendor')) / (CORE_TYPES.length * 2)) * 100),
      coreMissing: CORE_TYPES.filter((t) => !corePublished.includes(t)),
      members: published.filter((d) => audienceIncludes(d.app_source, 'member')).length,
      vendors: published.filter((d) => audienceIncludes(d.app_source, 'vendor')).length,
    };
  }, [docs]);

  const tabs = [
    { key: 'all', label: 'All Documents', test: () => true },
    { key: 'member', label: 'Members', test: (d) => audienceIncludes(d.app_source, 'member') },
    { key: 'vendor', label: 'Vendors', test: (d) => audienceIncludes(d.app_source, 'vendor') },
    { key: 'custom', label: 'Custom policies', test: (d) => !d.visuals.core },
    { key: 'draft', label: 'Drafts', test: (d) => d.status === 'draft' },
  ].map((t) => ({ ...t, count: docs.filter(t.test).length }));

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    const test = tabs.find((t) => t.key === tab)?.test || (() => true);
    const list = docs.filter((d) => test(d)
      && (statusFilter === 'all' || d.status === statusFilter)
      && (audience === 'all' || d.app_source === audience)
      && (!q || [d.title, d.type, d.excerpt].some((v) => String(v || '').toLowerCase().includes(q))));
    const sorters = {
      updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      title: (a, b) => String(a.title).localeCompare(String(b.title)),
      version: (a, b) => (b.version || 0) - (a.version || 0),
    };
    return list.sort(sorters[sort]);
  })();

  const toggle = async (d) => {
    const next = d.status === 'published' ? 'draft' : 'published';
    if (next === 'published' && !d.words) { showToast('Add content before publishing', 'error'); return; }
    try { await dispatch(togglePolicyStatus({ type: d.type, status: next })).unwrap(); showToast(next === 'published' ? `${d.title} is live in the apps` : `${d.title} moved to draft`); }
    catch (msg) { showToast(msg || 'Update failed', 'error'); }
  };
  const copyLink = (d) => {
    const links = appEndpoints(d.type);
    const text = d.app_source === 'vendor' ? links.vendor : d.app_source === 'member' ? links.member : `${links.member}\n${links.vendor}`;
    navigator.clipboard?.writeText(text).then(() => showToast('App API link copied')).catch(() => showToast('Copy failed', 'error'));
  };
  const runDelete = async () => {
    const d = confirm;
    setConfirm(null);
    try { await dispatch(deletePolicyMeta(d.type)).unwrap(); showToast(`${d.title} deleted`); } catch (msg) { showToast(msg || 'Delete failed', 'error'); }
  };

  const exportIndex = () => downloadCsv(`legal-documents-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Title', 'Type slug', 'Status', 'Audience', 'Version', 'Words', 'Last updated', 'Updated by', 'Created'],
    ...filtered.map((d) => [d.title, d.type, POLICY_STATUS[d.status]?.label || d.status, AUDIENCE[d.app_source]?.label || d.app_source, d.version, d.words, d.updatedAt, d.editor, d.createdAt]),
  ]);
  const exportBundle = () => {
    const pub = docs.filter((d) => d.status === 'published').sort((a, b) => String(a.title).localeCompare(String(b.title)));
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>B-smart legal documents</title><style>body{font-family:Arial,sans-serif;max-width:820px;margin:40px auto;color:#111;line-height:1.6}section{page-break-after:always;margin-bottom:48px}.m{color:#666;font-size:12px}</style></head><body>
      <h1>B-smart legal documents</h1><p class="m">Exported ${esc(new Date().toLocaleString('en-IN'))} · ${pub.length} published documents</p>
      ${pub.map((d) => `<section><h1>${esc(d.title)}</h1><p class="m">${esc(AUDIENCE[d.app_source]?.label)} · v${esc(d.version)} · updated ${esc(fmt(d.updatedAt))}</p>${d.content || ''}</section>`).join('')}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bsmart-legal-bundle-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loading = (listStatus === 'idle' || listStatus === 'loading') && !docs.length;

  const Actions = ({ d }) => (
    <div className="flex flex-wrap items-center gap-2">
      {d.status === 'draft'
        ? <button type="button" onClick={() => navigate(`/policies/${d.type}`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#C81345] px-3 text-[12.5px] font-bold text-white transition hover:-translate-y-0.5"><FilePenLine className="h-3.5 w-3.5" />{d.words ? 'Continue editing' : 'Start writing'}</button>
        : <button type="button" onClick={() => navigate(`/policies/${d.type}`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E5F4] bg-[#F1F3FC] px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:border-pink-200 hover:bg-white"><Pencil className="h-3.5 w-3.5" />Edit policy</button>}
      <button type="button" onClick={() => setPreview(d)} className="inline-flex h-9 items-center gap-1 px-2 text-[12.5px] font-bold text-[#C81345] hover:underline"><Eye className="h-3.5 w-3.5" />View live</button>
      {d.status === 'draft' && d.words > 0 && <button type="button" onClick={() => toggle(d)} className="ml-auto inline-flex h-9 items-center gap-1 px-2 text-[12.5px] font-bold text-emerald-700 hover:underline"><Globe className="h-3.5 w-3.5" />Publish now</button>}
    </div>
  );

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest">
              <span className="text-[#E8194E]">Legal</span><span className="text-neutral-300">·</span><span className="text-neutral-500">Compliance Center</span>
              {stats.published > 0 && <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{stats.published} live in apps</span>}
            </p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">Legal Documents & Policies</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">Terms, privacy, refund and custom policy pages shown inside the B-smart member and vendor apps. Every save keeps the previous version.</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">
            <OutlineButton icon={FileArchive} onClick={exportBundle} disabled={!stats.published}>Export Policy Bundle</OutlineButton>
            <GradientButton icon={Plus} onClick={() => setCreateOpen(true)} className="!bg-gradient-to-r !from-[#E8194E] !to-[#8E35B5]">New Legal Document</GradientButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Published policies" value={`${formatNumber(stats.published)} active`} icon={BadgeCheck} tone="pink" foot={<><Chip tone="emerald">+{stats.newThisQuarter} this quarter</Chip>of {formatNumber(docs.length)} documents</>} />
          <StatCard label="Draft revisions" value={`${formatNumber(stats.drafts)} in draft`} icon={FilePenLine} tone="violet" foot={stats.drafts ? <><Chip tone="purple">{stats.emptyDrafts} still empty</Chip>hidden from users</> : <Chip tone="emerald">Nothing pending</Chip>} />
          <StatCard label="Last updated" value={stats.latest ? relTime(stats.latest.updatedAt) : '—'} icon={Clock} tone="indigo" foot={stats.latest ? <><Chip tone="lavender">{stats.latest.title} · v{stats.latest.version}</Chip>{stats.latest.editor && `by ${stats.latest.editor}`}</> : 'No documents yet'} />
          <StatCard label="Core coverage" value={`${stats.corePct}%${stats.corePct === 100 ? ' complete' : ''}`} icon={ShieldCheck} tone="emerald" valueClass={stats.corePct < 100 ? 'text-[#E8194E]' : undefined}
            foot={stats.coreMissing.length ? <><Chip tone="rose">Missing: {stats.coreMissing.join(', ')}</Chip></> : <><Chip tone="emerald">Terms · Privacy · Refund</Chip>{stats.members} member / {stats.vendors} vendor docs</>} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={clsx('rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition', tab === t.key ? 'bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-white shadow-[0_6px_14px_-8px_rgba(232,25,78,0.7)]' : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50')}>{t.label} ({formatNumber(t.count)})</button>
          ))}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700"><ShieldCheck className="h-3 w-3" />Last 20 versions kept per document</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search legal documents by title, slug or text…" />
          <Select prefix="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All Statuses' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]} />
          <Select prefix="Audience" value={audience} onChange={setAudience} options={[{ value: 'all', label: 'All Audiences' }, ...Object.entries(AUDIENCE).map(([value, a]) => ({ value, label: a.label }))]} />
          <Select prefix="Sort" value={sort} onChange={setSort} options={SORTS} />
          <div className="flex rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] p-0.5">
            {[['grid', LayoutGrid], ['list', List]].map(([v, Icon]) => (
              <button key={v} type="button" onClick={() => setView(v)} aria-label={`${v} view`} className={clsx('flex h-8 w-8 items-center justify-center rounded-md transition', view === v ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-500 hover:text-neutral-800')}><Icon className="h-4 w-4" /></button>
            ))}
          </div>
          <OutlineButton icon={List} onClick={exportIndex} disabled={!filtered.length} className="!h-10">Index CSV</OutlineButton>
          <RefreshButton onClick={load} spinning={listStatus === 'loading'} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200/70 bg-white py-16 text-center">
            <Scale className="h-9 w-9 text-neutral-200" />
            <p className="text-sm font-semibold text-neutral-600">{listError ? `Error: ${listError}` : docs.length ? 'No documents match these filters' : 'No legal documents yet'}</p>
            {!docs.length && <p className="text-[12.5px] text-neutral-500">Start with Terms & Conditions, a Privacy Policy and a Refund Policy.</p>}
            <button type="button" onClick={() => setCreateOpen(true)} className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#C81345] hover:underline"><Plus className="h-3.5 w-3.5" />New legal document</button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d) => {
              const st = POLICY_STATUS[d.status] || POLICY_STATUS.draft;
              const Icon = d.visuals.icon;
              return (
                <article key={d.type} className={clsx('group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_14px_30px_-16px_rgba(232,25,78,0.45)]', d.status === 'draft' ? 'border-dashed border-amber-300' : 'border-neutral-200/70')}>
                  <div className={clsx('h-1', d.visuals.bar)} />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
                        <span className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-400">{d.visuals.label}</span>
                      </div>
                      <CardMenu p={d} onMeta={() => setMetaTarget(d)} onCopy={() => copyLink(d)} onToggle={() => toggle(d)} onDelete={() => setConfirm(d)} />
                    </div>
                    <div className="mt-2 flex items-start gap-3">
                      <span className={clsx('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110', d.visuals.tile)}><Icon className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <button type="button" onClick={() => navigate(`/policies/${d.type}`)} className="block max-w-full truncate text-left font-display text-[15.5px] font-bold text-neutral-900 group-hover:text-[#C81345]">{d.title}</button>
                        <p className="font-mono text-[11px] text-[#8E35B5]">/{d.type}</p>
                      </div>
                    </div>
                    <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-[#E9EBFA] px-2 py-0.5 text-[10.5px] font-bold text-neutral-700"><Users className="h-3 w-3" />{AUDIENCE[d.app_source]?.label || 'Members & Vendors'}</span>
                    <p className="mt-2 line-clamp-2 min-h-[34px] text-[12px] leading-relaxed text-neutral-500">{d.excerpt || <span className="italic text-neutral-400">No content yet. Open the editor to start writing.</span>}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-[#F6F7FD] px-3 py-2"><p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">Revision</p><p className="text-[13px] font-extrabold text-neutral-900">v{d.version || 1} <span className="text-[10.5px] font-medium text-neutral-500">({formatNumber(d.words)} words)</span></p></div>
                      <div className="rounded-xl bg-[#F6F7FD] px-3 py-2"><p className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">Last edited by</p><p className="truncate text-[13px] font-extrabold text-neutral-900">{d.editor || '—'}</p></div>
                    </div>
                    <p className="mt-2 text-[10.5px] text-neutral-500">{d.status === 'draft' ? `Unpublished · last saved ${relTime(d.updatedAt)}` : `Last updated ${fmt(d.updatedAt)}`} · {readMinutes(d.words)} min read</p>
                    <div className="mt-auto border-t border-neutral-100 pt-3"><Actions d={d} /></div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead><tr className="border-b border-neutral-100 bg-[#F7F8FD]">{['Document', 'Audience', 'Status', 'Revision', 'Last updated', ''].map((h) => <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((d) => {
                    const st = POLICY_STATUS[d.status] || POLICY_STATUS.draft;
                    const Icon = d.visuals.icon;
                    return (
                      <tr key={d.type} onClick={() => navigate(`/policies/${d.type}`)} className="group cursor-pointer transition-colors hover:bg-[#FDF2F6]">
                        <td className="px-4 py-3"><div className="flex items-center gap-3"><span className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', d.visuals.tile)}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-[13.5px] font-bold text-neutral-900 group-hover:text-[#C81345]">{d.title}</p><p className="font-mono text-[11px] text-[#8E35B5]">/{d.type}</p></div></div></td>
                        <td className="px-4 py-3 text-[12.5px] text-neutral-700">{AUDIENCE[d.app_source]?.label}</td>
                        <td className="px-4 py-3"><span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span></td>
                        <td className="px-4 py-3 text-[12.5px] font-semibold text-neutral-800">v{d.version || 1} · {formatNumber(d.words)} words</td>
                        <td className="px-4 py-3"><p className="text-[12.5px] text-neutral-800">{relTime(d.updatedAt)}</p><p className="text-[10.5px] text-neutral-500">{d.editor || '—'}</p></td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><CardMenu p={d} onMeta={() => setMetaTarget(d)} onCopy={() => copyLink(d)} onToggle={() => toggle(d)} onDelete={() => setConfirm(d)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {docs.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50/80 to-purple-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[#C81345] shadow-sm"><ShieldCheck className="h-[18px] w-[18px]" /></span>
              <div>
                <p className="text-[13px] font-bold text-neutral-900">Version history on every save</p>
                <p className="text-[12px] text-neutral-600">Each save archives the previous version with who saved it and when (last 20 per document). Users only ever see published documents for their app.</p>
              </div>
            </div>
            <p className="flex-shrink-0 text-[11px] font-semibold text-neutral-500">Showing {filtered.length} of {docs.length}</p>
          </div>
        )}
      </div>

      {createOpen && <CreateModal existing={docs.map((d) => d.type)} onClose={() => setCreateOpen(false)} onCreated={(slug) => { setCreateOpen(false); navigate(`/policies/${slug}`); }} />}
      {metaTarget && <MetaModal policy={metaTarget} onClose={() => setMetaTarget(null)} onSaved={() => { setMetaTarget(null); showToast('Document updated'); }} />}
      {preview && <PolicyPreview policy={preview} html={preview.content} docs={docs} onClose={() => setPreview(null)} />}
      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={runDelete} title={`Delete ${confirm?.title || 'document'}?`} description={`This permanently removes the document, its content and all ${confirm?.version || ''} versions of history. Apps asking for "${confirm?.type || ''}" will get "not found". To hide it instead, unpublish it.`} confirmText="Delete" confirmVariant="danger" loading={deleteStatus === 'loading'} />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
}
