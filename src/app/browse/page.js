'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'
import { formatAddress } from '@/lib/format'
import ReportModal from '@/components/ReportModal'

const TAG_OPTIONS = ['반려동물 전용 메뉴O', '대형견 가능', '이동가방 필수', '마당 있음', '자유 산책 가능', '실내 동반 가능', '실외에만 가능', '무게 제한 있음']
const CATEGORIES = [
  { key: '애견카페', label: '애견카페' },
  { key: '카페', label: '반려동물 동반 카페' },
  { key: '밥집', label: '반려동물 동반 밥집' },
  { key: '펜션', label: '반려동물 동반 펜션' },
  { key: '기타', label: '기타' },
]

function catTile(cat) {
  const c = cat || ''
  if (c.includes('애견카페')) return { icon: '🐶', cls: 'bg-orange-50' }
  if (c.includes('카페')) return { icon: '☕', cls: 'bg-orange-50' }
  if (c.includes('밥집') || c.includes('식당')) return { icon: '🍽️', cls: 'bg-amber-50' }
  if (c.includes('펜션') || c.includes('호텔')) return { icon: '🏡', cls: 'bg-green-50' }
  return { icon: '📍', cls: 'bg-gray-100' }
}

export default function BrowsePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState([])
  const [reportTarget, setReportTarget] = useState(null)

  async function load() {
    let q = supabase.from('places').select('*, reviews(count)').eq('hidden', false).order('created_at', { ascending: false })
    if (activeCat) q = q.ilike('category', `%${activeCat}%`)
    if (activeTags.length > 0) q = q.contains('tags', activeTags)
    const { data } = await q
    setPlaces(data ?? [])
    setLoading(false)
  }

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)) }, [])
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('cat')
    if (c) setActiveCat(c)
  }, [])
  useEffect(() => { load() }, [activeCat, activeTags])

  function toggleTag(t) {
    setActiveTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
  }

  if (loading) return <Loading />

  const q = query.trim().toLowerCase()
  const shown = q ? places.filter((p) => (p.name ?? '').toLowerCase().includes(q) || (p.address ?? '').toLowerCase().includes(q)) : places

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-3">둘러보기</h1>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 mb-3">
        <span className="text-gray-400">🔍</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="가게 이름·지역 검색"
          className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400" />
        {query && <button onClick={() => setQuery('')} className="text-gray-300 text-sm">✕</button>}
      </div>

      <div className="text-xs font-semibold text-gray-400 mb-1.5">카테고리</div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        <button onClick={() => setActiveCat('')}
          className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeCat === '' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}>전체</button>
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setActiveCat(c.key)}
            className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeCat === c.key ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{c.label}</button>
        ))}
      </div>

      <div className="text-xs font-semibold text-gray-400 mb-1.5">특징</div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-1 px-1">
        <button onClick={() => setActiveTags([])}
          className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeTags.length === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}>전체</button>
        {TAG_OPTIONS.map((t) => (
          <button key={t} onClick={() => toggleTag(t)}
            className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeTags.includes(t) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>#{t}</button>
        ))}
      </div>
      {activeTags.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">선택한 특징을 <b>모두</b> 만족하는 곳만 보여요</p>
      )}

      {user && (
        <Link href="/map"
          className="block text-center w-full mb-4 bg-white border border-dashed border-blue-300 rounded-xl py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition">
          ＋ 지도에서 장소 추가
        </Link>
      )}

      {shown.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-12">{query ? '검색 결과가 없어요.' : '해당하는 가게가 아직 없어요.'}</div>
      )}

      <ul className="flex flex-col gap-3">
        {shown.map((p) => {
          const t = catTile(p.category)
          const reviewCount = p.reviews?.[0]?.count ?? 0
          return (
            <li key={p.id} className="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 hover:shadow-md transition">
              <Link href={`/place/${p.id}`} className="flex gap-3">
                <span className={`w-14 h-14 rounded-2xl ${t.cls} flex items-center justify-center text-2xl shrink-0`}>{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[15px] truncate pr-6">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{formatAddress(p.address)}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{p.category}</span>
                    {reviewCount > 0 && <span className="text-[11px] text-gray-400">후기 {reviewCount}</span>}
                  </div>
                  {(p.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[11px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">{tag}</span>
                      ))}
                      {p.tags.length > 3 && <span className="text-[11px] text-gray-400">+{p.tags.length - 3}</span>}
                    </div>
                  )}
                </div>
              </Link>
              {user && (
                <button onClick={() => setReportTarget(p)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 text-sm" title="신고">🚩</button>
              )}
            </li>
          )
        })}
      </ul>

      {reportTarget && (
        <ReportModal place={reportTarget} user={user} onClose={() => setReportTarget(null)} />
      )}
    </div>
  )
}