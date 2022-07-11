import { isTouch } from './isTouch'

export function getPointerType(event) {
  if (isTouch(event)) return 'touch'
  if ('pointerType' in event) return event.pointerType
  return 'mouse'
}
