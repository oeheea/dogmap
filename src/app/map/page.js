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

  const [user, setUser] = useState(null)
  const [activeCat, setActiveCat] = useState(null)
  const [selected, setSelected] = useState(null)

  // 저장 모달 상태
  const [showSave, setShowSave] = useState(false)
  const [folders, setFolders] = useState([])
  const [newFolder, setNewFolder] = useState('')
  const [newPublic, setNewPublic] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    function initMap() {
      window.kakao.maps.load(() => {
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(37.5445, 127.0),
          level: 6,
        })
        mapObjRef.current = map
      })
    }
    if (window.kakao && window.kakao.maps) { initMap(); return }
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`
    script.async = true
    script.onload = initMap
    document.head.appendChild(script)
  }, [])

  function clearMarkers() {
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
  }

  async function browseCategory(cat) {
    setActiveCat(cat.label)
    setSelected(null)
    const map = mapObjRef.current
    const center = map.getCenter()
    const res = await fetch(
      `/api/search?query=${encodeURIComponent(cat.keyword)}&x=${center.getLng()}&y=${center.getLat()}`
    )
    const { places } = await res.json()
    clearMarkers()
    places.forEach((p) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(p.lat, p.lng), map,
      })
      window.kakao.maps.event.addListener(marker, 'click', () => {
        setSelected({ ...p, category: cat.label })
      })
      markersRef.current.push(marker)
    })
  }

  // 저장 모달 열기 → 내 폴더 목록 불러오기
  async function openSave() {
    if (!user) { alert('로그인이 필요해요'); return }
    const { data } = await supabase.from('folders').select('*')
      .eq('user_id', user.id).order('created_at')
    setFolders(data ?? [])
    setShowSave(true)
  }

  async function createFolder() {
    if (!newFolder.trim()) return
    const { data, error } = await supabase.from('folders')
      .insert({ user_id: user.id, name: newFolder, is_public: newPublic })
      .select().single()
    if (error) { alert(error.message); return }
    setFolders([...folders, data])
    setNewFolder(''); setNewPublic(false)
  }

  async function saveToFolder(folderId) {
    try {
      const place = await ensurePlace(selected)   // 가게 DB에 확보
      const { error } = await supabase.from('saved_places')
        .insert({ folder_id: folderId, place_id: place.id })
      if (error) throw error
      alert('저장했어요! 🐾')
      setShowSave(false)
    } catch (e) {
      alert('저장 실패: ' + e.message)
    }
  }

  // 후기: 가게 확보한 뒤 상세 페이지로 이동
  async function goReview() {
    if (!user) { alert('로그인이 필요해요'); return }
    try {
      const place = await ensurePlace(selected)
      router.push(`/place/${place.id}`)
    } catch (e) {
      alert('오류: ' + e.message)
    }
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 shrink-0 border-r bg-white text-gray-900 p-4 overflow-y-auto">
        <h1 className="font-bold text-lg mb-3">🐾 멍냥플레이스</h1>
        <p className="text-xs text-gray-500 mb-2">카테고리를 눌러 둘러보세요</p>
        <a href="/my" className="block text-sm text-blue-600 mb-3">⭐ 내 폴더 보기</a>
        <a href="/browse" className="block text-sm text-blue-600 mb-3">🔎 카테고리 둘러보기</a>
        <ul className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <li key={cat.label}>
              <button onClick={() => browseCategory(cat)}
                className={`w-full text-left rounded px-3 py-2 text-sm ${
                  activeCat === cat.label ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}>
                {cat.label}
              </button>
            </li>
          ))}
        </ul>
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
            <div className="mt-2 inline-block text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
              {selected.category}
            </div>
            {selected.phone && <div className="text-xs text-gray-500 mt-1">☎ {selected.phone}</div>}
            <div className="flex gap-2 mt-3">
              <button onClick={openSave} className="flex-1 border rounded px-3 py-2 text-sm hover:bg-gray-50">⭐ 저장</button>
              <button onClick={goReview} className="flex-1 border rounded px-3 py-2 text-sm hover:bg-gray-50">✍ 후기</button>
            </div>
          </div>
        )}

        {/* 저장 모달 */}
        {showSave && (
          <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center"
            onClick={() => setShowSave(false)}>
            <div className="w-80 bg-white text-gray-900 rounded-xl p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold">폴더에 저장</h2>
                <button onClick={() => setShowSave(false)} className="text-gray-400">✕</button>
              </div>

              <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto mb-3">
                {folders.length === 0 && (
                  <li className="text-xs text-gray-500">아직 폴더가 없어요. 아래에서 만들어보세요.</li>
                )}
                {folders.map((f) => (
                  <li key={f.id} className="flex justify-between items-center border rounded px-3 py-2">
                    <span className="text-sm">{f.name} {f.is_public ? '🌐' : '🔒'}</span>
                    <button onClick={() => saveToFolder(f.id)}
                      className="text-xs bg-blue-600 text-white rounded px-2 py-1">담기</button>
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
                <button onClick={createFolder}
                  className="bg-gray-800 text-white rounded px-3 py-2 text-sm">+ 폴더 만들기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}