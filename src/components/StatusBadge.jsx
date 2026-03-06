import React from 'react'
import { clsx } from 'clsx'

export default function StatusBadge({ value, map = {}, className = '' }) {
  const variants = {
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-neutral-100 text-neutral-700',
  }
  const v =
    map[String(value)?.toLowerCase()] ||
    (String(value).toLowerCase().includes('active') ? 'success' : undefined) ||
    (String(value).toLowerCase().includes('pending') ? 'warning' : undefined) ||
    (String(value).toLowerCase().includes('reject') ? 'danger' : undefined) ||
    'neutral'
  return (
    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', variants[v], className)}>
      {value}
    </span>
  )
}

