import React, { useState, useRef, useEffect } from 'react'
import { EllipsisVertical } from 'lucide-react'
import Button from './Button.jsx'

export default function ActionMenu({ items = [] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} icon={EllipsisVertical} />
      {open ? (
        <div className="absolute right-0 mt-2 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg z-10">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false)
                it.onClick && it.onClick()
              }}
              className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-xl"
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

