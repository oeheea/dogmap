'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/map', label: '지도' },
  { href: '/browse', label: '둘러보기' },
  { href: '/my', label: '내 폴더' },
  { href: '/my-reviews', label: '내 후기' },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
      <div className="ml-auto shrink-0 pl-2 flex items-center gap-3">
        {user && <Link href={`/profile/${user.id}`} className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap">프로필</Link>}
        {user ? (
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-900 whitespace-nowrap">로그아웃</button>
        ) : (
          <Link href="/login" className="text-sm bg-blue-600 text-white rounded-full px-4 py-1.5 whitespace-nowrap">로그인</Link>
        )}
      </div>
    </header>
  )
}