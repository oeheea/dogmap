'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const [user, setUser] = useState(null)
  const [avatar, setAvatar] = useState(null)

  useEffect(() => {
    async function loadUser(u) {
      setUser(u)
      if (u) {
        const { data } = await supabase.from('profiles').select('avatar_url, nickname').eq('id', u.id).single()
        setAvatar(data)
      } else setAvatar(null)
    }
    supabase.auth.getUser().then(({ data }) => loadUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => loadUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-30">
      <Link href="/" className="font-extrabold text-lg text-blue-600 flex items-center gap-1">🐾<span>멍냥플레이스</span></Link>
      <div>
        {user ? (
          <Link href="/me" className="block">
            {avatar?.avatar_url
              ? <img src={avatar.avatar_url} alt="프로필" className="w-9 h-9 rounded-full object-cover" />
              : <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">{(avatar?.nickname ?? '?').slice(0, 1)}</span>}
          </Link>
        ) : (
          <Link href="/login" className="text-sm bg-blue-600 text-white rounded-full px-4 py-1.5">로그인</Link>
        )}
      </div>
    </header>
  )
}