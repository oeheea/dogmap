import Link from 'next/link'

export const metadata = { title: '이용 가이드 · 멍냥플레이스' }

const SECTIONS = [
  { icon: '🗺️', title: '장소 찾기 & 저장', lines: [
    '지도와 둘러보기에서 반려동물 동반 가능한 카페·밥집·펜션·애견카페를 찾아요.',
    '마음에 드는 곳은 ⭐ 저장 → 나만의 폴더로 정리할 수 있어요.',
    '폴더를 공개로 만들면 다른 사람이 구독해서 볼 수도 있어요.',
  ] },
  { icon: '✍️', title: '후기 & 특징', lines: [
    '가게 상세에서 별점과 후기를 남겨요 (한 곳에 하나).',
    '후기 쓸 때 "이 곳의 특징"(마당 있음, 대형견 가능 등)을 체크해요.',
    '방문한 사람들이 고른 특징이 "방문자가 확인한 특징 · N명"으로 모여서, 실제 방문 기반이라 믿을 만해요.',
  ] },
  { icon: '🏷️', title: '카테고리가 틀렸다면', lines: [
    '카테고리(카페/밥집/펜션 등)가 잘못돼 있으면 🚩 신고 → "카테고리가 틀려요"를 골라요.',
    '올바른 카테고리를 골라 요청하면 접수돼요.',
    '서로 다른 여러 명이 같은 의견을 내면 자동으로 바뀌어요 (혼자서는 못 바꿔요).',
  ] },
  { icon: '🚩', title: '신고 & 자동 숨김', lines: [
    '폐업·동반 불가·스팸·중복인 곳을 신고해주세요.',
    '단순히 마음에 안 든다고 신고하면 안 돼요.',
    '서로 다른 여러 명이 신고하면 목록에서 자동으로 숨겨지고, 관리자가 검토해요.',
  ] },
  { icon: '🐾', title: '산책 기록', lines: [
    '산책 탭에서 시작하면 GPS로 경로를 발바닥으로 기록해요.',
    '내 프로필에 반려동물 발바닥 사진을 등록하면 경로에 그 발바닥이 콕콕 찍혀요.',
    '거리·시간이 저장되고 지난 산책을 다시 볼 수 있어요.',
  ] },
  { icon: '📸', title: '모먼트', lines: [
    '반려동물 사진을 올려 공유하는 공간이에요.',
    '사진 찍을 때 실시간 구도 가이드가 예쁜 위치를 잡아줘요.',
    '좋아요·댓글로 다른 집사들과 소통해요.',
  ] },
]

export default function GuidePage() {
  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href="/me" className="text-sm text-gray-400">← 마이</Link>
      <h1 className="text-2xl font-extrabold mt-2 mb-1">이용 가이드 🐾</h1>
      <p className="text-sm text-gray-500 mb-4">멍냥플레이스를 200% 활용하는 법이에요.</p>
      <div className="flex flex-col gap-3">
        {SECTIONS.map((s) => (
          <section key={s.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-bold text-base flex items-center gap-2 mb-2"><span>{s.icon}</span>{s.title}</h2>
            <ul className="flex flex-col gap-1.5">
              {s.lines.map((l, i) => (
                <li key={i} className="text-sm text-gray-600 leading-relaxed flex gap-2">
                  <span className="text-blue-500 shrink-0">·</span><span>{l}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-5 text-center">
        <Link href="/map" className="inline-block bg-blue-600 text-white rounded-full px-6 py-2.5 text-sm font-medium">지도로 시작하기 →</Link>
      </div>
      <p className="text-[11px] text-gray-400 text-center mt-6">공공데이터: 한국문화정보원 「전국 반려동물 동반 가능 문화시설」 (공공누리)</p>
    </div>
  )
}