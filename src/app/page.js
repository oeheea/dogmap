'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // 지금 로그인돼 있는지 확인
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    // 로그인/로그아웃 변화 실시간 감지
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl font-bold">🐾 dogmap</h1>
      <p className="text-gray-500">반려동물과 갈 수 있는 곳을 찾아보세요</p>
      <Link href="/map" className="bg-green-600 text-white rounded px-4 py-2">지도 보기 🗺️</Link>

      {user ? (
        <div className="flex flex-col items-center gap-2">
          <p>{user.email} 님 환영합니다!</p>
          <button onClick={handleLogout} className="bg-gray-200 text-gray-800 rounded px-4 py-2">로그아웃</button>
        </div>
      ) : (
        <Link href="/login" className="bg-blue-600 text-white rounded px-4 py-2">로그인 / 회원가입</Link>
      )}
    </main>
  )
}