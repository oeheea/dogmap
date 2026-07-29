'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatAddress } from '@/lib/format'
import ShapeIcon from '@/components/ShapeIcon'
import { SHAPES, shapeSvg } from '@/lib/shapes'
import ReportModal from '@/components/ReportModal'

const CATEGORIES = ['애견카페', '반려동물 동반 카페', '반려동물 동반 밥집', '반려동물 동반 펜션', '기타']
const TAG_OPTIONS = ['반려동물 전용 메뉴O', '대형견 가능', '이동가방 필수', '마당 있음', '자유 산책 가능', '실내 동반 가능', '실외에만 가능', '무게 제한 있음']
const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const ICONS = ['📍', '⭐', '❤️', '🐶', '🐾', '☕', '🍽️', '🌳', '🏠', '🔥']

function catTile(cat) {
  const c = cat || ''
  if (c.includes('애견카페')) return { icon: '🐶', cls: 'bg-orange-50' }
  if (c.includes('카페')) return { icon: '☕', cls: 'bg-orange-50' }
  if (c.includes('밥집') || c.includes('식당')) return { icon: '🍽️', cls: 'bg-amber-50' }
  if (c.includes('펜션') || c.includes('호텔')) return { icon: '🏡', cls: 'bg-green-50' }
  return { icon: '📍', cls: 'bg-gray-100' }
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

  const [folders, setFolders] = useState([])
  const [folderOn, setFolderOn] = useState({})
  const [mapReady, setMapReady] = useState(false)
  const [subFolders, setSubFolders] = useState([])
  const [hiddenIds, setHiddenIds] = useState(new Set())

  const [showSave, setShowSave] = useState(false)
  const [saveFolders, setSaveFolders] = useState([])
  const [newFolder, setNewFolder] = useState('')
  const [newPublic, setNewPublic] = useState(false)
  const [newIcon, setNewIcon] = useState('star')
  const [saveColor, setSaveColor] = useState('#3b82f6')
  const [saveStep, setSaveStep] = useState('select')
  const [chosenFolder, setChosenFolder] = useState(null)
  const [svLabel, setSvLabel] = useState('')
  const [svNote, setSvNote] = useState('')
  const [svColor, setSvColor] = useState('#3b82f6')
  const [newDesc, setNewDesc] = useState('')

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

  async function openSave() {
    if (!user) { alert('로그인이 필요해요'); return }
    const { data } = await supabase.from('folders').select('*, saved_places(count)').eq('user_id', user.id).order('created_at')
    setSaveFolders(data ?? []); setSaveStep('select'); setShowSave(true)
  }
  async function createFolder() {
    if (!newFolder.trim()) { alert('그룹 이름을 입력해주세요'); return }
    const { error } = await supabase.from('folders').insert({ user_id: user.id, name: newFolder, is_public: newPublic, icon: newIcon, description: newDesc })
    if (error) { alert(error.message); return }
    setNewFolder(''); setNewPublic(false); setNewIcon('star'); setNewDesc('')
    const { data } = await supabase.from('folders').select('*, saved_places(count)').eq('user_id', user.id).order('created_at')
    setSaveFolders(data ?? []); loadFolders(user.id); setSaveStep('select')
  }
  function chooseFolder(f) {
    setChosenFolder(f); setSvLabel(selected.name); setSvNote(''); setSvColor('#3b82f6'); setSaveStep('detail')
  }
  async function confirmSave() {
    const { error } = await supabase.from('saved_places').insert({
      folder_id: chosenFolder.id, place_id: selected.id, label: svLabel, note: svNote, color: svColor,
    })
    if (error) { alert('저장 실패: ' + error.message); return }
    setShowSave(false); loadFolders(user.id); alert('저장했어요! 🐾')
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
    <div className="flex h-[calc(100vh-56px)] relative -mb-20">
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

        <p className="text-xs text-gray-500 mb-1">특징</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {TAG_OPTIONS.map((t) => (
            <button key={t} onClick={() => setActiveTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
              className={`text-xs rounded-full px-2.5 py-1 border ${activeTags.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              #{t}
            </button>
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
          <form onSubmit={saveRegister} className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-80 bg-white text-gray-900 rounded-2xl shadow-xl p-4 flex flex-col gap-2">
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
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-80 max-w-[90vw] bg-white text-gray-900 rounded-2xl shadow-xl p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="flex gap-3 min-w-0">
                <span className={`w-12 h-12 rounded-2xl ${catTile(selected.category).cls} flex items-center justify-center text-xl shrink-0`}>{catTile(selected.category).icon}</span>
                <div className="min-w-0">
                  <div className="font-bold text-base truncate">{selected.name}</div>
                  <div className="text-xs text-gray-500 truncate">{formatAddress(selected.address)}</div>
                  <div className="mt-1 text-xs">
                    {stats?.count > 0
                      ? <span className="text-amber-500 font-semibold">★ {stats.avg} <span className="text-gray-400 font-normal">· 후기 {stats.count}</span></span>
                      : <span className="text-gray-400">아직 후기가 없어요</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-lg leading-none shrink-0">✕</button>
            </div>

            <div className="flex flex-wrap gap-1 mt-2 items-center">
              <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{selected.category}</span>
              {(selected.tags ?? []).slice(0, 3).map((t) => <span key={t} className="text-[11px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">{t}</span>)}
              {(selected.tags ?? []).length > 3 && <span className="text-[11px] text-gray-400">+{selected.tags.length - 3}</span>}
            </div>

            {photos.length > 0 && (
              <div className="flex gap-1 mt-2 overflow-x-auto">
                {photos.map((u, i) => <img key={i} src={u} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />)}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={openSave} className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium">⭐ 저장</button>
              <button onClick={() => router.push(`/place/${selected.id}`)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">상세·후기</button>
            </div>
          </div>
        )}

        {reportTarget && <ReportModal place={reportTarget} user={user} onClose={() => setReportTarget(null)} />}
        {showSave && (
          <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowSave(false)}>
            <div className="w-full max-w-sm bg-white text-gray-900 rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

              {saveStep === 'select' && (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-lg">그룹 선택</h2>
                    <button onClick={() => setShowSave(false)} className="text-gray-400 text-lg">✕</button>
                  </div>
                  <button onClick={() => setSaveStep('create')} className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-3 mb-2 text-blue-600 font-medium">
                    <span className="w-9 h-9 rounded-lg border border-blue-200 flex items-center justify-center text-lg">＋</span>
                    새 그룹 추가
                  </button>
                  <ul className="flex flex-col gap-1">
                    {saveFolders.map((f) => (
                      <li key={f.id}>
                        <button onClick={() => chooseFolder(f)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 text-left">
                          <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center"><ShapeIcon shape={f.icon} size={18} /></span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-sm truncate">{f.name}</span>
                            <span className="block text-[11px] text-gray-400">개수 {f.saved_places?.[0]?.count ?? 0} · {f.is_public ? '🌐 공개' : '🔒 비공개'}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {saveStep === 'create' && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setSaveStep('select')} className="text-gray-400 text-sm">← 뒤로</button>
                    <h2 className="font-bold text-lg">새 그룹 추가</h2>
                    <button onClick={() => setShowSave(false)} className="text-gray-400 text-lg">✕</button>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">공개 허용</span>
                    <div className="flex bg-gray-100 rounded-full p-1">
                      <button onClick={() => setNewPublic(true)} className={`px-4 py-1.5 rounded-full text-sm ${newPublic ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>공개</button>
                      <button onClick={() => setNewPublic(false)} className={`px-4 py-1.5 rounded-full text-sm ${!newPublic ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>🔒 비공개</button>
                    </div>
                  </div>
                  <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="그룹 이름" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2" />
                  <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="설명 (선택)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4" />
                  <p className="font-semibold text-sm mb-2">모양 선택</p>
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {SHAPES.map((s) => (
                      <button key={s} type="button" onClick={() => setNewIcon(s)} className={`h-11 rounded-xl flex items-center justify-center ${newIcon === s ? 'bg-blue-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <ShapeIcon shape={s} color={newIcon === s ? '#ffffff' : '#2563eb'} size={20} />
                      </button>
                    ))}
                  </div>
                  <button onClick={createFolder} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold">완료</button>
                </>
              )}

              {saveStep === 'detail' && chosenFolder && (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <button onClick={() => setSaveStep('select')} className="text-gray-400 text-sm">← 뒤로</button>
                    <h2 className="font-bold text-lg">즐겨찾기 저장</h2>
                    <button onClick={() => setShowSave(false)} className="text-gray-400 text-lg">✕</button>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1"><ShapeIcon shape={chosenFolder.icon} size={14} /> {chosenFolder.name} 에 저장</p>
                  <input value={svLabel} onChange={(e) => setSvLabel(e.target.value)} placeholder="장소 이름" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2" />
                  <input value={svNote} onChange={(e) => setSvNote(e.target.value)} placeholder="설명 (선택)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4" />
                  <p className="text-xs text-gray-500 mb-1">핀 색상</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {COLORS.map((c) => (
                      <button key={c} onClick={() => setSvColor(c)} className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: c, borderColor: svColor === c ? '#111' : 'transparent' }} />
                    ))}
                  </div>
                  <button onClick={confirmSave} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold">완료</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}