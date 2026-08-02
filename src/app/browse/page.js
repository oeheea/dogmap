'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'
import { formatAddress } from '@/lib/format'
import ReportModal from '@/components/ReportModal'
import { CATEGORIES, catTile } from '@/lib/categories'

const TAG_OPTIONS = ['반려동물 전용 메뉴O', '대형견 가능', '이동가방 필수', '마당 있음', '자유 산책 가능', '실내 동반 가능', '실외에만 가능', '무게 제한 있음']

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export default function BrowsePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allPlaces, setAllPlaces] = useState([])
  const [activeCat, setActiveCat] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [query, setQuery] = useState('')
  const [center, setCenter] = useState(null)
  const [searching, setSearching] = useState(false)
  const [radius, setRadius] = useState(2)
  const [photoMap, setPhotoMap] = useState({})
  const [reportTarget, setReportTarget] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    ;(async () => {
      const { data: st } = await supabase.from('app_settings').select('value').eq('key', 'search_radius_km').maybeSingle()
      setRadius(Number(st?.value ?? 2))
      const { data } = await supabase.from('places').select('id, name, category, address, lat, lng, tags, created_at').eq('hidden', false)
      setAllPlaces(data ?? [])
      setLoading(false)
    })()
    const c = new URLSearchParams(window.location.search).get('cat')
    if (c) setActiveCat(c)
  }, [])

  function toggleTag(t) { setActiveTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]) }

  async function runSearch(e) {
    e?.preventDefault()
    if (!query.trim()) { setCenter(null); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`)
      const j = await res.json()
      const hit = (j.places ?? [])[0]
      if (hit && hit.lat && hit.lng) setCenter({ lat: hit.lat, lng: hit.lng, label: query.trim() })
      else setCenter(null)
    } catch { setCenter(null) }
    setSearching(false)
  }
  function clearSearch() { setQuery(''); setCenter(null) }

  const shown = useMemo(() => {
    let list = allPlaces.filter((p) =>
      (!activeCat || (p.category ?? '').includes(activeCat)) &&
      (activeTags.length === 0 || activeTags.every((t) => (p.tags ?? []).includes(t)))
    )
    if (center) {
      list = list.map((p) => ({ ...p, dist: haversine(center.lat, center.lng, p.lat, p.lng) }))
        .filter((p) => p.dist <= radius * 1000).sort((a, b) => a.dist - b.dist)
    } else if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((p) => (p.name ?? '').toLowerCase().includes(q) || (p.address ?? '').toLowerCase().includes(q))
    } else {
      list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
    return list.slice(0, 30)
  }, [allPlaces, activeCat, activeTags, query, center, radius])

  const shownKey = shown.map((p) => p.id).join(',')
  useEffect(() => {
    const ids = shown.map((p) => p.id)
    if (!ids.length) { setPhotoMap({}); return }
    let alive = true
    supabase.from('reviews').select('place_id, image_url, review_likes(count)').in('place_id', ids).not('image_url', 'is', null)
      .then(({ data }) => {
        if (!alive) return
        const g = {}
        for (const r of (data ?? [])) { const likes = r.review_likes?.[0]?.count ?? 0; (g[r.place_id] = g[r.place_id] || []).push({ url: r.image_url, likes }) }
        const m = {}
        for (const pid in g) { g[pid].sort((a, b) => b.likes - a.likes); m[pid] = g[pid].slice(0, 4).map((x) => x.url) }
        setPhotoMap(m)
      })
    return () => { alive = false }
  }, [shownKey]) // eslint-disable-line

  if (loading) return <Loading />

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-3">둘러보기</h1>

      <form onSubmit={runSearch} className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5">
          <span className="text-gray-400">🔍</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="지역·역 이름 (예: 합정역)"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-gray-400" />
          {query && <button type="button" onClick={clearSearch} className="text-gray-300 text-sm">✕</button>}
        </div>
        <button type="submit" disabled={searching} className="bg-blue-600 text-white rounded-xl px-4 text-sm font-medium disabled:opacity-50">
          {searching ? '…' : '주변'}
        </button>
      </form>

      {center && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm bg-blue-50 text-blue-700 rounded-full px-3 py-1">📍 {center.label} 주변 {radius}km</span>
          <button onClick={clearSearch} className="text-xs text-gray-400">초기화</button>
        </div>
      )}

      <div className="text-xs font-semibold text-gray-400 mb-1.5">카테고리</div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        <button onClick={() => setActiveCat('')} className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeCat === '' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}>전체</button>
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setActiveCat(c.value)}
            className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeCat === c.value ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{c.label}</button>
        ))}
      </div>

      <div className="text-xs font-semibold text-gray-400 mb-1.5">특징</div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-1 px-1">
        <button onClick={() => setActiveTags([])} className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeTags.length === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}>전체</button>
        {TAG_OPTIONS.map((t) => (
          <button key={t} onClick={() => toggleTag(t)} className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeTags.includes(t) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>#{t}</button>
        ))}
      </div>
      {activeTags.length > 0 && <p className="text-xs text-gray-400 mb-3">선택한 특징을 <b>모두</b> 만족하는 곳만 보여요</p>}

      {user && (
        <Link href="/map" className="block text-center w-full my-4 bg-white border border-dashed border-blue-300 rounded-xl py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition">
          ＋ 지도에서 장소 추가
        </Link>
      )}

      {shown.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-12">{center ? `${center.label} 주변 ${radius}km에 등록된 곳이 없어요.` : query ? '검색 결과가 없어요.' : '아직 등록된 곳이 없어요.'}</div>
      )}

      <ul className="flex flex-col gap-3">
        {shown.map((p) => {
          const t = catTile(p.category)
          const photos = photoMap[p.id] || []
          return (
            <li key={p.id} className="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 hover:shadow-md transition">
              <Link href={`/place/${p.id}`} className="flex gap-3">
                <span className={`w-14 h-14 rounded-2xl ${t.cls} flex items-center justify-center text-2xl shrink-0`}>{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[15px] truncate pr-6">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{formatAddress(p.address)}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{p.category}</span>
                    {p.dist != null && <span className="text-[11px] text-blue-600 font-medium">{(p.dist / 1000).toFixed(1)}km</span>}
                  </div>
                  {(p.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.tags.slice(0, 3).map((tag) => <span key={tag} className="text-[11px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">{tag}</span>)}
                      {p.tags.length > 3 && <span className="text-[11px] text-gray-400">+{p.tags.length - 3}</span>}
                    </div>
                  )}
                </div>
              </Link>
              {photos.length > 0 && (
                <div className="flex gap-1 mt-2 overflow-x-auto">
                  {photos.map((u, i) => <img key={i} src={u} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />)}
                </div>
              )}
              {user && <button onClick={() => setReportTarget(p)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 text-sm" title="신고">🚩</button>}
            </li>
          )
        })}
      </ul>

      {reportTarget && <ReportModal place={reportTarget} user={user} onClose={() => setReportTarget(null)} />}
    </div>
  )
}