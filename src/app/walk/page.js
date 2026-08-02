'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { shapeSvg } from '@/lib/shapes'
import Loading from '@/components/Loading'
import Link from 'next/link'

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
function fmtDist(m) { return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(2)}km` }
function fmtTime(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}` }

function computeStats(rows) {
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // 월=0
  const weekStart = new Date(now); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(now.getDate() - day)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const labels = ['일', '월', '화', '수', '목', '금', '토']
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(now.getDate() - i)
    days.push({ date: d, dist: 0, label: labels[d.getDay()] })
  }
  let weekCount = 0, weekDist = 0, weekDur = 0, monthCount = 0, monthDist = 0, totalDist = 0, totalCount = 0
  for (const w of rows) {
    const c = new Date(w.created_at)
    const dist = w.distance || 0
    totalDist += dist; totalCount++
    if (c >= weekStart) { weekCount++; weekDist += dist; weekDur += (w.duration_sec || 0) }
    if (c >= monthStart) { monthCount++; monthDist += dist }
    for (const b of days) {
      const next = new Date(b.date); next.setDate(b.date.getDate() + 1)
      if (c >= b.date && c < next) { b.dist += dist; break }
    }
  }
  return { weekCount, weekDist, weekDur, monthCount, monthDist, totalDist, totalCount, days }
}

export default function WalkPage() {
  const mapRef = useRef(null)
  const mapObjRef = useRef(null)
  const pathRef = useRef([])
  const polylineRef = useRef(null)
  const pawsRef = useRef([])
  const distRef = useRef(0)
  const lastPawRef = useRef(null)
  const watchRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(0)
  const pawRef = useRef(null)
  const pawCountRef = useRef(0)

  const [user, setUser] = useState(null)
  const [paw, setPaw] = useState(null)
  const [tracking, setTracking] = useState(false)
  const [distance, setDistance] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [walks, setWalks] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { pawRef.current = paw }, [paw])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        loadWalks(data.user.id)
        loadStats(data.user.id)
        const { data: pr } = await supabase.from('profiles').select('paw_stamp_url, paw_color').eq('id', data.user.id).single()
        if (pr) setPaw({ url: pr.paw_stamp_url || null, color: pr.paw_color || '#2563eb' })
      }
      setLoading(false)
    })
    const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    function initMap() {
      window.kakao.maps.load(() => {
        const map = new window.kakao.maps.Map(mapRef.current, { center: new window.kakao.maps.LatLng(37.5445, 127.0), level: 3 })
        mapObjRef.current = map
        setTimeout(() => map.relayout(), 300)
        navigator.geolocation?.getCurrentPosition((pos) => {
          map.setCenter(new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude))
        })
      })
    }
    if (window.kakao && window.kakao.maps) { initMap() }
    else {
      const s = document.createElement('script')
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`
      s.async = true; s.onload = initMap; document.head.appendChild(s)
    }
    return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function loadWalks(uid) {
    const { data } = await supabase.from('walks').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20)
    setWalks(data ?? [])
  }
  async function loadStats(uid) {
    const { data } = await supabase.from('walks').select('distance, duration_sec, created_at').eq('user_id', uid)
    setStats(computeStats(data ?? []))
  }

  function dropPaw(point) {
    const p = pawRef.current
    if (p?.url) {
      const img = new window.kakao.maps.MarkerImage(p.url, new window.kakao.maps.Size(40, 40))
      const m = new window.kakao.maps.Marker({ position: point, image: img })
      m.setMap(mapObjRef.current)
      pawsRef.current.push(m)
    } else {
      const el = document.createElement('div')
      el.innerHTML = shapeSvg('paw', p?.color || '#2563eb', 22)
      const ov = new window.kakao.maps.CustomOverlay({ position: point, content: el, xAnchor: 0.5, yAnchor: 0.5 })
      ov.setMap(mapObjRef.current)
      pawsRef.current.push(ov)
    }
  }

  function onPos(pos) {
    const { latitude: lat, longitude: lng } = pos.coords
    const point = new window.kakao.maps.LatLng(lat, lng)
    const prev = pathRef.current[pathRef.current.length - 1]
    pathRef.current.push(point)
    if (polylineRef.current) polylineRef.current.setPath(pathRef.current)
    if (prev) { distRef.current += haversine(prev.getLat(), prev.getLng(), lat, lng); setDistance(distRef.current) }
    if (!lastPawRef.current || haversine(lastPawRef.current.getLat(), lastPawRef.current.getLng(), lat, lng) >= 15) {
      dropPaw(point)
      lastPawRef.current = point
    }
    mapObjRef.current.setCenter(point)
  }

  function startWalk() {
    if (!user) { alert('로그인이 필요해요'); return }
    if (!navigator.geolocation) { alert('이 브라우저는 위치를 지원하지 않아요'); return }
    pathRef.current = []; distRef.current = 0; lastPawRef.current = null; pawCountRef.current = 0
    setDistance(0); setElapsed(0)
    pawsRef.current.forEach((o) => o.setMap(null)); pawsRef.current = []
    if (polylineRef.current) polylineRef.current.setMap(null)
    polylineRef.current = new window.kakao.maps.Polyline({ strokeWeight: 5, strokeColor: pawRef.current?.color || '#2563eb', strokeOpacity: 0.85 })
    polylineRef.current.setMap(mapObjRef.current)
    setTracking(true)
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000)
    watchRef.current = navigator.geolocation.watchPosition(onPos, (e) => alert('위치 오류: ' + e.message), { enableHighAccuracy: true, maximumAge: 1000 })
  }

  async function stopWalk() {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    setTracking(false)
    const dur = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const path = pathRef.current.map((p) => [p.getLat(), p.getLng()])
    if (user && path.length > 1) {
      await supabase.from('walks').insert({ user_id: user.id, path, distance: Math.round(distRef.current), duration_sec: dur })
      loadWalks(user.id); loadStats(user.id)
      alert(`산책 완료! ${fmtDist(distRef.current)} · ${fmtTime(dur)} 🐾`)
    } else {
      alert('기록된 경로가 없어요 (야외에서 이동하며 해보세요)')
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="relative">
        <div ref={mapRef} className="w-full h-[58vh]" />
        {tracking && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white rounded-2xl shadow-lg px-6 py-2 flex gap-8">
            <div className="text-center"><div className="text-lg font-extrabold">{fmtDist(distance)}</div><div className="text-[11px] text-gray-400">거리</div></div>
            <div className="text-center"><div className="text-lg font-extrabold">{fmtTime(elapsed)}</div><div className="text-[11px] text-gray-400">시간</div></div>
          </div>
        )}
      </div>

      <div className="p-4">
        {!user ? (
          <p className="text-sm text-gray-400 text-center">로그인 후 산책을 기록할 수 있어요.</p>
        ) : !tracking ? (
          <button onClick={startWalk} className="w-full bg-blue-600 text-white rounded-full py-3.5 font-bold">🐾 산책 시작</button>
        ) : (
          <button onClick={stopWalk} className="w-full bg-red-500 text-white rounded-full py-3.5 font-bold">■ 산책 종료</button>
        )}

        {!tracking && stats && stats.totalCount > 0 && (
          <div className="mt-6">
            <h2 className="font-bold mb-2">산책 통계</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-extrabold">{stats.weekCount}</div><div className="text-[11px] text-gray-400">이번 주 횟수</div></div>
                <div><div className="text-lg font-extrabold">{fmtDist(stats.weekDist)}</div><div className="text-[11px] text-gray-400">이번 주 거리</div></div>
                <div><div className="text-lg font-extrabold">{fmtTime(stats.weekDur)}</div><div className="text-[11px] text-gray-400">이번 주 시간</div></div>
              </div>
              <div className="flex items-end justify-between gap-1.5 mt-4" style={{ height: '92px' }}>
                {stats.days.map((d, i) => {
                  const max = Math.max(...stats.days.map((x) => x.dist), 1)
                  const h = d.dist > 0 ? Math.max(6, Math.round((d.dist / max) * 72)) : 3
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                      <div className="w-full rounded-t" style={{ height: h + 'px', background: d.dist > 0 ? (paw?.color || '#2563eb') : '#e5e7eb' }} />
                      <div className="text-[10px] text-gray-400">{d.label}</div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
                <span>이번 달 {stats.monthCount}번 · {fmtDist(stats.monthDist)}</span>
                <span>누적 {fmtDist(stats.totalDist)}</span>
              </div>
            </div>
          </div>
        )}

        {!tracking && walks.length > 0 && (
          <>
            <h2 className="font-bold mt-6 mb-2">지난 산책</h2>
            <ul className="flex flex-col gap-2">
              {walks.map((w) => (
                <li key={w.id}>
                  <Link href={`/walk/${w.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-between items-center hover:shadow-md transition">
                    <div>
                      <div className="font-bold text-sm">{fmtDist(w.distance)} · {fmtTime(w.duration_sec)}</div>
                      <div className="text-[11px] text-gray-400">{new Date(w.created_at).toLocaleString('ko-KR')}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}