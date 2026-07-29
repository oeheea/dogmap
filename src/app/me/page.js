'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: p } = await supabase.from('profiles').select('nickname, avatar_url, is_admin').eq('id', data.user.id).single()
        setProfile(p)
      }
    })
  }, [])

  async function logout() { await supabase.auth.signOut(); router.push('/login') }

  if (!user) return (
    <div className="max-w-lg mx-auto p-6 text-center text-gray-500">
      <p className="mb-3">로그인하고 나만의 멍냥플레이스를 만들어보세요 🐾</p>
      <Link href="/login" className="inline-block bg-blue-600 text-white rounded-full px-5 py-2 text-sm">로그인</Link>
    </div>
  )

  const menu = [
    { href: `/profile/${user.id}`, label: '내 프로필', icon: '😊' },
    { href: '/my', label: '내 폴더', icon: '📁' },
    { href: '/my-reviews', label: '내 후기', icon: '✍️' },
    { href: '/feed', label: '피드', icon: '📰' },
    { href: '/community', label: '커뮤니티', icon: '💬' },
  ]

  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href={`/profile/${user.id}`} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
          : <span className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">{(profile?.nickname ?? '?').slice(0, 1)}</span>}
        <div className="min-w-0">
          <div className="font-extrabold text-lg truncate">{profile?.nickname ?? '익명'}</div>
          <div className="text-xs text-gray-400">프로필 보기 →</div>
        </div>
      </Link>

      <ul className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {menu.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
              <span className="text-lg w-6 text-center">{m.icon}</span>
              <span className="text-sm font-medium flex-1">{m.label}</span>
              <span className="text-gray-300">›</span>
            </Link>
          </li>
        ))}
        {profile?.is_admin && (
          <li>
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 hover:bg-red-50">
              <span className="text-lg w-6 text-center">🛠️</span>
              <span className="text-sm font-medium flex-1 text-red-500">관리자</span>
              <span className="text-gray-300">›</span>
            </Link>
          </li>
        )}
      </ul>

      <button onClick={logout} className="w-full mt-4 border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm hover:bg-gray-50">로그아웃</button>
    </div>
  )
}