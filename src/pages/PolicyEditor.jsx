import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import {
  AlertCircle, AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, Check, Clock, Copy, Eraser, Eye, FileMinus, Globe, Heading1, Heading2,
  Heading3, History, Info, Italic, Link2, List, ListOrdered, Loader2, Quote, Redo2, Save, ShieldCheck, Sparkles, Strikethrough, Trash2,
  Type, Underline, Undo2, Users,
} from 'lucide-react';
import { ConfirmModal } from '../components/Modal.jsx';
import PolicyPreview from '../components/PolicyPreview.jsx';
import {
  clearHistory, clearSaveStatus, deletePolicyMeta, fetchPolicies, fetchPolicyByType, fetchPolicyHistory, savePolicyContent, togglePolicyStatus,
  updatePolicyMeta,
} from '../store/policiesSlice.js';
import { formatNumber } from '../utils/helpers.jsx';
import { AUDIENCE, POLICY_STATUS, appEndpoints, policyVisuals, readMinutes } from '../utils/policyMeta.js';

const EDITOR_STYLES = `
  .pe-content { outline: none; }
  .pe-content h1 { font-size: 1.75rem; font-weight: 800; color: #111827; margin: 1.75rem 0 .75rem; line-height: 1.2; }
  .pe-content h2 { font-size: 1.3rem; font-weight: 700; color: #1f2937; margin: 1.6rem 0 .5rem; line-height: 1.3; }
  .pe-content h3 { font-size: 1.05rem; font-weight: 700; color: #374151; margin: 1.25rem 0 .4rem; line-height: 1.4; }
  .pe-content p { margin: .65rem 0; color: #374151; font-size: .9375rem; line-height: 1.8; }
  .pe-content ul { list-style: disc; padding-left: 1.5rem; margin: .75rem 0; color: #374151; }
  .pe-content ol { list-style: decimal; padding-left: 1.5rem; margin: .75rem 0; color: #374151; }
  .pe-content li { margin: .3rem 0; font-size: .9375rem; line-height: 1.7; }
  .pe-content blockquote { border-left: 4px solid #E8194E; margin: 1rem 0; padding: .75rem 1.25rem; background: #FFF5F7; border-radius: 0 .75rem .75rem 0; color: #9b2c51; }
  .pe-content a { color: #E8194E; text-decoration: underline; }
  .pe-content strong, .pe-content b { font-weight: 700; color: #111827; }
  .pe-content em, .pe-content i { font-style: italic; }
  .pe-content u { text-decoration: underline; }
  .pe-content s { text-decoration: line-through; color: #9ca3af; }
  .pe-content:empty::before { content: attr(data-placeholder); color: #c4c8d8; font-style: italic; pointer-events: none; display: block; }
`;

// A neutral outline for empty documents; every section still needs the team's real wording.
const STARTER = (title) => `<h2>1. Purpose &amp; scope</h2><p>Explain what ${title} covers and who it applies to on B-smart.</p>
<h2>2. Definitions</h2><p>Define the terms used in this document.</p>
<h2>3. Your responsibilities</h2><ul><li>Responsibility one</li><li>Responsibility two</li></ul>
<h2>4. What B-smart does</h2><p>Describe the platform's commitments.</p>
<h2>5. Changes to this policy</h2><p>Explain how users are told about changes.</p>
<h2>6. Contact</h2><p>How to reach the B-smart team about this policy.</p>`;

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const Divider = () => <div className="mx-1 h-5 w-px flex-shrink-0 bg-[#D9DCEF]" />;
function ToolbarBtn({ onClick, active, title, children, disabled }) {
  return (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }} title={title} aria-label={title} disabled={disabled}
      className={clsx('flex h-8 min-w-[32px] flex-shrink-0 items-center justify-center rounded-md px-1.5 transition-colors', active ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-600 hover:bg-white/70 hover:text-neutral-900', disabled && 'cursor-not-allowed opacity-30')}>
      {children}
    </button>
  );
}

const Card = ({ title, icon: Icon, aside, children, tone }) => (
  <section className={clsx('rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]', tone || 'border-neutral-200/70')}>
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-neutral-700">{Icon && <Icon className="h-3.5 w-3.5 text-[#E8194E]" />}{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);
const Row = ({ label, children, mono }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 text-[12.5px]">
    <span className="flex-shrink-0 text-neutral-500">{label}</span>
    <span className={clsx('min-w-0 break-all text-right font-semibold text-neutral-800', mono && 'font-mono text-[11.5px] text-[#8E35B5]')}>{children}</span>
  </div>
);

function HistoryPanel({ type, currentVersion }) {
  const dispatch = useDispatch();
  const { history = {}, historyStatus = 'idle', historyError = null } = useSelector((s) => s.policies) ?? {};
  const entries = history[type] ?? [];
  useEffect(() => {
    dispatch(fetchPolicyHistory(type));
    return () => { dispatch(clearHistory(type)); };
  }, [type, dispatch]);

  if (historyStatus === 'loading') return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-[#F1F3FC]" />)}</div>;
  if (historyStatus === 'failed') {
    return <div className="rounded-xl bg-rose-50 p-3 text-[12px] text-rose-700">{historyError || 'Failed to load history'} <button type="button" onClick={() => dispatch(fetchPolicyHistory(type))} className="ml-1 font-bold underline">Retry</button></div>;
  }
  return (
    <div>
      <ol className="relative space-y-3 border-l-2 border-[#EEF0FA] pl-4">
        <li className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#E8194E] ring-4 ring-white" />
          <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-neutral-900">v{currentVersion}<span className="rounded bg-pink-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-[#C81345]">Current</span></p>
          <p className="text-[11px] text-neutral-500">The version in the editor</p>
        </li>
        {entries.map((v) => (
          <li key={v._id} className="relative">
            <span className={clsx('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white', v.status === 'published' ? 'bg-emerald-500' : 'bg-neutral-300')} />
            <p className="flex items-center gap-2 text-[12.5px] font-bold text-neutral-800">v{v.version}<span className={clsx('rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase', v.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500')}>{v.status}</span></p>
            <p className="flex items-center gap-1 text-[11px] text-neutral-500"><Clock className="h-3 w-3" />{fmt(v.saved_at)}</p>
            {v.saved_by?.full_name && <p className="text-[11px] text-neutral-500">replaced by {v.saved_by.full_name}</p>}
          </li>
        ))}
      </ol>
      {!entries.length && <p className="mt-3 text-[11.5px] text-neutral-500">Earlier versions appear here after each save.</p>}
      <p className="mt-3 rounded-lg bg-[#F6F7FD] px-3 py-2 text-[10.5px] leading-relaxed text-neutral-500">The server keeps the last 20 versions. It doesn't send their text to the dashboard yet, so older versions can be listed but not opened or restored here.</p>
    </div>
  );
}

export default function PolicyEditor() {
  const { type } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items = {}, status: fetchStatus = 'idle', error: fetchError, saveStatus = 'idle', saveError, toggleLoading, deleteStatus, metaStatus } = useSelector((s) => s.policies) ?? {};
  const policy = items[type] ?? null;

  const editorRef = useRef(null);
  const loadedRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [words, setWords] = useState(0);
  const [formats, setFormats] = useState({});
  const [sideTab, setSideTab] = useState('details');
  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState('both');
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [copied, setCopied] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadedRef.current = false;
    dispatch(fetchPolicyByType(type));
    if (!Object.keys(items).length) dispatch(fetchPolicies());
    return () => { dispatch(clearSaveStatus()); };
  }, [type, dispatch]);

  const refreshWords = () => {
    const text = editorRef.current?.innerText || '';
    setWords(text.trim().split(/\s+/).filter(Boolean).length);
  };

  useEffect(() => {
    if (!policy || !editorRef.current || loadedRef.current) return;
    editorRef.current.innerHTML = policy.content || '';
    loadedRef.current = true;
    refreshWords();
  }, [policy]);

  useEffect(() => {
    if (!policy) return;
    setTitle(policy.title || '');
    setAudience(policy.app_source || 'both');
  }, [policy?.title, policy?.app_source]);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const showToast = (message, tone = 'success') => { setToast({ message, tone }); setTimeout(() => setToast(null), 2600); };

  const refreshFormats = useCallback(() => {
    const q = (c) => { try { return document.queryCommandState(c); } catch { return false; } };
    setFormats({
      bold: q('bold'), italic: q('italic'), underline: q('underline'), strikeThrough: q('strikeThrough'),
      insertUnorderedList: q('insertUnorderedList'), insertOrderedList: q('insertOrderedList'),
      justifyLeft: q('justifyLeft'), justifyCenter: q('justifyCenter'), justifyRight: q('justifyRight'),
    });
  }, []);

  const exec = useCallback((cmd, value = null) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    refreshFormats();
    setDirty(true);
    refreshWords();
  }, [refreshFormats]);

  const insertLink = () => {
    const url = window.prompt('Link address (e.g. https://bsmart.app/help):');
    if (url) exec('createLink', /^https?:\/\//i.test(url) || url.startsWith('mailto:') ? url : `https://${url}`);
  };

  const saveContent = async () => {
    const content = editorRef.current?.innerHTML || '';
    if (!editorRef.current?.innerText.trim()) { showToast('Write something before saving', 'error'); return false; }
    try {
      await dispatch(savePolicyContent({ type, content })).unwrap();
      setDirty(false);
      return true;
    } catch (msg) { showToast(msg || 'Save failed', 'error'); return false; }
  };

  const onSave = async () => { if (await saveContent()) showToast(policy?.status === 'published' ? 'Saved. The live version is updated.' : 'Draft saved'); };
  const onPublish = async () => {
    if (dirty && !(await saveContent())) return;
    if (!editorRef.current?.innerText.trim()) { showToast('Add content before publishing', 'error'); return; }
    try { await dispatch(togglePolicyStatus({ type, status: 'published' })).unwrap(); showToast('Published to the apps'); } catch (msg) { showToast(msg || 'Publish failed', 'error'); }
  };
  const onUnpublish = async () => {
    try { await dispatch(togglePolicyStatus({ type, status: 'draft' })).unwrap(); showToast('Moved to draft. Hidden from the apps.'); } catch (msg) { showToast(msg || 'Update failed', 'error'); }
    setConfirm(null);
  };
  const saveMeta = async () => {
    try { await dispatch(updatePolicyMeta({ type, title: title.trim(), app_source: audience })).unwrap(); showToast('Settings saved'); } catch (msg) { showToast(msg || 'Update failed', 'error'); }
  };
  const onDelete = async () => {
    try { await dispatch(deletePolicyMeta(type)).unwrap(); setDirty(false); navigate('/policies'); } catch (msg) { setConfirm(null); showToast(msg || 'Delete failed', 'error'); }
  };

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) onSave(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const copy = (key, text) => navigator.clipboard?.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500); }).catch(() => {});

  const loading = (fetchStatus === 'loading' || fetchStatus === 'idle') && !policy;
  if (!policy && fetchStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <p className="font-semibold text-neutral-800">Could not load this document</p>
        <p className="text-sm text-neutral-500">{fetchError}</p>
        <Link to="/policies" className="text-[13px] font-bold text-[#C81345] hover:underline">Back to Legal Documents</Link>
      </div>
    );
  }

  const isPublished = policy?.status === 'published';
  const st = POLICY_STATUS[policy?.status] || POLICY_STATUS.draft;
  const visuals = policyVisuals(type);
  const saving = saveStatus === 'loading';
  const metaDirty = policy && (title.trim() !== policy.title || audience !== (policy.app_source || 'both'));
  const links = appEndpoints(type);
  const editorName = policy?.updated_by?.full_name || policy?.updated_by?.email || '';
  const isEmpty = !words;

  return (
    <>
      <style>{EDITOR_STYLES}</style>
      <div className="space-y-5 pb-10">
        <nav className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <Link to="/policies" onClick={(e) => { if (dirty && !window.confirm('You have unsaved changes. Leave anyway?')) e.preventDefault(); }} className="inline-flex items-center gap-1 font-bold text-[#C81345] hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Legal Documents</Link>
          <span className="text-neutral-300">/</span><span className="font-mono text-neutral-500">{type}</span>
        </nav>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide', st.cls)}><span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label} · v{policy?.version || 1}</span>
              <span className="rounded-md bg-[#E9EBFA] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{AUDIENCE[policy?.app_source]?.label || 'Members & Vendors'}</span>
              {dirty && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">Unsaved changes</span>}
            </div>
            <h1 className="mt-1 truncate font-display text-[24px] font-bold tracking-tight text-neutral-900">{policy?.title || 'Loading…'}</h1>
            <p className="text-[12px] text-neutral-500">Last saved {fmt(policy?.updatedAt)}{editorName && ` by ${editorName}`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setSideTab('history')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md"><History className="h-4 w-4 text-[#8E35B5]" />Version history</button>
            <button type="button" onClick={() => setPreview({ ...policy, title: title || policy?.title, app_source: audience })} disabled={!policy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><Eye className="h-4 w-4 text-[#8E35B5]" />In-app preview</button>
            <button type="button" onClick={onSave} disabled={!dirty || saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-[#8E35B5]" />}{isPublished ? 'Save & update live' : 'Save draft'}</button>
            {!isPublished && <button type="button" onClick={onPublish} disabled={saving || toggleLoading || !policy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#8E35B5] px-3.5 text-[12.5px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:opacity-50">{toggleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}Publish policy</button>}
          </div>
        </div>
        {isPublished && dirty && <p className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800"><AlertCircle className="h-4 w-4" />This document is live. Saving updates what users see straight away. Move it to draft first if you want to prepare changes privately.</p>}
        {saveError && <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700"><AlertCircle className="h-4 w-4" />{saveError}</p>}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className={clsx('h-1', visuals.bar)} />
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest text-[#8E35B5]"><ShieldCheck className="h-3.5 w-3.5" />Official B-smart document · {visuals.label}</p>
              {editorName && <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" />Last edited by {editorName}</p>}
            </div>
            <div className="px-6 pt-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" aria-label="Document title" className="w-full border-0 bg-transparent font-display text-[26px] font-bold text-neutral-900 outline-none placeholder:text-neutral-300" />
              {metaDirty && title.trim() && <button type="button" onClick={saveMeta} disabled={metaStatus === 'loading'} className="mt-1 text-[11.5px] font-bold text-[#C81345] hover:underline">Save title & audience</button>}
            </div>

            <div className="sticky top-[60px] z-10 mx-4 mt-3 flex flex-wrap items-center gap-0.5 rounded-xl bg-[#EEF0FA] p-1.5 shadow-[0_6px_14px_-10px_rgba(31,35,64,0.4)]">
              <ToolbarBtn onClick={() => exec('undo')} title="Undo (Ctrl+Z)" disabled={loading}><Undo2 className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('redo')} title="Redo (Ctrl+Y)" disabled={loading}><Redo2 className="h-4 w-4" /></ToolbarBtn>
              <Divider />
              <ToolbarBtn onClick={() => exec('formatBlock', 'p')} title="Paragraph" disabled={loading}><Type className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('formatBlock', 'h1')} title="Heading 1" disabled={loading}><Heading1 className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('formatBlock', 'h2')} title="Heading 2" disabled={loading}><Heading2 className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('formatBlock', 'h3')} title="Heading 3" disabled={loading}><Heading3 className="h-4 w-4" /></ToolbarBtn>
              <Divider />
              <ToolbarBtn onClick={() => exec('bold')} active={formats.bold} title="Bold (Ctrl+B)" disabled={loading}><Bold className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('italic')} active={formats.italic} title="Italic (Ctrl+I)" disabled={loading}><Italic className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('underline')} active={formats.underline} title="Underline (Ctrl+U)" disabled={loading}><Underline className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('strikeThrough')} active={formats.strikeThrough} title="Strikethrough" disabled={loading}><Strikethrough className="h-4 w-4" /></ToolbarBtn>
              <Divider />
              <ToolbarBtn onClick={() => exec('justifyLeft')} active={formats.justifyLeft} title="Align left" disabled={loading}><AlignLeft className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('justifyCenter')} active={formats.justifyCenter} title="Align centre" disabled={loading}><AlignCenter className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('justifyRight')} active={formats.justifyRight} title="Align right" disabled={loading}><AlignRight className="h-4 w-4" /></ToolbarBtn>
              <Divider />
              <ToolbarBtn onClick={() => exec('insertUnorderedList')} active={formats.insertUnorderedList} title="Bullet list" disabled={loading}><List className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('insertOrderedList')} active={formats.insertOrderedList} title="Numbered list" disabled={loading}><ListOrdered className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('formatBlock', 'blockquote')} title="Callout / quote" disabled={loading}><Quote className="h-4 w-4" /></ToolbarBtn>
              <Divider />
              <ToolbarBtn onClick={insertLink} title="Insert link" disabled={loading}><Link2 className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('removeFormat')} title="Clear formatting" disabled={loading}><Eraser className="h-4 w-4" /></ToolbarBtn>
              <span className="ml-auto pr-2 text-[11px] font-semibold text-neutral-500">{formatNumber(words)} words</span>
            </div>

            <div className="px-6 pb-8 pt-4 sm:px-10">
              {loading ? (
                <div className="animate-pulse space-y-3 py-6">{[...Array(8)].map((_, i) => <div key={i} className={clsx('h-3 rounded bg-[#F1F3FC]', i % 3 === 2 ? 'w-1/2' : 'w-full')} />)}</div>
              ) : (
                <>
                  {isEmpty && (
                    <div className="mb-4 flex flex-col items-start gap-2 rounded-xl border border-dashed border-[#C9CFEC] bg-[#F6F7FD] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[12.5px] text-neutral-600">This document is empty. Start typing below, or insert a section outline to fill in.</p>
                      <button type="button" onClick={() => { if (editorRef.current) { editorRef.current.innerHTML = STARTER(title || policy?.title || 'this policy'); setDirty(true); refreshWords(); } }} className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[12px] font-bold text-[#8E35B5] ring-1 ring-[#E2E5F4] hover:ring-[#8E35B5]"><Sparkles className="h-3.5 w-3.5" />Insert outline</button>
                    </div>
                  )}
                  <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={() => { setDirty(true); refreshWords(); refreshFormats(); }} onKeyUp={refreshFormats} onMouseUp={refreshFormats}
                    data-placeholder="Start writing your policy content here…" className="pe-content mx-auto min-h-[560px] max-w-[760px]" />
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 bg-[#FAFAFE] px-6 py-3 text-[11px] text-neutral-500">
              <span>{formatNumber(words)} words · {readMinutes(words)} min read</span>
              <span>Ctrl+S to save · Ctrl+B / I / U to format · each save keeps the previous version</span>
            </div>
          </section>

          <div className="space-y-4 xl:sticky xl:top-[72px]">
            <div className="flex rounded-xl bg-[#EEF0FA] p-1">
              {[['details', 'Details', Info], ['history', 'History', History]].map(([id, lbl, Icon]) => (
                <button key={id} type="button" onClick={() => setSideTab(id)} className={clsx('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-bold transition', sideTab === id ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-500 hover:text-neutral-800')}><Icon className="h-3.5 w-3.5" />{lbl}</button>
              ))}
            </div>

            {sideTab === 'history' ? (
              <Card title="Version history" icon={History}><HistoryPanel type={type} currentVersion={policy?.version || 1} /></Card>
            ) : (
              <>
                <Card title="Document overview" icon={Info} aside={<span className={clsx('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase', st.cls)}>{isPublished ? 'Live' : 'Draft'}</span>}>
                  <div className="divide-y divide-neutral-100">
                    <Row label="Type slug" mono>/{type}</Row>
                    <Row label="Current version">v{policy?.version || 1}{dirty && <span className="ml-1 text-amber-600">(unsaved)</span>}</Row>
                    <Row label="Word count">{formatNumber(words)} · ~{readMinutes(words)} min read</Row>
                    <Row label="Created">{fmt(policy?.createdAt)}</Row>
                    <Row label="Last saved">{fmt(policy?.updatedAt)}</Row>
                    <Row label="Edited by">{editorName || '—'}</Row>
                  </div>
                </Card>

                <Card title="Audience & visibility" icon={Users}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Target audience</p>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#F1F3FC] p-1">
                    {Object.entries(AUDIENCE).map(([v, a]) => (
                      <button key={v} type="button" onClick={() => setAudience(v)} className={clsx('h-8 rounded-md text-[12px] font-bold transition', audience === v ? 'bg-white text-[#C81345] shadow-sm' : 'text-neutral-500 hover:text-neutral-800')}>{a.short}</button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#F6F7FD] px-3 py-2.5">
                    <div><p className="text-[12.5px] font-bold text-neutral-900">Published</p><p className="text-[11px] text-neutral-500">{isPublished ? 'Visible in the apps now' : 'Hidden until you publish'}</p></div>
                    <button type="button" role="switch" aria-checked={isPublished} disabled={toggleLoading} onClick={() => (isPublished ? setConfirm('unpublish') : onPublish())} className={clsx('relative h-6 w-11 flex-shrink-0 rounded-full transition disabled:opacity-50', isPublished ? 'bg-[#E8194E]' : 'bg-neutral-300')}><span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', isPublished ? 'left-[22px]' : 'left-0.5')} /></button>
                  </div>
                  <button type="button" onClick={saveMeta} disabled={!metaDirty || !title.trim() || metaStatus === 'loading'} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#1F2340] text-[12.5px] font-bold text-white disabled:opacity-40">{metaStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save title & audience</button>
                </Card>

                <Card title="App links & distribution" icon={Link2}>
                  {['member', 'vendor'].filter((a) => audience === 'both' || audience === a).map((a) => (
                    <div key={a} className="mb-2 rounded-xl bg-[#F6F7FD] p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{a === 'member' ? 'Member app' : 'Vendor app'}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#8E35B5]" title={links[a]}>{links[a].replace(/^https?:\/\/[^/]+/, '')}</p>
                        <button type="button" onClick={() => copy(a, links[a])} aria-label="Copy link" className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-white hover:text-[#C81345]">{copied === a ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10.5px] leading-relaxed text-neutral-500">The apps load this document from these endpoints. They only return it while it's published.</p>
                </Card>

                <Card title="Danger zone" icon={AlertCircle} tone="border-rose-200">
                  <p className="text-[11.5px] text-neutral-600">Unpublishing hides it from the apps. Deleting removes the document and all its versions for good.</p>
                  <div className="mt-3 space-y-2">
                    {isPublished && <button type="button" onClick={() => setConfirm('unpublish')} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white text-[12.5px] font-bold text-neutral-800 hover:bg-neutral-50"><FileMinus className="h-4 w-4" />Move to draft</button>}
                    <button type="button" onClick={() => setConfirm('delete')} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#E8194E] text-[12.5px] font-bold text-white hover:bg-[#C81345]"><Trash2 className="h-4 w-4" />Delete document</button>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {preview && <PolicyPreview policy={preview} html={editorRef.current?.innerHTML || preview.content} docs={Object.values(items).map((d) => (d.type === type ? { ...d, title: preview.title, app_source: preview.app_source } : d))} onClose={() => setPreview(null)} />}
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={confirm === 'delete' ? onDelete : onUnpublish}
        title={confirm === 'delete' ? `Delete ${policy?.title || 'document'}?` : 'Move to draft?'}
        description={confirm === 'delete' ? `The document, its content and every saved version are removed permanently. Apps asking for "${type}" will get "not found".` : 'The apps stop showing this document straight away. You can publish it again any time.'}
        confirmText={confirm === 'delete' ? 'Delete' : 'Move to draft'}
        confirmVariant="danger"
        loading={deleteStatus === 'loading' || toggleLoading}
      />
      {toast && <div className={clsx('fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-soft', toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{toast.message}</div>}
    </>
  );
}
