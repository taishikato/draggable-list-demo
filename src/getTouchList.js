export function getTouchList(event) {
  return event.type === 'touchend' || event.type === 'touchcancel' ? event.changedTouches : event.targetTouches
}
