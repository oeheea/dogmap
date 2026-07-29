'use client'
import { useState } from 'react'

export default function StarRating({ value = 0, onChange, size = 28, readOnly = false }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  function fill(i) {
    if (shown >= i) return '100%'
    if (shown >= i - 0.5) return '50%'
    return '0%'
  }
  return (
    <div className="inline-flex items-center" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block leading-none" style={{ width: size, height: size, fontSize: size }}>
          <span className="absolute inset-0 text-gray-300">★</span>
          <span className="absolute inset-0 text-amber-400 overflow-hidden" style={{ width: fill(i) }}>★</span>
          {!readOnly && (
            <>
              <span className="absolute left-0 top-0 w-1/2 h-full cursor-pointer" onMouseEnter={() => setHover(i - 0.5)} onClick={() => onChange(i - 0.5)} />
              <span className="absolute right-0 top-0 w-1/2 h-full cursor-pointer" onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} />
            </>
          )}
        </span>
      ))}
      {!readOnly && <span className="ml-2 text-sm text-gray-500">{Number(shown).toFixed(1)}</span>}
    </div>
  )
}