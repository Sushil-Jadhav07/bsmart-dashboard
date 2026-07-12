import { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPolicyByType, savePolicyContent, togglePolicyStatus,
  clearSaveStatus, fetchPolicyHistory, clearHistory,
} from '../store/policiesSlice.js';
import { clsx } from 'clsx';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Link2, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight,
  Quote, ArrowLeft, Save, Globe, FileMinus, Heading1, Heading2,
  Heading3, Type, Clock, Check, AlertCircle, Eraser, Loader2,
  FileText, Shield, RefreshCw, Hash, History, Info, ChevronRight,
} from 'lucide-react';

// ── Type visuals ─────────────────────────────────────────────────────────────

const PRESET = {
  terms:   { icon: FileText,  color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100',       bar: 'bg-blue-500'    },
  privacy: { icon: Shield,    color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-100',   bar: 'bg-violet-500'  },
  refund:  { icon: RefreshCw, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', bar: 'bg-emerald-500' },
};

const EXTRA_BARS = [
  'bg-orange-500', 'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500', 'bg-pink-500',
];
const EXTRA_ICON_COLORS = [
  'text-orange-600', 'text-rose-600', 'text-cyan-600', 'text-amber-600', 'text-indigo-600', 'text-pink-600',
];
const EXTRA_BG_COLORS = [
  'bg-orange-50 border-orange-100', 'bg-rose-50 border-rose-100', 'bg-cyan-50 border-cyan-100',
  'bg-amber-50 border-amber-100',   'bg-indigo-50 border-indigo-100', 'bg-pink-50 border-pink-100',
];

function getVisuals(type, idx = 0) {
  if (PRESET[type]) return PRESET[type];
  const i = idx % EXTRA_BARS.length;
  return { icon: FileText, color: EXTRA_ICON_COLORS[i], bg: EXTRA_BG_COLORS[i], bar: EXTRA_BARS[i] };
}

// ── Toolbar helpers ───────────────────────────────────────────────────────────

const Divider = () => <div className="w-px h-5 bg-neutral-200 mx-0.5 flex-shrink-0" />;

function ToolbarBtn({ onClick, active, title, children, disabled }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      title={title}
      disabled={disabled}
      className={clsx(
        'h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded text-[12px] font-semibold transition-colors flex-shrink-0',
        active
          ? 'bg-neutral-900 text-white shadow-sm'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

// ── Editor CSS ────────────────────────────────────────────────────────────────

const EDITOR_STYLES = `
  .pe-content { outline: none; }
  .pe-content h1 { font-size: 1.875rem; font-weight: 800; color: #111827; margin: 1.75rem 0 0.75rem; line-height: 1.2; }
  .pe-content h2 { font-size: 1.375rem; font-weight: 700; color: #1f2937; margin: 1.5rem 0 0.5rem; line-height: 1.3; padding-bottom: 0.4rem; border-bottom: 2px solid #f3f4f6; }
  .pe-content h3 { font-size: 1.1rem; font-weight: 700; color: #374151; margin: 1.25rem 0 0.4rem; line-height: 1.4; }
  .pe-content p { margin: 0.65rem 0; color: #374151; font-size: 0.9375rem; line-height: 1.8; }
  .pe-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.75rem 0; color: #374151; }
  .pe-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.75rem 0; color: #374151; }
  .pe-content li { margin: 0.3rem 0; font-size: 0.9375rem; line-height: 1.7; }
  .pe-content blockquote { border-left: 4px solid #e2185a; margin: 1rem 0; padding: 0.75rem 1.25rem; background: #fff5f7; border-radius: 0 0.5rem 0.5rem 0; color: #9b2c51; font-style: italic; }
  .pe-content a { color: #e2185a; text-decoration: underline; }
  .pe-content strong, .pe-content b { font-weight: 700; color: #111827; }
  .pe-content em, .pe-content i { font-style: italic; }
  .pe-content u { text-decoration: underline; }
  .pe-content s { text-decoration: line-through; color: #9ca3af; }
  .pe-content:empty::before { content: attr(data-placeholder); color: #d1d5db; font-style: italic; pointer-events: none; display: block; }
`;

// ── History panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ type }) {
  const dispatch = useDispatch();
  const { history = {}, historyStatus = 'idle', historyError = null } =
    useSelector((s) => s.policies) ?? {};
  const entries = history[type] ?? [];

  useEffect(() => {
    dispatch(fetchPolicyHistory(type));
    return () => { dispatch(clearHistory(type)); };
  }, [type, dispatch]);

  const fmtDateTime = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '—';

  if (historyStatus === 'loading') {
    return (
      <div className="flex flex-col gap-2 px-1 py-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-neutral-100 h-16" />
        ))}
      </div>
    );
  }

  if (historyStatus === 'failed') {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 mt-2">
        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] text-red-700">{historyError || 'Failed to load history'}</p>
          <button
            onClick={() => dispatch(fetchPolicyHistory(type))}
            className="text-[11px] text-red-600 underline underline-offset-1 mt-1"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center py-8 text-center px-2">
        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
          <History className="w-5 h-5 text-neutral-400" />
        </div>
        <p className="text-[12px] font-semibold text-neutral-600">No history yet</p>
        <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
          Previous versions appear here after each save.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((v) => {
        const isPublished = v.status === 'published';
        return (
          <div
            key={v._id}
            className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5 space-y-1.5 hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-neutral-800">v{v.version}</span>
              <span className={clsx(
                'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                isPublished
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-neutral-200 text-neutral-500'
              )}>
                {isPublished ? 'PUBLISHED' : 'DRAFT'}
              </span>
            </div>
            <p className="flex items-center gap-1 text-[11px] text-neutral-400">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {fmtDateTime(v.saved_at)}
            </p>
            {v.saved_by?.full_name && (
              <p className="text-[11px] text-neutral-500 truncate">
                by <span className="font-medium">{v.saved_by.full_name}</span>
              </p>
            )}
          </div>
        );
      })}
      <p className="text-center text-[10px] text-neutral-400 pt-1">Last {entries.length} versions</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PolicyEditor() {
  const { type }  = useParams();
  const navigate  = useNavigate();
  const dispatch  = useDispatch();

  const policiesState = useSelector((s) => s.policies) ?? {};
  const policy        = policiesState.items?.[type] ?? null;
  const fetchStatus   = policiesState.status ?? 'idle';
  const saveStatus    = policiesState.saveStatus ?? 'idle';
  const saveError     = policiesState.saveError ?? null;
  const toggleLoading = policiesState.toggleLoading ?? false;

  const editorRef         = useRef(null);
  const contentLoadedRef  = useRef(false);
  const [isDirty,   setIsDirty]   = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [formats,   setFormats]   = useState({});
  const [sideTab,   setSideTab]   = useState('details'); // 'details' | 'history'

  // Determine visuals — use a stable index (0 for unknown types on first render)
  const allItems   = policiesState.items ?? {};
  const typeKeys   = Object.keys(allItems);
  const typeIndex  = typeKeys.indexOf(type);
  const visuals    = getVisuals(type, typeIndex >= 0 ? typeIndex : 0);
  const { icon: PolicyIcon, color, bg, bar } = visuals;

  // ── Fetch policy on mount ─────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchPolicyByType(type));
    return () => { dispatch(clearSaveStatus()); };
  }, [type, dispatch]);

  // ── Populate editor once content arrives ──────────────────────────────────
  useEffect(() => {
    if (policy?.content && editorRef.current && !contentLoadedRef.current) {
      editorRef.current.innerHTML = policy.content;
      contentLoadedRef.current = true;
      refreshWordCount();
    }
  }, [policy?.content]);

  // ── Auto-clear "Saved" badge after 3s ────────────────────────────────────
  useEffect(() => {
    if (saveStatus === 'succeeded') {
      setIsDirty(false);
      const t = setTimeout(() => dispatch(clearSaveStatus()), 3000);
      return () => clearTimeout(t);
    }
  }, [saveStatus, dispatch]);

  const refreshWordCount = () => {
    const text = editorRef.current?.innerText || '';
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
  };

  const refreshFormats = useCallback(() => {
    setFormats({
      bold:                document.queryCommandState('bold'),
      italic:              document.queryCommandState('italic'),
      underline:           document.queryCommandState('underline'),
      strikeThrough:       document.queryCommandState('strikeThrough'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList:   document.queryCommandState('insertOrderedList'),
      justifyLeft:         document.queryCommandState('justifyLeft'),
      justifyCenter:       document.queryCommandState('justifyCenter'),
      justifyRight:        document.queryCommandState('justifyRight'),
    });
  }, []);

  const exec = useCallback((cmd, value = null) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    refreshFormats();
    setIsDirty(true);
  }, [refreshFormats]);

  const handleInput = () => {
    setIsDirty(true);
    refreshWordCount();
    refreshFormats();
  };

  const handleLinkInsert = () => {
    const url = window.prompt('Enter URL (e.g. https://example.com):');
    if (url) exec('createLink', url.startsWith('http') ? url : `https://${url}`);
  };

  const handleSave = () => {
    const content = editorRef.current?.innerHTML || '';
    dispatch(savePolicyContent({ type, content }));
  };

  const handleToggleStatus = () => {
    const next = policy?.status === 'published' ? 'draft' : 'published';
    dispatch(togglePolicyStatus({ type, status: next }));
  };

  const isPublished = policy?.status === 'published';
  const isSaving    = saveStatus === 'loading';
  const isSaved     = saveStatus === 'succeeded';
  // Show skeleton when idle (before first effect) OR loading AND no cached data
  const isLoading   = (fetchStatus === 'loading' || fetchStatus === 'idle') && !policy;

  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : 'Never';

  return (
    <>
      <style>{EDITOR_STYLES}</style>

      <div className="flex flex-col -mx-4 md:-mx-6 -my-4 md:-my-6" style={{ height: 'calc(100vh - 68px)' }}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-neutral-200 flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/policies')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-5 bg-neutral-200 flex-shrink-0" />
            <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border', bg)}>
              <PolicyIcon className={clsx('w-3.5 h-3.5', color)} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-neutral-900 leading-tight truncate">
                {policy?.title || type.charAt(0).toUpperCase() + type.slice(1) + ' Policy'}
              </h1>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                {policy?.updatedAt ? `Last saved ${fmtDate(policy.updatedAt)}` : 'Not saved yet'}
                {policy?.version ? ` · v${policy.version}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status toggle (top bar) */}
            <button
              onClick={handleToggleStatus}
              disabled={toggleLoading || !policy}
              className={clsx(
                'inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all',
                isPublished
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                  : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100',
                (toggleLoading || !policy) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {toggleLoading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : isPublished
                ? <><Globe className="w-3 h-3" /> Published</>
                : <><FileMinus className="w-3 h-3" /> Draft</>
              }
            </button>

            {/* Save button (top bar) */}
            <button
              onClick={handleSave}
              disabled={isSaving || (!isDirty && !isSaved)}
              className={clsx(
                'inline-flex items-center gap-1.5 text-[11px] font-bold px-4 py-1.5 rounded-full transition-all',
                isSaved
                  ? 'bg-emerald-500 text-white'
                  : isSaving
                  ? 'bg-primary/70 text-white cursor-not-allowed'
                  : isDirty
                  ? 'bg-gradient-brand text-white shadow-sm hover:opacity-90'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              )}
            >
              {isSaved
                ? <><Check className="w-3 h-3" /> Saved</>
                : isSaving
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                : <><Save className="w-3 h-3" /> Save</>
              }
            </button>
          </div>
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center flex-wrap gap-0.5 px-4 py-2 bg-white border-b border-neutral-100 flex-shrink-0">
          <ToolbarBtn onClick={() => exec('undo')} title="Undo (Ctrl+Z)" disabled={isLoading}><Undo2 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('redo')} title="Redo (Ctrl+Y)" disabled={isLoading}><Redo2 className="w-3.5 h-3.5" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn onClick={() => exec('formatBlock', 'h1')} title="Heading 1" disabled={isLoading}><Heading1 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('formatBlock', 'h2')} title="Heading 2" disabled={isLoading}><Heading2 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('formatBlock', 'h3')} title="Heading 3" disabled={isLoading}><Heading3 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('formatBlock', 'p')} title="Paragraph" disabled={isLoading}><Type className="w-3.5 h-3.5" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn onClick={() => exec('bold')} active={formats.bold} title="Bold (Ctrl+B)" disabled={isLoading}><Bold className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('italic')} active={formats.italic} title="Italic (Ctrl+I)" disabled={isLoading}><Italic className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('underline')} active={formats.underline} title="Underline (Ctrl+U)" disabled={isLoading}><Underline className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('strikeThrough')} active={formats.strikeThrough} title="Strikethrough" disabled={isLoading}><Strikethrough className="w-3.5 h-3.5" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn onClick={() => exec('justifyLeft')} active={formats.justifyLeft} title="Align Left" disabled={isLoading}><AlignLeft className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('justifyCenter')} active={formats.justifyCenter} title="Align Center" disabled={isLoading}><AlignCenter className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('justifyRight')} active={formats.justifyRight} title="Align Right" disabled={isLoading}><AlignRight className="w-3.5 h-3.5" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn onClick={() => exec('insertUnorderedList')} active={formats.insertUnorderedList} title="Bullet List" disabled={isLoading}><List className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('insertOrderedList')} active={formats.insertOrderedList} title="Numbered List" disabled={isLoading}><ListOrdered className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('formatBlock', 'blockquote')} title="Blockquote" disabled={isLoading}><Quote className="w-3.5 h-3.5" /></ToolbarBtn>
          <Divider />
          <ToolbarBtn onClick={handleLinkInsert} title="Insert Link" disabled={isLoading}><Link2 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec('removeFormat')} title="Clear Formatting" disabled={isLoading}><Eraser className="w-3.5 h-3.5" /></ToolbarBtn>
          <div className="ml-auto text-[11px] text-neutral-400 pl-2 flex-shrink-0">{wordCount} words</div>
        </div>

        {/* ── Editor + Sidebar ─────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Editor area */}
          <div className="flex-1 overflow-y-auto bg-neutral-50 py-8 px-4 flex justify-center">
            <div className="w-full max-w-3xl">

              {/* Loading skeleton */}
              {isLoading ? (
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden animate-pulse">
                  <div className={clsx('h-1', bar)} />
                  <div className="px-10 py-10 space-y-4">
                    <div className="h-8 bg-neutral-100 rounded w-2/3" />
                    <div className="h-4 bg-neutral-100 rounded w-1/3" />
                    <div className="space-y-2 pt-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className={clsx('h-3 bg-neutral-100 rounded', i % 3 === 2 ? 'w-1/2' : 'w-full')} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className={clsx('h-1', bar)} />
                  <div className="px-10 py-10">
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleInput}
                      onKeyUp={refreshFormats}
                      onMouseUp={refreshFormats}
                      data-placeholder="Start writing your policy content here…"
                      className="pe-content min-h-[560px]"
                    />
                  </div>
                </div>
              )}

              {saveError && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-700">{saveError}</p>
                </div>
              )}

              <p className="text-center text-[11px] text-neutral-400 mt-4">
                Use Ctrl+B, Ctrl+I, Ctrl+U for quick formatting · Each save creates a new version in history
              </p>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-64 flex-shrink-0 border-l border-neutral-200 bg-white hidden xl:flex flex-col">

            {/* Tabs */}
            <div className="flex border-b border-neutral-100 flex-shrink-0">
              {[
                { id: 'details', label: 'Details', Icon: Info },
                { id: 'history', label: 'History', Icon: History },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setSideTab(id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold border-b-2 transition-colors',
                    sideTab === id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-neutral-400 hover:text-neutral-700'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">

              {sideTab === 'details' && (
                <div className="space-y-5">

                  {/* Status */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Status</p>
                    <button
                      onClick={handleToggleStatus}
                      disabled={toggleLoading || !policy}
                      className={clsx(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
                        isPublished
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                          : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100',
                        (toggleLoading || !policy) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {toggleLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : isPublished
                          ? <Globe className="w-4 h-4" />
                          : <FileMinus className="w-4 h-4" />
                        }
                        {isPublished ? 'Published' : 'Draft'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </button>
                    <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                      {isPublished ? 'Visible to all users in the app.' : 'Not publicly visible yet.'}
                    </p>
                  </div>

                  {/* Document info */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Document Info</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Words',   value: wordCount },
                        { label: 'Version', value: policy?.version != null ? `v${policy.version}` : '—' },
                        { label: 'Type',    value: type },
                        {
                          label: 'Last saved',
                          value: policy?.updatedAt
                            ? new Date(policy.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—',
                        },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between text-[12px]">
                          <span className="text-neutral-400">{label}</span>
                          <span className="font-semibold text-neutral-700 capitalize truncate max-w-[120px] text-right">{value}</span>
                        </div>
                      ))}
                      {policy?.updated_by?.full_name && (
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-neutral-400">Edited by</span>
                          <span className="font-semibold text-neutral-700 truncate max-w-[120px] text-right">
                            {policy.updated_by.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save */}
                  <div className="space-y-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || (!isDirty && !isSaved)}
                      className={clsx(
                        'w-full inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all',
                        isSaved
                          ? 'bg-emerald-500 text-white'
                          : isSaving
                          ? 'bg-primary/70 text-white cursor-not-allowed'
                          : isDirty
                          ? 'bg-gradient-brand text-white shadow-sm hover:opacity-90'
                          : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      )}
                    >
                      {isSaved
                        ? <><Check className="w-4 h-4" /> Saved!</>
                        : isSaving
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                        : <><Save className="w-4 h-4" /> Save Changes</>
                      }
                    </button>

                    {isDirty && !isSaving && !isSaved && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 leading-relaxed">You have unsaved changes</p>
                      </div>
                    )}
                  </div>

                  {/* Shortcut to history */}
                  <button
                    onClick={() => setSideTab('history')}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-neutral-200 text-[12px] font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5" />
                      Version history
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </button>
                </div>
              )}

              {sideTab === 'history' && <HistoryPanel type={type} />}
            </div>

            {/* Sidebar footer */}
            <div className="border-t border-neutral-100 p-4 flex-shrink-0">
              <button
                onClick={() => navigate('/policies')}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-neutral-500 hover:text-neutral-900 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                All legal documents
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
