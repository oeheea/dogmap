'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ensurePlace } from '@/lib/place'
import Loading from '@/components/Loading'
import { formatAddress } from '@/lib/format'

const CATEGORIES = ['반려동물 동반 카페', '반려동물 동반 밥집', '반려동물 동반 펜션', '기타']
const TAG_OPTIONS = ['강아지 음료 O', '대형견 가능', '자유 산책 가능', '마당 있음', '실내 동반 가능', '매장 강아지 있음', '반려동물 전용 메뉴', '무게 제한 있음']

export default function BrowsePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState('전체')
  const [places, setPlaces] = useState([])

  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [addCat, setAddCat] = useState(CATEGORIES[0])

  async function load() {
    let q = supabase.from('places').select('*').eq('hidden', false).order('created_at', { ascending: false })
    if (active !== '전체') q = q.contains('tags', [active])
    const { data } = await q
    setPlaces(data ?? [])
    setLoading(false)
  }

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)) }, [])
  useEffect(() => { load() }, [active])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    async function addPlace(p) {
    const { error } = await supabase.from('places').insert({
      name: p.name, category: addCat, address: p.address, lat: p.lat, lng: p.lng,
    })
    if (error) { alert('추가 실패: ' + error.message); return }
    alert('추가했어요! 세부 태그는 가게 상세에서 달 수 있어요 🐾')
    setShowAdd(false); setQuery(''); setResults([]); setActive('전체')
  }
  }
  async function addPlace(p) {
    try {
      await ensurePlace({ ...p, category: addCat })
      alert('추가했어요! 세부 태그는 가게 상세에서 달 수 있어요 🐾')
      setShowAdd(false); setQuery(''); setResults([]); setActive('전체')
    } catch (e) { alert('추가 실패: ' + e.message) }
  }
  async function reportPlace(id) {
    if (!user) { alert('로그인이 필요해요'); return }
    if (!confirm('이 가게를 신고할까요? 서로 다른 여러 명이 신고하면 목록에서 자동으로 숨겨져요.')) return
    const { error } = await supabase.from('reports').insert({ place_id: id, user_id: user.id })
    if (error) {
      if (error.code === '23505') { alert('이미 신고한 가게예요.'); return }
      alert('신고 실패: ' + error.message); return
    }
    alert('신고했어요. 검토 후 조치돼요 🐾')
    load()
  }

  if (loading) return <Loading />

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-3">둘러보기</h1>
      
      {/* 태그 필터 (가로 스크롤) */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {['전체', ...TAG_OPTIONS].map((t) => (
          <button key={t} onClick={() => setActive(t)}
            className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${
              active === t ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>{t === '전체' ? '전체' : `#${t}`}</button>
        ))}
      </div>

      {user && (
        <Link href="/map"
          className="block text-center w-full mb-4 bg-white border border-dashed border-blue-300 rounded-xl py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition">
          ＋ 지도에서 장소 추가
        </Link>
      )}

      {places.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-12">이 태그에 해당하는 가게가 아직 없어요.</div>
      )}

      <ul className="flex flex-col gap-3">
        {places.map((p) => (
          <li key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
            <div className="flex justify-between items-start gap-2">
              <Link href={`/place/${p.id}`} className="flex-1 min-w-0">
                <div className="font-bold text-[15px] truncate">{p.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{formatAddress(p.address)}</div>
                <span className="inline-block mt-2 text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5">{p.category}</span>
                {(p.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.tags.map((t) => (
                      <span key={t} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">#{t}</span>
                    ))}
                  </div>
                )}
              </Link>
              {user && (
                <button onClick={() => reportPlace(p.id)} className="text-gray-300 hover:text-red-500 text-sm shrink-0" title="신고">🚩</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* 가게 추가 모달 */}
      {showAdd && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">가게 추가</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-lg">✕</button>
            </div>
            <select value={addCat} onChange={(e) => setAddCat(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 mb-2 text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="가게 이름 검색" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm" />
              <button className="bg-blue-600 text-white rounded-lg px-4 text-sm">검색</button>
            </form>
            <ul className="max-h-56 overflow-y-auto flex flex-col gap-1.5">
              {results.map((r, i) => (
                <li key={i}>
                  <button onClick={() => addPlace(r)}
                    className="w-full text-left border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50">
                    <div className="font-semibold text-sm">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.address}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}