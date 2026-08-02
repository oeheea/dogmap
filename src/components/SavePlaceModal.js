'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ShapeIcon from '@/components/ShapeIcon'
import { SHAPES } from '@/lib/shapes'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function SavePlaceModal({ place, userId, onClose, onSaved }) {
  const [folders, setFolders] = useState([])
  const [step, setStep] = useState('select')
  const [newFolder, setNewFolder] = useState('')
  const [newPublic, setNewPublic] = useState(false)
  const [newIcon, setNewIcon] = useState('star')
  const [newDesc, setNewDesc] = useState('')
  const [chosen, setChosen] = useState(null)
  const [svLabel, setSvLabel] = useState('')
  const [svNote, setSvNote] = useState('')
  const [svColor, setSvColor] = useState('#3b82f6')

  async function loadFolders() {
    const { data } = await supabase.from('folders').select('*, saved_places(count)').eq('user_id', userId).order('created_at')
    setFolders(data ?? [])
  }
  useEffect(() => { loadFolders() }, [])

  async function createFolder() {
    if (!newFolder.trim()) { alert('그룹 이름을 입력해주세요'); return }
    const { error } = await supabase.from('folders').insert({ user_id: userId, name: newFolder, is_public: newPublic, icon: newIcon, description: newDesc })
    if (error) { alert(error.message); return }
    setNewFolder(''); setNewPublic(false); setNewIcon('star'); setNewDesc('')
    await loadFolders(); onSaved?.(); setStep('select')
  }
  function chooseFolder(f) {
    setChosen(f); setSvLabel(place.name); setSvNote(''); setSvColor('#3b82f6'); setStep('detail')
  }
  async function confirmSave() {
    const { error } = await supabase.from('saved_places').insert({ folder_id: chosen.id, place_id: place.id, label: svLabel, note: svNote, color: svColor })
    if (error) { alert('저장 실패: ' + error.message); return }
    onSaved?.(); onClose(); alert('저장했어요! 🐾')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white text-gray-900 rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {step === 'select' && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">그룹 선택</h2>
              <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
            </div>
            <button onClick={() => setStep('create')} className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-3 mb-2 text-blue-600 font-medium">
              <span className="w-9 h-9 rounded-lg border border-blue-200 flex items-center justify-center text-lg">＋</span>
              새 그룹 추가
            </button>
            <ul className="flex flex-col gap-1">
              {folders.map((f) => (
                <li key={f.id}>
                  <button onClick={() => chooseFolder(f)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 text-left">
                    <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center"><ShapeIcon shape={f.icon} size={18} /></span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-sm truncate">{f.name}</span>
                      <span className="block text-[11px] text-gray-400">개수 {f.saved_places?.[0]?.count ?? 0} · {f.is_public ? '🌐 공개' : '🔒 비공개'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {step === 'create' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setStep('select')} className="text-gray-400 text-sm">← 뒤로</button>
              <h2 className="font-bold text-lg">새 그룹 추가</h2>
              <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm">공개 허용</span>
              <div className="flex bg-gray-100 rounded-full p-1">
                <button onClick={() => setNewPublic(true)} className={`px-4 py-1.5 rounded-full text-sm ${newPublic ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>공개</button>
                <button onClick={() => setNewPublic(false)} className={`px-4 py-1.5 rounded-full text-sm ${!newPublic ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>🔒 비공개</button>
              </div>
            </div>
            <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="그룹 이름" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2" />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="설명 (선택)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4" />
            <p className="font-semibold text-sm mb-2">모양 선택</p>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {SHAPES.map((s) => (
                <button key={s} type="button" onClick={() => setNewIcon(s)} className={`h-11 rounded-xl flex items-center justify-center ${newIcon === s ? 'bg-blue-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <ShapeIcon shape={s} color={newIcon === s ? '#ffffff' : '#2563eb'} size={20} />
                </button>
              ))}
            </div>
            <button onClick={createFolder} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold">완료</button>
          </>
        )}
        {step === 'detail' && chosen && (
          <>
            <div className="flex justify-between items-center mb-3">
              <button onClick={() => setStep('select')} className="text-gray-400 text-sm">← 뒤로</button>
              <h2 className="font-bold text-lg">즐겨찾기 저장</h2>
              <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
            </div>
            <p className="text-xs text-gray-400 mb-3 flex items-center gap-1"><ShapeIcon shape={chosen.icon} size={14} /> {chosen.name} 에 저장</p>
            <input value={svLabel} onChange={(e) => setSvLabel(e.target.value)} placeholder="장소 이름" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2" />
            <input value={svNote} onChange={(e) => setSvNote(e.target.value)} placeholder="설명 (선택)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4" />
            <p className="text-xs text-gray-500 mb-1">핀 색상</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setSvColor(c)} className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: c, borderColor: svColor === c ? '#111' : 'transparent' }} />
              ))}
            </div>
            <button onClick={confirmSave} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold">완료</button>
          </>
        )}
      </div>
    </div>
  )
}