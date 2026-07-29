import { NextResponse } from 'next/server'

export async function POST(request) {
  const { image } = await request.json()
  if (!image) return NextResponse.json({ advice: '' })
  const key = process.env.GEMINI_API_KEY
  const prompt = '너는 반려동물 사진 구도를 도와주는 친근한 코치야. 이 카메라 화면을 보고 "지금 이대로 찍으면" 어떤지 + 더 예쁘게 찍는 법을 한국어로 2~3문장, 아주 구체적으로 알려줘 (피사체 위치·카메라 높이/각도·여백·배경 정리 등). 반려동물이 안 보이면 어디에 두면 좋을지 알려줘. 딱딱하지 않게, 다정하게.'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: image } }] }],
    }),
  })
  const j = await res.json()
  const advice = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? ('조언 실패: ' + (j?.error?.message ?? '알 수 없음'))
  return NextResponse.json({ advice })
}