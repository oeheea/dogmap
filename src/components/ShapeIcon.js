import { shapeInner } from '@/lib/shapes'

export default function ShapeIcon({ shape, color = '#DC4E24', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}
      dangerouslySetInnerHTML={{ __html: shapeInner(shape) }} />
  )
}