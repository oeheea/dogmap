export function formatAddress(addr) {
  if (!addr) return ''
  if (!addr.includes(',')) return addr   // 이미 짧으면 그대로
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean)
  const sido = parts.find((s) => /(특별시|광역시|특별자치시|특별자치도|도)$/.test(s))
  const gu = parts.find((s) => s !== sido && /(시|군|구)$/.test(s))
  const road = parts.find((s) => /(로|길)$/.test(s))
  const num = parts.find((s) => /^\d+(-\d+)?$/.test(s))
  const out = [sido, gu, road, num].filter(Boolean)
  return out.length ? out.join(' ') : parts.slice(0, 3).join(' ')
}

export function fmtDist(m) { return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(2)}km` }
export function fmtTime(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}` }