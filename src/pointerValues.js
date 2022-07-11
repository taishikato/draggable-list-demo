import { getValueEvent } from './getValueEvent'

export function pointerValues(event) {
  const valueEvent = getValueEvent(event)
  return [valueEvent.clientX, valueEvent.clientY]
}
