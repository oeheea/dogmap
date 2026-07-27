import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const x = searchParams.get('x')  // 지도 중심 경도(lng)
  const y = searchParams.get('y')  // 지도 중심 위도(lat)
  if (!query) return NextResponse.json({ places: [] })

  let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15`
  if (x && y) url += `&x=${x}&y=${y}&radius=20000&sort=distance`  // 근처 20km 우선

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}` },
  })
  const data = await res.json()

  const places = (data.documents ?? []).map((d) => ({
    kakaoId: d.id,
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    kakaoCategory: d.category_name,
    phone: d.phone,
    placeUrl: d.place_url,
    lat: parseFloat(d.y),
    lng: parseFloat(d.x),
  }))
  return NextResponse.json({ places })
}