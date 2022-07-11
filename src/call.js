export function call(v, ...args) {
  if (typeof v === 'function') {
    return v(...args)
  } else {
    return v
  }
}
