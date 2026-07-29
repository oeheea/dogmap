'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import StarRating from '@/components/StarRating'
import ReportModal from '@/components/ReportModal'
import { supabase } from '@/lib/supabase'
import { formatAddress } from '@/lib/format'

const CATEGORIES = ['애견카페', '반려동물 동반 카페', '반려동물 동반 밥집', '반려동물 동반 펜션', '기타']
const TAG_OPTIONS = ['반려동물 전용 메뉴O', '대형견 가능', '이동가방 필수', '마당 있음', '자유 산책 가능', '실내 동반 가능', '실외에만 가능', '무게 제한 있음']

export default function PlaceDetail() {
  const { id } = useParams()
  const [place, setPlace] = useState(null)
  const [reviews, setReviews] = useState([])
  const [user, setUser] = useState(null)

  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [editingReview, setEditingReview] = useState(false)
  const [removePhoto, setRemovePhoto] = useState(false)

  const [editingCat, setEditingCat] = useState(false)
  const [cat, setCat] = useState('')
  const [tagList, setTagList] = useState([])
  const [thr, setThr] = useState({ confirm: 5, delete: 5 })
  const [sort, setSort] = useState('recent')
  const [reportOpen, setReportOpen] = useState(false)

  async function loadData() {
    const { data: placeData } = await supabase.from('places').select('*').eq('id', id).single()
    setPlace(placeData)
    if (placeData) setCat(placeData.category ?? '기타')
    const { data: u } = await supabase.auth.getUser()

    // 임계값(설정) 읽기
    const { data: st } = await supabase.from('app_settings').select('key, value')
    const cthr = Number(st?.find((s) => s.key === 'tag_confirm')?.value ?? 5)
    const dthr = Number(st?.find((s) => s.key === 'tag_delete')?.value ?? 5)
    setThr({ confirm: cthr, delete: dthr })

    // 태그 투표 집계 (동의/삭제제안)
    const { data: pt } = await supabase.from('place_tags').select('tag, user_id, stance').eq('place_id', id)
    const m = {}
    for (const row of (pt ?? [])) {
      if (!m[row.tag]) m[row.tag] = { tag: row.tag, up: new Set(), down: new Set(), seeded: false, mine: null }
      if (row.user_id == null) m[row.tag].seeded = true
      else {
        if (row.stance === 'down') m[row.tag].down.add(row.user_id); else m[row.tag].up.add(row.user_id)
        if (u.user && row.user_id === u.user.id) m[row.tag].mine = row.stance === 'down' ? 'down' : 'up'
      }
    }
    const list = Object.values(m)
      .map((x) => ({ tag: x.tag, up: x.up.size, down: x.down.size, confirmed: x.down.size < dthr && (x.seeded || x.up.size >= cthr), removed: x.down.size >= dthr, mine: x.mine }))
      .sort((a, b) => (b.confirmed - a.confirmed) || a.tag.localeCompare(b.tag))
    setTagList(list)

    const { data: reviewData } = await supabase.from('reviews').select('*, review_likes(count)').eq('place_id', id).order('created_at', { ascending: false })
    let liked = new Set()
    if (u.user) {
      const { data: myl } = await supabase.from('review_likes').select('review_id').eq('user_id', u.user.id)
      liked = new Set((myl ?? []).map((x) => x.review_id))
    }
    setReviews((reviewData ?? []).map((r) => ({ ...r, likeCount: r.review_likes?.[0]?.count ?? 0, liked: liked.has(r.id) })))
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

  async function toggleReviewLike(r) {
    if (!user) { alert('로그인이 필요해요'); return }
    setReviews((prev) => prev.map((x) => x.id === r.id ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x))
    if (r.liked) await supabase.from('review_likes').delete().eq('review_id', r.id).eq('user_id', user.id)
    else await supabase.from('review_likes').insert({ review_id: r.id, user_id: user.id })
  }

  async function setStance(tag, stance) {
    if (!user) { alert('로그인이 필요해요'); return }
    await supabase.from('place_tags').delete().eq('place_id', id).eq('tag', tag).eq('user_id', user.id)
    const { error } = await supabase.from('place_tags').insert({ place_id: id, tag, user_id: user.id, stance })
    if (error) { alert(error.message); return }
    loadData()
  }
  async function clearStance(tag) {
    if (!user) return
    await supabase.from('place_tags').delete().eq('place_id', id).eq('tag', tag).eq('user_id', user.id)
    loadData()
  }
  async function saveCategory() {
    const { error } = await supabase.from('places').update({ category: cat }).eq('id', id)
    if (error) { alert('수정 실패: ' + error.message); return }
    setEditingCat(false); loadData()
  }

  if (!place) return <div className="p-6 text-gray-400">불러오는 중...</div>

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href="/map" className="text-sm text-gray-400">← 지도로</Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-2">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold">{place.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{formatAddress(place.address)}</p>
          </div>
          <button onClick={() => setReportOpen(true)} className="text-gray-300 hover:text-red-500 text-sm shrink-0" title="신고">🚩</button>
        </div>
        {avg && <p className="text-sm mt-2"><span className="text-amber-500">★</span> <b>{avg}</b> <span className="text-gray-400">· 후기 {reviews.length}</span></p>}

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center gap-2">
            {!editingCat ? (
              <>
                <span className="text-sm font-semibold bg-blue-50 text-blue-700 rounded-full px-3 py-1">{place.category ?? '기타'}</span>
                {user && <button onClick={() => setEditingCat(true)} className="text-xs text-gray-400 hover:text-gray-700 shrink-0">✎ 카테고리 수정</button>}
              </>
            ) : (
              <div className="flex gap-2 w-full">
                <select value={cat} onChange={(e) => setCat(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={saveCategory} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm">저장</button>
                <button onClick={() => { setEditingCat(false); setCat(place.category ?? '기타') }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">취소</button>
              </div>
            )}
          </div>

          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-400 mb-1.5">세부 특징 <span className="font-normal text-gray-300">· 👍{thr.confirm}명이면 확정 · 🗑️{thr.delete}명이면 삭제</span></div>
            <div className="flex flex-wrap gap-1.5">
              {tagList.length === 0 && <span className="text-xs text-gray-300">아직 특징이 없어요. 아래에서 추가해보세요.</span>}
              {tagList.map((t) => (
                <span key={t.tag} className={`text-xs rounded-full pl-2.5 pr-1.5 py-0.5 flex items-center gap-1.5 border ${t.removed ? 'bg-gray-50 text-gray-300 line-through border-gray-100' : t.confirmed ? 'bg-gray-100 text-gray-600 border-gray-100' : 'bg-white text-gray-400 border-dashed border-gray-300'}`}>
                  #{t.tag}
                  {t.removed ? <span className="text-[10px] no-underline">삭제됨</span> : (<>
                    {!t.confirmed && <span className="text-[10px] text-amber-500">제안·{t.up}</span>}
                    {t.down > 0 && <span className="text-[10px] text-red-400">삭제 {t.down}/{thr.delete}</span>}
                  </>)}
                  {user && (
                    <span className="flex items-center gap-1">
                      <button onClick={() => (t.mine === 'up' ? clearStance(t.tag) : setStance(t.tag, 'up'))} className={`text-[11px] leading-none ${t.mine === 'up' ? 'opacity-100' : 'opacity-40'}`} title="이 태그 맞아요">👍</button>
                      <button onClick={() => (t.mine === 'down' ? clearStance(t.tag) : setStance(t.tag, 'down'))} className={`text-[11px] leading-none ${t.mine === 'down' ? 'opacity-100' : 'opacity-40'}`} title="이 태그 아니에요 (삭제 제안)">🗑️</button>
                    </span>
                  )}
                </span>
              ))}
            </div>
            {user && (
              <details className="mt-2">
                <summary className="text-xs text-blue-600 cursor-pointer list-none">＋ 특징 추가·제안</summary>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TAG_OPTIONS.filter((t) => !tagList.some((x) => x.tag === t)).map((t) => (
                    <button key={t} onClick={() => setStance(t, 'up')} className="text-xs border border-gray-200 rounded-full px-2.5 py-1 hover:bg-gray-50">#{t}</button>
                  ))}
                </div>
              </details>
            )}
          </div>
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

      <ul className="flex flex-col gap-3">
        {sortedReviews.filter((r) => !(editingReview && r.id === myReview?.id)).map((r) => (
          <li key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex justify-between items-center">
              <Link href={`/profile/${r.user_id}`} className="font-semibold text-sm hover:underline">{r.nickname ?? '익명'}</Link>
              <StarRating value={r.rating} readOnly size={16} />
            </div>
            <p className="mt-1.5 text-sm text-gray-700">{r.content}</p>
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

      {reportOpen && <ReportModal place={place} user={user} onClose={() => setReportOpen(false)} />}
    </div>
  )
}