'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'

export default function Home() {
  const [user, setUser] = useState(null)
  const [folders, setFolders] = useState([])
  const [recent, setRecent] = useState([])
  const [myReviews, setMyReviews] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: u } = await supabase.auth.getUser()
      setUser(u.user)
      const { data: places } = await supabase.from('places').select('id, name, category, address')
        .eq('hidden', false).order('created_at', { ascending: false }).limit(5)
      setRecent(places ?? [])
      if (u.user) {
        const { data: fs } = await supabase.from('folders').select('*, saved_places(count)').eq('user_id', u.user.id).order('created_at')
        setFolders(fs ?? [])
        const { count } = await supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', u.user.id)
        setMyReviews(count ?? 0)
      }
      setLoading(false)
    }
    load()
  }, [])

  const nickname = user?.user_metadata?.nickname
  if (loading) return <Loading />

  return (
    <div className="max-w-lg mx-auto p-4">
      <section className="bg-blue-600 text-white rounded-3xl p-6 mb-5">
        <div className="text-3xl">🐾</div>
        <h1 className="text-2xl font-extrabold mt-1">멍냥플레이스</h1>
        <p className="text-sm text-blue-100 mt-1">반려동물과 함께 갈 수 있는 곳을 찾고, 기록하고, 공유해요</p>
        <div className="flex gap-2 mt-4">
          <Link href="/map" className="flex-1 text-center bg-white text-blue-600 rounded-full py-2.5 text-sm font-semibold">지도 보기</Link>
          <Link href="/browse" className="flex-1 text-center bg-blue-500 text-white rounded-full py-2.5 text-sm font-semibold">둘러보기</Link>
        </div>
      </section>

      {user ? (
        <>
          <p className="text-sm text-gray-500 mb-3">안녕하세요, <b className="text-gray-800">{nickname || '친구'}</b>님 🐾</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link href="/my" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-2xl font-extrabold">{folders.length}</div>
              <div className="text-xs text-gray-400">내 폴더</div>
            </Link>
            <Link href="/my-reviews" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-2xl font-extrabold">{myReviews}</div>
              <div className="text-xs text-gray-400">내 후기</div>
            </Link>
          </div>

          {folders.length > 0 && (
            <>
              <h2 className="font-bold mb-2">내 폴더</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                {folders.map((f) => (
                  <Link key={f.id} href={`/folder/${f.id}`} className="shrink-0 bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">{f.icon || '📍'}</span>
                    <span className="text-sm font-medium whitespace-nowrap">{f.name} <span className="text-gray-400">{f.saved_places?.[0]?.count ?? 0}</span></span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 text-center">
          <p className="text-sm text-gray-500">로그인하면 즐겨찾기·후기를 남길 수 있어요</p>
          <Link href="/login" className="inline-block mt-3 bg-blue-600 text-white rounded-full px-6 py-2.5 text-sm font-semibold">로그인 / 회원가입</Link>
        </div>
      )}

      <h2 className="font-bold mb-2">최근 등록된 곳</h2>
      {recent.length === 0 && <p className="text-sm text-gray-400">아직 등록된 장소가 없어요.</p>}
      <ul className="flex flex-col gap-2">
        {recent.map((p) => (
          <li key={p.id}>
            <Link href={`/place/${p.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-xs text-gray-400">{p.category} · {p.address}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}