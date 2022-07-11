export function persistEvent(event) {
  'persist' in event && typeof event.persist === 'function' && event.persist()
}
