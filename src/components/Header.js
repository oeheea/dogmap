'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [unread, setUnread] = useState(0)

  async function refreshUnread(uid) {
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false)
    setUnread(count ?? 0)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setUnread(0); return }
    if (pathname === '/notifications') { setUnread(0); return }
    refreshUnread(user.id)
  }, [user, pathname])

  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-30">
      <Link href="/" className="font-extrabold text-lg text-blue-600 flex items-center gap-1">🐾<span>멍냥플레이스</span></Link>
      {user ? (
        <Link href="/notifications" className="relative text-gray-500 hover:text-blue-600" aria-label="알림">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unread > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
        </Link>
      ) : (
        <Link href="/login" className="text-sm bg-blue-600 text-white rounded-full px-4 py-1.5">로그인</Link>
      )}
    </header>
  )
}