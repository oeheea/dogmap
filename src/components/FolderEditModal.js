'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const ICONS = ['📍', '⭐', '❤️', '🐶', '🐾', '☕', '🍽️', '🌳', '🏠', '🔥']

export default function FolderEditModal({ folder, onClose, onSaved, onDeleted }) {
  const [name, setName] = useState(folder.name)
  const [description, setDescription] = useState(folder.description ?? '')
  const [isPublic, setIsPublic] = useState(folder.is_public)
  const [icon, setIcon] = useState(folder.icon ?? '📍')

  async function save() {
    if (!name.trim()) { alert('이름을 입력해주세요'); return }
    const { error } = await supabase.from('folders').update({ name, description, is_public: isPublic, icon }).eq('id', folder.id)
    if (error) { alert(error.message); return }
    onSaved && onSaved(); onClose()
  }
  async function remove() {
    if (!confirm('그룹을 삭제할까요? 안의 저장도 사라져요.')) return
    await supabase.from('folders').delete().eq('id', folder.id)
    onDeleted && onDeleted(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="w-6" />
          <h2 className="font-bold text-lg">그룹 수정</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">공개 허용</span>
          <div className="flex bg-gray-100 rounded-full p-1">
            <button onClick={() => setIsPublic(true)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${isPublic ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>공개</button>
            <button onClick={() => setIsPublic(false)} className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${!isPublic ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>🔒 비공개</button>
          </div>
        </div>
        {isPublic && <p className="text-xs text-blue-500 mb-3">공개 그룹은 다른 사람이 보고 구독할 수 있어요.</p>}

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="그룹 이름"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2 mt-2" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)" rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-5" />

        <p className="font-semibold text-sm mb-2">모양 선택</p>
        <div className="grid grid-cols-5 gap-2 mb-6">
          {ICONS.map((ic) => (
            <button key={ic} onClick={() => setIcon(ic)}
              className={`h-12 rounded-xl text-xl flex items-center justify-center transition ${icon === ic ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50 hover:bg-gray-100'}`}>{ic}</button>
          ))}
        </div>

        <button onClick={save} className="w-full bg-blue-600 hover:bg-blue-700 transition text-white rounded-xl py-3 font-semibold">완료</button>
        <button onClick={remove} className="w-full text-red-400 text-sm py-3">그룹 삭제</button>
      </div>
    </div>
  )
}