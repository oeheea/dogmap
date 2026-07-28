'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'
import { formatAddress } from '@/lib/format'

const TAG_OPTIONS = ['반려동물 전용 메뉴O', '대형견 가능', '이동가방 필수', '마당 있음', '자유 산책 가능', '실내 동반 가능', '실외에만 가능', '무게 제한 있음']

export default function BrowsePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTags, setActiveTags] = useState([])
  const [places, setPlaces] = useState([])

  async function load() {
    let q = supabase.from('places').select('*').eq('hidden', false).order('created_at', { ascending: false })
    if (activeTags.length > 0) q = q.contains('tags', activeTags)
    const { data } = await q
    setPlaces(data ?? [])
    setLoading(false)
  }

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)) }, [])
  useEffect(() => { load() }, [activeTags])

  function toggleTag(t) {
    setActiveTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
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

      <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-1 px-1">
        <button onClick={() => setActiveTags([])}
          className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${
            activeTags.length === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200'
          }`}>전체</button>
        {TAG_OPTIONS.map((t) => (
          <button key={t} onClick={() => toggleTag(t)}
            className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${
              activeTags.includes(t) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>#{t}</button>
        ))}
      </div>
      {activeTags.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">선택한 특징을 <b>모두</b> 만족하는 곳만 보여요</p>
      )}

      {user && (
        <Link href="/map"
          className="block text-center w-full mb-4 bg-white border border-dashed border-blue-300 rounded-xl py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition">
          ＋ 지도에서 장소 추가
        </Link>
      )}

      {places.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-12">해당하는 가게가 아직 없어요.</div>
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
    </div>
  )
}