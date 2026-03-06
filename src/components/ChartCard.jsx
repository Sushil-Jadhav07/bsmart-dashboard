import React from 'react'
import { clsx } from 'clsx'

export default function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={clsx('bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm', className)}>
      <div className="mb-4">
        {title ? <p className="text-sm font-semibold text-neutral-800">{title}</p> : null}
        {subtitle ? <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="w-full">{children}</div>
    </div>
  )
}

