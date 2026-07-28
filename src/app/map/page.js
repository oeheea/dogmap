'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ensurePlace } from '@/lib/place'

const CATEGORIES = [
  { label: '반려동물 동반 카페', keyword: '애견동반 카페' },
  { label: '반려동물 동반 밥집', keyword: '애견동반 식당' },
  { label: '반려동물 동반 펜션', keyword: '애견동반 펜션' },
]

export default function MapPage() {
  const router = useRouter()
  const mapRef = useRef(null)
  const mapObjRef = useRef(null)
  const markersRef = useRef([])
  const folderMarkersRef = useRef({})
  const restoredRef = useRef(false)

  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [activeCat, setActiveCat] = useState(null)
  const [selected, setSelected] = useState(null)     // 카카오 검색 결과 카드
  const [dbSelected, setDbSelected] = useState(null) // 폴더 핀 클릭 카드

  const [folders, setFolders] = useState([])
  const [folderOn, setFolderOn] = useState({})

  const [showSave, setShowSave] = useState(false)
  const [saveFolders, setSaveFolders] = useState([])
  const [newFolder, setNewFolder] = useState('')
  const [newPublic, setNewPublic] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadFolders(data.user.id)
    })
    const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    function initMap() {
      window.kakao.maps.load(() => {
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(37.5445, 127.0), level: 6,
        })
        mapObjRef.current = map
        setReady(true)
      })
    }
    if (window.kakao && window.kakao.maps) { initMap(); return }
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`
    script.async = true
    script.onload = initMap
    document.head.appendChild(script)
  }, [])

  async function loadFolders(uid) {
    const { data } = await supabase.from('folders').select('*, saved_places(count)').eq('user_id', uid).order('created_at')
    setFolders(data ?? [])
  }

  // 지도+폴더 준비되면 저장해둔 토글 복원
  useEffect(() => {
    if (restoredRef.current) return
    if (!ready || folders.length === 0) return
    restoredRef.current = true
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem('folderOn') || '{}') } catch {}
    setFolderOn(saved)
    folders.forEach((f) => { if (saved[f.id]) showFolderMarkers(f) })
  }, [ready, folders])

  function makeFolderOverlay(p, folder) {
    const el = document.createElement('div')
    el.style.cssText = 'cursor:pointer;'
    el.innerHTML = `<div style="width:34px;height:34px;border-radius:50%;background:${folder.color || '#3b82f6'};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:17px;">${folder.icon || '📍'}</div>`
    const overlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(p.lat, p.lng), content: el, xAnchor: 0.5, yAnchor: 0.5,
    })
    el.addEventListener('click', () => { setSelected(null); setDbSelected(p) })
    return overlay
  }

  async function showFolderMarkers(folder) {
    const { data } = await supabase.from('saved_places').select('places(*)').eq('folder_id', folder.id)
    const overlays = (data ?? []).filter((d) => d.places).map((d) => makeFolderOverlay(d.places, folder))
    overlays.forEach((o) => o.setMap(mapObjRef.current))
    folderMarkersRef.current[folder.id] = overlays
  }
  function hideFolderMarkers(id) {
    const ms = folderMarkersRef.current[id] ?? []
    ms.forEach((o) => o.setMap(null))
    folderMarkersRef.current[id] = []
  }

  function toggleFolder(folder) {
    const on = !folderOn[folder.id]
    const next = { ...folderOn, [folder.id]: on }
    setFolderOn(next)
    localStorage.setItem('folderOn', JSON.stringify(next))
    if (on) showFolderMarkers(folder)
    else hideFolderMarkers(folder.id)
  }

  function clearMarkers() { markersRef.current.forEach((m) => m.setMap(null)); markersRef.current = [] }

  async function browseCategory(cat) {
    setActiveCat(cat.label); setSelected(null); setDbSelected(null)
    const map = mapObjRef.current
    const center = map.getCenter()
    const res = await fetch(`/api/search?query=${encodeURIComponent(cat.keyword)}&x=${center.getLng()}&y=${center.getLat()}`)
    const { places } = await res.json()
    clearMarkers()
    places.forEach((p) => {
      const marker = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(p.lat, p.lng), map })
      window.kakao.maps.event.addListener(marker, 'click', () => { setDbSelected(null); setSelected({ ...p, category: cat.label }) })
      markersRef.current.push(marker)
    })
  }

  async function openSave() {
    if (!user) { alert('로그인이 필요해요'); return }
    const { data } = await supabase.from('folders').select('*').eq('user_id', user.id).order('created_at')
    setSaveFolders(data ?? [])
    setShowSave(true)
  }
  async function createFolder() {
    if (!newFolder.trim()) return
    const { data, error } = await supabase.from('folders').insert({ user_id: user.id, name: newFolder, is_public: newPublic }).select().single()
    if (error) { alert(error.message); return }
    setSaveFolders([...saveFolders, data]); setNewFolder(''); setNewPublic(false); loadFolders(user.id)
  }
  async function saveToFolder(folderId) {
    try {
      const place = await ensurePlace(selected)
      const { error } = await supabase.from('saved_places').insert({ folder_id: folderId, place_id: place.id })
      if (error) throw error
      alert('저장했어요! 🐾'); setShowSave(false); loadFolders(user.id)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }
  async function goReview() {
    if (!user) { alert('로그인이 필요해요'); return }
    try { const place = await ensurePlace(selected); router.push(`/place/${place.id}`) } catch (e) { alert('오류: ' + e.message) }
  }

  return (
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 border-r bg-white text-gray-900 p-4 overflow-y-auto">
        <h1 className="font-bold text-lg mb-2">🐾 멍냥플레이스</h1>
        <a href="/my" className="block text-sm text-blue-600">⭐ 내 폴더 관리</a>
        <a href="/browse" className="block text-sm text-blue-600 mb-3">🔎 카테고리 둘러보기</a>

        <p className="text-xs text-gray-500 mb-1 mt-2">카테고리 둘러보기</p>
        <ul className="flex flex-col gap-1 mb-4">
          {CATEGORIES.map((cat) => (
            <li key={cat.label}>
              <button onClick={() => browseCategory(cat)}
                className={`w-full text-left rounded px-3 py-2 text-sm ${activeCat === cat.label ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
                {cat.label}
              </button>
            </li>
          ))}
        </ul>

        {user && (
          <>
            <p className="text-xs text-gray-500 mb-1">내 폴더 지도표시</p>
            <ul className="flex flex-col gap-2">
              {folders.length === 0 && <li className="text-xs text-gray-400">저장한 폴더가 없어요</li>}
              {folders.map((f) => (
                <li key={f.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs"
                      style={{ backgroundColor: f.color || '#3b82f6' }}>{f.icon || '📍'}</span>
                    <div className="min-w-0">
                      <div className="text-sm truncate">{f.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {f.is_public ? '🌐 공개' : '🔒 비공개'} · {f.saved_places?.[0]?.count ?? 0}개
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toggleFolder(f)}
                    className={`w-10 h-6 rounded-full shrink-0 relative transition ${folderOn[f.id] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${folderOn[f.id] ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      <div className="relative flex-1">
        <div ref={mapRef} className="w-full h-full" />

        {selected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-80 bg-white text-gray-900 rounded-xl shadow-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-base">{selected.name}</div>
                <div className="text-xs text-gray-700">{selected.address}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-sm">✕</button>
            </div>
            <div className="mt-2 inline-block text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{selected.category}</div>
            {selected.phone && <div className="text-xs text-gray-500 mt-1">☎ {selected.phone}</div>}
            <div className="flex gap-2 mt-3">
              <button onClick={openSave} className="flex-1 border rounded px-3 py-2 text-sm hover:bg-gray-50">⭐ 저장</button>
              <button onClick={goReview} className="flex-1 border rounded px-3 py-2 text-sm hover:bg-gray-50">✍ 후기</button>
            </div>
          </div>
        )}

        {dbSelected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-80 bg-white text-gray-900 rounded-xl shadow-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-base">{dbSelected.name}</div>
                <div className="text-xs text-gray-700">{dbSelected.address}</div>
              </div>
              <button onClick={() => setDbSelected(null)} className="text-gray-400 text-sm">✕</button>
            </div>
            <button onClick={() => router.push(`/place/${dbSelected.id}`)}
              className="w-full mt-3 bg-blue-600 text-white rounded px-3 py-2 text-sm">상세보기 →</button>
          </div>
        )}

        {showSave && (
          <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center" onClick={() => setShowSave(false)}>
            <div className="w-80 bg-white text-gray-900 rounded-xl p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold">폴더에 저장</h2>
                <button onClick={() => setShowSave(false)} className="text-gray-400">✕</button>
              </div>
              <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto mb-3">
                {saveFolders.length === 0 && <li className="text-xs text-gray-500">아직 폴더가 없어요. 아래에서 만들어보세요.</li>}
                {saveFolders.map((f) => (
                  <li key={f.id} className="flex justify-between items-center border rounded px-3 py-2">
                    <span className="text-sm">{f.icon || '📍'} {f.name} {f.is_public ? '🌐' : '🔒'}</span>
                    <button onClick={() => saveToFolder(f.id)} className="text-xs bg-blue-600 text-white rounded px-2 py-1">담기</button>
                  </li>
                ))}
              </ul>
              <div className="border-t pt-3 flex flex-col gap-2">
                <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="새 폴더 이름" className="border rounded px-2 py-1 bg-white text-gray-900" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newPublic} onChange={(e) => setNewPublic(e.target.checked)} />
                  다른 사람에게 공개 (체크 안 하면 나만 보기)
                </label>
                <button onClick={createFolder} className="bg-gray-800 text-white rounded px-3 py-2 text-sm">+ 폴더 만들기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}