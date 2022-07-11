export function getEventDetails(event) {
  const payload = {}
  if ('buttons' in event) payload.buttons = event.buttons

  if ('shiftKey' in event) {
    const { shiftKey, altKey, metaKey, ctrlKey } = event
    Object.assign(payload, {
      shiftKey,
      altKey,
      metaKey,
      ctrlKey
    })
  }

  return payload
}
