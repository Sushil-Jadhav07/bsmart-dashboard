import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCw, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { formatNumber } from '../utils/helpers.jsx';
import { pageList } from '../utils/contentHelpers.js';

// Shared building blocks for the redesigned marketplace admin pages.

export const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;

export const PRODUCT_STATUS = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  draft: { label: 'Draft', cls: 'bg-purple-100 text-[#8E35B5]', dot: 'bg-[#8E35B5]' },
  inactive: { label: 'Inactive', cls: 'bg-[#E9EBFA] text-neutral-600', dot: 'bg-neutral-400' },
  out_of_stock: { label: 'Out of Stock', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

export const ORDER_STATUS = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  processing: { label: 'Processing', cls: 'bg-purple-100 text-[#8E35B5]', dot: 'bg-[#8E35B5]' },
  shipped: { label: 'Shipped', cls: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

export const PAYMENT_STATUS = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700' },
  paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700' },
  failed: { label: 'Failed', cls: 'bg-rose-100 text-rose-700' },
  refunded: { label: 'Refunded', cls: 'bg-purple-100 text-[#8E35B5]' },
};

export const PageHeader = ({ eyebrow, section, title, description, children }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest">
        <span className="text-[#E8194E]">{eyebrow}</span>
        {section && <><span className="text-neutral-300">·</span><span className="text-neutral-500">{section}</span></>}
      </p>
      <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-neutral-900">{title}</h1>
      {description && <p className="mt-0.5 max-w-2xl text-[13px] text-neutral-500">{description}</p>}
    </div>
    {children && <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">{children}</div>}
  </div>
);

export const OutlineButton = ({ icon: Icon, children, className, ...props }) => (
  <button type="button" {...props} className={clsx('inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-[13px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-50', className)}>
    {Icon && <Icon className="h-4 w-4" />}{children}
  </button>
);

export const GradientButton = ({ icon: Icon, children, className, ...props }) => (
  <button type="button" {...props} className={clsx('inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#E8194E] to-[#C81345] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,25,78,0.6)] transition hover:-translate-y-0.5 disabled:opacity-50', className)}>
    {Icon && <Icon className="h-4 w-4" />}{children}
  </button>
);

export const Delta = ({ value, suffix }) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={clsx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold', value >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
      <Icon className="h-3 w-3" />{value >= 0 ? '+' : ''}{value.toFixed(1)}%{suffix}
    </span>
  );
};

export const Chip = ({ tone = 'pink', children }) => {
  const tones = {
    pink: 'bg-pink-100 text-[#C81345]',
    purple: 'bg-purple-100 text-[#8E35B5]',
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    lavender: 'bg-[#E9EBFA] text-neutral-700',
  };
  return <span className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold', tones[tone])}>{children}</span>;
};

const ICON_TONES = {
  pink: 'bg-pink-100 text-[#C81345]',
  purple: 'bg-[#EDE7FA] text-[#6D4AD9]',
  violet: 'bg-purple-100 text-[#8E35B5]',
  rose: 'bg-rose-100 text-rose-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  indigo: 'bg-indigo-50 text-indigo-600',
};
const GLOW = {
  pink: 'bg-pink-100/60', purple: 'bg-[#EDE7FA]/70', violet: 'bg-purple-100/60', rose: 'bg-rose-100/60', emerald: 'bg-emerald-50', indigo: 'bg-indigo-50',
};

export const StatCard = ({ label, value, icon: Icon, tone = 'pink', valueClass, foot }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_14px_30px_-14px_rgba(232,25,78,0.4)]">
    <span className={clsx('pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full transition-transform duration-300 group-hover:scale-125', GLOW[tone])} />
    <div className="relative flex items-start justify-between gap-2">
      <p className="pt-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700">{label}</p>
      <span className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110', ICON_TONES[tone])}><Icon className="h-[18px] w-[18px]" /></span>
    </div>
    <p className={clsx('relative mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight', valueClass || 'text-neutral-900')}>{value}</p>
    <div className="relative mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-neutral-500">{foot}</div>
  </div>
);

export const Select = ({ value, options, onChange, prefix, className }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) || options[0];
  return (
    <div className={clsx('relative', className)}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 w-full min-w-[130px] items-center justify-between gap-2 rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] px-3 text-[12.5px] text-neutral-600 transition hover:border-[#C9CFEC] hover:bg-[#E9EBFA]">
        <span className="truncate">{prefix && `${prefix}: `}<b className="font-semibold text-neutral-900">{selected?.label}</b></span>
        <ChevronDown className={clsx('h-3.5 w-3.5 flex-shrink-0 text-neutral-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 max-h-72 min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {options.map((o) => <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={clsx('block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] transition', o.value === value ? 'bg-pink-50 font-semibold text-[#E8194E]' : 'text-neutral-700 hover:bg-neutral-50')}>{o.label}</button>)}
          </div>
        </>
      )}
    </div>
  );
};

export const SearchInput = ({ value, onChange, placeholder, className }) => (
  <div className={clsx('relative min-w-[240px] flex-1', className)}>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E72A8]" />
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] pl-9 pr-3 text-[13px] text-neutral-800 placeholder-[#7E8299] outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10" />
  </div>
);

export const RefreshButton = ({ onClick, spinning }) => (
  <button type="button" onClick={onClick} title="Refresh" aria-label="Refresh" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[#E2E5F4] bg-[#EEF0FA] text-neutral-700 transition hover:bg-[#E9EBFA]">
    <RotateCw className={clsx('h-4 w-4', spinning && 'animate-spin')} />
  </button>
);

export const Th = ({ children, className }) => <th className={clsx('px-4 py-3 text-[10.5px] font-bold uppercase tracking-wide text-neutral-700', className)}>{children}</th>;

export const StateRow = ({ colSpan, loading, icon: Icon, message }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-16 text-center">
      {loading ? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : Icon && <Icon className="mx-auto h-5 w-5 text-neutral-300" />}
      <p className={clsx('text-sm', loading ? 'mt-3 text-neutral-400' : 'mt-2 font-medium text-neutral-500')}>{message}</p>
    </td>
  </tr>
);

export const StatusPill = ({ cls, dot, children, title }) => (
  <span title={title} className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', cls)}>
    {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dot)} />}{children}
  </span>
);

const ROWS_OPTIONS = [10, 25, 50];

export const Pager = ({ page, setPage, pageSize, setPageSize, total, noun = 'items', extra }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const nav = 'flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30';
  if (!total) return null;
  return (
    <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-[12px] text-neutral-500">
        <span>Showing <b className="font-semibold text-neutral-800">{formatNumber((page - 1) * pageSize + 1)}-{formatNumber(Math.min(page * pageSize, total))}</b> of {formatNumber(total)} {noun}</span>
        {setPageSize && (
          <label className="flex items-center gap-1.5">
            · Rows per page:
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-7 rounded-md border border-[#E2E5F4] bg-[#EEF0FA] px-1.5 text-[12px] font-semibold text-neutral-800 outline-none">
              {ROWS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        {extra}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setPage(1)} disabled={page === 1} aria-label="First page" className={nav}><ChevronsLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" className={nav}><ChevronLeft className="h-4 w-4" /></button>
        {pageList(page, totalPages).map((p, i) => (p === '…' ? <span key={`gap-${i}`} className="px-1 text-[12px] text-neutral-400">…</span> : (
          <button key={p} type="button" onClick={() => setPage(p)} className={clsx('h-8 min-w-[32px] rounded-lg px-2 text-[12.5px] font-semibold transition', p === page ? 'bg-[#E8194E] text-white shadow-[0_4px_12px_-4px_rgba(232,25,78,0.6)]' : 'text-neutral-700 hover:bg-neutral-100')}>{formatNumber(p)}</button>
        )))}
        <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next page" className={nav}><ChevronRight className="h-4 w-4" /></button>
        <button type="button" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Last page" className={nav}><ChevronsRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
};
