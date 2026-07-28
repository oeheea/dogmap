'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const ICONS = ['📍', '⭐', '❤️', '🐶', '🐾', '☕', '🍽️', '🌳', '🏠', '🔥']

export default function MyPage() {
  const [user, setUser] = useState(null)
  const [folders, setFolders] = useState([])
  const [items, setItems] = useState([])
  const [editId, setEditId] = useState(null)

  async function load() {
    const { data: u } = await supabase.auth.getUser()
    setUser(u.user)
    if (!u.user) return
    const { data: fs } = await supabase.from('folders').select('*').eq('user_id', u.user.id).order('created_at')
    setFolders(fs ?? [])
    const ids = (fs ?? []).map((f) => f.id)
    if (ids.length) {
      const { data: its } = await supabase.from('saved_places').select('id, folder_id, places(*)').in('folder_id', ids)
      setItems(its ?? [])
    } else setItems([])
  }

  useEffect(() => { load() }, [])

  async function removeSaved(id) { await supabase.from('saved_places').delete().eq('id', id); load() }
  async function deleteFolder(id) {
    if (!confirm('폴더를 삭제할까요? 안의 저장도 사라져요.')) return
    await supabase.from('folders').delete().eq('id', id); load()
  }
  async function togglePublic(f) { await supabase.from('folders').update({ is_public: !f.is_public }).eq('id', f.id); load() }
  async function updateStyle(f, patch) { await supabase.from('folders').update(patch).eq('id', f.id); load() }

  if (!user) return (<div className="p-6">로그인이 필요해요. <Link href="/login" className="text-blue-600 underline">로그인</Link></div>)

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">내 폴더</h1>
        <Link href="/map" className="text-sm text-gray-500">지도로 →</Link>
      </div>

      {folders.length === 0 && <p className="text-gray-500">아직 폴더가 없어요. 지도에서 가게를 저장해보세요.</p>}

      <div className="flex flex-col gap-4">
        {folders.map((f) => {
          const saved = items.filter((it) => it.folder_id === f.id)
          return (
            <section key={f.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                    style={{ backgroundColor: f.color || '#3b82f6' }}>{f.icon || '📍'}</span>
                  {f.name} <span className="text-xs font-normal text-gray-400">{f.is_public ? '🌐 공개' : '🔒 나만'}</span>
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setEditId(editId === f.id ? null : f.id)} className="text-xs text-gray-500">🎨 꾸미기</button>
                  <button onClick={() => togglePublic(f)} className="text-xs text-blue-600">{f.is_public ? '🔒' : '🌐'}</button>
                  <button onClick={() => deleteFolder(f.id)} className="text-xs text-red-500">삭제</button>
                </div>
              </div>

              {editId === f.id && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {COLORS.map((c) => (
                      <button key={c} onClick={() => updateStyle(f, { color: c })}
                        className="w-6 h-6 rounded-full border-2"
                        style={{ backgroundColor: c, borderColor: f.color === c ? '#111' : 'transparent' }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ICONS.map((ic) => (
                      <button key={ic} onClick={() => updateStyle(f, { icon: ic })}
                        className={`w-7 h-7 rounded ${f.icon === ic ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white border'}`}>{ic}</button>
                    ))}
                  </div>
                </div>
              )}

              {saved.length === 0 && <p className="text-xs text-gray-500 mt-2">비어있어요</p>}
              <ul className="flex flex-col gap-2 mt-2">
                {saved.map((it) => (
                  <li key={it.id} className="flex justify-between items-center">
                    <Link href={`/place/${it.places.id}`} className="text-sm">
                      {it.places.name} <span className="text-xs text-gray-500">· {it.places.category}</span>
                    </Link>
                    <button onClick={() => removeSaved(it.id)} className="text-xs text-gray-400">빼기</button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </main>
  )
}