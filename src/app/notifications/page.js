'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'
import Icon from '@/components/Icon'

const MSG = {
  moment_like: '님이 회원님의 사진을 좋아합니다',
  moment_comment: '님이 회원님의 사진에 댓글을 남겼습니다',
  review_like: '님이 회원님의 후기를 도움돼요 했습니다',
  follow: '님이 회원님을 팔로우했습니다',
}
function linkFor(n) {
  if (n.type === 'moment_like' || n.type === 'moment_comment') return `/moments/${n.target_id}`
  if (n.type === 'review_like') return `/place/${n.target_id}`
  if (n.type === 'follow') return `/profile/${n.target_id}`
  return '/'
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return '방금'
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return `${Math.floor(s / 86400)}일 전`
}

export default function NotificationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      setUser(u.user)
      if (!u.user) { setLoading(false); return }
      const { data: ns } = await supabase.from('notifications').select('*').eq('user_id', u.user.id).order('created_at', { ascending: false }).limit(50)
      const list = ns ?? []
      const actorIds = [...new Set(list.map((n) => n.actor_id).filter(Boolean))]
      let amap = {}
      if (actorIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', actorIds)
        amap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]))
      }
      setItems(list.map((n) => ({ ...n, actor: amap[n.actor_id] })))
      setLoading(false)
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', u.user.id).eq('is_read', false)
    })()
  }, [])

  if (loading) return <Loading />
  if (!user) return <div className="max-w-lg mx-auto p-6 text-center text-gray-500">로그인이 필요해요.</div>

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2">알림 <Icon name="bell" size={22} className="text-gray-500" /></h1>
      {items.length === 0 && <p className="text-sm text-gray-400 text-center py-10">아직 알림이 없어요 🐾</p>}
      <ul className="flex flex-col gap-1">
        {items.map((n) => (
          <li key={n.id}>
            <Link href={linkFor(n)} className={`flex items-center gap-3 p-3 rounded-xl ${n.is_read ? '' : 'bg-blue-50'}`}>
              {n.actor?.avatar_url
                ? <img src={n.actor.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                : <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">{(n.actor?.nickname ?? '?').slice(0, 1)}</span>}
              <div className="min-w-0 flex-1">
                <p className="text-sm"><b>{n.actor?.nickname ?? '누군가'}</b>{MSG[n.type] ?? '님의 활동'}</p>
                <p className="text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}