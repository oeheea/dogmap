'use client'

import { formatAddress } from '@/lib/format'
import { catTile } from '@/lib/categories'

export default function PlaceCard({ place, stats, photos, onClose, onSave, onDetail, onDirections }) {
  const t = catTile(place.category)
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-80 max-w-[90vw] bg-white text-gray-900 rounded-2xl shadow-xl p-4">
      <div className="flex justify-between items-start gap-2">
        <div className="flex gap-3 min-w-0">
          <span className={`w-12 h-12 rounded-2xl ${t.cls} flex items-center justify-center text-xl shrink-0`}>{t.icon}</span>
          <div className="min-w-0">
            <div className="font-bold text-base truncate">{place.name}</div>
            <div className="text-xs text-gray-500 truncate">{formatAddress(place.address)}</div>
            <div className="mt-1 text-xs">
              {stats?.count > 0
                ? <span className="text-amber-500 font-semibold">★ {stats.avg} <span className="text-gray-400 font-normal">· 후기 {stats.count}</span></span>
                : <span className="text-gray-400">아직 후기가 없어요</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 text-lg leading-none shrink-0">✕</button>
      </div>
      <div className="flex flex-wrap gap-1 mt-2 items-center">
        <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{place.category}</span>
        {(place.tags ?? []).slice(0, 3).map((tag) => <span key={tag} className="text-[11px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">{tag}</span>)}
      </div>
      {photos.length > 0 && (
        <div className="flex gap-1 mt-2 overflow-x-auto">
          {photos.map((u, i) => <img key={i} src={u} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />)}
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button onClick={onSave} className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium">⭐ 저장</button>
        <button onClick={onDetail} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">상세·후기</button>
      </div>
      <button onClick={onDirections} className="w-full mt-2 rounded-lg px-3 py-2 text-sm font-medium flex items-center justify-center gap-1" style={{ background: '#FEE500', color: '#3C1E1E' }}>
        <span>🧭</span> 카카오맵 길찾기
      </button>
    </div>
  )
}