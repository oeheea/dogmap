'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['반려동물 동반 카페', '반려동물 동반 밥집', '반려동물 동반 펜션', '기타']
const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function MapPage() {
  const router = useRouter()
  const mapRef = useRef(null)
  const mapObjRef = useRef(null)
  const placeMarkersRef = useRef([])
  const folderMarkersRef = useRef({})
  const folderPlaceIdsRef = useRef({})
  const tempMarkerRef = useRef(null)
  const registerRef = useRef(false)

  const [user, setUser] = useState(null)
  const [allPlaces, setAllPlaces] = useState([])
  const [activeCat, setActiveCat] = useState('전체')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)

  const [folders, setFolders] = useState([])
  const [folderOn, setFolderOn] = useState({})
  const [subFolders, setSubFolders] = useState([])
  const [hiddenIds, setHiddenIds] = useState(new Set())

  const [showSave, setShowSave] = useState(false)
  const [saveFolders, setSaveFolders] = useState([])
  const [newFolder, setNewFolder] = useState('')
  const [newPublic, setNewPublic] = useState(false)
  const [saveColor, setSaveColor] = useState('#3b82f6')

  const [register, setRegister] = useState(false)
  const [regPos, setRegPos] = useState(null)
  const [regForm, setRegForm] = useState({ name: '', category: CATEGORIES[0], address: '', description: '' })
  const [regQuery, setRegQuery] = useState('')
  const [regResults, setRegResults] = useState([])

  useEffect(() => { registerRef.current = register }, [register])

  function coloredPin(color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="36" viewBox="0 0 26 36"><path d="M13 0C6 0 0 5.8 0 13c0 9.6 13 23 13 23s13-13.4 13-23C26 5.8 20 0 13 0z" fill="${color}"/><circle cx="13" cy="13" r="5.5" fill="white"/></svg>`
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
    return new window.kakao.maps.MarkerImage(url, new window.kakao.maps.Size(26, 36))
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) { loadFolders(data.user.id); loadSubs(data.user.id) } })
    const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    function initMap() {
      window.kakao.maps.load(async () => {
        const map = new window.kakao.maps.Map(mapRef.current, { center: new window.kakao.maps.LatLng(37.5445, 127.0), level: 6 })
        mapObjRef.current = map
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
            setRegForm((f) => ({ ...f, address: d.address ?? '' }))
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
    allPlaces.filter((p) => (activeCat === '전체' || p.category === activeCat) && !hiddenIds.has(p.id)).forEach((p) => {
      const marker = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(p.lat, p.lng), map })
      window.kakao.maps.event.addListener(marker, 'click', () => selectPlace(p))
      placeMarkersRef.current.push(marker)
    })
  }, [allPlaces, activeCat, hiddenIds])

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

  async function selectPlace(p) {
    setSelected(p); setStats(null)
    const { data: revs } = await supabase.from('reviews').select('rating').eq('place_id', p.id)
    const count = revs?.length ?? 0
    const avg = count ? (revs.reduce((s, r) => s + r.rating, 0) / count).toFixed(1) : null
    setStats({ avg, count })
  }

  function circleHtml(color, icon) {
    return `<div style="width:32px;height:32px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 1px 4px rgba(0,0,0,.4)">${icon}</div>`
  }

  function recomputeHidden() {
    const s = new Set()
    Object.values(folderPlaceIdsRef.current).forEach((ids) => ids.forEach((id) => s.add(id)))
    setHiddenIds(s)
  }

  function toggleFolder(folder) {
    const on = !folderOn[folder.id]
    setFolderOn((prev) => ({ ...prev, [folder.id]: on }))
    if (on) {
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
    } else {
      const ms = folderMarkersRef.current[folder.id] ?? []
      ms.forEach((o) => o.setMap(null))
      folderMarkersRef.current[folder.id] = []
      delete folderPlaceIdsRef.current[folder.id]
      recomputeHidden()
    }
  }

  async function openSave() {
    if (!user) { alert('로그인이 필요해요'); return }
    const { data } = await supabase.from('folders').select('*').eq('user_id', user.id).order('created_at')
    setSaveFolders(data ?? []); setShowSave(true)
  }
  async function createFolder() {
    if (!newFolder.trim()) return
    const { data, error } = await supabase.from('folders').insert({ user_id: user.id, name: newFolder, is_public: newPublic }).select().single()
    if (error) { alert(error.message); return }
    setSaveFolders([...saveFolders, data]); setNewFolder(''); setNewPublic(false); loadFolders(user.id)
  }
  async function saveToFolder(folderId) {
    const { error } = await supabase.from('saved_places').insert({ folder_id: folderId, place_id: selected.id, color: saveColor })
    if (error) { alert('저장 실패: ' + error.message); return }
    alert('저장했어요! 🐾'); setShowSave(false); loadFolders(user.id)
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
    setRegForm((f) => ({ ...f, name: r.name || f.name, address: r.address || f.address }))
    setRegResults([])
  }

  async function saveRegister(e) {
    e.preventDefault()
    if (!regPos) { alert('지도를 클릭해 위치를 먼저 선택해주세요'); return }
    const { data, error } = await supabase.from('places').insert({
      name: regForm.name, category: regForm.category, address: regForm.address,
      description: regForm.description, lat: regPos.lat, lng: regPos.lng,
    }).select().single()
    if (error) { alert('등록 실패: ' + error.message); return }
    setAllPlaces((prev) => [...prev, data]); cancelRegister(); alert('장소가 등록되었어요! 🐾')
  }
  function cancelRegister() {
    setRegister(false); setRegPos(null); setRegForm({ name: '', category: CATEGORIES[0], address: '', description: '' })
    setRegQuery(''); setRegResults([])
    if (tempMarkerRef.current) { tempMarkerRef.current.setMap(null); tempMarkerRef.current = null }
  }

  return (
    <div className="flex h-[calc(100vh-56px)] relative">
      {sidebarOpen && <div className="sm:hidden absolute inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />}
      <aside className={`w-64 sm:w-60 shrink-0 border-r bg-white text-gray-900 p-4 overflow-y-auto absolute sm:static inset-y-0 left-0 z-40 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0`}>
        <button onClick={() => setSidebarOpen(false)} className="sm:hidden absolute top-2 right-2 text-gray-400 text-lg">✕</button>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 장소 이름 검색"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 bg-white" />
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
            {allPlaces.filter((p) => p.name.includes(query)).length === 0 && (
              <li className="text-xs text-gray-400 px-1">결과 없음</li>
            )}
          </ul>
        )}
        <p className="text-xs text-gray-500 mb-1">카테고리</p>
        <ul className="flex flex-col gap-1 mb-4">
          {['전체', ...CATEGORIES].map((c) => (
            <li key={c}>
              <button onClick={() => { setActiveCat(c); setSidebarOpen(false) }} className={`w-full text-left rounded px-3 py-2 text-sm ${activeCat === c ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>{c}</button>
            </li>
          ))}
        </ul>

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
                    <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs" style={{ backgroundColor: f.color || '#3b82f6' }}>{f.icon || '📍'}</span>
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
                        <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs bg-gray-100">{f.icon || '📍'}</span>
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
        <button onClick={() => setSidebarOpen(true)} className="sm:hidden absolute top-3 left-3 z-20 bg-white shadow rounded-full w-10 h-10 flex items-center justify-center text-lg">☰</button>

        {register && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">장소 등록</span>
              <button onClick={cancelRegister} className="text-gray-400 text-sm">취소</button>
            </div>
            <form onSubmit={searchForRegister} className="flex gap-2">
              <input value={regQuery} onChange={(e) => setRegQuery(e.target.value)} placeholder="이름·주소로 검색"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
          <form onSubmit={saveRegister} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-80 bg-white text-gray-900 rounded-2xl shadow-xl p-4 flex flex-col gap-2">
            <h2 className="font-bold">새 장소 등록</h2>
            <input value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} placeholder="장소 이름" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <select value={regForm.category} onChange={(e) => setRegForm({ ...regForm, category: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={regForm.address} onChange={(e) => setRegForm({ ...regForm, address: e.target.value })} placeholder="주소" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={regForm.description} onChange={(e) => setRegForm({ ...regForm, description: e.target.value })} placeholder="한줄 소개" rows={2} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">등록</button>
              <button type="button" onClick={cancelRegister} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">취소</button>
            </div>
          </form>
        )}

        {selected && !register && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-80 bg-white text-gray-900 rounded-2xl shadow-xl p-4">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <div className="font-bold text-base truncate">{selected.name}</div>
                <div className="text-xs text-gray-500 truncate">{selected.address}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-lg leading-none">✕</button>
            </div>
            <div className="mt-1.5 text-sm">
              {stats?.count > 0 ? <span className="text-amber-500 font-semibold">★ {stats.avg} <span className="text-gray-400 font-normal">· 후기 {stats.count}</span></span> : <span className="text-gray-400 text-xs">아직 후기가 없어요</span>}
            </div>
            <span className="inline-block mt-1.5 text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{selected.category}</span>
            <div className="flex gap-2 mt-3">
              <button onClick={openSave} className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium">⭐ 저장</button>
              <button onClick={() => router.push(`/place/${selected.id}`)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">상세·후기</button>
            </div>
          </div>
        )}

        {showSave && (
          <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center" onClick={() => setShowSave(false)}>
            <div className="w-80 bg-white text-gray-900 rounded-xl p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold">폴더에 저장</h2>
                <button onClick={() => setShowSave(false)} className="text-gray-400">✕</button>
              </div>
              <p className="text-xs text-gray-500 mb-1">핀 색상</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setSaveColor(c)} className="w-7 h-7 rounded-full border-2"
                    style={{ backgroundColor: c, borderColor: saveColor === c ? '#111' : 'transparent' }} />
                ))}
              </div>
              <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto mb-3">
                {saveFolders.length === 0 && <li className="text-xs text-gray-500">아직 폴더가 없어요.</li>}
                {saveFolders.map((f) => (
                  <li key={f.id} className="flex justify-between items-center border rounded px-3 py-2">
                    <span className="text-sm">{f.icon || '📍'} {f.name} {f.is_public ? '🌐' : '🔒'}</span>
                    <button onClick={() => saveToFolder(f.id)} className="text-xs bg-blue-600 text-white rounded px-2 py-1">담기</button>
                  </li>
                ))}
              </ul>
              <div className="border-t pt-3 flex flex-col gap-2">
                <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="새 폴더 이름" className="border rounded px-2 py-1 bg-white text-gray-900" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newPublic} onChange={(e) => setNewPublic(e.target.checked)} /> 공개</label>
                <button onClick={createFolder} className="bg-gray-800 text-white rounded px-3 py-2 text-sm">+ 폴더 만들기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}