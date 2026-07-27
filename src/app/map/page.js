'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function MapPage() {
  const mapRef = useRef(null)

  useEffect(() => {
    const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY

    function initMap() {
      window.kakao.maps.load(async () => {
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(37.5445, 127.0), // 서울 중심쯤
          level: 8,
        })

        // DB에서 장소 불러오기
        const { data: places, error } = await supabase.from('places').select('*')
        if (error) { console.error(error); return }

        // 장소마다 마커 찍기
        places.forEach((place) => {
          const position = new window.kakao.maps.LatLng(place.lat, place.lng)
          const marker = new window.kakao.maps.Marker({ position, map })

          // 마커 클릭하면 뜨는 말풍선
          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:13px;">
              <strong>${place.name}</strong><br/>${place.category ?? ''}
            </div>`,
          })
          window.kakao.maps.event.addListener(marker, 'click', () => {
            infowindow.open(map, marker)
          })
        })
      })
    }

    if (window.kakao && window.kakao.maps) {
      initMap()
      return
    }
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`
    script.async = true
    script.onload = initMap
    document.head.appendChild(script)
  }, [])

  return (
    <div className="w-full h-screen">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}