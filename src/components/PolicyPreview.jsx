import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, X } from 'lucide-react';
import { AUDIENCE, audienceIncludes } from '../utils/policyMeta.js';

export const POLICY_PROSE = `
  .pp-prose h1 { font-size: 1.5rem; font-weight: 800; color: #111827; margin: 1.25rem 0 .6rem; line-height: 1.25; }
  .pp-prose h2 { font-size: 1.15rem; font-weight: 700; color: #1f2937; margin: 1.2rem 0 .45rem; }
  .pp-prose h3 { font-size: 1rem; font-weight: 700; color: #374151; margin: 1rem 0 .35rem; }
  .pp-prose p { margin: .5rem 0; color: #374151; line-height: 1.7; }
  .pp-prose ul { list-style: disc; padding-left: 1.25rem; margin: .5rem 0; }
  .pp-prose ol { list-style: decimal; padding-left: 1.25rem; margin: .5rem 0; }
  .pp-prose li { margin: .2rem 0; line-height: 1.6; color: #374151; }
  .pp-prose blockquote { border-left: 3px solid #E8194E; background: #FFF5F7; padding: .5rem .9rem; border-radius: 0 .5rem .5rem 0; color: #9b2c51; margin: .75rem 0; }
  .pp-prose a { color: #E8194E; text-decoration: underline; }
  .pp-prose strong, .pp-prose b { font-weight: 700; color: #111827; }
`;

// Phone-frame preview of how a policy reads in the member or vendor app.
// `docs` is the full list so the side panel can show what else that app lists.
export default function PolicyPreview({ policy, html, docs = [], onClose }) {
  const [app, setApp] = useState(policy?.app_source === 'vendor' ? 'vendor' : 'member');
  if (!policy) return null;
  const visibleHere = audienceIncludes(policy.app_source, app);
  const listed = docs.filter((d) => audienceIncludes(d.app_source, app)).sort((a, b) => String(a.title).localeCompare(String(b.title)));
  const updated = policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{POLICY_PROSE}</style>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#1B1530]/55 backdrop-blur-sm" />
      <div className="relative flex max-h-[94vh] w-full max-w-[780px] flex-col gap-4 sm:flex-row sm:items-start">
        <div className="mx-auto flex flex-col items-center gap-3">
          <div className="flex rounded-full bg-white/90 p-1 shadow">
            {['member', 'vendor'].map((a) => (
              <button key={a} type="button" onClick={() => setApp(a)} className={clsx('rounded-full px-4 py-1.5 text-[12px] font-bold transition', app === a ? 'bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-white' : 'text-neutral-600')}>{a === 'member' ? 'As a member' : 'As a vendor'}</button>
            ))}
          </div>
          <div className="flex h-[640px] max-h-[78vh] w-[340px] flex-col overflow-hidden rounded-[36px] border-[8px] border-[#1F2340] bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
              <ChevronLeft className="h-5 w-5 text-neutral-700" />
              <p className="truncate text-[14px] font-bold text-neutral-900">{policy.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 text-[13px]">
              {!visibleHere ? (
                <p className="mt-10 text-center text-[12.5px] text-neutral-500">This document is {AUDIENCE[policy.app_source]?.label.toLowerCase()}, so the {app} app doesn't show it.</p>
              ) : policy.status !== 'published' ? (
                <>
                  <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700">Draft preview. The app shows nothing until you publish.</p>
                  {updated && <p className="text-[11px] text-neutral-400">Last updated {updated}</p>}
                  <div className="pp-prose" dangerouslySetInnerHTML={{ __html: html || '<p><em>No content yet.</em></p>' }} />
                </>
              ) : (
                <>
                  {updated && <p className="text-[11px] text-neutral-400">Last updated {updated}</p>}
                  <div className="pp-prose" dangerouslySetInnerHTML={{ __html: html || '<p><em>No content yet.</em></p>' }} />
                </>
              )}
            </div>
          </div>
        </div>
        <div className="w-full rounded-2xl bg-white p-4 shadow-xl sm:mt-12 sm:w-[260px]">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold uppercase tracking-wide text-neutral-600">{app === 'member' ? 'Member' : 'Vendor'} app lists</p>
            <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {listed.map((d) => (
              <li key={d.type} className={clsx('flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px]', d.type === policy.type ? 'bg-pink-50 font-bold text-[#C81345]' : 'text-neutral-700')}>
                <span className="flex min-w-0 items-center gap-2"><span className={clsx('h-1.5 w-1.5 flex-shrink-0 rounded-full', d.status === 'published' ? 'bg-emerald-500' : 'bg-neutral-300')} /><span className="truncate">{d.title}</span></span>
                {d.status !== 'published' && <span className="flex-shrink-0 text-[10px] font-semibold text-neutral-400">Hidden: draft</span>}
              </li>
            ))}
            {!listed.length && <li className="text-[12px] text-neutral-500">No documents for this app.</li>}
          </ul>
          <p className="mt-3 text-[10.5px] leading-relaxed text-neutral-400">Only published documents reach the app. Wording renders with the app's own fonts, so spacing can differ slightly.</p>
        </div>
      </div>
    </div>
  );
}
