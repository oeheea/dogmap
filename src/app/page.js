'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatAddress } from '@/lib/format'
import ShapeIcon from '@/components/ShapeIcon'
import Loading from '@/components/Loading'

const SHORTCUTS = [
  { href: '/my', label: '내 폴더', icon: '📁', bg: 'bg-rose-50' },
  { href: '/moments', label: '모먼트', icon: '📸', bg: 'bg-pink-50' },
  { href: '/community', label: '커뮤니티', icon: '💬', bg: 'bg-amber-50' },
  { href: '/feed', label: '피드', icon: '📰', bg: 'bg-violet-50' },
]

function catTile(cat) {
  const c = cat || ''
  if (c.includes('애견카페')) return { icon: '🐶', cls: 'bg-orange-50' }
  if (c.includes('카페')) return { icon: '☕', cls: 'bg-amber-50' }
  if (c.includes('밥집') || c.includes('식당')) return { icon: '🍽️', cls: 'bg-rose-50' }
  if (c.includes('펜션') || c.includes('호텔')) return { icon: '🏡', cls: 'bg-emerald-50' }
  return { icon: '📍', cls: 'bg-gray-100' }
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [folders, setFolders] = useState([])
  const [recent, setRecent] = useState([])
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
      }
      setLoading(false)
    }
    load()
  }, [])

  const nickname = user?.user_metadata?.nickname
  if (loading) return <Loading />

  return (
    <div className="max-w-lg mx-auto p-4">
      <section className="bg-blue-600 text-white rounded-3xl p-6 mb-4">
        <div className="text-sm font-medium text-white/90">🐾 멍냥플레이스</div>
        <h1 className="text-2xl font-extrabold mt-2 leading-snug">반려동물과<br />어디든 함께</h1>
        <p className="text-sm text-white/80 mt-1.5">동반 가능한 카페·밥집·펜션을 찾아보세요</p>
        <Link href="/browse" className="mt-4 flex items-center gap-2 bg-white rounded-full px-4 py-3 text-gray-400 text-sm">
          <span>🔍</span> 어디로 갈까요?
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition">
            <span className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center text-xl shrink-0`}>{s.icon}</span>
            <span className="font-semibold text-sm">{s.label}</span>
          </Link>
        ))}
      </div>

      {user ? (
        <>
          <p className="text-sm text-gray-500 mb-3">안녕하세요, <b className="text-gray-800">{nickname || '친구'}</b>님 🐾</p>
          {folders.length > 0 && (
            <>
              <h2 className="font-bold mb-2">내 폴더</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                {folders.map((f) => (
                  <Link key={f.id} href={`/folder/${f.id}`} className="shrink-0 bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><ShapeIcon shape={f.icon} size={18} /></span>
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
      <ul className="flex flex-col gap-2.5">
        {recent.map((p) => {
          const t = catTile(p.category)
          return (
            <li key={p.id}>
              <Link href={`/place/${p.id}`} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md transition">
                <span className={`w-12 h-12 rounded-2xl ${t.cls} flex items-center justify-center text-xl shrink-0`}>{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{p.name}</div>
                  <div className="text-xs text-gray-400 truncate">{p.category} · {formatAddress(p.address)}</div>
                </div>
                <span className="text-gray-300">›</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="text-center text-[11px] text-gray-400 mt-8 mb-2">장소 데이터 · 한국문화정보원(공공데이터포털 data.go.kr)</p>
    </div>
  )
}