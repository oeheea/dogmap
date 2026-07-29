// 발바닥 사진 → 배경 제거 → 여백 잘라 정사각 중앙 배치 (사진 그대로, PNG Blob)
export async function makePawCutout(file) {
  const { removeBackground } = await import('@imgly/background-removal')
  const cutBlob = await removeBackground(file)
  const img = await blobToImage(cutBlob)
  const w0 = img.width, h0 = img.height
  const tmp = document.createElement('canvas')
  tmp.width = w0; tmp.height = h0
  const tctx = tmp.getContext('2d')
  tctx.drawImage(img, 0, 0)
  const { data } = tctx.getImageData(0, 0, w0, h0)
  let minX = w0, minY = h0, maxX = 0, maxY = 0, found = false
  for (let y = 0; y < h0; y++) {
    for (let x = 0; x < w0; x++) {
      if (data[(y * w0 + x) * 4 + 3] > 30) {
        found = true
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
  }
  if (!found) { minX = 0; minY = 0; maxX = w0 - 1; maxY = h0 - 1 }
  const cw = maxX - minX + 1, ch = maxY - minY + 1
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  const scale = Math.min(size / cw, size / ch) * 0.92
  const dw = cw * scale, dh = ch * scale
  ctx.drawImage(img, minX, minY, cw, ch, (size - dw) / 2, (size - dh) / 2, dw, dh)
  return await new Promise((res) => canvas.toBlob(res, 'image/png'))
}

function blobToImage(blob) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = URL.createObjectURL(blob)
  })
}