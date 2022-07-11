import { _objectSpread2 } from './_objectSpread2'
import * as maths from './maths'

const DEFAULT_RUBBERBAND = 0.15

const identity = v => v

export const commonConfigResolver = {
  enabled(value = true) {
    return value
  },

  eventOptions(value, _k, config) {
    return _objectSpread2(_objectSpread2({}, config.shared.eventOptions), value)
  },

  preventDefault(value = false) {
    return value
  },

  triggerAllEvents(value = false) {
    return value
  },

  rubberband(value = 0) {
    switch (value) {
      case true:
        return [DEFAULT_RUBBERBAND, DEFAULT_RUBBERBAND]

      case false:
        return [0, 0]

      default:
        return maths.V.toVector(value)
    }
  },

  from(value) {
    if (typeof value === 'function') return value
    if (value != null) return maths.V.toVector(value)
  },

  transform(value, _k, config) {
    const transform = value || config.shared.transform
    this.hasCustomTransform = !!transform

    if (process.env.NODE_ENV === 'development') {
      const originalTransform = transform || identity
      return v => {
        const r = originalTransform(v)

        if (!isFinite(r[0]) || !isFinite(r[1])) {
          console.warn(`[@use-gesture]: config.transform() must produce a valid result, but it was: [${r[0]},${[1]}]`)
        }

        return r
      }
    }

    return transform || identity
  },

  threshold(value) {
    return maths.V.toVector(value, 0)
  }
}
