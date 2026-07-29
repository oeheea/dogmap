'use client'
import { useEffect, useRef, useState } from 'react'

const PET_CLASSES = ['dog', 'cat', 'bird', 'horse', 'teddy bear']
const PROP_CLASSES = ['cup', 'bowl', 'wine glass', 'bottle', 'cake', 'donut', 'sandwich', 'potted plant', 'book', 'vase']
const MODES = [
  { key: 'thirds', label: '삼분할' },
  { key: 'center', label: '가운데' },
  { key: 'fill', label: '꽉 채우기' },
]

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const modelRef = useRef(null)
  const rawPetRef = useRef(null)   // { bbox, ts }
  const rawPropRef = useRef(null)
  const dispPetRef = useRef(null)  // 화면좌표 박스 (부드럽게)
  const dispPropRef = useRef(null)
  const rafRef = useRef(0)
  const lastDetectRef = useRef(0)
  const detectingRef = useRef(false)
  const modeRef = useRef('thirds')

  const [mode, setMode] = useState('thirds')
  const [status, setStatus] = useState('loading')
  const [hint, setHint] = useState('반려동물을 화면에 담아보세요 🐾')
  const [good, setGood] = useState(false)
  const [flash, setFlash] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { modeRef.current = mode }, [mode])

  // 카메라
  useEffect(() => {
    let active = true
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      })
      .catch((e) => setErr('카메라를 열 수 없어요: ' + e.message))
    return () => { active = false; streamRef.current?.getTracks().forEach((t) => t.stop()) }
  }, [])

  // 모델
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const tf = await import('@tensorflow/tfjs')
        await tf.ready()
        const cocoSsd = await import('@tensorflow-models/coco-ssd')
        const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
        if (!active) return
        modelRef.current = model
        setStatus('ready')
      } catch (e) {
        if (active) { setErr('AI 모델 로딩 실패: ' + e.message); setStatus('error') }
      }
    })()
    return () => { active = false }
  }, [])

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
  function ring(ctx, x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke() }
  function lerpBox(d, t, a) {
    if (!d) return { ...t }
    return { x1: d.x1 + (t.x1 - d.x1) * a, y1: d.y1 + (t.y1 - d.y1) * a, x2: d.x2 + (t.x2 - d.x2) * a, y2: d.y2 + (t.y2 - d.y2) * a }
  }

  useEffect(() => {
    function loop(ts) {
      rafRef.current = requestAnimationFrame(loop)
      const v = videoRef.current, c = canvasRef.current
      if (!v || !c || v.readyState < 2) return
      const cw = v.clientWidth, ch = v.clientHeight
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch }
      const vw = v.videoWidth, vh = v.videoHeight
      if (!vw || !vh) return
      const scale = Math.max(cw / vw, ch / vh)
      const offX = (vw * scale - cw) / 2, offY = (vh * scale - ch) / 2
      const mapBox = (b) => ({ x1: b[0] * scale - offX, y1: b[1] * scale - offY, x2: (b[0] + b[2]) * scale - offX, y2: (b[1] + b[3]) * scale - offY })
      const cen = (b) => [(b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2]

      // 감지 (throttle)
      if (modelRef.current && !detectingRef.current && ts - lastDetectRef.current > 110) {
        lastDetectRef.current = ts
        detectingRef.current = true
        modelRef.current.detect(v, 8).then((p) => {
          const now = performance.now()
          const pet = p.filter((x) => PET_CLASSES.includes(x.class) && x.score > 0.4).sort((a, b) => b.score - a.score)[0]
            || p.filter((x) => x.score > 0.55).sort((a, b) => (b.bbox[2] * b.bbox[3]) - (a.bbox[2] * a.bbox[3]))[0]
          if (pet) rawPetRef.current = { bbox: pet.bbox, ts: now }
          const prop = p.filter((x) => PROP_CLASSES.includes(x.class) && x.score > 0.4).sort((a, b) => b.score - a.score)[0]
          if (prop) rawPropRef.current = { bbox: prop.bbox, ts: now }
        }).catch(() => {}).finally(() => { detectingRef.current = false })
      }

      const ctx = c.getContext('2d')
      ctx.clearRect(0, 0, cw, ch)
      const m = modeRef.current
      const now = performance.now()

      // 삼분할 보조선
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1
      for (const fx of [1 / 3, 2 / 3]) { ctx.beginPath(); ctx.moveTo(cw * fx, 0); ctx.lineTo(cw * fx, ch); ctx.stroke() }
      for (const fy of [1 / 3, 2 / 3]) { ctx.beginPath(); ctx.moveTo(0, ch * fy); ctx.lineTo(cw, ch * fy); ctx.stroke() }
      const T = [[cw / 3, ch / 3], [cw * 2 / 3, ch / 3], [cw / 3, ch * 2 / 3], [cw * 2 / 3, ch * 2 / 3]]

      // 안정화: 신선하면 목표로 lerp, 오래되면 제거
      const petFresh = rawPetRef.current && now - rawPetRef.current.ts < 500
      const propFresh = rawPropRef.current && now - rawPropRef.current.ts < 500
      if (petFresh) dispPetRef.current = lerpBox(dispPetRef.current, mapBox(rawPetRef.current.bbox), 0.35)
      else dispPetRef.current = null
      if (propFresh && m === 'thirds') dispPropRef.current = lerpBox(dispPropRef.current, mapBox(rawPropRef.current.bbox), 0.35)
      else dispPropRef.current = null

      const pet = dispPetRef.current
      if (!pet) {
        for (const [tx, ty] of T) { ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill() }
        setHint('반려동물을 화면에 담아보세요 🐾'); setGood(false)
        return
      }
      const [pcx, pcy] = cen(pet)
      const thr = Math.min(cw, ch) * 0.10
      let ok = false, msg = ''

      if (m === 'center') {
        const tgt = [cw / 2, ch / 2]
        const d = Math.hypot(tgt[0] - pcx, tgt[1] - pcy)
        ok = d < thr
        ring(ctx, tgt[0], tgt[1], 22, ok ? '#34d399' : '#fbbf24')
        if (!ok) { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.lineTo(tgt[0], tgt[1]); ctx.stroke() }
        msg = ok ? '구도 좋아요! 지금 찰칵 📸' : '🎯 반려동물을 가운데로'
      } else if (m === 'fill') {
        const frac = ((pet.x2 - pet.x1) * (pet.y2 - pet.y1)) / (cw * ch)
        ok = frac >= 0.33 && frac <= 0.75
        msg = frac < 0.33 ? '📷 조금 더 가까이 다가가세요' : frac > 0.75 ? '📷 살짝 뒤로 물러나세요' : '구도 좋아요! 지금 찰칵 📸'
      } else { // thirds
        let petT = T[0], bd = Infinity
        for (const t of T) { const d = Math.hypot(t[0] - pcx, t[1] - pcy); if (d < bd) { bd = d; petT = t } }
        const petOk = bd < thr
        const leftSide = petT[0] < cw / 2
        ring(ctx, petT[0], petT[1], 22, petOk ? '#34d399' : '#fbbf24')
        if (!petOk) { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.lineTo(petT[0], petT[1]); ctx.stroke() }

        const prop = dispPropRef.current
        let propOk = true
        if (prop) {
          const [qcx, qcy] = cen(prop)
          const opp = T.filter((t) => (t[0] < cw / 2) !== leftSide)
          let propT = opp[0], qd = Infinity
          for (const t of opp) { const d = Math.hypot(t[0] - qcx, t[1] - qcy); if (d < qd) { qd = d; propT = t } }
          propOk = qd < thr
          ctx.strokeStyle = propOk ? '#34d399' : '#22d3ee'; ctx.lineWidth = 3
          roundRect(ctx, prop.x1, prop.y1, prop.x2 - prop.x1, prop.y2 - prop.y1, 12); ctx.stroke()
          ring(ctx, propT[0], propT[1], 20, propOk ? '#34d399' : '#22d3ee')
          if (!propOk) { ctx.beginPath(); ctx.moveTo(qcx, qcy); ctx.lineTo(propT[0], propT[1]); ctx.stroke() }
        }
        ok = petOk && propOk
        msg = !petOk ? '🎯 반려동물을 원 안으로' : (prop && !propOk) ? '☕ 소품도 반대편 원으로' : '구도 좋아요! 지금 찰칵 📸'
      }

      // 반려동물 박스
      ctx.strokeStyle = ok ? '#34d399' : '#ffffff'; ctx.lineWidth = 3
      roundRect(ctx, pet.x1, pet.y1, pet.x2 - pet.x1, pet.y2 - pet.y1, 14); ctx.stroke()
      setHint(msg); setGood(ok)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  function playShutter() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      const ac = new AC()
      const o = ac.createOscillator(), g = ac.createGain()
      o.type = 'square'; o.frequency.value = 1100
      o.connect(g); g.connect(ac.destination)
      g.gain.setValueAtTime(0.0001, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.11)
      o.start(); o.stop(ac.currentTime + 0.12)
      o.onended = () => ac.close()
    } catch (e) {}
  }

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    if (navigator.vibrate) navigator.vibrate(40)
    playShutter()
    setFlash(true); setTimeout(() => setFlash(false), 140)
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth; canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    canvas.toBlob((blob) => { if (blob) onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })) }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-[1200] bg-black flex flex-col">
      <div className="flex justify-between items-center p-3 text-white">
        <button onClick={onClose} className="text-sm">✕ 닫기</button>
        <span className="text-sm font-semibold">📷 실시간 구도 가이드</span>
        <span className="w-10" />
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {flash && <div className="absolute inset-0 bg-white pointer-events-none" />}
        {err && <div className="absolute inset-0 flex items-center justify-center text-white text-sm p-4 text-center">{err}</div>}
        {status === 'loading' && !err && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/40">AI 구도 가이드 불러오는 중... 🐾</div>
        )}
        {status === 'ready' && (
          <div className={`absolute left-1/2 -translate-x-1/2 bottom-3 text-white text-[13px] rounded-full px-4 py-1.5 ${good ? 'bg-emerald-500/85' : 'bg-black/55'}`}>
            {hint}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2 p-3 bg-black">
        {MODES.map((mo) => (
          <button key={mo.key} onClick={() => setMode(mo.key)}
            className={`text-xs rounded-full px-3 py-1.5 ${mode === mo.key ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>{mo.label}</button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 pb-8 pt-1 bg-black">
        <span className="w-16" />
        <button onClick={capture} className={`w-16 h-16 rounded-full border-4 ${good ? 'bg-emerald-400 border-emerald-200' : 'bg-white border-gray-400'}`} aria-label="촬영" />
        <span className="w-16" />
      </div>
    </div>
  )
}