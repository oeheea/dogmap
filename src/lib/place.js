import { supabase } from './supabase'

// 카카오 가게를 우리 DB에 확보하고 (없으면 새로 저장) 그 행을 돌려줌
export async function ensurePlace(p) {
  // 이미 저장된 가게면 그대로 사용
  const { data: existing } = await supabase
    .from('places').select('*').eq('kakao_id', p.kakaoId).maybeSingle()
  if (existing) return existing

  // 없으면 새로 등록 (카테고리는 지금 보고 있던 큰 분류로 자동 지정)
  const { data, error } = await supabase.from('places').insert({
    kakao_id: p.kakaoId,
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    category: p.category,
    kakao_category: p.kakaoCategory,
  }).select().single()
  if (error) throw error
  return data
}