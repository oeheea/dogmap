'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['반려동물 동반 카페', '반려동물 동반 밥집', '반려동물 동반 펜션', '기타']

export default function MapPage() {
  const router = useRouter()
  const mapRef = useRef(null)
  const mapObjRef = useRef(null)
  const placeMarkersRef = useRef([])
  const folderMarkersRef = useRef({})
  const tempMarkerRef = useRef(null)
  const registerRef = useRef(false)

  const [user, setUser] = useState(null)
  const [allPlaces, setAllPlaces] = useState([])
  const [activeCat, setActiveCat] = useState('전체')
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)

  const [folders, setFolders] = useState([])
  const [folderOn, setFolderOn] = useState({})

  const [showSave, setShowSave] = useState(false)
  const [saveFolders, setSaveFolders] = useState([])
  const [newFolder, setNewFolder] = useState('')
  const [newPublic, setNewPublic] = useState(false)

  const [register, setRegister] = useState(false)
  const [regPos, setRegPos] = useState(null)
  const [regForm, setRegForm] = useState({ name: '', category: CATEGORIES[0], address: '', description: '' })

  useEffect(() => { registerRef.current = register }, [register])

  function coloredPin(color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="36" viewBox="0 0 26 36"><path d="M13 0C6 0 0 5.8 0 13c0 9.6 13 23 13 23s13-13.4 13-23C26 5.8 20 0 13 0z" fill="${color}"/><circle cx="13" cy="13" r="5.5" fill="white"/></svg>`
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
    return new window.kakao.maps.MarkerImage(url, new window.kakao.maps.Size(26, 36))
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) loadFolders(data.user.id) })
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
    allPlaces.filter((p) => activeCat === '전체' || p.category === activeCat).forEach((p) => {
      const marker = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(p.lat, p.lng), map })
      window.kakao.maps.event.addListener(marker, 'click', () => selectPlace(p))
      placeMarkersRef.current.push(marker)
    })
  }, [allPlaces, activeCat])

  async function loadFolders(uid) {
    const { data } = await supabase.from('folders').select('*, saved_places(count)').eq('user_id', uid).order('created_at')
    setFolders(data ?? [])
  }

  async function selectPlace(p) {
    setSelected(p); setStats(null)
    const { data: revs } = await supabase.from('reviews').select('rating').eq('place_id', p.id)
    const count = revs?.length ?? 0
    const avg = count ? (revs.reduce((s, r) => s + r.rating, 0) / count).toFixed(1) : null
    setStats({ avg, count })
  }

  function toggleFolder(folder) {
    const on = !folderOn[folder.id]
    setFolderOn((prev) => ({ ...prev, [folder.id]: on }))
    if (on) {
      supabase.from('saved_places').select('places(*)').eq('folder_id', folder.id).then(({ data }) => {
        const image = coloredPin(folder.color || '#3b82f6')
        const markers = (data ?? []).filter((d) => d.places).map((d) => {
          const p = d.places
          const marker = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(p.lat, p.lng), map: mapObjRef.current, image })
          window.kakao.maps.event.addListener(marker, 'click', () => selectPlace(p))
          return marker
        })
        folderMarkersRef.current[folder.id] = markers
      })
    } else {
      const ms = folderMarkersRef.current[folder.id] ?? []
      ms.forEach((m) => m.setMap(null))
      folderMarkersRef.current[folder.id] = []
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
    const { error } = await supabase.from('saved_places').insert({ folder_id: folderId, place_id: selected.id })
    if (error) { alert('저장 실패: ' + error.message); return }
    alert('저장했어요! 🐾'); setShowSave(false); loadFolders(user.id)
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
    if (tempMarkerRef.current) { tempMarkerRef.current.setMap(null); tempMarkerRef.current = null }
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <aside className="w-60 shrink-0 border-r bg-white text-gray-900 p-4 overflow-y-auto">
        <p className="text-xs text-gray-500 mb-1">카테고리</p>
        <ul className="flex flex-col gap-1 mb-4">
          {['전체', ...CATEGORIES].map((c) => (
            <li key={c}>
              <button onClick={() => setActiveCat(c)} className={`w-full text-left rounded px-3 py-2 text-sm ${activeCat === c ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>{c}</button>
            </li>
          ))}
        </ul>

        {user && (
          <button onClick={() => { setSelected(null); setRegister(true) }} className="w-full mb-4 bg-blue-600 text-white rounded-lg py-2 text-sm">＋ 장소 등록</button>
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
          </>
        )}
      </aside>

      <div className="relative flex-1">
        <div ref={mapRef} className="w-full h-full" />

        {register && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-black/80 text-white text-sm rounded-full px-4 py-2">
            지도를 클릭해 위치를 선택하세요 <button onClick={cancelRegister} className="ml-2 underline">취소</button>
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