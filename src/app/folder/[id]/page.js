'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FolderEditModal from '@/components/FolderEditModal'

export default function FolderDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [folder, setFolder] = useState(null)
  const [items, setItems] = useState([])
  const [showEdit, setShowEdit] = useState(false)

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setUser(u.user)
    const { data: f } = await supabase.from('folders').select('*').eq('id', id).single()
    setFolder(f)
    const { data: its } = await supabase.from('saved_places').select('id, places(*)').eq('folder_id', id)
    setItems(its ?? [])
  }
  useEffect(() => { load() }, [id])

  async function removeSaved(sid) { await supabase.from('saved_places').delete().eq('id', sid); load() }

  if (!folder) return <div className="p-6 text-gray-400">불러오는 중...</div>
  const isOwner = user && user.id === folder.user_id

  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href="/my" className="text-sm text-gray-400">← 내 폴더</Link>

      <div className="flex items-center gap-3 mt-2">
        <span className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: folder.color || '#3b82f6' }}>{folder.icon || '📍'}</span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold truncate">{folder.name}</h1>
          <p className="text-xs text-gray-400">{folder.is_public ? '🌐 공개' : '🔒 비공개'} · {items.length}곳</p>
        </div>
      </div>
      {folder.description && <p className="text-sm text-gray-500 mt-2">{folder.description}</p>}

      {isOwner && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => setShowEdit(true)} className="flex-1 border border-gray-200 rounded-full py-2 text-sm">✎ 편집</button>
          <Link href="/map" className="flex-1 border border-gray-200 rounded-full py-2 text-sm text-center">＋ 지도에서 추가</Link>
        </div>
      )}

      <ul className="flex flex-col gap-3 mt-5">
        {items.length === 0 && <p className="text-gray-400 text-sm">저장한 곳이 없어요.</p>}
        {items.map((it) => (
          <li key={it.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-start">
            <Link href={`/place/${it.places.id}`} className="min-w-0">
              <div className="font-bold text-sm truncate">{it.places.name}</div>
              <div className="text-xs text-gray-400 truncate">{it.places.address}</div>
              <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{it.places.category}</span>
            </Link>
            {isOwner && <button onClick={() => removeSaved(it.id)} className="text-xs text-gray-300 hover:text-red-500 shrink-0">빼기</button>}
          </li>
        ))}
      </ul>

      {showEdit && <FolderEditModal folder={folder} onClose={() => setShowEdit(false)} onSaved={load} onDeleted={() => router.push('/my')} />}
    </div>
  )
}