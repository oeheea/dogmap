'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'
import CameraCapture from '@/components/CameraCapture'

export default function MomentsPage() {
  const [user, setUser] = useState(null)
  const [moments, setMoments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [place, setPlace] = useState(null)
  const [posting, setPosting] = useState(false)

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setUser(u.user)
    const { data: ms } = await supabase.from('moments').select('*, places(name), moment_likes(count), moment_comments(count)').order('created_at', { ascending: false }).limit(50)
    const list = ms ?? []
    let likedSet = new Set()
    if (u.user) {
      const { data: my } = await supabase.from('moment_likes').select('moment_id').eq('user_id', u.user.id)
      likedSet = new Set((my ?? []).map((l) => l.moment_id))
    }
    const ids = [...new Set(list.map((m) => m.user_id))]
    let pmap = {}
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', ids)
      pmap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]))
    }
    setMoments(list.map((m) => ({ ...m, liked: likedSet.has(m.id), likeCount: m.moment_likes?.[0]?.count ?? 0, commentCount: m.moment_comments?.[0]?.count ?? 0, author: pmap[m.user_id] })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function toggleLike(m) {
    if (!user) { alert('로그인이 필요해요'); return }
    setMoments((prev) => prev.map((x) => x.id === m.id ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x))
    if (m.liked) await supabase.from('moment_likes').delete().eq('moment_id', m.id).eq('user_id', user.id)
    else await supabase.from('moment_likes').insert({ moment_id: m.id, user_id: user.id })
  }

  async function searchPlace(q) {
    setPlaceQuery(q)
    if (!q.trim()) { setPlaceResults([]); return }
    const { data } = await supabase.from('places').select('id, name').ilike('name', `%${q}%`).limit(6)
    setPlaceResults(data ?? [])
  }

  async function submitMoment() {
    if (!file) { alert('사진을 골라주세요'); return }
    setPosting(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('review-photos').upload(path, file)
      if (upErr) throw upErr
      const image_url = supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl
      const nickname = user.user_metadata?.nickname ?? user.email
      const { error } = await supabase.from('moments').insert({ user_id: user.id, nickname, image_url, caption, place_id: place?.id ?? null })
      if (error) throw error
      setShowNew(false); setFile(null); setCaption(''); setPlace(null); setPlaceQuery(''); setPlaceResults([])
      load()
    } catch (e) { alert('업로드 실패: ' + e.message) }
    setPosting(false)
  }

  if (loading) return <Loading />

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-extrabold">모먼트 📸</h1>
        {user && <button onClick={() => setShowNew(true)} className="text-sm bg-blue-600 text-white rounded-full px-4 py-1.5">＋ 올리기</button>}
      </div>

      {moments.length === 0 && <p className="text-sm text-gray-400 text-center py-10">아직 게시물이 없어요. 첫 사진을 올려보세요 🐾</p>}

      <ul className="flex flex-col gap-5">
        {moments.map((m) => (
          <li key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2.5 p-3">
              <Link href={`/profile/${m.user_id}`} className="shrink-0">
                {m.author?.avatar_url
                  ? <img src={m.author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  : <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">{(m.author?.nickname ?? m.nickname ?? '?').slice(0, 1)}</span>}
              </Link>
              <div className="min-w-0">
                <Link href={`/profile/${m.user_id}`} className="text-sm font-semibold leading-tight truncate block">{m.author?.nickname ?? m.nickname ?? '익명'}</Link>
                {m.places?.name && m.place_id && (
                  <Link href={`/place/${m.place_id}`} className="text-[11px] text-gray-400 leading-tight truncate block">📍 {m.places.name}</Link>
                )}
              </div>
            </div>

            <img src={m.image_url} alt="" className="w-full aspect-square object-cover bg-gray-50" />

            <div className="p-3">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleLike(m)} className="text-2xl leading-none active:scale-90 transition" aria-label="좋아요">{m.liked ? '❤️' : '🤍'}</button>
                <Link href={`/moments/${m.id}`} className="text-2xl leading-none" aria-label="댓글">💬</Link>
              </div>
              {m.likeCount > 0 && <div className="text-sm font-semibold mt-2">좋아요 {m.likeCount}개</div>}
              {m.caption && <p className="text-sm mt-1"><b>{m.author?.nickname ?? m.nickname}</b> {m.caption}</p>}
              {m.commentCount > 0 && (
                <Link href={`/moments/${m.id}`} className="block text-sm text-gray-400 mt-1">댓글 {m.commentCount}개 모두 보기</Link>
              )}
              <div className="text-[11px] text-gray-300 mt-2">{new Date(m.created_at).toLocaleDateString('ko-KR')}</div>
            </div>
          </li>
        ))}
      </ul>

      {showCamera && <CameraCapture onCapture={(f) => { setFile(f); setShowCamera(false) }} onClose={() => setShowCamera(false)} />}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">새 모먼트</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 text-lg">✕</button>
            </div>
            <label className="block cursor-pointer mb-3">
              {file
                ? <img src={URL.createObjectURL(file)} alt="" className="w-full rounded-xl object-cover max-h-72" />
                : <div className="w-full h-40 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">📷 사진 선택</div>}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
            <button type="button" onClick={() => setShowCamera(true)} className="w-full mb-3 border border-blue-200 text-blue-600 rounded-xl py-2 text-sm">📷 카메라로 찍기 (구도 가이드)</button>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="문구 입력..." rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2" />
            {place ? (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <span className="bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5">📍 {place.name}</span>
                <button onClick={() => setPlace(null)} className="text-gray-400 text-xs">해제</button>
              </div>
            ) : (
              <div className="mb-3">
                <input value={placeQuery} onChange={(e) => searchPlace(e.target.value)} placeholder="📍 장소 태그 (선택)" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                {placeResults.length > 0 && (
                  <ul className="mt-1 border border-gray-100 rounded-xl overflow-hidden">
                    {placeResults.map((p) => (
                      <li key={p.id}><button onClick={() => { setPlace(p); setPlaceResults([]); setPlaceQuery('') }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{p.name}</button></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <button onClick={submitMoment} disabled={posting} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50">{posting ? '올리는 중...' : '게시하기'}</button>
          </div>
        </div>
      )}
    </div>
  )
}