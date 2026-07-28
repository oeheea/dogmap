'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FolderEditModal from '@/components/FolderEditModal'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function FolderDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [folder, setFolder] = useState(null)
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const [editId, setEditId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('#3b82f6')

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setUser(u.user)
    const { data: f } = await supabase.from('folders').select('*').eq('id', id).single()
    setFolder(f)
    if (f) {
      const { data: its } = await supabase.from('saved_places').select('id, color, label, places(*)').eq('folder_id', id)
      setItems(its ?? [])
      if (u.user && u.user.id !== f.user_id) {
        const { data: sub } = await supabase.from('folder_subscriptions').select('id').eq('user_id', u.user.id).eq('folder_id', id).maybeSingle()
        setSubscribed(!!sub)
      }
    }
    setLoaded(true)
  }
  useEffect(() => { load() }, [id])

  function startEdit(it) { setEditId(it.id); setEditLabel(it.label ?? ''); setEditColor(it.color ?? '#3b82f6') }
  async function saveItem() {
    const { error } = await supabase.from('saved_places').update({ label: editLabel || null, color: editColor }).eq('id', editId)
    if (error) { alert('수정 실패: ' + error.message); return }
    setEditId(null); load()
  }
  async function delItem(sid) {
    if (!confirm('이 장소를 폴더에서 삭제할까요?')) return
    await supabase.from('saved_places').delete().eq('id', sid); load()
  }

  async function toggleSubscribe() {
    if (!user) { alert('로그인이 필요해요'); return }
    if (subscribed) {
      await supabase.from('folder_subscriptions').delete().eq('user_id', user.id).eq('folder_id', id)
      setSubscribed(false)
    } else {
      const { error } = await supabase.from('folder_subscriptions').insert({ user_id: user.id, folder_id: id })
      if (error) { alert(error.message); return }
      setSubscribed(true)
    }
  }

  function share() {
    const url = `${window.location.origin}/folder/${id}`
    if (!folder.is_public) { alert('공개 폴더만 공유할 수 있어요. "편집"에서 공개로 바꿔주세요 🐾'); return }
    navigator.clipboard.writeText(url); alert('공유 링크를 복사했어요! 🐾\n' + url)
  }

  if (!loaded) return <div className="p-6 text-gray-400">불러오는 중...</div>
  if (!folder) return (
    <div className="max-w-lg mx-auto p-6 text-center">
      <p className="text-gray-500">볼 수 없는 폴더예요.</p>
      <Link href="/map" className="inline-block mt-4 text-blue-600 text-sm">지도로 가기 →</Link>
    </div>
  )
  const isOwner = user && user.id === folder.user_id

  return (
    <div className="max-w-lg mx-auto p-4">
      <Link href={isOwner ? '/my' : '/map'} className="text-sm text-gray-400">← 뒤로</Link>

      <div className="flex items-center gap-3 mt-2">
        <span className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 bg-gray-100">{folder.icon || '📍'}</span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold truncate">{folder.name}</h1>
          <p className="text-xs text-gray-400">{folder.is_public ? '🌐 공개' : '🔒 비공개'} · {items.length}곳</p>
        </div>
      </div>
      {folder.description && <p className="text-sm text-gray-500 mt-2">{folder.description}</p>}

      <div className="flex gap-2 mt-4">
        {isOwner && <button onClick={() => setShowEdit(true)} className="flex-1 border border-gray-200 rounded-full py-2 text-sm">✎ 그룹 편집</button>}
        {!isOwner && folder.is_public && (
          <button onClick={toggleSubscribe} className={`flex-1 rounded-full py-2 text-sm ${subscribed ? 'border border-gray-200 text-gray-600' : 'bg-blue-600 text-white'}`}>
            {subscribed ? '구독중 ✓' : '＋ 구독'}
          </button>
        )}
        <button onClick={share} className="flex-1 bg-blue-600 text-white rounded-full py-2 text-sm">🔗 공유</button>
      </div>

      <ul className="flex flex-col gap-3 mt-5">
        {items.length === 0 && <p className="text-gray-400 text-sm">저장한 곳이 없어요.</p>}
        {items.map((it) => (
          <li key={it.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            {editId === it.id ? (
              <div className="flex flex-col gap-2">
                <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder={it.places.name}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setEditColor(c)} className="w-7 h-7 rounded-full border-2"
                      style={{ backgroundColor: c, borderColor: editColor === c ? '#111' : 'transparent' }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveItem} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">완료</button>
                  <button onClick={() => setEditId(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">취소</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <Link href={`/place/${it.places.id}`} className="flex items-start gap-2 min-w-0">
                  <span className="w-4 h-4 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: it.color || '#3b82f6' }} />
                  <span className="min-w-0">
                    <span className="font-bold text-sm block truncate">{it.label || it.places.name}</span>
                    <span className="text-xs text-gray-400 block truncate">{it.places.address}</span>
                  </span>
                </Link>
                {isOwner && (
                  <div className="flex gap-2 shrink-0 text-xs">
                    <button onClick={() => startEdit(it)} className="text-blue-500">수정</button>
                    <button onClick={() => delItem(it.id)} className="text-gray-300 hover:text-red-500">삭제</button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {showEdit && <FolderEditModal folder={folder} onClose={() => setShowEdit(false)} onSaved={load} onDeleted={() => router.push('/my')} />}
    </div>
  )
}