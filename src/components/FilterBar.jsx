import React from 'react'
import { clsx } from 'clsx'
import Input from './Input.jsx'

export default function FilterBar({ search, onSearch, children, className = '' }) {
  return (
    <div className={clsx('flex flex-col sm:flex-row gap-3 items-stretch sm:items-center', className)}>
      <div className="w-full sm:max-w-xs">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearch && onSearch(e.target.value)}
          fullWidth
        />
      </div>
      <div className="flex-1 flex flex-wrap gap-3">{children}</div>
    </div>
  )
}

