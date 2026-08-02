'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'

export default function MomentDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [m, setM] = useState(null)
  const [author, setAuthor] = useState(null)
  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)
  const [eCaption, setECaption] = useState('')
  const [ePlaceQuery, setEPlaceQuery] = useState('')
  const [ePlaceResults, setEPlaceResults] = useState([])
  const [ePlace, setEPlace] = useState(null)

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setUser(u.user)
    const { data: mm } = await supabase.from('moments').select('*, places(name)').eq('id', id).single()
    setM(mm)
    if (mm) {
      setECaption(mm.caption ?? '')
      setEPlace(mm.place_id ? { id: mm.place_id, name: mm.places?.name } : null)
      const { data: prof } = await supabase.from('profiles').select('id, nickname, avatar_url').eq('id', mm.user_id).single()
      setAuthor(prof)
      const { count } = await supabase.from('moment_likes').select('id', { count: 'exact', head: true }).eq('moment_id', id)
      setLikeCount(count ?? 0)
      if (u.user) {
        const { data: myl } = await supabase.from('moment_likes').select('id').eq('moment_id', id).eq('user_id', u.user.id).maybeSingle()
        setLiked(!!myl)
      }
      const { data: cs } = await supabase.from('moment_comments').select('*').eq('moment_id', id).order('created_at')
      const cids = [...new Set((cs ?? []).map((c) => c.user_id))]
      let cmap = {}
      if (cids.length) {
        const { data: cprofs } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', cids)
        cmap = Object.fromEntries((cprofs ?? []).map((p) => [p.id, p]))
      }
      setComments((cs ?? []).map((c) => ({ ...c, author: cmap[c.user_id] })))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function toggleLike() {
    if (!user) { alert('로그인이 필요해요'); return }
    if (liked) { await supabase.from('moment_likes').delete().eq('moment_id', id).eq('user_id', user.id); setLiked(false); setLikeCount((c) => c - 1) }
    else { await supabase.from('moment_likes').insert({ moment_id: id, user_id: user.id }); setLiked(true); setLikeCount((c) => c + 1) }
  }
  async function addComment(e) {
    e.preventDefault(); if (!text.trim()) return
    const nickname = user.user_metadata?.nickname ?? user.email
    await supabase.from('moment_comments').insert({ moment_id: id, user_id: user.id, nickname, content: text })
    setText(''); load()
  }
  async function delComment(cid) {
    if (!confirm('댓글을 삭제할까요?')) return
    await supabase.from('moment_comments').delete().eq('id', cid)
    load()
  }
  async function delMoment() {
    if (!confirm('게시물을 삭제할까요?')) return
    await supabase.from('moments').delete().eq('id', id); router.push('/moments')
  }
  async function searchEPlace(q) {
    setEPlaceQuery(q)
    if (!q.trim()) { setEPlaceResults([]); return }
    const { data } = await supabase.from('places').select('id, name').ilike('name', `%${q}%`).limit(6)
    setEPlaceResults(data ?? [])
  }
  async function saveEdit() {
    await supabase.from('moments').update({ caption: eCaption, place_id: ePlace?.id ?? null }).eq('id', id)
    setEditing(false); load()
  }

  if (loading) return <Loading />
  if (!m) return <div className="max-w-lg mx-auto p-6 text-center text-gray-500">없는 게시물이에요.</div>
  const isOwner = user && user.id === m.user_id

  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href="/moments" className="text-sm text-gray-400">← 모먼트</Link>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-2">
        <div className="flex items-center justify-between p-3">
          <Link href={`/profile/${m.user_id}`} className="flex items-center gap-2">
            {author?.avatar_url ? <img src={author.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" /> : <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{(author?.nickname ?? '?').slice(0, 1)}</span>}
            <span className="text-sm font-semibold">{author?.nickname ?? m.nickname ?? '익명'}</span>
          </Link>
          {isOwner && !editing && (
            <div className="flex gap-3 text-xs">
              <button onClick={() => setEditing(true)} className="text-blue-500">수정</button>
              <button onClick={delMoment} className="text-red-400">삭제</button>
            </div>
          )}
        </div>
        <img src={m.image_url} alt="" className="w-full object-cover" />
        <div className="p-3">
          <button onClick={toggleLike} className="text-sm">{liked ? '❤️' : '🤍'} {likeCount}</button>
          {editing ? (
            <div className="mt-3 flex flex-col gap-2">
              <textarea value={eCaption} onChange={(e) => setECaption(e.target.value)} rows={2} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              {ePlace ? (
                <div className="flex items-center gap-2 text-sm"><span className="bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5">📍 {ePlace.name}</span><button onClick={() => setEPlace(null)} className="text-gray-400 text-xs">해제</button></div>
              ) : (
                <div>
                  <input value={ePlaceQuery} onChange={(e) => searchEPlace(e.target.value)} placeholder="📍 장소 태그" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  {ePlaceResults.length > 0 && <ul className="mt-1 border border-gray-100 rounded-lg overflow-hidden">{ePlaceResults.map((p) => <li key={p.id}><button onClick={() => { setEPlace(p); setEPlaceResults([]); setEPlaceQuery('') }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{p.name}</button></li>)}</ul>}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">저장</button>
                <button onClick={() => setEditing(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">취소</button>
              </div>
            </div>
          ) : (
            <>
              {m.caption && <p className="text-sm mt-2"><b>{author?.nickname ?? m.nickname}</b> {m.caption}</p>}
              {m.place_id && m.places?.name && <Link href={`/place/${m.place_id}`} className="inline-block mt-2 text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5">📍 {m.places.name}</Link>}
              <div className="text-[11px] text-gray-300 mt-2">{new Date(m.created_at).toLocaleDateString('ko-KR')}</div>
            </>
          )}
        </div>
      </div>

      <h2 className="font-bold mt-6 mb-2">댓글 {comments.length}</h2>
      {user ? (
        <form onSubmit={addComment} className="flex gap-2 mb-4">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="댓글 달기" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button className="bg-blue-600 text-white rounded-lg px-4 text-sm">등록</button>
        </form>
      ) : <p className="text-sm text-gray-400 mb-4"><Link href="/login" className="text-blue-600 underline">로그인</Link> 후 댓글 가능</p>}
      <ul className="flex flex-col gap-2">
        {comments.map((c) => (
          <li key={c.id} className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <Link href={`/profile/${c.user_id}`} className="shrink-0">
                  {c.author?.avatar_url
                    ? <img src={c.author.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    : <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-bold">{(c.author?.nickname ?? c.nickname ?? '?').slice(0, 1)}</span>}
                </Link>
                <div className="min-w-0">
                  <Link href={`/profile/${c.user_id}`} className="text-sm font-semibold hover:underline">{c.author?.nickname ?? c.nickname ?? '익명'}</Link>
                  <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                </div>
              </div>
              {user && user.id === c.user_id && <button onClick={() => delComment(c.id)} className="text-xs text-gray-300 hover:text-red-500 shrink-0">삭제</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}