export const CATEGORIES = [
  { value: '애견카페', label: '애견카페', icon: '🐶', bg: 'bg-orange-50' },
  { value: '반려동물 동반 카페', label: '반려동물 동반 카페', icon: '☕', bg: 'bg-amber-50' },
  { value: '반려동물 동반 밥집', label: '반려동물 동반 밥집', icon: '🍽️', bg: 'bg-rose-50' },
  { value: '반려동물 동반 펜션', label: '반려동물 동반 펜션', icon: '🏡', bg: 'bg-emerald-50' },
  { value: '공원', label: '공원', icon: '🌳', bg: 'bg-green-50' },
  { value: '백화점·쇼핑몰', label: '백화점·쇼핑몰', icon: '🛍️', bg: 'bg-violet-50' },
  { value: '기타', label: '기타', icon: '📍', bg: 'bg-gray-100' },
]

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value)

export function guessCategory(name) {
  const n = (name || '').replace(/\s/g, '')
  if (/애견카페|강아지카페|댕댕이카페|도그카페|퍼피카페/.test(n)) return '애견카페'
  if (/공원|수목원|둘레길|호수공원|근린공원/.test(n)) return '공원'
  if (/백화점|쇼핑몰|아울렛|아웃렛|스타필드/.test(n)) return '백화점·쇼핑몰'
  if (/펜션|풀빌라|글램핑|캠핑|스테이|리조트|호텔|민박|게스트하우스/.test(n)) return '반려동물 동반 펜션'
  if (/카페|커피|coffee|베이커리|디저트|브런치|로스터리|티하우스/i.test(n)) return '반려동물 동반 카페'
  if (/식당|밥집|맛집|국밥|고깃집|고기|치킨|피자|파스타|레스토랑|분식|횟집|삼겹|중국집|일식|한식|양식|포차|술집|bar|펍/i.test(n)) return '반려동물 동반 밥집'
  return '기타'
}

export function catTile(cat) {
  const c = cat || ''
  if (c.includes('애견카페')) return { icon: '🐶', cls: 'bg-orange-50' }
  if (c.includes('공원')) return { icon: '🌳', cls: 'bg-green-50' }
  if (c.includes('백화점') || c.includes('쇼핑')) return { icon: '🛍️', cls: 'bg-violet-50' }
  if (c.includes('펜션') || c.includes('호텔')) return { icon: '🏡', cls: 'bg-emerald-50' }
  if (c.includes('밥집') || c.includes('식당')) return { icon: '🍽️', cls: 'bg-rose-50' }
  if (c.includes('카페')) return { icon: '☕', cls: 'bg-amber-50' }
  return { icon: '📍', cls: 'bg-gray-100' }
}