import { NextResponse } from 'next/server'

const UA = 'MyeongnyangPlace/1.0 (contact: oe7eea7@gmail.com)'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (lat && lon) {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`, { headers: { 'User-Agent': UA } })
    const d = await res.json()
    return NextResponse.json({ address: d.display_name ?? '' })
  }
  if (q) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&countrycodes=kr&accept-language=ko`, { headers: { 'User-Agent': UA } })
    const arr = await res.json()
    const places = (arr ?? []).map((d) => ({
      name: d.name || (d.display_name ?? '').split(',')[0],
      address: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }))
    return NextResponse.json({ places })
  }
  return NextResponse.json({ places: [] })
}