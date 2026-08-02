'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import StarRating from '@/components/StarRating'
import ReportModal from '@/components/ReportModal'
import { supabase } from '@/lib/supabase'
import { formatAddress } from '@/lib/format'
import { CATEGORY_VALUES } from '@/lib/categories'

const TAG_OPTIONS = ['반려동물 전용 메뉴O', '대형견 가능', '이동가방 필수', '마당 있음', '자유 산책 가능', '실내 동반 가능', '실외에만 가능', '무게 제한 있음']

export default function PlaceDetail() {
  const { id } = useParams()
  const [place, setPlace] = useState(null)
  const [reviews, setReviews] = useState([])
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [reviewTags, setReviewTags] = useState([])
  const [editingReview, setEditingReview] = useState(false)
  const [removePhoto, setRemovePhoto] = useState(false)

  const [editingCat, setEditingCat] = useState(false)
  const [cat, setCat] = useState('')
  const [catHint, setCatHint] = useState(false)
  const [editingTags, setEditingTags] = useState(false)
  const [baseTags, setBaseTags] = useState([])
  const [tagCounts, setTagCounts] = useState([])
  const [tagMinShow, setTagMinShow] = useState(1)
  const [sort, setSort] = useState('recent')
  const [reportOpen, setReportOpen] = useState(false)

  async function loadData() {
    const { data: placeData } = await supabase.from('places').select('*').eq('id', id).single()
    setPlace(placeData)
    if (placeData) setCat(placeData.category ?? '기타')
    const { data: u } = await supabase.auth.getUser()

    let admin = false
    if (u.user) {
      const { data: pr } = await supabase.from('profiles').select('is_admin').eq('id', u.user.id).single()
      admin = !!pr?.is_admin
    }
    setIsAdmin(admin)

    const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'tag_min_show').maybeSingle()
    setTagMinShow(Number(setting?.value ?? 1))

    const { data: reviewData } = await supabase.from('reviews').select('*, review_likes(count)').eq('place_id', id).order('created_at', { ascending: false })
    const rev = reviewData ?? []

    const counts = {}
    for (const r of rev) for (const t of (r.tags ?? [])) counts[t] = (counts[t] ?? 0) + 1
    setTagCounts(Object.entries(counts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count))

    let liked = new Set()
    if (u.user) {
      const { data: myl } = await supabase.from('review_likes').select('review_id').eq('user_id', u.user.id)
      liked = new Set((myl ?? []).map((x) => x.review_id))
    }
    setReviews(rev.map((r) => ({ ...r, likeCount: r.review_likes?.[0]?.count ?? 0, liked: liked.has(r.id) })))
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    loadData()
  }, [id])

  const myReview = reviews.find((r) => r.user_id === user?.id)
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sort === 'high') return b.rating - a.rating
    if (sort === 'low') return a.rating - b.rating
    if (sort === 'popular') return (b.likeCount ?? 0) - (a.likeCount ?? 0)
    return new Date(b.created_at) - new Date(a.created_at)
  })

  function toggleReviewTag(t) { setReviewTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]) }

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
      const { error } = await supabase.from('reviews').update({ rating, content, image_url: imageUrl, tags: reviewTags }).eq('id', myReview.id)
      if (error) { alert('수정 실패: ' + error.message); return }
    } else {
      const { error } = await supabase.from('reviews').insert({ place_id: id, user_id: user.id, rating, content, nickname, image_url: imageUrl, tags: reviewTags })
      if (error) { alert('등록 실패: ' + error.message); return }
    }
    setContent(''); setRating(5); setFile(null); setReviewTags([]); setEditingReview(false); setRemovePhoto(false)
    loadData()
  }

  function startEditReview() {
    setEditingReview(true)
    setRating(myReview.rating)
    setContent(myReview.content)
    setReviewTags(myReview.tags ?? [])
    setFile(null); setRemovePhoto(false)
  }
  async function handleDeleteReview(reviewId) {
    if (!confirm('후기를 삭제할까요?')) return
    await supabase.from('reviews').delete().eq('id', reviewId)
    setEditingReview(false)
    loadData()
  }

  async function toggleReviewLike(r) {
    if (!user) { alert('로그인이 필요해요'); return }
    setReviews((prev) => prev.map((x) => x.id === r.id ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x))
    if (r.liked) await supabase.from('review_likes').delete().eq('review_id', r.id).eq('user_id', user.id)
    else await supabase.from('review_likes').insert({ review_id: r.id, user_id: user.id })
  }

  async function saveCategory() {
    const { error } = await supabase.from('places').update({ category: cat }).eq('id', id)
    if (error) { alert('수정 실패: ' + error.message); return }
    setEditingCat(false); loadData()
  }

  function toggleBaseTag(t) { setBaseTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]) }
  async function saveBaseTags() {
    const { error } = await supabase.from('places').update({ tags: baseTags }).eq('id', id)
    if (error) { alert(error.message); return }
    setEditingTags(false); loadData()
  }

  if (!place) return <div className="p-6 text-gray-400">불러오는 중...</div>

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null
  const shownTags = tagCounts.filter((t) => t.count >= tagMinShow)

  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href="/map" className="text-sm text-gray-400">← 지도로</Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-2">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold">{place.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{formatAddress(place.address)}</p>
            {place.description && <p className="text-sm text-gray-700 mt-2">{place.description}</p>}
          </div>
          <button onClick={() => setReportOpen(true)} className="text-gray-300 hover:text-red-500 text-sm shrink-0" title="신고">🚩</button>
        </div>
        {avg && <p className="text-sm mt-2"><span className="text-amber-500">★</span> <b>{avg}</b> <span className="text-gray-400">· 후기 {reviews.length}</span></p>}

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {!editingCat ? (
              <>
                <span className="text-sm font-semibold bg-blue-50 text-blue-700 rounded-full px-3 py-1">{place.category ?? '기타'}</span>
                <button onClick={() => setCatHint((v) => !v)} className="text-gray-300 text-sm leading-none" aria-label="카테고리 안내">ⓘ</button>
                {isAdmin && <button onClick={() => setEditingCat(true)} className="ml-auto text-xs text-gray-400 hover:text-gray-700 shrink-0">✎ 카테고리 수정</button>}
              </>
            ) : (
              <div className="flex gap-2 w-full">
                <select value={cat} onChange={(e) => setCat(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm">
                  {CATEGORY_VALUES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={saveCategory} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm">저장</button>
                <button onClick={() => { setEditingCat(false); setCat(place.category ?? '기타') }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">취소</button>
              </div>
            )}
          </div>
          {catHint && (
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">카테고리가 틀리면 🚩 신고 → "카테고리가 틀려요"에서 올바른 걸 골라 요청하세요. 서로 다른 여러 명이 같은 의견이면 자동으로 바뀌어요.</p>
          )}

          {shownTags.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-gray-400 mb-1.5">방문자가 확인한 특징</div>
              <div className="flex flex-wrap gap-1.5">
                {shownTags.map((t) => {
                  const strong = t.count >= 3
                  return (
                    <span key={t.tag} className={`text-xs rounded-full px-2.5 py-0.5 ${strong ? 'bg-emerald-100 text-emerald-800 font-medium' : 'bg-emerald-50 text-emerald-600'}`}>{t.tag} · {t.count}</span>
                  )
                })}
              </div>
            </div>
          )}

          {(isAdmin || (place.tags ?? []).length > 0) && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="text-xs font-semibold text-gray-400">기본 정보</div>
                {isAdmin && !editingTags && <button onClick={() => { setBaseTags(place.tags ?? []); setEditingTags(true) }} className="text-[11px] text-gray-400 hover:text-gray-700">✎ 수정</button>}
              </div>
              {!editingTags ? (
                <div className="flex flex-wrap gap-1.5">
                  {(place.tags ?? []).length === 0
                    ? <span className="text-xs text-gray-300">기본 태그 없음</span>
                    : place.tags.map((t) => <span key={t} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">#{t}</span>)}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_OPTIONS.map((t) => (
                      <button type="button" key={t} onClick={() => toggleBaseTag(t)}
                        className={`text-xs rounded-full px-2.5 py-1 border transition ${baseTags.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={saveBaseTags} className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm">저장</button>
                    <button onClick={() => setEditingTags(false)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">취소</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="text-lg font-bold">후기 {reviews.length}</h2>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600">
          <option value="recent">최신순</option>
          <option value="popular">인기순</option>
          <option value="high">별점 높은순</option>
          <option value="low">별점 낮은순</option>
        </select>
      </div>

      {!user ? (
        <p className="text-sm text-gray-500 mb-4"><Link href="/login" className="text-blue-600 underline">로그인</Link> 후 후기를 남길 수 있어요.</p>
      ) : (!myReview || editingReview) ? (
        <form onSubmit={submitReview} className="flex flex-col gap-2 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <StarRating value={rating} onChange={setRating} size={30} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="후기를 남겨주세요" required rows={3}
            className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm" />

          <div className="text-xs text-gray-400 mt-1">이 곳의 특징 <span className="text-gray-300">· 체크하면 "방문자가 확인한 특징"으로 함께 모여요</span></div>
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((t) => (
              <button type="button" key={t} onClick={() => toggleReviewTag(t)}
                className={`text-xs rounded-full px-2.5 py-1 border transition ${reviewTags.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>{t}</button>
            ))}
          </div>

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
              <button type="button" onClick={() => { setEditingReview(false); setFile(null); setRemovePhoto(false); setReviewTags([]) }}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm">취소</button>
            )}
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-xl p-3 mb-4">이미 후기를 남겼어요. 아래에서 수정할 수 있어요.</p>
      )}

      <ul className="flex flex-col gap-3">
        {sortedReviews.filter((r) => !(editingReview && r.id === myReview?.id)).map((r) => (
          <li key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex justify-between items-center">
              <Link href={`/profile/${r.user_id}`} className="font-semibold text-sm hover:underline">{r.nickname ?? '익명'}</Link>
              <StarRating value={r.rating} readOnly size={16} />
            </div>
            <p className="mt-1.5 text-sm text-gray-700">{r.content}</p>
            {(r.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {r.tags.map((t) => <span key={t} className="text-[11px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">{t}</span>)}
              </div>
            )}
            {r.image_url && <img src={r.image_url} alt="" className="mt-2 rounded-lg max-h-56 object-cover" />}
            <button onClick={() => toggleReviewLike(r)} className="text-xs mt-2 block">
              {r.liked ? '❤️' : '🤍'} 도움돼요 {r.likeCount}
            </button>
            {user && user.id === r.user_id && (
              <div className="flex gap-3 mt-2">
                <button onClick={startEditReview} className="text-xs text-blue-500">수정</button>
                <button onClick={() => handleDeleteReview(r.id)} className="text-xs text-gray-300 hover:text-red-500">삭제</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {reviews.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">아직 후기가 없어요. 첫 후기를 남겨보세요 🐾</div>
      )}

      {reportOpen && <ReportModal place={place} user={user} onClose={() => setReportOpen(false)} />}
    </div>
  )
}