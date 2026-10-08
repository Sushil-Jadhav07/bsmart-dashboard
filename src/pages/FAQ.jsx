import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  ArrowDown, ArrowUp, BookOpen, ChevronDown, Copy, Download, Eye, EyeOff, FilePenLine, HelpCircle, Layers, MonitorSmartphone, PenLine,
  Plus, Radio, Store, Trash2, Users, X,
} from 'lucide-react';
import { Chip, FieldSelect, GradientButton, OutlineButton, RefreshButton, SearchInput, Select, StatCard } from '../components/MarketplaceKit.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { createFAQ, deleteFAQ, fetchFAQs, reorderFAQs, toggleFAQ, updateFAQ } from '../store/faqSlice.js';
import { formatDate, formatNumber } from '../utils/helpers.jsx';
import { DAY_MS, downloadCsv } from '../utils/contentHelpers.js';

const PAGE_SIZE = 10;

const CATEGORY = {
  general: { label: 'General', cls: 'bg-[#E9EBFA] text-neutral-700', dot: 'bg-[#6E72A8]' },
  account: { label: 'Account', cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  payment: { label: 'Payments & Bcoins', cls: 'bg-pink-100 text-[#C81345]', dot: 'bg-[#E8194E]' },
  vendor: { label: 'Vendor', cls: 'bg-purple-100 text-[#8E35B5]', dot: 'bg-[#8E35B5]' },
  member: { label: 'Member', cls: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  ads: { label: 'Ads & Promotions', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  other: { label: 'Other', cls: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
};
const AUDIENCE = {
  both: { label: 'Members & Vendors', short: 'Everyone', icon: Users },
  member: { label: 'Members only', short: 'Members', icon: Users },
  vendor: { label: 'Vendors only', short: 'Vendors', icon: Store },
};
const SORTS = [
  { value: 'order', label: 'Display order' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'Question A–Z' },
];
const EMPTY_FORM = { question: '', answer: '', category: 'general', app_source: 'both', is_active: true };

const faqRef = (id) => `FAQ-${String(id).slice(-4).toUpperCase()}`;
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

const FAQFormModal = ({ open, faq, nextOrder, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!faq?._id;

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(faq ? { question: faq.question || '', answer: faq.answer || '', category: faq.category || 'general', app_source: faq.app_source || 'both', is_active: faq.is_active !== false } : EMPTY_FORM);
  }, [open, faq]);

  if (!open) return null;
  const submit = async (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) return;
    setBusy(true);
    setError('');
    try {
      const body = { ...form, question: form.question.trim(), answer: form.answer.trim() };
      if (isEdit) await dispatch(updateFAQ({ id: faq._id, ...body, order: faq.order ?? 0 })).unwrap();
      else await dispatch(createFAQ({ ...body, order: nextOrder })).unwrap();
      onSaved(isEdit ? 'Article updated' : body.is_active ? 'Article published' : 'Draft saved');
      onClose();
    } catch (msg) {
      setError(typeof msg === 'string' ? msg : 'Failed to save');
    } finally {
      setBusy(false);
    }
  };
  const label = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-neutral-700';
  const field = 'h-10 w-full rounded-lg border border-transparent bg-[#F1F3FC] px-3 text-[13px] text-neutral-900 outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-[#E8194E] to-[#8E35B5]" />
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[19px] font-bold text-neutral-900"><PenLine className="h-5 w-5 text-[#C81345]" />{isEdit ? `Edit ${faqRef(faq._id)}` : 'New FAQ Article'}</h2>
            <p className="text-[12.5px] text-neutral-500">Shown in the in-app Help section for the audience you choose.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-5">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">{error}</div>}
          <div>
            <label className={label}>Question <span className="text-rose-500">*</span></label>
            <input required value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} maxLength={500} placeholder="How do I recharge my Bcoins wallet?" className={clsx(field, 'font-semibold')} />
          </div>
          <div>
            <label className={clsx(label, 'flex justify-between')}><span>Answer <span className="text-rose-500">*</span></span><span className="font-medium normal-case text-neutral-400">{formatNumber(form.answer.length)} / 5,000</span></label>
            <textarea required value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} maxLength={5000} rows={7} placeholder="Go to Wallet → Recharge, choose an amount…" className="w-full resize-y rounded-lg border border-transparent bg-[#F1F3FC] px-3 py-2.5 text-[13px] leading-relaxed outline-none transition focus:border-[#E8194E]/40 focus:bg-white focus:ring-2 focus:ring-[#E8194E]/10" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Category</label>
              <FieldSelect value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={Object.entries(CATEGORY).map(([v, c]) => ({ value: v, label: c.label, dot: c.dot }))} />
            </div>
            <div>
              <label className={label}>Audience</label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#F1F3FC] p-1">
                {Object.entries(AUDIENCE).map(([v, a]) => (
                  <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, app_source: v }))} className={clsx('h-8 rounded-md text-[11.5px] font-bold transition', form.app_source === v ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-500 hover:text-neutral-800')}>{a.short}</button>
                ))}
              </div>
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#F6F7FD] px-3.5 py-3">
            <span>
              <span className="block text-[13px] font-bold text-neutral-900">{form.is_active ? 'Published' : 'Hidden draft'}</span>
              <span className="block text-[11.5px] text-neutral-500">{form.is_active ? 'Visible in the app right after saving.' : 'Saved but not shown to anyone.'}</span>
            </span>
            <button type="button" role="switch" aria-checked={form.is_active} onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))} className={clsx('relative h-6 w-11 flex-shrink-0 rounded-full transition', form.is_active ? 'bg-[#E8194E]' : 'bg-neutral-300')}>
              <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', form.is_active ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </label>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-neutral-100 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-800 hover:bg-neutral-50">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-4 text-[13px] font-bold text-white disabled:opacity-60">{busy ? 'Saving…' : isEdit ? 'Save changes' : form.is_active ? 'Publish article' : 'Save draft'}</button>
        </div>
      </form>
    </div>
  );
};

// Mirrors the public GET /faq filter: active only, audience = chosen or "both".
const PreviewModal = ({ open, faqs, onClose }) => {
  const [audience, setAudience] = useState('member');
  const [openId, setOpenId] = useState(null);
  if (!open) return null;
  const visible = faqs.filter((f) => f.is_active && (f.app_source === audience || f.app_source === 'both')).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const groups = Object.keys(CATEGORY).map((key) => ({ key, items: visible.filter((f) => f.category === key) })).filter((g) => g.items.length);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#1B1530]/45 backdrop-blur-sm" />
      <div className="relative flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border-[6px] border-[#1F2340] bg-[#F6F7FD] shadow-2xl">
        <div className="flex items-center justify-between bg-white px-5 py-3.5">
          <div>
            <p className="font-display text-[16px] font-bold text-neutral-900">Help Center</p>
            <p className="text-[11px] text-neutral-500">Preview · {formatNumber(visible.length)} articles</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex gap-1 bg-white px-5 pb-3">
          {['member', 'vendor'].map((a) => (
            <button key={a} type="button" onClick={() => { setAudience(a); setOpenId(null); }} className={clsx('flex-1 rounded-full py-1.5 text-[12px] font-bold transition', audience === a ? 'bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-white' : 'bg-[#EEF0FA] text-neutral-600')}>{a === 'member' ? 'As a member' : 'As a vendor'}</button>
          ))}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!groups.length && <p className="py-10 text-center text-[13px] text-neutral-500">No published articles for this audience.</p>}
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-500">{CATEGORY[g.key].label}</p>
              <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white">
                {g.items.map((f) => (
                  <div key={f._id}>
                    <button type="button" onClick={() => setOpenId(openId === f._id ? null : f._id)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-semibold text-neutral-900">
                      {f.question}<ChevronDown className={clsx('h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform', openId === f._id && 'rotate-180')} />
                    </button>
                    {openId === f._id && <p className="whitespace-pre-wrap px-4 pb-3 text-[12.5px] leading-relaxed text-neutral-600">{f.answer}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FAQ = () => {
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((s) => s.faq);
  const [audience, setAudience] = useState('all');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('order');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ open: false, faq: null });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => dispatch(fetchFAQs({}));
  useEffect(() => { dispatch(fetchFAQs({})); }, [dispatch]);
  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };

  const ordered = useMemo(() => [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || new Date(a.createdAt) - new Date(b.createdAt)), [items]);

  const stats = useMemo(() => {
    const live = items.filter((f) => f.is_active);
    const now = Date.now();
    const updated30 = items.filter((f) => now - new Date(f.updatedAt).getTime() <= 30 * DAY_MS).length;
    const last = items.reduce((m, f) => Math.max(m, new Date(f.updatedAt).getTime() || 0), 0);
    return {
      live: live.length,
      hidden: items.length - live.length,
      categories: new Set(live.map((f) => f.category)).size,
      members: live.filter((f) => f.app_source !== 'vendor').length,
      vendors: live.filter((f) => f.app_source !== 'member').length,
      updated30,
      last,
      avgWords: live.length ? Math.round(live.reduce((s, f) => s + words(f.answer), 0) / live.length) : 0,
    };
  }, [items]);

  const audienceTabs = [
    { key: 'all', label: 'All Audiences', count: items.length },
    ...Object.entries(AUDIENCE).map(([key, a]) => ({ key, label: a.label, count: items.filter((f) => f.app_source === key).length })),
  ];
  const inAudience = items.filter((f) => audience === 'all' || f.app_source === audience);
  const categoryChips = Object.entries(CATEGORY).map(([key, c]) => ({ key, label: c.label, count: inAudience.filter((f) => f.category === key).length })).filter((c) => c.count > 0);

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    const list = ordered.filter((f) => (audience === 'all' || f.app_source === audience)
      && (category === 'all' || f.category === category)
      && (statusFilter === 'all' || (statusFilter === 'live' ? f.is_active : !f.is_active))
      && (!q || [f.question, f.answer, faqRef(f._id)].some((v) => String(v).toLowerCase().includes(q))));
    if (sort === 'updated') return [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (sort === 'newest') return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'az') return [...list].sort((a, b) => a.question.localeCompare(b.question));
    return list;
  })();

  useEffect(() => { setPage(1); }, [audience, category, statusFilter, search, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Swaps an article with its neighbour in the current (filtered) view, then renumbers everything.
  const move = (faq, dir) => {
    const idx = filtered.findIndex((f) => f._id === faq._id);
    const neighbour = filtered[idx + dir];
    if (!neighbour) return;
    const list = [...ordered];
    const a = list.findIndex((f) => f._id === faq._id);
    const b = list.findIndex((f) => f._id === neighbour._id);
    [list[a], list[b]] = [list[b], list[a]];
    setReordering(true);
    dispatch(reorderFAQs(list.map((f, i) => ({ id: f._id, order: i + 1 })))).unwrap()
      .catch((msg) => showToast(msg || 'Reorder failed', 'error'))
      .finally(() => setReordering(false));
  };

  const duplicate = async (faq) => {
    try {
      await dispatch(createFAQ({ question: `${faq.question} (copy)`.slice(0, 500), answer: faq.answer, category: faq.category, app_source: faq.app_source, is_active: false, order: ordered.length + 1 })).unwrap();
      showToast('Copy saved as a hidden draft');
    } catch (msg) { showToast(msg || 'Duplicate failed', 'error'); }
  };

  const toggle = async (faq) => {
    try {
      await dispatch(toggleFAQ(faq._id)).unwrap();
      showToast(faq.is_active ? 'Article hidden' : 'Article published');
    } catch (msg) { showToast(msg || 'Update failed', 'error'); }
  };

  const runDelete = async () => {
    const faq = confirm;
    setConfirm(null);
    try { await dispatch(deleteFAQ(faq._id)).unwrap(); showToast('Article deleted'); } catch (msg) { showToast(msg || 'Delete failed', 'error'); }
  };

  const exportCsv = () => downloadCsv(`faq-articles-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Reference', 'ID', 'Order', 'Question', 'Answer', 'Category', 'Audience', 'Status', 'Created', 'Updated'],
    ...filtered.map((f) => [faqRef(f._id), f._id, f.order ?? '', f.question, f.answer, CATEGORY[f.category]?.label || f.category, AUDIENCE[f.app_source]?.label || f.app_source, f.is_active ? 'Published' : 'Hidden', f.createdAt, f.updatedAt]),
  ]);

  const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-[#EEF0FA] hover:text-[#C81345] disabled:opacity-30';

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest"><span className="text-[#E8194E]">Help & Ticket</span><span className="text-neutral-300">·</span><span className="text-neutral-500">Knowledge Base & Self-Serve Portal</span></p>
            <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">FAQ & Help Articles Management</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">Self-service answers shown in the app's Help section for members and vendors.</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">
            <OutlineButton icon={MonitorSmartphone} onClick={() => setPreviewOpen(true)} disabled={!stats.live}>Preview Help Center</OutlineButton>
            <OutlineButton icon={Download} onClick={exportCsv} disabled={!filtered.length}>Export Articles</OutlineButton>
            <GradientButton icon={Plus} onClick={() => setForm({ open: true, faq: null })} className="!bg-gradient-to-r !from-[#E8194E] !to-[#8E35B5]">Create New FAQ Article</GradientButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Published Articles" value={formatNumber(stats.live)} icon={BookOpen} tone="pink" foot={<><Chip tone="lavender">{stats.categories} categories</Chip>live in the app</>} />
          <StatCard label="Hidden / Drafts" value={formatNumber(stats.hidden)} icon={EyeOff} tone="violet" foot={stats.hidden ? 'saved but not visible to users' : <Chip tone="emerald">Everything is live</Chip>} />
          <StatCard label="Audience Coverage" value={`${formatNumber(stats.members)} / ${formatNumber(stats.vendors)}`} icon={Users} tone="purple" foot={<><Chip tone="purple">Members / Vendors</Chip>articles each sees</>} />
          <StatCard label="Updated in 30 Days" value={formatNumber(stats.updated30)} icon={FilePenLine} tone="emerald" foot={stats.last ? <><Chip tone="emerald">~{stats.avgWords} words</Chip>avg answer · last edit {formatDate(stats.last)}</> : 'No articles yet'} />
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {audienceTabs.map((t) => (
              <button key={t.key} type="button" onClick={() => { setAudience(t.key); setCategory('all'); }} className={clsx('rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition', audience === t.key ? 'bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-white shadow-[0_6px_14px_-8px_rgba(232,25,78,0.7)]' : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50')}>
                {t.label} ({formatNumber(t.count)})
              </button>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-500">Delivered via <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 normal-case tracking-normal text-emerald-700"><Radio className="h-3 w-3" />In-app Help section</span></p>
          {categoryChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setCategory('all')} className={clsx('rounded-lg px-3 py-1 text-[12px] font-semibold transition', category === 'all' ? 'bg-[#1F2340] text-white' : 'bg-[#EEF0FA] text-neutral-700 hover:bg-[#E2E5F4]')}>All categories</button>
              {categoryChips.map((c) => (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)} className={clsx('rounded-lg px-3 py-1 text-[12px] font-semibold transition', category === c.key ? 'bg-[#1F2340] text-white' : 'bg-[#EEF0FA] text-neutral-700 hover:bg-[#E2E5F4]')}>{c.label} ({c.count})</button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search questions, answers or FAQ-ID…" />
          <Select prefix="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All (Published / Hidden)' }, { value: 'live', label: 'Published' }, { value: 'hidden', label: 'Hidden' }]} />
          <Select prefix="Sort" value={sort} onChange={setSort} options={SORTS} />
          <RefreshButton onClick={load} spinning={status === 'loading'} />
        </div>

        {status === 'loading' && !items.length ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200/70 bg-white py-16"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-3 text-sm text-neutral-400">Loading articles…</p></div>
        ) : !visible.length ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200/70 bg-white py-16">
            <HelpCircle className="h-8 w-8 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-500">{error ? `Error: ${error}` : 'No articles match these filters'}</p>
            <button type="button" onClick={() => setForm({ open: true, faq: null })} className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#C81345] hover:underline"><Plus className="h-3.5 w-3.5" /> Create an article</button>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((f) => {
              const cat = CATEGORY[f.category] || CATEGORY.other;
              const aud = AUDIENCE[f.app_source] || AUDIENCE.both;
              const isOpen = expanded === f._id;
              const idx = filtered.findIndex((x) => x._id === f._id);
              return (
                <article key={f._id} className={clsx('group rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-[0_14px_30px_-18px_rgba(232,25,78,0.45)]', f.is_active ? 'border-neutral-200/70' : 'border-dashed border-neutral-300 bg-neutral-50/60')}>
                  <div className="flex items-start gap-3">
                    {sort === 'order' && (
                      <div className="flex flex-shrink-0 flex-col items-center gap-0.5 pt-0.5">
                        <button type="button" onClick={() => move(f, -1)} disabled={idx === 0 || reordering} aria-label="Move up" className="rounded p-0.5 text-neutral-400 hover:text-[#C81345] disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <span className="text-[10px] font-bold text-neutral-400">{f.order ?? '–'}</span>
                        <button type="button" onClick={() => move(f, 1)} disabled={idx === filtered.length - 1 || reordering} aria-label="Move down" className="rounded p-0.5 text-neutral-400 hover:text-[#C81345] disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold', f.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-200/70 text-neutral-600')}><span className={clsx('h-1.5 w-1.5 rounded-full', f.is_active ? 'bg-emerald-500' : 'bg-neutral-400')} />{f.is_active ? 'Published · Live' : 'Hidden'}</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#E9EBFA] px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-700"><aud.icon className="h-3 w-3" />Target: {aud.label}</span>
                        <span className={clsx('rounded-md px-1.5 py-0.5 text-[10.5px] font-bold', cat.cls)}>{cat.label}</span>
                        <span className="font-mono text-[10.5px] text-neutral-400">ID: {faqRef(f._id)}</span>
                      </div>
                      <button type="button" onClick={() => setExpanded(isOpen ? null : f._id)} className="mt-1.5 block w-full text-left">
                        <h3 className={clsx('text-[15px] font-bold leading-snug transition-colors group-hover:text-[#C81345]', f.is_active ? 'text-neutral-900' : 'text-neutral-500')}>{f.question}</h3>
                        <p className={clsx('mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-neutral-500', !isOpen && 'line-clamp-2')}>{f.answer}</p>
                      </button>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-neutral-100 pt-2.5 text-[11px] text-neutral-500">
                        <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" />{words(f.answer)} words</span>
                        <button type="button" onClick={() => setExpanded(isOpen ? null : f._id)} className="inline-flex items-center gap-1 font-semibold text-[#8E35B5] hover:underline"><ChevronDown className={clsx('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />{isOpen ? 'Collapse answer' : 'Read full answer'}</button>
                        <span className="ml-auto">Updated {formatDate(f.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-0.5">
                      <button type="button" onClick={() => setForm({ open: true, faq: f })} className="mr-1 inline-flex h-8 items-center gap-1 rounded-lg border border-[#E2E5F4] bg-[#F1F3FC] px-2.5 text-[12px] font-semibold text-neutral-800 hover:border-pink-200 hover:bg-white"><PenLine className="h-3.5 w-3.5" /> Edit</button>
                      <button type="button" onClick={() => duplicate(f)} title="Duplicate as draft" aria-label="Duplicate" className={iconBtn}><Copy className="h-4 w-4" /></button>
                      <button type="button" onClick={() => toggle(f)} title={f.is_active ? 'Hide' : 'Publish'} aria-label={f.is_active ? 'Hide' : 'Publish'} className={iconBtn}>{f.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      <button type="button" onClick={() => setConfirm(f)} title="Delete" aria-label="Delete" className={clsx(iconBtn, 'hover:!bg-rose-50 hover:!text-rose-600')}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between text-[12px] text-neutral-500">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {formatNumber(filtered.length)} articles</span>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 rounded-lg px-2.5 font-semibold text-neutral-600 hover:bg-white disabled:opacity-30">‹ Prev</button>
              <span className="font-semibold text-neutral-800">{page} / {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 rounded-lg px-2.5 font-semibold text-neutral-600 hover:bg-white disabled:opacity-30">Next ›</button>
            </div>
          </div>
        )}
      </div>

      <FAQFormModal open={form.open} faq={form.faq} nextOrder={ordered.length + 1} onClose={() => setForm({ open: false, faq: null })} onSaved={showToast} />
      <PreviewModal open={previewOpen} faqs={items} onClose={() => setPreviewOpen(false)} />
      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={runDelete} title="Delete article" description={confirm ? `"${confirm.question}" will be removed from the Help section permanently.` : ''} confirmText="Delete" confirmVariant="danger" />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
};

export default FAQ;
