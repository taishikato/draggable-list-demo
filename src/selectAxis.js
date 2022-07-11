export function selectAxis([dx, dy], threshold) {
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx > absDy && absDx > threshold) {
    return 'x'
  }

  if (absDy > absDx && absDy > threshold) {
    return 'y'
  }

  return undefined
}
