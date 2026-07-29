'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/map', label: '지도' },
  { href: '/moments', label: '모먼트' },
  { href: '/walk', label: '산책' },
  { href: '/browse', label: '둘러보기' },
  { href: '/community', label: '커뮤니티' },
  { href: '/feed', label: '피드' },
  { href: '/my', label: '내 폴더' },
  { href: '/my-reviews', label: '내 후기' },
]

export default function Header() {
  const pathname = usePathname()
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
    <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center px-3 gap-1 sticky top-0 z-30 overflow-x-auto">
      <Link href="/" className="font-extrabold text-lg mr-1 text-blue-600 whitespace-nowrap shrink-0">
        🐾<span className="hidden sm:inline"> 멍냥플레이스</span>
      </Link>
      <nav className="flex items-center gap-1 shrink-0">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              pathname === n.href ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {n.label}
          </Link>
        ))}
      </nav>
      {user?.email === 'oe7eea7@gmail.com' && (
        <Link href="/admin" className="px-2.5 py-1.5 rounded-full text-sm font-medium text-red-500 hover:bg-red-50 whitespace-nowrap shrink-0">관리</Link>
      )}
      <div className="ml-auto shrink-0 pl-2">
        {user ? (
          <Link href={`/profile/${user.id}`} className="block">
            {avatar?.avatar_url ? (
              <img src={avatar.avatar_url} alt="프로필" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{(avatar?.nickname ?? '?').slice(0, 1)}</span>
            )}
          </Link>
        ) : (
          <Link href="/login" className="text-sm bg-blue-600 text-white rounded-full px-4 py-1.5 whitespace-nowrap">로그인</Link>
        )}
      </div>
    </header>
  )
}