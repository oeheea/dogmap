'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'

const CATS = ['자유', '질문', '정보', '자랑']

export default function PostDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [post, setPost] = useState(null)
  const [author, setAuthor] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)
  const [eTitle, setETitle] = useState('')
  const [eContent, setEContent] = useState('')
  const [eCat, setECat] = useState('자유')

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setUser(u.user)
    const { data: p } = await supabase.from('posts').select('*').eq('id', id).single()
    setPost(p)
    if (p) {
      const { data: prof } = await supabase.from('profiles').select('id, nickname, avatar_url').eq('id', p.user_id).single()
      setAuthor(prof)
    }
    const { data: cs } = await supabase.from('comments').select('*').eq('post_id', id).order('created_at')
    const list = cs ?? []
    const cids = [...new Set(list.map((c) => c.user_id))]
    let cmap = {}
    if (cids.length) {
      const { data: cprofs } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', cids)
      cmap = Object.fromEntries((cprofs ?? []).map((p) => [p.id, p]))
    }
    setComments(list.map((c) => ({ ...c, author: cmap[c.user_id] })))
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function addComment(e) {
    e.preventDefault()
    if (!text.trim()) return
    const nickname = user.user_metadata?.nickname ?? user.email
    const { error } = await supabase.from('comments').insert({ post_id: id, user_id: user.id, nickname, content: text })
    if (error) { alert(error.message); return }
    setText(''); load()
  }
  async function delComment(cid) {
    if (!confirm('댓글을 삭제할까요?')) return
    await supabase.from('comments').delete().eq('id', cid)
    load()
  }
  async function delPost() {
    if (!confirm('글을 삭제할까요?')) return
    await supabase.from('posts').delete().eq('id', id)
    router.push('/community')
  }

  function startEdit() { setETitle(post.title); setEContent(post.content); setECat(post.category); setEditing(true) }
  async function saveEdit() {
    const { error } = await supabase.from('posts').update({ title: eTitle, content: eContent, category: eCat }).eq('id', id)
    if (error) { alert(error.message); return }
    setEditing(false); load()
  }

  if (loading) return <Loading />
  if (!post) return <div className="max-w-lg mx-auto p-6 text-center text-gray-500">없는 글이에요.</div>

  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href="/community" className="text-sm text-gray-400">← 커뮤니티</Link>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-2">
        {editing ? (
          <div className="flex flex-col gap-2">
            <select value={eCat} onChange={(e) => setECat(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28">
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={eTitle} onChange={(e) => setETitle(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <textarea value={eContent} onChange={(e) => setEContent(e.target.value)} rows={4} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">수정 완료</button>
              <button onClick={() => setEditing(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">취소</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-3">
              <Link href={`/profile/${post.user_id}`} className="shrink-0">
                {author?.avatar_url
                  ? <img src={author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  : <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">{(author?.nickname ?? post.nickname ?? '?').slice(0, 1)}</span>}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${post.user_id}`} className="text-sm font-semibold hover:underline block truncate">{author?.nickname ?? post.nickname ?? '익명'}</Link>
                <div className="text-[11px] text-gray-400">{new Date(post.created_at).toLocaleDateString('ko-KR')}</div>
              </div>
              <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 shrink-0">{post.category}</span>
            </div>
            <h1 className="text-xl font-extrabold">{post.title}</h1>
            <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            {user && user.id === post.user_id && (
              <div className="flex gap-3 mt-4 pt-3 border-t border-gray-50">
                <button onClick={startEdit} className="text-xs text-blue-500">수정</button>
                <button onClick={delPost} className="text-xs text-red-400">삭제</button>
              </div>
            )}
          </>
        )}
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
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.content}</p>
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