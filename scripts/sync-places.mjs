import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// .env.local 읽기
const env = {}
try {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  })
} catch {}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const DATA_KEY = env.PUBLIC_DATA_KEY
if (!URL || !KEY || !DATA_KEY) { console.error('❌ .env.local에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PUBLIC_DATA_KEY 확인'); process.exit(1) }

const supa = createClient(URL, KEY)
const ENDPOINT = 'https://api.odcloud.kr/api/15111389/v1/uddi:41944402-8249-4e45-9e9d-a52d0a7db1cc'
const CAT = { '카페': '반려동물 동반 카페', '식당': '반려동물 동반 밥집', '펜션': '반려동물 동반 펜션', '호텔': '반려동물 동반 펜션', '여행지': '기타', '박물관': '기타', '미술관': '기타', '문예회관': '기타' }
const n = (s) => (s ?? '').toString().trim()
const okcoord = (la, ln) => la > 33 && la < 39 && ln > 124 && ln < 132
function tags(r) {
  const t = []; const size = n(r['입장 가능 동물 크기']); const low = size.toLowerCase()
  const restr = n(r['반려동물 제한사항']); const jeon = n(r['반려동물 전용 정보'])
  const indoor = n(r['장소(실내) 여부']) === 'Y'; const outdoor = n(r['장소(실외)여부']) === 'Y'
  if (jeon === '반려동물 전용') t.push('반려동물 전용 메뉴O')
  if (size.includes('모두') || size.includes('대형')) t.push('대형견 가능')
  if ((low.includes('kg') || size.includes('소형') || size.includes('중형')) && !size.includes('모두')) t.push('무게 제한 있음')
  if (['케이지', '캐리어', '이동가방', '이동장', '안고'].some((k) => restr.includes(k))) t.push('이동가방 필수')
  if (indoor) t.push('실내 동반 가능')
  if (outdoor) t.push('마당 있음')
  if (restr.includes('야외만') || restr.includes('실외만') || (outdoor && !indoor)) t.push('실외에만 가능')
  return [...new Set(t)]
}

async function run() {
  let page = 1; const perPage = 1000; let all = []
  while (true) {
    const url = `${ENDPOINT}?page=${page}&perPage=${perPage}&serviceKey=${encodeURIComponent(DATA_KEY)}&returnType=JSON`
    const res = await fetch(url)
    const j = await res.json()
    const data = j.data || []
    all = all.concat(data)
    process.stdout.write(`\r불러오는 중... ${all.length}/${j.totalCount || '?'}`)
    if (data.length < perPage) break
    page++
  }
  console.log('\n원본:', all.length)
  const seen = new Set(); const rows = []
  for (const r of all) {
    if (n(r['반려동물 동반 가능정보']) !== 'Y') continue
    const c3 = n(r['카테고리3']); if (!CAT[c3]) continue
    const la = parseFloat(r['위도']); const ln = parseFloat(r['경도'])
    if (!okcoord(la, ln)) continue
    const name = n(r['시설명'])
    const source_id = `kci:${name}|${la.toFixed(6)}|${ln.toFixed(6)}`
    if (seen.has(source_id)) continue; seen.add(source_id)
    let desc = n(r['기본 정보_장소설명']); if (['정보없음', '없음', '해당없음'].includes(desc)) desc = ''
    const dogCafe = ['애견카페', '강아지카페', '도그카페', '댕댕이카페'].some((k) => name.replace(/\s/g, '').includes(k))
    const category = dogCafe ? '애견카페' : CAT[c3]
    rows.push({ name, category, address: n(r['도로명주소']) || n(r['지번주소']), lat: +la.toFixed(6), lng: +ln.toFixed(6), description: desc.slice(0, 200), tags: tags(r), source_id })
  }
  console.log('필터 후:', rows.length)
  let done = 0
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { error } = await supa.from('places').upsert(chunk, { onConflict: 'source_id' })
    if (error) { console.error('\n❌ 저장 오류:', error.message); process.exit(1) }
    done += chunk.length
    process.stdout.write(`\r저장 중... ${done}/${rows.length}`)
  }
  console.log(`\n✅ 완료! ${rows.length}곳 동기화 🐾`)
}
run()