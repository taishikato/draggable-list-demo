import { isTouch } from './isTouch'
import { getTouchList } from './getTouchList'

export function getValueEvent(event) {
  return isTouch(event) ? getTouchList(event)[0] : event
}
