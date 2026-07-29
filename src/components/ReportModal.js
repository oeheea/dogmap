'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const REASONS = ['폐업했어요', '반려동물 동반이 안 돼요', '정보가 틀려요 (주소·카테고리 등)', '부적절하거나 스팸이에요', '중복 등록이에요']

export default function ReportModal({ place, user, onClose }) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!user) { alert('로그인이 필요해요'); return }
    if (!reason && !detail.trim()) { alert('신고 사유를 고르거나 설명을 적어주세요'); return }
    setBusy(true)
    const finalReason = [reason, detail.trim()].filter(Boolean).join(' · ') || null
    const { error } = await supabase.from('reports').insert({ place_id: place.id, user_id: user.id, reason: finalReason })
    setBusy(false)
    if (error) {
      if (error.code === '23505') { alert('이미 신고한 가게예요.'); onClose(); return }
      alert('신고 실패: ' + error.message); return
    }
    alert('신고했어요. 검토 후 조치돼요 🐾')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[1100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-1">
          <h2 className="font-bold text-lg">🚩 신고하기</h2>
          <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
        </div>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          <b>{place?.name}</b><br />
          잘못된 정보·폐업 등 <b>실제 문제가 있을 때만</b> 신고해주세요. 단순히 마음에 안 든다고 신고하면 안 돼요. 서로 다른 여러 명이 신고하면 목록에서 자동으로 숨겨져요.
        </p>
        <div className="flex flex-col gap-1.5 mb-3">
          {REASONS.map((r) => (
            <button key={r} onClick={() => setReason(reason === r ? '' : r)}
              className={`text-left text-sm rounded-xl px-3 py-2 border transition ${reason === r ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-700'}`}>
              {r}
            </button>
          ))}
        </div>
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="추가 설명 (선택)" rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3" />
        <button onClick={submit} disabled={busy || (!reason && !detail.trim())} className="w-full bg-red-500 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50">
          {busy ? '신고 중...' : '신고하기'}
        </button>
        <p className="text-[11px] text-gray-400 text-center mt-2">사유를 고르거나 설명을 적어야 신고할 수 있어요</p>
      </div>
    </div>
  )
}