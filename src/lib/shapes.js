export const SHAPES = ['star', 'heart', 'circle', 'square', 'bookmark', 'paw', 'diamond', 'flag']

const PATHS = {
  star: '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>',
  heart: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  square: '<rect x="5" y="5" width="14" height="14" rx="3"/>',
  bookmark: '<path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>',
  paw: '<ellipse cx="12" cy="15" rx="5" ry="4"/><circle cx="6.5" cy="10" r="2"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="7" r="2"/><circle cx="17.5" cy="10" r="2"/>',
  diamond: '<path d="M12 2l10 10-10 10L2 12z"/>',
  flag: '<path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>',
}

export function shapeInner(key) {
  return PATHS[SHAPES.includes(key) ? key : 'star']
}

export function shapeSvg(key, color = '#DC4E24', size = 18) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">${shapeInner(key)}</svg>`
}