import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Eye, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import Button from './Button.jsx';
import { formatNumber } from '../utils/helpers.jsx';

export const toneClass = {
  magenta: {
    chip: 'bg-primary/10 text-primary',
    icon: 'bg-primary/10 text-primary',
    pill: 'border-primary/15 bg-primary/10 text-primary',
    text: 'text-primary',
  },
  rose: {
    chip: 'bg-rose-50 text-rose-600',
    icon: 'bg-rose-50 text-rose-700',
    pill: 'border-rose-200 bg-rose-50 text-rose-700',
    text: 'text-rose-700',
  },
  emerald: {
    chip: 'bg-emerald-50 text-emerald-600',
    icon: 'bg-emerald-50 text-emerald-700',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    text: 'text-emerald-700',
  },
  violet: {
    chip: 'bg-violet-50 text-violet-600',
    icon: 'bg-violet-50 text-violet-700',
    pill: 'border-violet-200 bg-violet-50 text-violet-700',
    text: 'text-violet-700',
  },
  neutral: {
    chip: 'bg-neutral-100 text-neutral-600',
    icon: 'bg-neutral-100 text-neutral-700',
    pill: 'border-neutral-200 bg-neutral-100 text-neutral-700',
    text: 'text-neutral-700',
  },
};

export const PremiumBadge = ({ children, tone = 'magenta', dot = false, className = '' }) => (
  <span className={clsx('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium capitalize', toneClass[tone]?.pill || toneClass.magenta.pill, className)}>
    {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', tone === 'emerald' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-primary')} />}
    {children}
  </span>
);

export const statusTone = (value) => {
  const status = String(value || '').toLowerCase();
  if (['active', 'approved', 'validated', 'completed', 'published', 'read', 'success'].includes(status)) return 'emerald';
  if (['pending', 'draft', 'paused', 'scheduled', 'processing', 'unread'].includes(status)) return 'magenta';
  if (['rejected', 'suspended', 'inactive', 'failed', 'deleted', 'not validated'].includes(status)) return 'rose';
  return 'neutral';
};

const MetricCard = ({ label, value, icon: Icon, tone = 'magenta' }) => {
  const styles = toneClass[tone] || toneClass.magenta;
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
      <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', styles.chip)}>
        {Icon && <Icon className="w-4 h-4" />}
      </div>
      <div>
        <p className="text-lg font-bold text-neutral-900 leading-tight">{value}</p>
        <p className="text-[11px] text-neutral-500 font-medium">{label}</p>
      </div>
    </div>
  );
};

const PremiumSelect = ({ label, value, options = [], onChange }) => (
  <div className="relative">
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={onChange}
      className="h-9 appearance-none rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-8 text-xs font-medium text-neutral-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
  </div>
);

const SortHeader = ({ column, sortConfig, onSort }) => {
  const active = sortConfig.key === column.key;
  return (
    <button
      type="button"
      disabled={column.sortable === false}
      onClick={() => column.sortable !== false && onSort(column.key)}
      className={clsx(
        'group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 transition',
        column.sortable === false ? 'cursor-default' : 'hover:text-primary',
        column.align === 'right' && 'justify-end'
      )}
    >
      {column.title}
      {column.sortable !== false && (
        <ArrowUpDown className={clsx('h-3 w-3 transition', active ? 'text-primary' : 'text-neutral-300 group-hover:text-primary/70', active && sortConfig.direction === 'desc' && 'rotate-180')} />
      )}
    </button>
  );
};

const ActionMenu = ({ row, actions = [] }) => {
  const [open, setOpen] = useState(false);
  if (!actions.length) return null;
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((value) => !value); }}
        className="p-1.5 rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" type="button" aria-label="Close actions" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {actions.map((action) => {
              const Icon = action.icon || (action.tone === 'rose' ? Trash2 : Eye);
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    action.onClick?.(row);
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition',
                    action.tone === 'rose' ? 'text-red-600 hover:bg-red-50' : 'text-neutral-700 hover:bg-neutral-50'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const compareValues = (a, b, key) => {
  const aValue = a?.[key];
  const bValue = b?.[key];
  if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue;
  const aDate = new Date(aValue);
  const bDate = new Date(bValue);
  if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) return aDate - bDate;
  return String(aValue || '').localeCompare(String(bValue || ''));
};

const PremiumResourcePage = ({
  eyebrow,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  actionDisabled = false,
  metrics = [],
  rows = [],
  columns = [],
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  emptyMessage = 'No records found',
  actions = [],
  pageSize = 10,
  rowKey = (row, index) => row?.id || row?._id || index,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: columns.find((column) => column.sortable !== false)?.key || '', direction: 'desc' });
  const [page, setPage] = useState(1);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;
    return [...rows].sort((a, b) => {
      const comparison = compareValues(a, b, sortConfig.key);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const onSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  React.useEffect(() => {
    setPage(1);
  }, [rows.length, searchValue, filters.map((filter) => filter.value).join('|')]);

  const metricCols = metrics.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{eyebrow}</p>}
          <h1 className="text-xl font-bold text-neutral-900 mt-1">{title}</h1>
          {description && <p className="text-sm text-neutral-500 mt-0.5 max-w-2xl">{description}</p>}
        </div>
        {actionLabel && (
          <Button
            variant="primary"
            icon={actionIcon}
            size="sm"
            className="flex-shrink-0"
            onClick={onAction}
            disabled={actionDisabled}
          >
            {actionLabel}
          </Button>
        )}
      </div>

      {/* Stat cards */}
      {!!metrics.length && (
        <div className={clsx('grid grid-cols-2 gap-3', metricCols)}>
          {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="p-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder-neutral-400 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          {!!filters.length && (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <PremiumSelect
                  key={filter.label}
                  label={filter.label}
                  value={filter.value}
                  options={filter.options}
                  onChange={(event) => filter.onChange?.(event.target.value)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                {columns.map((column) => (
                  <th key={column.key} className={clsx('px-4 py-2.5', column.align === 'right' && 'text-right')}>
                    <SortHeader column={column} sortConfig={sortConfig} onSort={onSort} />
                  </th>
                ))}
                {!!actions.length && (
                  <th className="px-4 py-2.5 text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visibleRows.length > 0 ? visibleRows.map((row, index) => (
                <tr key={rowKey(row, index)} className="group bg-white transition-colors hover:bg-neutral-50/60">
                  {columns.map((column) => (
                    <td key={column.key} className={clsx('px-4 py-3 text-sm text-neutral-700', column.align === 'right' && 'text-right')}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {!!actions.length && (
                    <td className="px-4 py-3">
                      <ActionMenu row={row} actions={actions} />
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={columns.length + (actions.length ? 1 : 0)} className="px-4 py-16 text-center">
                    <Search className="mx-auto h-5 w-5 text-neutral-300" />
                    <p className="mt-2 text-sm font-medium text-neutral-500">{emptyMessage}</p>
                    <p className="mt-1 text-xs text-neutral-400">Try changing your search or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            {sortedRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, sortedRows.length)} of {formatNumber(sortedRows.length)}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-neutral-700 px-2">{page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumResourcePage;