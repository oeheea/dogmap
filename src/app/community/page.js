'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'
import Icon from '@/components/Icon'

const CATS = ['자유', '질문', '정보', '자랑']

export default function CommunityPage() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState('')
  const [writing, setWriting] = useState(false)
  const [cat, setCat] = useState('자유')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setUser(u.user)
    const { data } = await supabase.from('posts').select('*, comments(count)').order('created_at', { ascending: false })
    const list = data ?? []
    const ids = [...new Set(list.map((p) => p.user_id))]
    let pmap = {}
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', ids)
      pmap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]))
    }
    setPosts(list.map((p) => ({ ...p, author: pmap[p.user_id], commentCount: p.comments?.[0]?.count ?? 0 })))
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

  const shown = activeCat ? posts.filter((p) => p.category === activeCat) : posts

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

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        <button onClick={() => setActiveCat('')} className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeCat === '' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}>전체</button>
        {CATS.map((c) => (
          <button key={c} onClick={() => setActiveCat(c)} className={`whitespace-nowrap text-sm rounded-full px-3.5 py-1.5 border transition ${activeCat === c ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{c}</button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-12">
          {activeCat ? `'${activeCat}' 글이 아직 없어요.` : '아직 글이 없어요. 첫 글을 남겨보세요 🐾'}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {shown.map((p) => (
          <li key={p.id}>
            <Link href={`/community/${p.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              <div className="flex items-center gap-2 mb-2">
                {p.author?.avatar_url
                  ? <img src={p.author.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  : <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-bold">{(p.author?.nickname ?? p.nickname ?? '?').slice(0, 1)}</span>}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{p.author?.nickname ?? p.nickname ?? '익명'}</div>
                  <div className="text-[11px] text-gray-400">{new Date(p.created_at).toLocaleDateString('ko-KR')}</div>
                </div>
                <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 shrink-0">{p.category}</span>
              </div>
              <div className="font-bold text-[15px]">{p.title}</div>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.content}</p>
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-2">
                <Icon name="message" size={14} strokeWidth={2} /> {p.commentCount}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}