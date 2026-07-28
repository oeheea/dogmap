import { NextResponse } from 'next/server'

const UA = 'MyeongnyangPlace/1.0 (contact: oe7eea7@gmail.com)'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ address: '' })

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`,
    { headers: { 'User-Agent': UA } }
  )
  const d = await res.json()
  return NextResponse.json({ address: d.display_name ?? '' })
}