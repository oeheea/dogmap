'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function MyReviewsPage() {
  const [user, setUser] = useState(null)
  const [reviews, setReviews] = useState([])

  // 인라인 수정 상태
  const [editId, setEditId] = useState(null)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  async function load() {
    const { data: u } = await supabase.auth.getUser()
    setUser(u.user)
    if (!u.user) return
    const { data } = await supabase.from('reviews')
      .select('*, places(name, category)')
      .eq('user_id', u.user.id)
      .order('created_at', { ascending: false })
    setReviews(data ?? [])
  }
  useEffect(() => { load() }, [])

  function startEdit(r) {
    setEditId(r.id); setRating(r.rating); setContent(r.content); setFile(null); setRemovePhoto(false)
  }
  function cancelEdit() { setEditId(null); setFile(null); setRemovePhoto(false) }

  async function saveEdit(r) {
    let imageUrl = r.image_url ?? null
    if (removePhoto) imageUrl = null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('review-photos').upload(path, file)
      if (upErr) { alert('사진 업로드 실패: ' + upErr.message); return }
      imageUrl = supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl
    }
    const { error } = await supabase.from('reviews').update({ rating, content, image_url: imageUrl }).eq('id', r.id)
    if (error) { alert('수정 실패: ' + error.message); return }
    cancelEdit(); load()
  }

  async function handleDelete(id) {
    if (!confirm('이 후기를 삭제할까요?')) return
    await supabase.from('reviews').delete().eq('id', id)
    load()
  }

  if (!user) return (<div className="p-6">로그인이 필요해요. <Link href="/login" className="text-blue-600 underline">로그인</Link></div>)

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-1">내 후기</h1>
      <p className="text-sm text-gray-400 mb-4">전체 {reviews.length}개{avg ? ` · 평균 ★ ${avg}` : ''}</p>

      {reviews.length === 0 && <p className="text-gray-400 text-sm">아직 작성한 후기가 없어요.</p>}

      <ul className="flex flex-col gap-3">
        {reviews.map((r) => (
          <li key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start">
              <Link href={`/place/${r.place_id}`} className="min-w-0">
                <div className="font-bold text-sm truncate">{r.places?.name ?? '(삭제된 장소)'}</div>
                <div className="text-xs text-gray-400">{r.places?.category}</div>
              </Link>
              {editId !== r.id && (
                <span className="text-amber-500 text-sm shrink-0">{'★'.repeat(r.rating)}<span className="text-gray-200">{'★'.repeat(5 - r.rating)}</span></span>
              )}
            </div>

            {editId === r.id ? (
              /* ── 수정 모드 ── */
              <div className="mt-3 flex flex-col gap-2">
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 w-28 bg-white text-sm">
                  {[5,4,3,2,1].map((n) => <option key={n} value={n}>{'⭐'.repeat(n)}</option>)}
                </select>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
                  className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm" />

                {(file || (r.image_url && !removePhoto)) && (
                  <div className="relative w-fit">
                    <img src={file ? URL.createObjectURL(file) : r.image_url} alt="" className="rounded-lg max-h-48" />
                    <button type="button" onClick={() => { setFile(null); setRemovePhoto(true) }}
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full px-2 py-0.5">사진 빼기</button>
                  </div>
                )}
                <label className="text-sm text-blue-600 cursor-pointer">
                  📷 사진 {(file || (r.image_url && !removePhoto)) ? '변경' : '추가'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files[0]); setRemovePhoto(false) }} />
                </label>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(r)} className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium">수정 완료</button>
                  <button onClick={cancelEdit} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">취소</button>
                </div>
              </div>
            ) : (
              /* ── 보기 모드 ── */
              <>
                <p className="mt-2 text-sm text-gray-700">{r.content}</p>
                {r.image_url && <img src={r.image_url} alt="" className="mt-2 rounded-lg max-h-56 object-cover" />}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[11px] text-gray-300">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(r)} className="text-xs text-blue-500">수정</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-gray-300 hover:text-red-500">삭제</button>
                  </div>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}