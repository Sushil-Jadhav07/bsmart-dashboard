import React from 'react'
import { clsx } from 'clsx'

export default function StatsCard({ label, value, icon: Icon, color = 'blue', trend, trendUp }) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('p-3 rounded-xl', colorStyles[color])}>
          {Icon ? <Icon className="w-5 h-5" /> : null}
        </div>
        {trend !== undefined ? (
          <span
            className={clsx(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            )}
          >
            {trendUp ? '+' : ''}
            {trend}%
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        <p className="text-xs text-neutral-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

