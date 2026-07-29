'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { makePawCutout } from '@/lib/pawStamp'
import { shapeSvg } from '@/lib/shapes'

const COLORS = ['#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#78716c']

export default function PawStampUploader({ userId, current, currentColor, onDone }) {
  const [busy, setBusy] = useState(false)
  const [color, setColor] = useState(currentColor || '#f59e0b')
  const [preview, setPreview] = useState(current || '')
  const [msg, setMsg] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setMsg('발바닥 모양 따는 중... 🐾 (처음 한 번은 좀 걸려요)')
    try {
      const mask = await makePawCutout(file)
      const path = `${userId}/paw-${Date.now()}.png`
      const { error } = await supabase.storage.from('avatars').upload(path, mask, { contentType: 'image/png', upsert: true })
      if (error) throw error
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      await supabase.from('profiles').update({ paw_stamp_url: url, paw_color: color }).eq('id', userId)
      setPreview(url); setMsg('완성! 산책하면 이 발바닥이 찍혀요 🐾')
      onDone?.(url, color)
    } catch (err) { setMsg('실패: ' + err.message) }
    setBusy(false)
  }

  async function removePaw() {
    await supabase.from('profiles').update({ paw_stamp_url: null }).eq('id', userId)
    setPreview(''); setMsg('기본 발바닥으로 바뀌었어요 🐾')
    onDone?.('', color)
  }

  async function saveColor(c) {
    setColor(c)
    await supabase.from('profiles').update({ paw_color: c }).eq('id', userId)
    onDone?.(preview, c)
  }

  return (
    <div className="border rounded-2xl p-4">
      <div className="font-semibold text-sm mb-2">🐾 내 발바닥 도장</div>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
          {preview ? <img src={preview} alt="발바닥" className="w-full h-full object-contain" /> : <span dangerouslySetInnerHTML={{ __html: shapeSvg('paw', color, 36) }} />}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm px-3 py-2 bg-black text-white rounded-lg cursor-pointer text-center">
            {busy ? '처리 중...' : '발바닥 사진 올리기'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
          </label>
          {preview && <button onClick={removePaw} className="text-xs text-gray-500 underline">사진 내리고 기본 발바닥으로</button>}
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-3 mb-1">산책 경로 · 발바닥 색</div>
      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button key={c} onClick={() => saveColor(c)} className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-black' : 'border-transparent'}`} style={{ background: c }} />
        ))}
      </div>
      {msg && <div className="text-xs text-gray-500 mt-2">{msg}</div>}
    </div>
  )
}