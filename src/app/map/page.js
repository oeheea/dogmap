'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatAddress } from '@/lib/format'
import ShapeIcon from '@/components/ShapeIcon'
import { shapeSvg } from '@/lib/shapes'
import ReportModal from '@/components/ReportModal'
import SavePlaceModal from '@/components/SavePlaceModal'
import NearbySheet from '@/components/NearbySheet'
import PlaceCard from '@/components/PlaceCard'
import { CATEGORY_VALUES, guessCategory } from '@/lib/categories'

const TAG_OPTIONS = ['반려동물 전용 메뉴O', '대형견 가능', '이동가방 필수', '마당 있음', '자유 산책 가능', '실내 동반 가능', '실외에만 가능', '무게 제한 있음']

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export default function MapPage() {
  const router = useRouter()
  const mapRef = useRef(null)
  const mapObjRef = useRef(null)
  const placeMarkersRef = useRef([])
  const folderMarkersRef = useRef({})
  const folderPlaceIdsRef = useRef({})
  const tempMarkerRef = useRef(null)
  const registerRef = useRef(false)
  const restoredRef = useRef(false)

  const [user, setUser] = useState(null)
  const [allPlaces, setAllPlaces] = useState([])
  const [activeCat, setActiveCat] = useState('전체')
  const [activeTags, setActiveTags] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)
  const [photos, setPhotos] = useState([])
  const [reportTarget, setReportTarget] = useState(null)
  const [saveTarget, setSaveTarget] = useState(null)

  const [radius, setRadius] = useState(2)
  const [searchCenter, setSearchCenter] = useState(null)
  const [nearbyPhotos, setNearbyPhotos] = useState({})
  const [sheetOpen, setSheetOpen] = useState(false)

  const [folders, setFolders] = useState([])
  const [folderOn, setFolderOn] = useState({})
  const [mapReady, setMapReady] = useState(false)
  const [subFolders, setSubFolders] = useState([])
  const [hiddenIds, setHiddenIds] = useState(new Set())

  const [register, setRegister] = useState(false)
  const [regPos, setRegPos] = useState(null)
  const [regForm, setRegForm] = useState({ name: '', category: CATEGORY_VALUES[0], address: '', description: '' })
  const [regQuery, setRegQuery] = useState('')
  const [regResults, setRegResults] = useState([])

  useEffect(() => { registerRef.current = register }, [register])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) { loadFolders(data.user.id); loadSubs(data.user.id) } })
    supabase.from('app_settings').select('value').eq('key', 'search_radius_km').maybeSingle().then(({ data }) => setRadius(Number(data?.value ?? 2)))
    const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    function initMap() {
      window.kakao.maps.load(async () => {
        const map = new window.kakao.maps.Map(mapRef.current, { center: new window.kakao.maps.LatLng(37.5445, 127.0), level: 6 })
        mapObjRef.current = map
        setMapReady(true)
        window.kakao.maps.event.addListener(map, 'click', async (e) => {
          if (!registerRef.current) return
          const latlng = e.latLng
          const lat = latlng.getLat(), lng = latlng.getLng()
          setRegPos({ lat, lng })
          if (tempMarkerRef.current) tempMarkerRef.current.setPosition(latlng)
          else tempMarkerRef.current = new window.kakao.maps.Marker({ position: latlng, map })
          try {
            const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`)
            const d = await res.json()
            setRegForm((f) => ({ ...f, address: formatAddress(d.address ?? '') }))
          } catch {}
        })
        const { data: places } = await supabase.from('places').select('*').eq('hidden', false)
        setAllPlaces(places ?? [])
      })
    }
    if (window.kakao && window.kakao.maps) { initMap(); return }
    const s = document.createElement('script')
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`
    s.async = true; s.onload = initMap; document.head.appendChild(s)
  }, [])

  useEffect(() => {
    const map = mapObjRef.current
    if (!map || !window.kakao) return
    placeMarkersRef.current.forEach((m) => m.setMap(null))
    placeMarkersRef.current = []
    allPlaces.filter((p) => (activeCat === '전체' || p.category === activeCat) && (activeTags.length === 0 || activeTags.every((t) => (p.tags ?? []).includes(t))) && !hiddenIds.has(p.id)).forEach((p) => {
      const marker = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(p.lat, p.lng), map })
      window.kakao.maps.event.addListener(marker, 'click', () => selectPlace(p))
      placeMarkersRef.current.push(marker)
    })
  }, [allPlaces, activeCat, activeTags, hiddenIds])

  useEffect(() => {
    if (restoredRef.current) return
    if (!mapReady) return
    if (folders.length === 0 && subFolders.length === 0) return
    restoredRef.current = true
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem('folderOn') || '{}') } catch {}
    setFolderOn(saved)
    ;[...folders, ...subFolders].forEach((f) => { if (saved[f.id]) showFolder(f) })
  }, [mapReady, folders, subFolders])

  const nearbyList = useMemo(() => {
    if (!searchCenter) return []
    return allPlaces
      .filter((p) => (activeCat === '전체' || p.category === activeCat) && (activeTags.length === 0 || activeTags.every((t) => (p.tags ?? []).includes(t))) && !hiddenIds.has(p.id))
      .map((p) => ({ ...p, dist: haversine(searchCenter.lat, searchCenter.lng, p.lat, p.lng) }))
      .filter((p) => p.dist <= radius * 1000)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 30)
  }, [searchCenter, allPlaces, activeCat, activeTags, hiddenIds, radius])

  const nearbyKey = nearbyList.map((p) => p.id).join(',')
  useEffect(() => {
    const ids = nearbyList.map((p) => p.id)
    if (!ids.length) { setNearbyPhotos({}); return }
    let alive = true
    supabase.from('reviews').select('place_id, image_url, review_likes(count)').in('place_id', ids).not('image_url', 'is', null)
      .then(({ data }) => {
        if (!alive) return
        const g = {}
        for (const r of (data ?? [])) { const likes = r.review_likes?.[0]?.count ?? 0; (g[r.place_id] = g[r.place_id] || []).push({ url: r.image_url, likes }) }
        const m = {}
        for (const pid in g) { g[pid].sort((a, b) => b.likes - a.likes); m[pid] = g[pid].slice(0, 4).map((x) => x.url) }
        setNearbyPhotos(m)
      })
    return () => { alive = false }
  }, [nearbyKey]) // eslint-disable-line

  async function loadFolders(uid) {
    const { data } = await supabase.from('folders').select('*, saved_places(count)').eq('user_id', uid).order('created_at')
    setFolders(data ?? [])
  }
  async function loadSubs(uid) {
    const { data } = await supabase.from('folder_subscriptions').select('folders(*, saved_places(count))').eq('user_id', uid)
    setSubFolders((data ?? []).map((d) => d.folders).filter(Boolean))
  }

  function goToPlace(p) {
    const map = mapObjRef.current
    map.setLevel(4)
    map.setCenter(new window.kakao.maps.LatLng(p.lat, p.lng))
    selectPlace(p)
    setSidebarOpen(false)
    setQuery('')
  }

  async function moveToRegion(e) {
    e?.preventDefault()
    if (!query.trim()) return
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`)
      const j = await res.json()
      const hit = (j.places ?? [])[0]
      if (!hit || !hit.lat) { alert('그 지역을 못 찾았어요'); return }
      const map = mapObjRef.current
      map.setLevel(5)
      map.setCenter(new window.kakao.maps.LatLng(hit.lat, hit.lng))
      setSidebarOpen(false)
      setSearchCenter({ lat: hit.lat, lng: hit.lng, label: query.trim() })
      setSheetOpen(true)
    } catch { alert('검색 실패') }
  }
  function pickNearby(p) {
    const map = mapObjRef.current
    map.setLevel(4)
    map.setCenter(new window.kakao.maps.LatLng(p.lat, p.lng))
    selectPlace(p)
    setSheetOpen(false)
  }

  async function selectPlace(p) {
    setSheetOpen(false)
    setSelected(p); setStats(null); setPhotos([])
    const { data: revs } = await supabase.from('reviews').select('rating').eq('place_id', p.id)
    const count = revs?.length ?? 0
    const avg = count ? (revs.reduce((s, r) => s + r.rating, 0) / count).toFixed(1) : null
    setStats({ avg, count })
    const [rp, mp] = await Promise.all([
      supabase.from('reviews').select('image_url, created_at, review_likes(count)').eq('place_id', p.id).not('image_url', 'is', null),
      supabase.from('moments').select('image_url, created_at, moment_likes(count)').eq('place_id', p.id).not('image_url', 'is', null),
    ])
    const all = [
      ...(rp.data || []).map((x) => ({ url: x.image_url, likes: x.review_likes?.[0]?.count ?? 0, t: x.created_at })),
      ...(mp.data || []).map((x) => ({ url: x.image_url, likes: x.moment_likes?.[0]?.count ?? 0, t: x.created_at })),
    ]
    all.sort((a, b) => (b.likes - a.likes) || (new Date(b.t) - new Date(a.t)))
    setPhotos(all.slice(0, 4).map((x) => x.url))
  }

  function openSave() {
    if (!user) { alert('로그인이 필요해요'); return }
    setSaveTarget(selected)
  }
  function openDirections(p) {
    window.open(`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`, '_blank')
  }

  function circleHtml(color, icon) {
    return `<div style="width:32px;height:32px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4)">${shapeSvg(icon, '#ffffff', 16)}</div>`
  }
  function recomputeHidden() {
    const s = new Set()
    Object.values(folderPlaceIdsRef.current).forEach((ids) => ids.forEach((id) => s.add(id)))
    setHiddenIds(s)
  }
  function showFolder(folder) {
    supabase.from('saved_places').select('color, places(*)').eq('folder_id', folder.id).then(({ data }) => {
      const rows = (data ?? []).filter((d) => d.places)
      const overlays = rows.map((d) => {
        const p = d.places
        const el = document.createElement('div')
        el.style.cssText = 'cursor:pointer'
        el.innerHTML = circleHtml(d.color || '#3b82f6', folder.icon || '📍')
        const ov = new window.kakao.maps.CustomOverlay({ position: new window.kakao.maps.LatLng(p.lat, p.lng), content: el, xAnchor: 0.5, yAnchor: 0.5 })
        ov.setMap(mapObjRef.current)
        el.addEventListener('click', () => selectPlace(p))
        return ov
      })
      folderMarkersRef.current[folder.id] = overlays
      folderPlaceIdsRef.current[folder.id] = rows.map((d) => d.places.id)
      recomputeHidden()
    })
  }
  function hideFolder(id) {
    const ms = folderMarkersRef.current[id] ?? []
    ms.forEach((o) => o.setMap(null))
    folderMarkersRef.current[id] = []
    delete folderPlaceIdsRef.current[id]
    recomputeHidden()
  }
  function toggleFolder(folder) {
    const on = !folderOn[folder.id]
    const next = { ...folderOn, [folder.id]: on }
    setFolderOn(next)
    localStorage.setItem('folderOn', JSON.stringify(next))
    if (on) showFolder(folder)
    else hideFolder(folder.id)
  }

  async function searchForRegister(e) {
    e.preventDefault()
    if (!regQuery.trim()) return
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(regQuery)}`)
    const d = await res.json()
    setRegResults(d.places ?? [])
  }
  function pickSearchResult(r) {
    const map = mapObjRef.current
    const latlng = new window.kakao.maps.LatLng(r.lat, r.lng)
    map.setLevel(3); map.setCenter(latlng)
    setRegPos({ lat: r.lat, lng: r.lng })
    if (tempMarkerRef.current) tempMarkerRef.current.setPosition(latlng)
    else tempMarkerRef.current = new window.kakao.maps.Marker({ position: latlng, map })
    setRegForm((f) => ({ ...f, name: r.name || f.name, address: formatAddress(r.address) || f.address }))
    setRegResults([])
  }
  async function saveRegister(e) {
    e.preventDefault()
    if (!regPos) { alert('지도를 클릭해 위치를 먼저 선택해주세요'); return }
    const { data, error } = await supabase.from('places').insert({
      name: regForm.name, category: guessCategory(regForm.name), address: regForm.address,
      description: regForm.description, lat: regPos.lat, lng: regPos.lng,
    }).select().single()
    if (error) { alert('등록 실패: ' + error.message); return }
    setAllPlaces((prev) => [...prev, data]); cancelRegister(); alert('장소가 등록되었어요! 🐾')
  }
  function cancelRegister() {
    setRegister(false); setRegPos(null); setRegForm({ name: '', category: CATEGORY_VALUES[0], address: '', description: '' })
    setRegQuery(''); setRegResults([])
    if (tempMarkerRef.current) { tempMarkerRef.current.setMap(null); tempMarkerRef.current = null }
  }

  return (
    <div className="flex h-[calc(100vh-56px)] relative -mb-20">
      {sidebarOpen && <div className="absolute inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />}
      <aside className={`w-72 max-w-[80vw] shrink-0 border-r bg-white text-gray-900 p-4 pb-8 overflow-y-auto absolute top-0 bottom-16 left-0 z-40 transition-transform shadow-xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-2 right-2 text-gray-400 text-lg">✕</button>
        <form onSubmit={moveToRegion} className="flex gap-2 mb-2 mt-6">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="장소·지역 검색 (예: 합정역)"
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
          <button type="submit" className="bg-blue-600 text-white rounded-lg px-3 text-sm shrink-0">이동</button>
        </form>
        {query && (
          <ul className="flex flex-col gap-1 mb-3 max-h-52 overflow-y-auto">
            {allPlaces.filter((p) => p.name.includes(query)).slice(0, 20).map((p) => (
              <li key={p.id}>
                <button onClick={() => goToPlace(p)} className="w-full text-left rounded px-3 py-2 text-sm hover:bg-gray-100">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">{p.category} · {p.address}</div>
                </button>
              </li>
            ))}
            {allPlaces.filter((p) => p.name.includes(query)).length === 0 && <li className="text-xs text-gray-400 px-1">이름 결과 없음 · "이동"으로 지역 검색</li>}
          </ul>
        )}
        <p className="text-xs text-gray-500 mb-1">카테고리</p>
        <ul className="flex flex-col gap-1 mb-4">
          {['전체', ...CATEGORY_VALUES].map((c) => (
            <li key={c}>
              <button onClick={() => { setActiveCat(c); setSidebarOpen(false) }} className={`w-full text-left rounded px-3 py-2 text-sm ${activeCat === c ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>{c}</button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mb-1">특징</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {TAG_OPTIONS.map((t) => (
            <button key={t} onClick={() => setActiveTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
              className={`text-xs rounded-full px-2.5 py-1 border ${activeTags.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>#{t}</button>
          ))}
        </div>
        {user && (
          <button onClick={() => { setSelected(null); setRegister(true); setSidebarOpen(false) }} className="w-full mb-4 bg-blue-600 text-white rounded-lg py-2 text-sm">＋ 장소 등록</button>
        )}
        {user && (
          <>
            <p className="text-xs text-gray-500 mb-1">내 폴더 지도표시</p>
            <ul className="flex flex-col gap-2">
              {folders.length === 0 && <li className="text-xs text-gray-400">저장한 폴더가 없어요</li>}
              {folders.map((f) => (
                <li key={f.id} className="flex items-center justify-between">
                  <Link href={`/folder/${f.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-70">
                    <span className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-gray-50 border border-gray-200"><ShapeIcon shape={f.icon} size={16} /></span>
                    <div className="min-w-0">
                      <div className="text-sm truncate">{f.name}</div>
                      <div className="text-[11px] text-gray-400">{f.is_public ? '🌐 공개' : '🔒 비공개'} · {f.saved_places?.[0]?.count ?? 0}개</div>
                    </div>
                  </Link>
                  <button onClick={() => toggleFolder(f)} className={`w-10 h-6 rounded-full shrink-0 relative transition ${folderOn[f.id] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${folderOn[f.id] ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </li>
              ))}
            </ul>
            {subFolders.length > 0 && (
              <>
                <p className="text-xs text-gray-500 mb-1 mt-4">구독 폴더</p>
                <ul className="flex flex-col gap-2">
                  {subFolders.map((f) => (
                    <li key={f.id} className="flex items-center justify-between">
                      <Link href={`/folder/${f.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-70">
                        <span className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-gray-50 border border-gray-200"><ShapeIcon shape={f.icon} size={16} /></span>
                        <div className="min-w-0">
                          <div className="text-sm truncate">{f.name}</div>
                          <div className="text-[11px] text-gray-400">구독 · {f.saved_places?.[0]?.count ?? 0}개</div>
                        </div>
                      </Link>
                      <button onClick={() => toggleFolder(f)} className={`w-10 h-6 rounded-full shrink-0 relative transition ${folderOn[f.id] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${folderOn[f.id] ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </aside>

      <div className="relative flex-1">
        <div ref={mapRef} className="w-full h-full" />
        <button onClick={() => setSidebarOpen(true)} className="absolute top-3 left-3 z-20 bg-white shadow rounded-full w-10 h-10 flex items-center justify-center text-lg">☰</button>
        {nearbyList.length > 0 && (
          <button onClick={() => setSheetOpen((v) => !v)} className={`absolute top-3 right-3 z-20 rounded-full px-3 py-2 text-sm shadow-lg border border-blue-600 transition ${sheetOpen ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}>📍 목록 {nearbyList.length}</button>
        )}

        {register && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">장소 등록</span>
              <button onClick={cancelRegister} className="text-gray-400 text-sm">취소</button>
            </div>
            <form onSubmit={searchForRegister} className="flex gap-2">
              <input value={regQuery} onChange={(e) => setRegQuery(e.target.value)} placeholder="이름·주소로 검색" className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <button className="bg-blue-600 text-white rounded-lg px-3 text-sm">검색</button>
            </form>
            {regResults.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto flex flex-col gap-1">
                {regResults.map((r, i) => (
                  <li key={i}>
                    <button onClick={() => pickSearchResult(r)} className="w-full text-left border border-gray-100 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      <div className="text-[11px] text-gray-400 truncate">{r.address}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-gray-400 mt-2">검색이 안 되면 지도를 직접 클릭해 위치를 찍어도 돼요.</p>
          </div>
        )}

        {register && regPos && (
          <form onSubmit={saveRegister} className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-80 bg-white text-gray-900 rounded-2xl shadow-xl p-4 flex flex-col gap-2">
            <h2 className="font-bold">새 장소 등록</h2>
            <input value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} placeholder="장소 이름" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
              카테고리: <b className="text-gray-800">{guessCategory(regForm.name)}</b>
              <span className="text-[11px] text-gray-400"> · 이름 기반 자동 분류</span>
            </div>
            <input value={regForm.address} onChange={(e) => setRegForm({ ...regForm, address: e.target.value })} placeholder="주소" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={regForm.description} onChange={(e) => setRegForm({ ...regForm, description: e.target.value })} placeholder="한줄 소개" rows={2} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">등록</button>
              <button type="button" onClick={cancelRegister} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">취소</button>
            </div>
          </form>
        )}

        {selected && !register && !sheetOpen && (
          <PlaceCard
            place={selected} stats={stats} photos={photos}
            onClose={() => setSelected(null)}
            onSave={openSave}
            onDetail={() => router.push(`/place/${selected.id}`)}
            onDirections={() => openDirections(selected)}
          />
        )}

        {reportTarget && <ReportModal place={reportTarget} user={user} onClose={() => setReportTarget(null)} />}
      </div>

      {sheetOpen && nearbyList.length > 0 && (
        <NearbySheet
          places={nearbyList} photos={nearbyPhotos} label={searchCenter?.label}
          onPick={pickNearby}
          onClose={() => { setSheetOpen(false); setSearchCenter(null) }}
        />
      )}

      {saveTarget && (
        <SavePlaceModal
          place={saveTarget} userId={user.id}
          onClose={() => setSaveTarget(null)}
          onSaved={() => loadFolders(user.id)}
        />
      )}
    </div>
  )
}