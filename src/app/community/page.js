'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'

const CATS = ['자유', '질문', '정보', '자랑']

export default function CommunityPage() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [writing, setWriting] = useState(false)
  const [cat, setCat] = useState('자유')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setUser(u.user)
    const { data } = await supabase.from('posts').select('*, comments(count)').order('created_at', { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    const nickname = user.user_metadata?.nickname ?? user.email
    const { error } = await supabase.from('posts').insert({ user_id: user.id, nickname, category: cat, title, content })
    if (error) { alert(error.message); return }
    setTitle(''); setContent(''); setCat('자유'); setWriting(false); load()
  }

  if (loading) return <Loading />

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-extrabold">커뮤니티</h1>
        {user && <button onClick={() => setWriting(!writing)} className="text-sm bg-blue-600 text-white rounded-full px-4 py-1.5">글쓰기</button>}
      </div>

      {writing && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-col gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28">
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" required className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용을 나눠보세요 🐾" required rows={4} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium">등록</button>
        </form>
      )}

      {posts.length === 0 && <p className="text-sm text-gray-400">아직 글이 없어요. 첫 글을 남겨보세요!</p>}
      <ul className="flex flex-col gap-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link href={`/community/${p.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 shrink-0">{p.category}</span>
                <span className="font-bold text-sm truncate">{p.title}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.content}</p>
              <div className="text-[11px] text-gray-400 mt-2">{p.nickname ?? '익명'} · {new Date(p.created_at).toLocaleDateString('ko-KR')} · 댓글 {p.comments?.[0]?.count ?? 0}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}