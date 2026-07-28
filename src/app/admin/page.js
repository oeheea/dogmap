'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'oe7eea7@gmail.com'  // 관리자 이메일

export default function AdminPage() {
  const [user, setUser] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [places, setPlaces] = useState([])

  async function load() {
    const { data: u } = await supabase.auth.getUser()
    setUser(u.user); setLoaded(true)
    if (u.user?.email !== ADMIN_EMAIL) return
    const { data } = await supabase.from('places').select('*, reports(count)').eq('hidden', true).order('created_at', { ascending: false })
    setPlaces(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function restore(id) { await supabase.from('places').update({ hidden: false }).eq('id', id); load() }
  async function remove(id) {
    if (!confirm('완전히 삭제할까요? 되돌릴 수 없어요.')) return
    await supabase.from('places').delete().eq('id', id); load()
  }

  if (!loaded) return <div className="p-6 text-gray-400">불러오는 중...</div>
  if (user?.email !== ADMIN_EMAIL) return (
    <div className="max-w-lg mx-auto p-6 text-center text-gray-500">관리자만 볼 수 있는 페이지예요.</div>
  )

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-1">관리자 · 신고된 가게</h1>
      <p className="text-sm text-gray-400 mb-4">신고로 숨겨진 가게 {places.length}곳</p>
      {places.length === 0 && <p className="text-gray-400 text-sm">숨겨진 가게가 없어요 🐾</p>}
      <ul className="flex flex-col gap-3">
        {places.map((p) => (
          <li key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="font-bold text-sm">{p.name}</div>
            <div className="text-xs text-gray-400">{p.category} · {p.address}</div>
            <div className="text-xs text-red-500 mt-1">🚩 신고 {p.reports?.[0]?.count ?? 0}건</div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => restore(p.id)} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">복구</button>
              <button onClick={() => remove(p.id)} className="flex-1 border border-gray-200 text-red-500 rounded-lg py-2 text-sm">완전 삭제</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}