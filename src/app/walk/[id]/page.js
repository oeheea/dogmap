'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { shapeSvg } from '@/lib/shapes'
import Loading from '@/components/Loading'
import { useParams, useRouter } from 'next/navigation'
import { fmtDist, fmtTime } from '@/lib/format'

export default function WalkDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const mapRef = useRef(null)
  const [walk, setWalk] = useState(null)
  const [paw, setPaw] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let go = true
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (go) setMe(u.user)
      const { data: w } = await supabase.from('walks').select('*').eq('id', id).single()
      if (!go) return
      setWalk(w); setLoading(false)
      if (w?.user_id) {
        const { data: pr } = await supabase.from('profiles').select('paw_stamp_url, paw_color').eq('id', w.user_id).single()
        if (go && pr) setPaw({ url: pr.paw_stamp_url || null, color: pr.paw_color || '#2563eb' })
      }
    })()
    return () => { go = false }
  }, [id])

  useEffect(() => {
    if (!walk || !walk.path || walk.path.length === 0) return
    let cancelled = false
    const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    const theme = paw?.color || '#2563eb'

    async function prepAndDraw() {
      const stampUrl = paw?.url || null
      if (cancelled) return
      window.kakao.maps.load(() => {
        if (!mapRef.current || cancelled) return
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(walk.path[0][0], walk.path[0][1]), level: 3,
        })
        setTimeout(() => map.relayout(), 300)
        const pts = walk.path.map(([la, ln]) => new window.kakao.maps.LatLng(la, ln))
        new window.kakao.maps.Polyline({ path: pts, strokeWeight: 5, strokeColor: theme, strokeOpacity: 0.85 }).setMap(map)

        const step = Math.max(1, Math.floor(pts.length / 40))
        let drawn = 0
        pts.forEach((p, i) => {
          if (i % step !== 0 && i !== pts.length - 1) return
          if (stampUrl) {
            const img = new window.kakao.maps.MarkerImage(stampUrl, new window.kakao.maps.Size(40, 40))
            new window.kakao.maps.Marker({ position: p, image: img }).setMap(map)
          } else {
            const el = document.createElement('div')
            el.innerHTML = shapeSvg('paw', theme, 20)
            new window.kakao.maps.CustomOverlay({ position: p, content: el, xAnchor: 0.5, yAnchor: 0.5 }).setMap(map)
          }
        })
        const bounds = new window.kakao.maps.LatLngBounds()
        pts.forEach((p) => bounds.extend(p))
        map.setBounds(bounds)
      })
    }

    if (window.kakao && window.kakao.maps) prepAndDraw()
    else {
      const s = document.createElement('script')
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`
      s.async = true; s.onload = prepAndDraw; document.head.appendChild(s)
    }
    return () => { cancelled = true }
  }, [walk, paw])

  async function deleteWalk() {
    const { error } = await supabase.from('walks').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    router.push('/walk')
  }

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
        {me && me.id === walk.user_id && (
          <button onClick={() => setConfirming(true)} className="w-full mt-4 border border-gray-200 text-red-500 rounded-xl py-2.5 text-sm hover:bg-red-50">이 산책 기록 삭제</button>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[1100] bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirming(false)}>
          <div className="w-full max-w-xs bg-white rounded-2xl p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-2xl mb-1">🐾</div>
            <p className="font-semibold">이 산책 기록을 삭제할까요?</p>
            <p className="text-xs text-gray-400 mt-1">삭제하면 되돌릴 수 없어요.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirming(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm">취소</button>
              <button onClick={deleteWalk} className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}