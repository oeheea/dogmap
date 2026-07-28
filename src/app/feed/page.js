'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'
import LoginRequired from '@/components/LoginRequired'

export default function FeedPage() {
  const [user, setUser] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setUser(u.user)
    if (!u.user) { setLoading(false); return }
    const { data: fol } = await supabase.from('follows').select('following_id').eq('follower_id', u.user.id)
    const ids = (fol ?? []).map((f) => f.following_id)
    if (ids.length === 0) { setReviews([]); setLoading(false); return }
    const { data: profs } = await supabase.from('profiles').select('id, nickname, avatar_url, reviews_public').in('id', ids)
    const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]))
    const publicIds = (profs ?? []).filter((p) => p.reviews_public).map((p) => p.id)
    if (publicIds.length === 0) { setReviews([]); setLoading(false); return }
    const { data: rv } = await supabase.from('reviews').select('*, places(name, category)').in('user_id', publicIds).order('created_at', { ascending: false }).limit(50)
    setReviews((rv ?? []).map((r) => ({ ...r, author: profMap[r.user_id] })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (loading) return <Loading />
  if (!user) return <LoginRequired />
  
  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-4">피드</h1>
      {reviews.length === 0 && <p className="text-sm text-gray-400">팔로우한 사람의 공개 후기가 여기 모여요. 프로필에서 팔로우해보세요 🐾</p>}
      <ul className="flex flex-col gap-3">
        {reviews.map((r) => (
          <li key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <Link href={`/profile/${r.user_id}`} className="flex items-center gap-2 mb-2">
              {r.author?.avatar_url
                ? <img src={r.author.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                : <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{(r.author?.nickname ?? '?').slice(0, 1)}</span>}
              <span className="text-sm font-semibold">{r.author?.nickname ?? r.nickname ?? '익명'}</span>
            </Link>
            <Link href={`/place/${r.place_id}`} className="block">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm truncate">{r.places?.name ?? '(삭제된 장소)'}</span>
                <span className="text-amber-500 text-sm shrink-0">{'★'.repeat(r.rating)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{r.content}</p>
              {r.image_url && <img src={r.image_url} alt="" className="mt-2 rounded-lg max-h-52 object-cover" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}