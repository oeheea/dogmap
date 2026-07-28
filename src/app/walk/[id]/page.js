'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { shapeSvg } from '@/lib/shapes'
import Loading from '@/components/Loading'

function fmtDist(m) { return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(2)}km` }
function fmtTime(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}` }

export default function WalkDetail() {
  const { id } = useParams()
  const mapRef = useRef(null)
  const [walk, setWalk] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('walks').select('*').eq('id', id).single().then(({ data }) => {
      setWalk(data); setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (!walk || !walk.path || walk.path.length === 0) return
    const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    function draw() {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(walk.path[0][0], walk.path[0][1]), level: 3,
        })
        setTimeout(() => map.relayout(), 300)
        const pts = walk.path.map(([la, ln]) => new window.kakao.maps.LatLng(la, ln))
        new window.kakao.maps.Polyline({ path: pts, strokeWeight: 5, strokeColor: '#2563eb', strokeOpacity: 0.85 }).setMap(map)
        const step = Math.max(1, Math.floor(pts.length / 40))
        pts.forEach((p, i) => {
          if (i % step !== 0 && i !== pts.length - 1) return
          const el = document.createElement('div')
          el.innerHTML = shapeSvg('paw', '#2563eb', 20)
          new window.kakao.maps.CustomOverlay({ position: p, content: el, xAnchor: 0.5, yAnchor: 0.5 }).setMap(map)
        })
        const bounds = new window.kakao.maps.LatLngBounds()
        pts.forEach((p) => bounds.extend(p))
        map.setBounds(bounds)
      })
    }
    if (window.kakao && window.kakao.maps) draw()
    else {
      const s = document.createElement('script')
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`
      s.async = true; s.onload = draw; document.head.appendChild(s)
    }
  }, [walk])

  if (loading) return <Loading />
  if (!walk) return <div className="max-w-lg mx-auto p-6 text-center text-gray-500">기록을 찾을 수 없어요.</div>

  return (
    <div className="max-w-lg mx-auto">
      <div className="p-4 pb-0"><Link href="/walk" className="text-sm text-gray-400">← 산책</Link></div>
      <div ref={mapRef} className="w-full h-[55vh] mt-2" />
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-around text-center">
          <div><div className="text-xl font-extrabold">{fmtDist(walk.distance)}</div><div className="text-xs text-gray-400">거리</div></div>
          <div><div className="text-xl font-extrabold">{fmtTime(walk.duration_sec)}</div><div className="text-xs text-gray-400">시간</div></div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">{new Date(walk.created_at).toLocaleString('ko-KR')}</p>
      </div>
    </div>
  )
}