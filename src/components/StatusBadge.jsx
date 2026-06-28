import React from 'react'
import { clsx } from 'clsx'

export default function StatusBadge({ value, map = {}, className = '' }) {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    danger: 'bg-red-50 text-red-700 ring-red-600/20',
    info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    neutral: 'bg-neutral-100 text-neutral-600 ring-neutral-500/20',
  }
  const v =
    map[String(value)?.toLowerCase()] ||
    (String(value).toLowerCase().includes('draft') ? 'neutral' : undefined) ||
    (String(value).toLowerCase().includes('active') ? 'success' : undefined) ||
    (String(value).toLowerCase().includes('pending') ? 'warning' : undefined) ||
    (String(value).toLowerCase().includes('paused') ? 'info' : undefined) ||
    (String(value).toLowerCase().includes('reject') ? 'danger' : undefined) ||
    'neutral'
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset', variants[v], className)}>
      {value}
    </span>
  )
}

