'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['반려동물 동반 카페', '반려동물 동반 밥집', '반려동물 동반 펜션', '기타']
const TAG_OPTIONS = ['강아지 음료 O', '대형견 가능', '실내 운동장', '마당 있음', '동반석 별도', '캐리어 필요', '자유 산책 가능', '리드줄 필수']

export default function PlaceDetail() {
  const { id } = useParams()
  const [place, setPlace] = useState(null)
  const [reviews, setReviews] = useState([])
  const [user, setUser] = useState(null)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')

  // 카테고리/태그 수정
  const [editing, setEditing] = useState(false)
  const [cat, setCat] = useState('')
  const [tags, setTags] = useState([])

  async function loadData() {
    const { data: placeData } = await supabase.from('places').select('*').eq('id', id).single()
    setPlace(placeData)
    if (placeData) { setCat(placeData.category ?? '기타'); setTags(placeData.tags ?? []) }

    const { data: reviewData } = await supabase.from('reviews').select('*')
      .eq('place_id', id).order('created_at', { ascending: false })
    setReviews(reviewData ?? [])
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    loadData()
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) return
    const nickname = user.user_metadata?.nickname ?? user.email
    const { error } = await supabase.from('reviews').insert({
      place_id: id, user_id: user.id, rating, content, nickname,
    })
    if (error) { alert('후기 등록 실패: ' + error.message); return }
    setContent(''); setRating(5)
    loadData()
  }

  async function handleDelete(reviewId) {
    await supabase.from('reviews').delete().eq('id', reviewId)
    loadData()
  }

  function toggleTag(t) {
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
  }

  async function saveCategory() {
    const { error } = await supabase.from('places').update({ category: cat, tags }).eq('id', id)
    if (error) { alert('수정 실패: ' + error.message); return }
    setEditing(false)
    loadData()
  }

  if (!place) return <div className="p-6">불러오는 중...</div>

  const myReview = reviews.find((r) => r.user_id === user?.id)

  return (
    <main className="max-w-md mx-auto p-4">
      <Link href="/map" className="text-sm text-gray-500">← 지도로</Link>

      <h1 className="text-2xl font-bold mt-2">{place.name}</h1>
      <p className="text-gray-500">{place.address}</p>

      {/* 카테고리 + 세부 태그 */}
      <div className="mt-3 border rounded-lg p-3">
        {!editing ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold bg-blue-50 text-blue-700 rounded-full px-3 py-1">
                {place.category ?? '기타'}
              </span>
              {user && <button onClick={() => setEditing(true)} className="text-xs text-gray-500">✎ 수정</button>}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(place.tags ?? []).length === 0
                ? <span className="text-xs text-gray-400">아직 세부 정보가 없어요</span>
                : place.tags.map((t) => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">#{t}</span>
                  ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <select value={cat} onChange={(e) => setCat(e.target.value)}
              className="border rounded px-2 py-1 bg-white text-gray-900">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <label key={t} className="text-xs flex items-center gap-1">
                  <input type="checkbox" checked={tags.includes(t)} onChange={() => toggleTag(t)} />
                  {t}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={saveCategory} className="flex-1 bg-blue-600 text-white rounded px-3 py-1 text-sm">저장</button>
              <button onClick={() => { setEditing(false); setCat(place.category ?? '기타'); setTags(place.tags ?? []) }}
                className="flex-1 border rounded px-3 py-1 text-sm">취소</button>
            </div>
            <p className="text-[11px] text-gray-400">누구나 함께 고칠 수 있어요 🐾</p>
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold mt-6 mb-2">후기 ({reviews.length})</h2>

      {user && myReview ? (
        <p className="text-sm text-gray-500 mb-4">이미 이 곳에 후기를 남겼어요. 한 곳당 후기는 하나예요. (아래에서 삭제하면 다시 쓸 수 있어요)</p>
      ) : user ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-4 border rounded p-3">
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}
            className="border rounded px-2 py-1 w-28 bg-white text-gray-900">
            {[5,4,3,2,1].map((n) => <option key={n} value={n}>{'⭐'.repeat(n)}</option>)}
          </select>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="후기를 남겨주세요" required rows={3}
            className="border rounded px-2 py-1 bg-white text-gray-900" />
          <button className="bg-blue-600 text-white rounded px-3 py-2">후기 등록</button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 mb-4">
          <Link href="/login" className="text-blue-600 underline">로그인</Link> 후 후기를 남길 수 있어요.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {reviews.map((r) => (
          <li key={r.id} className="border rounded p-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{r.nickname ?? '익명'}</span>
              <span>{'⭐'.repeat(r.rating)}</span>
            </div>
            <p className="mt-1 text-sm">{r.content}</p>
            {user && user.id === r.user_id && (
              <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 mt-1">삭제</button>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}