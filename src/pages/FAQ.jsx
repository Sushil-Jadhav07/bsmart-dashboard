import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  HelpCircle,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  clearMutateStatus,
  createFAQ,
  deleteFAQ,
  fetchFAQs,
  reorderFAQs,
  toggleFAQ,
  updateFAQ,
} from '../store/faqSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import Dropdown from '../components/Dropdown.jsx';
import Button from '../components/Button.jsx';
import ActionMenu from '../components/ActionMenu.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

const PAGE_LIMIT = 10;

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'account', label: 'Account' },
  { value: 'payment', label: 'Payment' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'member', label: 'Member' },
  { value: 'ads', label: 'Ads' },
  { value: 'other', label: 'Other' },
];

const FORM_CATEGORIES = CATEGORY_OPTIONS.filter((c) => c.value !== 'all');

const APP_SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'member', label: 'Members' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'both', label: 'Both' },
];

const FORM_APP_SOURCES = APP_SOURCE_OPTIONS.filter((s) => s.value !== 'all');

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const categoryConfig = {
  general: { label: 'General', color: 'bg-neutral-100 text-neutral-600' },
  account: { label: 'Account', color: 'bg-blue-50 text-blue-700' },
  payment: { label: 'Payment', color: 'bg-emerald-50 text-emerald-700' },
  vendor: { label: 'Vendor', color: 'bg-violet-50 text-violet-700' },
  member: { label: 'Member', color: 'bg-sky-50 text-sky-700' },
  ads: { label: 'Ads', color: 'bg-amber-50 text-amber-700' },
  other: { label: 'Other', color: 'bg-neutral-100 text-neutral-500' },
};

const appSourceConfig = {
  member: { label: 'Members', color: 'bg-sky-50 text-sky-700' },
  vendor: { label: 'Vendors', color: 'bg-violet-50 text-violet-700' },
  both: { label: 'Both', color: 'bg-teal-50 text-teal-700' },
};

const CategoryBadge = ({ value }) => {
  const c = categoryConfig[value] || categoryConfig.other;
  return (
    <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize', c.color)}>
      {c.label}
    </span>
  );
};

const AppSourceBadge = ({ value }) => {
  const c = appSourceConfig[value] || appSourceConfig.both;
  return (
    <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium', c.color)}>
      {c.label}
    </span>
  );
};

/* ─── FAQ Form Modal ─── */
const EMPTY_FORM = {
  question: '',
  answer: '',
  category: 'general',
  app_source: 'both',
  order: 0,
  is_active: true,
};

const FAQFormModal = ({ isOpen, onClose, faq }) => {
  const dispatch = useDispatch();
  const { mutateStatus, mutateError } = useSelector((s) => s.faq);
  const isEdit = Boolean(faq);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isOpen) {
      setForm(faq
        ? {
            question: faq.question || '',
            answer: faq.answer || '',
            category: faq.category || 'general',
            app_source: faq.app_source || 'both',
            order: faq.order ?? 0,
            is_active: faq.is_active !== false,
          }
        : EMPTY_FORM
      );
      dispatch(clearMutateStatus());
    }
  }, [isOpen, faq, dispatch]);

  useEffect(() => {
    if (mutateStatus === 'succeeded') onClose();
  }, [mutateStatus, onClose]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) return;
    if (isEdit) {
      dispatch(updateFAQ({ id: faq._id, ...form, order: Number(form.order) }));
    } else {
      dispatch(createFAQ({ ...form, order: Number(form.order) }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">{isEdit ? 'Edit FAQ' : 'New FAQ'}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{isEdit ? 'Update the question and answer' : 'Add a new FAQ to the knowledge base'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {mutateError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{mutateError}</p>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Question <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="How do I recharge my wallet?"
              required
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Answer <span className="text-rose-500">*</span></label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              placeholder="Go to Wallet → Recharge → ..."
              required
              rows={4}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Category</label>
              <Dropdown value={form.category} onChange={set('category')} options={FORM_CATEGORIES} fullWidth />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">App Source</label>
              <Dropdown value={form.app_source} onChange={set('app_source')} options={FORM_APP_SOURCES} fullWidth />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Order <span className="font-normal text-neutral-400">(lower = first)</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Status</label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition',
                  form.is_active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                )}
              >
                {form.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {form.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-neutral-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={mutateStatus === 'loading'}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={mutateStatus === 'loading'}>
              {isEdit ? 'Save Changes' : 'Create FAQ'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const FAQ = () => {
  const dispatch = useDispatch();
  const { items, total, status, error } = useSelector((s) => s.faq);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [appSourceFilter, setAppSourceFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editFaq, setEditFaq] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [reordering, setReordering] = useState(false);

  const load = useCallback(() => {
    dispatch(fetchFAQs({
      app_source: appSourceFilter !== 'all' ? appSourceFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      is_active: activeFilter !== 'all' ? activeFilter : undefined,
    }));
  }, [dispatch, categoryFilter, appSourceFilter, activeFilter]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [categoryFilter, appSourceFilter, activeFilter]);

  const displayItems = useMemo(
    () => [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [items]
  );

  const totalPages = Math.max(1, Math.ceil(displayItems.length / PAGE_LIMIT));
  const pagedItems = displayItems.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  const activeCount = useMemo(() => items.filter((f) => f.is_active).length, [items]);
  const inactiveCount = useMemo(() => items.filter((f) => !f.is_active).length, [items]);

  const handleOpenCreate = () => { setEditFaq(null); setFormOpen(true); };
  const handleOpenEdit = (faq) => { setEditFaq(faq); setFormOpen(true); };
  const handleCloseForm = () => { setFormOpen(false); setEditFaq(null); };

  const handleToggle = (id) => dispatch(toggleFAQ(id));

  // displayIdx is the true index in displayItems (not the page index)
  const handleMoveUp = (displayIdx) => {
    if (displayIdx === 0) return;
    const newOrder = displayItems.map((f, i) => {
      if (i === displayIdx - 1) return { id: f._id, order: displayItems[displayIdx].order ?? displayIdx };
      if (i === displayIdx) return { id: f._id, order: displayItems[displayIdx - 1].order ?? (displayIdx - 1) };
      return { id: f._id, order: f.order ?? i };
    });
    setReordering(true);
    dispatch(reorderFAQs(newOrder)).finally(() => setReordering(false));
  };

  const handleMoveDown = (displayIdx) => {
    if (displayIdx === displayItems.length - 1) return;
    const newOrder = displayItems.map((f, i) => {
      if (i === displayIdx) return { id: f._id, order: displayItems[displayIdx + 1].order ?? (displayIdx + 1) };
      if (i === displayIdx + 1) return { id: f._id, order: displayItems[displayIdx].order ?? displayIdx };
      return { id: f._id, order: f.order ?? i };
    });
    setReordering(true);
    dispatch(reorderFAQs(newOrder)).finally(() => setReordering(false));
  };

  const handleDelete = () => {
    if (confirmDelete.id) dispatch(deleteFAQ(confirmDelete.id));
    setConfirmDelete({ isOpen: false, id: null });
  };

  const statCards = [
    { label: 'Total FAQs', value: total || items.length, icon: BookOpen, color: 'text-primary bg-primary/10' },
    { label: 'Active', value: activeCount, icon: Eye, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Inactive', value: inactiveCount, icon: EyeOff, color: 'text-neutral-500 bg-neutral-100' },
  ];

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Help & Ticket</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">FAQ Management</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Manage frequently asked questions shown to members and vendors.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreate}>New FAQ</Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', s.color)}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 leading-tight">{formatNumber(s.value)}</p>
                <p className="text-[11px] text-neutral-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {/* Filters */}
          <div className="p-3 border-b border-neutral-100 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Dropdown value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} />
              <Dropdown value={appSourceFilter} onChange={setAppSourceFilter} options={APP_SOURCE_OPTIONS} />
              <Dropdown value={activeFilter} onChange={setActiveFilter} options={STATUS_OPTIONS} />
            </div>
            <p className="text-xs text-neutral-400">
              {formatNumber(displayItems.length)} item{displayItems.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* List */}
          {status === 'loading' && items.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <HelpCircle className="h-8 w-8 text-neutral-200" />
              <p className="text-sm font-medium text-neutral-500">No FAQs found</p>
              <p className="text-xs text-neutral-400">Try changing your filters or create a new FAQ.</p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Create FAQ
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {pagedItems.map((faq, pageIdx) => {
                const displayIdx = (page - 1) * PAGE_LIMIT + pageIdx;
                const isExpanded = expandedId === faq._id;

                const menuItems = [
                  {
                    label: 'Edit',
                    onClick: () => handleOpenEdit(faq),
                  },
                  {
                    label: faq.is_active ? 'Hide FAQ' : 'Show FAQ',
                    onClick: () => handleToggle(faq._id),
                  },
                  {
                    label: 'Delete',
                    onClick: () => setConfirmDelete({ isOpen: true, id: faq._id }),
                  },
                ];

                return (
                  <div key={faq._id} className={clsx('transition-colors', faq.is_active ? 'bg-white' : 'bg-neutral-50/60')}>
                    {/* Row */}
                    <div className="flex items-start gap-3 px-4 py-3.5">

                      {/* Up / Down reorder arrows */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(displayIdx)}
                          disabled={displayIdx === 0 || reordering}
                          title="Move up"
                          className="p-0.5 rounded text-neutral-300 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(displayIdx)}
                          disabled={displayIdx === displayItems.length - 1 || reordering}
                          title="Move down"
                          className="p-0.5 rounded text-neutral-300 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Order number badge */}
                      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center mt-0.5">
                        <span className="text-[10px] font-bold text-neutral-500">{faq.order ?? displayIdx + 1}</span>
                      </div>

                      {/* Clickable question + badges */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : faq._id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={clsx('text-sm font-semibold leading-snug', faq.is_active ? 'text-neutral-900' : 'text-neutral-400')}>
                            {faq.question}
                          </p>
                          {!faq.is_active && (
                            <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                              hidden
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <CategoryBadge value={faq.category} />
                          <AppSourceBadge value={faq.app_source} />
                        </div>
                      </button>

                      {/* Three-dot action menu */}
                      <div className="flex-shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu items={menuItems} />
                      </div>
                    </div>

                    {/* Expanded answer panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pl-[72px]">
                        <div className="bg-neutral-50 rounded-xl border border-neutral-200 px-4 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Answer</p>
                          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                Page {page} of {totalPages} &middot; {formatNumber(displayItems.length)} total
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                  disabled={page === 1 || status === 'loading'}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-neutral-700 px-2">{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                  disabled={page === totalPages || status === 'loading'}
                  className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <FAQFormModal isOpen={formOpen} onClose={handleCloseForm} faq={editFaq} />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete FAQ"
        description="Are you sure you want to delete this FAQ? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
};

export default FAQ;
