'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ensurePlace } from '@/lib/place'

const CATEGORIES = ['반려동물 동반 카페', '반려동물 동반 밥집', '반려동물 동반 펜션', '기타']
const TAG_OPTIONS = ['강아지 음료 O', '대형견 가능', '실내 운동장', '마당 있음', '동반석 별도', '캐리어 필요', '자유 산책 가능', '리드줄 필수']

export default function BrowsePage() {
  const [user, setUser] = useState(null)
  const [active, setActive] = useState('전체')   // 선택된 태그
  const [places, setPlaces] = useState([])

  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [addCat, setAddCat] = useState(CATEGORIES[0])

  async function load() {
    let q = supabase.from('places').select('*').eq('hidden', false).order('created_at', { ascending: false })
    if (active !== '전체') q = q.contains('tags', [active])   // 그 태그를 가진 가게만
    const { data } = await q
    setPlaces(data ?? [])
  }

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)) }, [])
  useEffect(() => { load() }, [active])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data.places)
  }

  async function addPlace(p) {
    try {
      await ensurePlace({ ...p, category: addCat })
      alert('추가했어요! 세부 태그는 가게 상세에서 달 수 있어요 🐾')
      setShowAdd(false); setQuery(''); setResults([])
      setActive('전체')
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

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold">둘러보기</h1>
        <Link href="/map" className="text-sm text-gray-500">지도 →</Link>
      </div>

      {/* 태그 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['전체', ...TAG_OPTIONS].map((t) => (
          <button key={t} onClick={() => setActive(t)}
            className={`text-xs rounded-full px-3 py-1 border ${
              active === t ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600'
            }`}>{t === '전체' ? '전체' : `#${t}`}</button>
        ))}
      </div>

      {user && (
        <button onClick={() => setShowAdd(true)}
          className="w-full mb-4 border-2 border-dashed rounded-lg py-2 text-sm text-blue-600">
          ＋ 가게 직접 추가
        </button>
      )}

      {places.length === 0 && <p className="text-gray-500 text-sm">이 태그에 해당하는 가게가 아직 없어요.</p>}

      <ul className="flex flex-col gap-2">
        {places.map((p) => (
          <li key={p.id} className="border rounded-lg p-3 flex justify-between items-start">
            <Link href={`/place/${p.id}`} className="flex-1">
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-gray-500">{p.address}</div>
              <div className="text-xs text-blue-700 mt-1">{p.category}</div>
              {(p.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.tags.map((t) => (
                    <span key={t} className="text-[11px] bg-gray-100 text-gray-700 rounded-full px-2">#{t}</span>
                  ))}
                </div>
              )}
            </Link>
            {user && (
              <button onClick={() => reportPlace(p.id)} className="text-xs text-red-500 ml-2">🚩 신고</button>
            )}
          </li>
        ))}
      </ul>

      {/* 가게 추가 모달 */}
      {showAdd && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-sm bg-white text-gray-900 rounded-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold">가게 추가</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400">✕</button>
            </div>
            <select value={addCat} onChange={(e) => setAddCat(e.target.value)}
              className="w-full border rounded px-2 py-1 bg-white text-gray-900 mb-2">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <form onSubmit={handleSearch} className="flex gap-2 mb-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="가게 이름 검색" className="flex-1 border rounded px-2 py-1 bg-white text-gray-900" />
              <button className="bg-blue-600 text-white rounded px-3">검색</button>
            </form>
            <ul className="max-h-52 overflow-y-auto flex flex-col gap-1">
              {results.map((r, i) => (
                <li key={i}>
                  <button onClick={() => addPlace(r)}
                    className="w-full text-left border rounded px-2 py-1 hover:bg-gray-100">
                    <div className="font-semibold text-sm">{r.name}</div>
                    <div className="text-xs text-gray-700">{r.address}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  )
}