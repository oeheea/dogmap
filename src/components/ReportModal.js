'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReportModal({ placeId, placeName, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit() {
    setBusy(true)
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) { alert('로그인이 필요해요'); setBusy(false); return }
    const { error } = await supabase.from('reports').insert({ place_id: placeId, user_id: u.user.id, reason: reason || null })
    setBusy(false)
    if (error) {
      if (error.code === '23505') { alert('이미 신고한 곳이에요.'); onClose(); return }
      alert('신고 실패: ' + error.message); return
    }
    alert('신고했어요. 검토 후 조치돼요 🐾')
    onDone && onDone(); onClose()
  }
  return (
    <div className="fixed inset-0 z-[1100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-1">신고하시겠습니까?</h2>
        <p className="text-xs text-gray-500 mb-3">반려동물 동반이 안 되는데 등록돼 있거나, 정보가 잘못된 경우 신고할 수 있어요. 서로 다른 여러 명이 신고하면 자동으로 숨겨져요.</p>
        {placeName && <p className="text-sm font-semibold mb-2">📍 {placeName}</p>}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="신고 사유 (선택)" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4" />
        <div className="flex gap-2">
          <button onClick={submit} disabled={busy} className="flex-1 bg-red-500 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">신고</button>
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm">취소</button>
        </div>
      </div>
    </div>
  )
}