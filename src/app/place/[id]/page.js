'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatAddress } from '@/lib/format'

const CATEGORIES = ['반려동물 동반 카페', '반려동물 동반 밥집', '반려동물 동반 펜션', '기타']
const TAG_OPTIONS = ['강아지 음료 O', '대형견 가능', '자유 산책 가능', '마당 있음', '실내 동반 가능', '매장 강아지 있음', '반려동물 전용 메뉴', '무게 제한 있음']

export default function PlaceDetail() {
  const { id } = useParams()
  const [place, setPlace] = useState(null)
  const [reviews, setReviews] = useState([])
  const [user, setUser] = useState(null)

  // 후기 폼
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [editingReview, setEditingReview] = useState(false)
  const [removePhoto, setRemovePhoto] = useState(false)

  // 카테고리/태그 수정
  const [editingCat, setEditingCat] = useState(false)
  const [cat, setCat] = useState('')
  const [tags, setTags] = useState([])

  async function loadData() {
    const { data: placeData } = await supabase.from('places').select('*').eq('id', id).single()
    setPlace(placeData)
    if (placeData) { setCat(placeData.category ?? '기타'); setTags(placeData.tags ?? []) }
    const { data: reviewData } = await supabase.from('reviews').select('*').eq('place_id', id).order('created_at', { ascending: false })
    setReviews(reviewData ?? [])
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    loadData()
  }, [id])

  const myReview = reviews.find((r) => r.user_id === user?.id)

  async function submitReview(e) {
    e.preventDefault()
    if (!user) return
    let imageUrl = editingReview ? (myReview?.image_url ?? null) : null
    if (removePhoto) imageUrl = null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('review-photos').upload(path, file)
      if (upErr) { alert('사진 업로드 실패: ' + upErr.message); return }
      imageUrl = supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl
    }
    const nickname = user.user_metadata?.nickname ?? user.email
    if (editingReview) {
      const { error } = await supabase.from('reviews').update({ rating, content, image_url: imageUrl }).eq('id', myReview.id)
      if (error) { alert('수정 실패: ' + error.message); return }
    } else {
      const { error } = await supabase.from('reviews').insert({ place_id: id, user_id: user.id, rating, content, nickname, image_url: imageUrl })
      if (error) { alert('등록 실패: ' + error.message); return }
    }
    setContent(''); setRating(5); setFile(null); setEditingReview(false); setRemovePhoto(false)
    loadData()
  }

  function startEditReview() {
    setEditingReview(true)
    setRating(myReview.rating)
    setContent(myReview.content)
    setFile(null); setRemovePhoto(false)
  }
  async function handleDeleteReview(reviewId) {
    if (!confirm('후기를 삭제할까요?')) return
    await supabase.from('reviews').delete().eq('id', reviewId)
    setEditingReview(false)
    loadData()
  }

  function toggleTag(t) { setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]) }
  async function saveCategory() {
    const { error } = await supabase.from('places').update({ category: cat, tags }).eq('id', id)
    if (error) { alert('수정 실패: ' + error.message); return }
    setEditingCat(false); loadData()
  }

  if (!place) return <div className="p-6 text-gray-400">불러오는 중...</div>

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href="/map" className="text-sm text-gray-400">← 지도로</Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-2">
        <h1 className="text-2xl font-extrabold">{place.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{formatAddress(place.address)}</p>
        {avg && <p className="text-sm mt-2"><span className="text-amber-500">★</span> <b>{avg}</b> <span className="text-gray-400">· 후기 {reviews.length}</span></p>}

        <div className="mt-3 pt-3 border-t border-gray-100">
          {!editingCat ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold bg-blue-50 text-blue-700 rounded-full px-3 py-1">{place.category ?? '기타'}</span>
                {user && <button onClick={() => setEditingCat(true)} className="text-xs text-gray-400 hover:text-gray-700">✎ 수정</button>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(place.tags ?? []).length === 0
                  ? <span className="text-xs text-gray-300">아직 세부 정보가 없어요</span>
                  : place.tags.map((t) => <span key={t} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">#{t}</span>)}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((t) => (
                  <label key={t} className="text-xs flex items-center gap-1 bg-gray-50 rounded-full px-2 py-1">
                    <input type="checkbox" checked={tags.includes(t)} onChange={() => toggleTag(t)} /> {t}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={saveCategory} className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm">저장</button>
                <button onClick={() => { setEditingCat(false); setCat(place.category ?? '기타'); setTags(place.tags ?? []) }} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">취소</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-lg font-bold mt-6 mb-2">후기 {reviews.length}</h2>

      {/* 후기 작성/수정 폼 */}
      {!user ? (
        <p className="text-sm text-gray-500 mb-4"><Link href="/login" className="text-blue-600 underline">로그인</Link> 후 후기를 남길 수 있어요.</p>
      ) : (!myReview || editingReview) ? (
        <form onSubmit={submitReview} className="flex flex-col gap-2 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 w-28 bg-white text-sm">
            {[5,4,3,2,1].map((n) => <option key={n} value={n}>{'⭐'.repeat(n)}</option>)}
          </select>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="후기를 남겨주세요" required rows={3}
            className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm" />

          {/* 기존 사진 (수정 중, 새 파일 없고 삭제 안 했을 때) */}
          {(file || (editingReview && myReview?.image_url && !removePhoto)) && (
            <div className="relative w-fit">
              <img src={file ? URL.createObjectURL(file) : myReview.image_url} alt="" className="rounded-lg max-h-48" />
              <button type="button" onClick={() => { setFile(null); setRemovePhoto(true) }}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full px-2 py-0.5">사진 빼기</button>
            </div>
          )}
          <label className="text-sm text-blue-600 cursor-pointer">
            📷 사진 {(file || (editingReview && myReview?.image_url && !removePhoto)) ? '변경' : '추가'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files[0]); setRemovePhoto(false) }} />
          </label>

          <div className="flex gap-2">
            <button className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2.5 text-sm font-medium">{editingReview ? '수정 완료' : '후기 등록'}</button>
            {editingReview && (
              <button type="button" onClick={() => { setEditingReview(false); setFile(null); setRemovePhoto(false) }}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm">취소</button>
            )}
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-xl p-3 mb-4">이미 후기를 남겼어요. 아래에서 수정할 수 있어요.</p>
      )}

      {/* 후기 목록 */}
      <ul className="flex flex-col gap-3">
        {reviews.filter((r) => !(editingReview && r.id === myReview?.id)).map((r) => (
          <li key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">{r.nickname ?? '익명'}</span>
              <span className="text-amber-500 text-sm">{'★'.repeat(r.rating)}<span className="text-gray-200">{'★'.repeat(5 - r.rating)}</span></span>
            </div>
            <p className="mt-1.5 text-sm text-gray-700">{r.content}</p>
            {r.image_url && <img src={r.image_url} alt="" className="mt-2 rounded-lg max-h-56 object-cover" />}
            {user && user.id === r.user_id && (
              <div className="flex gap-3 mt-2">
                <button onClick={startEditReview} className="text-xs text-blue-500">수정</button>
                <button onClick={() => handleDeleteReview(r.id)} className="text-xs text-gray-300 hover:text-red-500">삭제</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}