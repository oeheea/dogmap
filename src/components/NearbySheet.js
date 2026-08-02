'use client'

import { catTile } from '@/lib/categories'

export default function NearbySheet({ places, photos, label, onPick, onClose }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-16 w-[94%] max-w-lg z-30 bg-white rounded-2xl shadow-2xl max-h-[52vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
        <span className="text-sm font-bold">📍 {label} 주변 {places.length}곳</span>
        <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
      </div>
      <ul className="overflow-y-auto p-2 flex flex-col gap-1">
        {places.map((p) => {
          const t = catTile(p.category)
          const ph = photos[p.id] || []
          return (
            <li key={p.id}>
              <button onClick={() => onPick(p)} className="w-full text-left p-2 rounded-xl hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className={`w-9 h-9 rounded-lg ${t.cls} flex items-center justify-center text-lg shrink-0`}>{t.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm truncate">{p.name}</span>
                      <span className="text-[11px] text-blue-600 shrink-0">{(p.dist / 1000).toFixed(1)}km</span>
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">{p.category}</div>
                  </div>
                </div>
                {ph.length > 0 && (
                  <div className="flex gap-1.5 mt-2 overflow-x-auto">
                    {ph.map((u, i) => <img key={i} src={u} alt="" className="w-24 h-24 rounded-lg object-cover shrink-0" />)}
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}