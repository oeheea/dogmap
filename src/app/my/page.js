'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ShapeIcon from '@/components/ShapeIcon'
import Loading from '@/components/Loading'
import LoginRequired from '@/components/LoginRequired'

export default function MyPage() {
  const [user, setUser] = useState(null)
  const [folders, setFolders] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setUser(u.user)
    if (!u.user) { setLoading(false); return }
    const { data } = await supabase.from('folders').select('*, saved_places(count)').eq('user_id', u.user.id).order('created_at')
    setFolders(data ?? [])
    const { data: s } = await supabase.from('folder_subscriptions').select('folders(*, saved_places(count))').eq('user_id', u.user.id)
    setSubs((s ?? []).map((d) => d.folders).filter(Boolean))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (loading) return <Loading />
  
  if (!user) return <LoginRequired />
  
  const Row = (f, tag) => (
    <li key={f.id}>
      <Link href={`/folder/${f.id}`} className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
        <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-gray-100"><ShapeIcon shape={f.icon} size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">{f.name}</div>
          <div className="text-xs text-gray-400">{tag || (f.is_public ? '🌐 공개' : '🔒 비공개')} · {f.saved_places?.[0]?.count ?? 0}곳</div>
        </div>
        <span className="text-gray-300 text-lg">›</span>
      </Link>
    </li>
  )

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-4">내 폴더</h1>
      {folders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📁</div>
          <p className="font-semibold text-gray-700">아직 저장한 폴더가 없어요</p>
          <p className="text-sm text-gray-400 mt-1">마음에 드는 곳을 폴더로 모아보세요 🐾</p>
          <Link href="/map" className="inline-block mt-4 bg-blue-600 text-white rounded-full px-6 py-2.5 text-sm font-medium">지도에서 저장하러 가기 →</Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">{folders.map((f) => Row(f))}</ul>
      )}
      
      {subs.length > 0 && (
        <>
          <h2 className="text-lg font-bold mt-6 mb-2">구독한 폴더</h2>
          <ul className="flex flex-col gap-2.5">{subs.map((f) => Row(f, '구독'))}</ul>
        </>
      )}
    </div>
  )
}