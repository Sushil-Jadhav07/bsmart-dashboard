import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPolicies, createPolicy, togglePolicyStatus, clearCreateStatus,
  deletePolicyMeta, updatePolicyMeta, clearDeleteStatus, clearMetaStatus,
} from '../store/policiesSlice.js';
import { clsx } from 'clsx';
import {
  FileText, Shield, RefreshCw, Pencil, Globe, FileMinus,
  Clock, Scale, AlertCircle, Loader2, Plus, X, Check,
  MoreVertical, Trash2, ChevronDown, Search, Users, Briefcase,
} from 'lucide-react';

// ── Preset visuals for known types ──────────────────────────────────────────

const PRESET = {
  terms:   { title: 'Terms & Conditions',  icon: FileText,  iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    bar: 'bg-blue-500' },
  privacy: { title: 'Privacy Policy',      icon: Shield,    iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  bar: 'bg-violet-500' },
  refund:  { title: 'Refund Policy',       icon: RefreshCw, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', bar: 'bg-emerald-500' },
};

const EXTRA_COLORS = [
  { iconBg: 'bg-orange-50',  iconColor: 'text-orange-600',  bar: 'bg-orange-500' },
  { iconBg: 'bg-rose-50',    iconColor: 'text-rose-600',    bar: 'bg-rose-500'   },
  { iconBg: 'bg-cyan-50',    iconColor: 'text-cyan-600',    bar: 'bg-cyan-500'   },
  { iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   bar: 'bg-amber-500'  },
  { iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600',  bar: 'bg-indigo-500' },
  { iconBg: 'bg-pink-50',    iconColor: 'text-pink-600',    bar: 'bg-pink-500'   },
];

function getVisuals(type, idx) {
  if (PRESET[type]) return PRESET[type];
  const c = EXTRA_COLORS[idx % EXTRA_COLORS.length];
  return { title: type.charAt(0).toUpperCase() + type.slice(1) + ' Policy', icon: FileText, ...c };
}

// ── Skeleton card ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden animate-pulse">
      <div className="h-1 bg-neutral-200 w-full" />
      <div className="px-5 pt-5 pb-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-100 rounded w-3/4" />
            <div className="h-3 bg-neutral-100 rounded w-full" />
            <div className="h-3 bg-neutral-100 rounded w-2/3" />
          </div>
        </div>
        <div className="h-px bg-neutral-100" />
        <div className="flex gap-2">
          <div className="flex-1 h-9 rounded-xl bg-neutral-100" />
          <div className="w-10 h-9 rounded-xl bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

// ── Create Policy Modal ────────────────────────────────────────────────────

const SLUG_RE = /^[a-z][a-z0-9_-]*$/;

function CreateModal({ onClose }) {
  const dispatch = useDispatch();
  const { createStatus, createError } = useSelector((s) => s.policies ?? {});
  const [form, setForm]       = useState({ type: '', title: '', status: 'draft' });
  const [slugError, setSlugError] = useState('');

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (k === 'type') setSlugError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!SLUG_RE.test(form.type)) {
      setSlugError('Lowercase letters, numbers, - or _ only. Must start with a letter.');
      return;
    }
    if (!form.title.trim()) return;
    dispatch(createPolicy({ type: form.type.trim(), title: form.title.trim(), status: form.status }));
  };

  useEffect(() => {
    if (createStatus === 'succeeded') {
      dispatch(clearCreateStatus());
      onClose();
    }
  }, [createStatus, dispatch, onClose]);

  useEffect(() => {
    return () => { dispatch(clearCreateStatus()); };
  }, [dispatch]);

  const isLoading = createStatus === 'loading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-[16px] font-bold text-neutral-900">New Legal Document</h2>
            <p className="text-[12px] text-neutral-500 mt-0.5">Create a custom policy page</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* API error */}
          {createStatus === 'failed' && createError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{createError}</p>
            </div>
          )}

          {/* Type slug */}
          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
              Document type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.type}
              onChange={set('type')}
              placeholder="e.g. cookies, shipping, disclaimer"
              disabled={isLoading}
              className={clsx(
                'w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder-neutral-400',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition',
                slugError ? 'border-red-300 bg-red-50' : 'border-neutral-200 bg-neutral-50'
              )}
            />
            {slugError
              ? <p className="text-[11px] text-red-500 mt-1">{slugError}</p>
              : <p className="text-[11px] text-neutral-400 mt-1">Used as the URL slug — cannot be changed later</p>
            }
          </div>

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
              Display title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Cookie Policy"
              disabled={isLoading}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>

          {/* Initial status */}
          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-2">
              Initial status
            </label>
            <div className="flex gap-3">
              {['draft', 'published'].map((s) => (
                <label
                  key={s}
                  className={clsx(
                    'flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition',
                    form.status === s
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={set('status')}
                    className="sr-only"
                  />
                  <div className={clsx(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    form.status === s ? 'border-primary' : 'border-neutral-300'
                  )}>
                    {form.status === s && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-[13px] font-medium capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.type || !form.title}
              className="flex-1 py-2.5 rounded-xl bg-gradient-brand text-[13px] font-semibold text-white shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                : <><Check className="w-4 h-4" /> Create</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Meta Modal ────────────────────────────────────────────────────────

const APP_SOURCE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'all',    label: 'All' },
];

function EditMetaModal({ policy, onClose }) {
  const dispatch = useDispatch();
  const { metaStatus, metaError } = useSelector((s) => s.policies ?? {});
  const [form, setForm] = useState({
    title:      policy.title      || '',
    app_source: policy.app_source || 'member',
  });
  const [sourceOpen, setSourceOpen] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isLoading = metaStatus === 'loading';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    dispatch(updatePolicyMeta({ type: policy.type, title: form.title.trim(), app_source: form.app_source }));
  };

  useEffect(() => {
    if (metaStatus === 'succeeded') {
      dispatch(clearMetaStatus());
      onClose();
    }
  }, [metaStatus, dispatch, onClose]);

  useEffect(() => {
    return () => { dispatch(clearMetaStatus()); };
  }, [dispatch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-[16px] font-bold text-neutral-900">Edit Document Type</h2>
            <p className="text-[12px] text-neutral-500 mt-0.5">Update title and app visibility</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {metaStatus === 'failed' && metaError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{metaError}</p>
            </div>
          )}

          {/* Type — read-only */}
          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Document type</label>
            <div className="w-full rounded-xl border border-neutral-200 bg-neutral-100 px-3.5 py-2.5 text-[13px] text-neutral-500 font-mono">
              {policy.type}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Type slug cannot be changed</p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">
              Display title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              disabled={isLoading}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>

          {/* App source — custom dropdown */}
          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">App source</label>
            <div className="relative">
              {/* Trigger */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setSourceOpen((o) => !o)}
                className={clsx(
                  'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-[13px] transition',
                  sourceOpen
                    ? 'border-primary ring-2 ring-primary/30 bg-white text-neutral-800'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span>{APP_SOURCE_OPTIONS.find((o) => o.value === form.app_source)?.label ?? form.app_source}</span>
                <ChevronDown className={clsx('w-4 h-4 text-neutral-400 transition-transform duration-200', sourceOpen && 'rotate-180')} />
              </button>

              {/* Dropdown list */}
              {sourceOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSourceOpen(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 overflow-hidden">
                    {APP_SOURCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setForm((f) => ({ ...f, app_source: opt.value })); setSourceOpen(false); }}
                        className={clsx(
                          'flex items-center justify-between w-full px-3.5 py-2.5 text-[13px] transition-colors',
                          form.app_source === opt.value
                            ? 'bg-primary/5 text-primary font-semibold'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        )}
                      >
                        {opt.label}
                        {form.app_source === opt.value && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Which app users this document is visible to</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.title}
              className="flex-1 py-2.5 rounded-xl bg-gradient-brand text-[13px] font-semibold text-white shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Check className="w-4 h-4" /> Save Changes</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────

function DeleteConfirmModal({ policy, onClose }) {
  const dispatch = useDispatch();
  const { deleteStatus, deleteError } = useSelector((s) => s.policies ?? {});
  const isLoading = deleteStatus === 'loading';

  const handleDelete = () => dispatch(deletePolicyMeta(policy.type));

  useEffect(() => {
    if (deleteStatus === 'succeeded') {
      dispatch(clearDeleteStatus());
      onClose();
    }
  }, [deleteStatus, dispatch, onClose]);

  useEffect(() => {
    return () => { dispatch(clearDeleteStatus()); };
  }, [dispatch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-sm">

        <div className="px-6 pt-6 pb-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-4">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-[16px] font-bold text-neutral-900">Delete Policy Type</h2>
          <p className="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">
            Are you sure you want to delete{' '}
            <strong className="text-neutral-800">{policy.title || policy.type}</strong>?
            This will permanently remove the document and all its version history.
          </p>
        </div>

        {deleteStatus === 'failed' && deleteError && (
          <div className="mx-6 mb-2 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-700">{deleteError}</p>
          </div>
        )}

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-[13px] font-semibold text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
              : <><Trash2 className="w-4 h-4" /> Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Policies() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const {
    items        = {},
    listStatus   = 'idle',
    listError    = null,
    toggleLoading = false,
  } = useSelector((s) => s.policies) ?? {};

  const [showCreate, setShowCreate]     = useState(false);
  const [openMenu, setOpenMenu]         = useState(null);   // type string or null
  const [editTarget, setEditTarget]     = useState(null);   // policy object
  const [deleteTarget, setDeleteTarget] = useState(null);   // policy object
  const [search, setSearch]             = useState('');
  const [filterSource, setFilterSource] = useState('all'); // 'all' | 'member' | 'vendor'

  // Always fetch on mount so navigating back to the list gets fresh data.
  useEffect(() => {
    dispatch(fetchPolicies());
  }, [dispatch]);

  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Never saved';

  const handleToggle = useCallback((key, currentStatus) => {
    const next = currentStatus === 'published' ? 'draft' : 'published';
    dispatch(togglePolicyStatus({ type: key, status: next }));
  }, [dispatch]);

  const handleCloseCreate = useCallback(() => setShowCreate(false), []);

  const isLoading  = listStatus === 'loading' || listStatus === 'idle';
  const policyList = Object.values(items);
  const published  = policyList.filter((p) => p.status === 'published').length;
  const drafts     = policyList.filter((p) => p.status !== 'published').length;
  const skeletonCount = policyList.length === 0 ? 3 : policyList.length;

  const filteredList = policyList.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      (p.title || '').toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q);
    const matchSource = filterSource === 'all' || (p.app_source || '') === filterSource;
    return matchSearch && matchSource;
  });

  return (
    <>
      {showCreate   && <CreateModal onClose={handleCloseCreate} />}
      {editTarget   && <EditMetaModal policy={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && <DeleteConfirmModal policy={deleteTarget} onClose={() => setDeleteTarget(null)} />}

      {/* Transparent backdrop — closes any open card dropdown */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Legal</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-1">Legal Documents</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Manage your platform policies and legal pages</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLoading && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-brand text-white text-[13px] font-semibold shadow-soft hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Policy</span>
            </button>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400" />
            <div>
              <p className="text-lg font-bold text-neutral-900 leading-none">{published}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Published</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-neutral-300" />
            <div>
              <p className="text-lg font-bold text-neutral-900 leading-none">{drafts}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Draft</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-primary" />
            <div>
              <p className="text-lg font-bold text-neutral-900 leading-none">{policyList.length}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Total docs</p>
            </div>
          </div>
        </div>

        {/* Search + filter bar */}
        {!isLoading && policyList.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or type…"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-neutral-200 bg-white text-[13px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* App source filter pills */}
            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-1.5 py-1.5 flex-shrink-0">
              {[
                { value: 'all',    label: 'All',    icon: null },
                { value: 'member', label: 'Member', icon: Users },
                { value: 'vendor', label: 'Vendor', icon: Briefcase },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setFilterSource(value)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                    filterSource === value
                      ? 'bg-gradient-brand text-white shadow-soft'
                      : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                  )}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {listStatus === 'failed' && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-red-700">{listError || 'Failed to load policies'}</p>
              <button
                onClick={() => dispatch(fetchPolicies())}
                className="text-[12px] text-red-600 underline underline-offset-2 mt-0.5 hover:text-red-800"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Policy cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {isLoading && policyList.length === 0
            ? Array.from({ length: skeletonCount }, (_, i) => <CardSkeleton key={i} />)
            : filteredList.map((p, idx) => {
                const visuals     = getVisuals(p.type, idx);
                const { icon: Icon, iconBg, iconColor, bar, title: fallbackTitle } = visuals;
                const isPublished = p.status === 'published';

                return (
                  <div key={p.type} className="relative">
                    {/* Card */}
                    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                      {/* Top color bar */}
                      <div className={clsx('h-1 w-full', bar)} />

                      {/* Body */}
                      <div className="px-5 pt-5 pb-4 flex-1 flex flex-col gap-4">

                        {/* Icon + title + three-dots */}
                        <div className="flex items-start gap-3">
                          <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
                            <Icon className={clsx('w-5 h-5', iconColor)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15px] font-bold text-neutral-900 leading-tight">
                              {p.title || fallbackTitle}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">
                                {p.type}
                              </p>
                              {p.app_source && (
                                <span className={clsx(
                                  'inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider',
                                  p.app_source === 'member' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  p.app_source === 'vendor' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                  'bg-neutral-50 text-neutral-500 border-neutral-200'
                                )}>
                                  {p.app_source === 'member' && <Users className="w-2.5 h-2.5" />}
                                  {p.app_source === 'vendor' && <Briefcase className="w-2.5 h-2.5" />}
                                  {p.app_source}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === p.type ? null : p.type); }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center justify-between">
                          <span className={clsx(
                            'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border',
                            isPublished
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-neutral-50 text-neutral-400 border-neutral-200'
                          )}>
                            {isPublished
                              ? <><Globe className="w-3 h-3" /> Published</>
                              : <><FileMinus className="w-3 h-3" /> Draft</>
                            }
                          </span>
                          <div className="text-right">
                            {p.version != null && (
                              <p className="text-[10px] text-neutral-400 font-medium">v{p.version}</p>
                            )}
                            <span className="flex items-center justify-end gap-1 text-[11px] text-neutral-400">
                              <Clock className="w-3 h-3" />
                              {fmtDate(p.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-neutral-100" />

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/policies/${p.type}`)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-[13px] font-semibold text-neutral-700 hover:bg-gradient-brand hover:text-white hover:border-transparent transition-all duration-200"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggle(p.type, p.status)}
                            disabled={toggleLoading}
                            className={clsx(
                              'px-3 py-2.5 rounded-xl border text-[13px] font-semibold transition-all duration-200',
                              isPublished
                                ? 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100',
                              toggleLoading && 'opacity-50 cursor-not-allowed'
                            )}
                            title={isPublished ? 'Unpublish' : 'Publish'}
                          >
                            {toggleLoading
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : isPublished
                              ? <FileMinus className="w-4 h-4" />
                              : <Globe className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dropdown — outside overflow:hidden so it isn't clipped by the card */}
                    {openMenu === p.type && (
                      <div className="absolute top-12 right-4 z-20 w-44 bg-white rounded-xl border border-neutral-200 shadow-lg py-1">
                        <button
                          onClick={() => { setEditTarget(p); setOpenMenu(null); }}
                          className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                          Edit Type
                        </button>
                        <div className="h-px bg-neutral-100 mx-2" />
                        <button
                          onClick={() => { setDeleteTarget(p); setOpenMenu(null); }}
                          className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Type
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>

        {/* No results from search/filter */}
        {listStatus === 'succeeded' && policyList.length > 0 && filteredList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-[14px] font-semibold text-neutral-700">No matching policies</p>
            <p className="text-[12px] text-neutral-400 mt-1">
              Try a different search term or filter
            </p>
            <button
              onClick={() => { setSearch(''); setFilterSource('all'); }}
              className="mt-3 text-[12px] text-primary font-semibold underline underline-offset-2 hover:opacity-80"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Empty state when loaded but no policies */}
        {listStatus === 'succeeded' && policyList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Scale className="w-7 h-7 text-neutral-400" />
            </div>
            <p className="text-[15px] font-semibold text-neutral-700">No legal documents yet</p>
            <p className="text-[13px] text-neutral-400 mt-1 mb-5 max-w-xs">
              Create your first policy to get started — Terms, Privacy, Refund, and more.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-[13px] font-semibold shadow-soft hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              New Policy
            </button>
          </div>
        )}

        {/* Info note */}
        {filteredList.length > 0 && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <Scale className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-blue-700 leading-relaxed">
              Published documents are visible to users in the app. Draft documents are saved but not publicly visible.
              Click <strong>Edit</strong> to open the full document editor with formatting tools and version history.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
