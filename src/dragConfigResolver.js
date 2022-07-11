import { _objectSpread2 } from './_objectSpread2'
import * as maths from './maths'
import { commonConfigResolver } from './commonConfigResolver'

const DEFAULT_AXIS_THRESHOLD = 0

const isBrowser = typeof window !== 'undefined' && window.document && window.document.createElement

const DEFAULT_PREVENT_SCROLL_DELAY = 250
const DEFAULT_SWIPE_VELOCITY = 0.5
const DEFAULT_SWIPE_DISTANCE = 50
const DEFAULT_SWIPE_DURATION = 250
const DEFAULT_DRAG_DELAY = 180
const DEFAULT_DRAG_AXIS_THRESHOLD = {
  mouse: 0,
  touch: 0,
  pen: 8
}

function supportsGestureEvents() {
  try {
    // eslint-disable-next-line no-undef
    return 'constructor' in GestureEvent
  } catch (e) {
    return false
  }
}

function supportsTouchEvents() {
  return isBrowser && 'ontouchstart' in window
}

function isTouchScreen() {
  return supportsTouchEvents() || (isBrowser && window.navigator.maxTouchPoints > 1)
}

function supportsPointerEvents() {
  return isBrowser && 'onpointerdown' in window
}

function supportsPointerLock() {
  return isBrowser && 'exitPointerLock' in window.document
}

const SUPPORT = {
  isBrowser,
  gesture: supportsGestureEvents(),
  touch: isTouchScreen(),
  touchscreen: isTouchScreen(),
  pointer: supportsPointerEvents(),
  pointerLock: supportsPointerLock()
}

const coordinatesConfigResolver = _objectSpread2(
  _objectSpread2({}, commonConfigResolver),
  {},
  {
    axis(_v, _k, { axis }) {
      this.lockDirection = axis === 'lock'
      if (!this.lockDirection) return axis
    },

    axisThreshold(value = DEFAULT_AXIS_THRESHOLD) {
      return value
    },

    bounds(value = {}) {
      if (typeof value === 'function') {
        return state => coordinatesConfigResolver.bounds(value(state))
      }

      if ('current' in value) {
        return () => value.current
      }

      if (typeof HTMLElement === 'function' && value instanceof HTMLElement) {
        return value
      }

      const { left = -Infinity, right = Infinity, top = -Infinity, bottom = Infinity } = value
      return [
        [left, right],
        [top, bottom]
      ]
    }
  }
)

export const dragConfigResolver = _objectSpread2(
  _objectSpread2({}, coordinatesConfigResolver),
  {},
  {
    device(_v, _k, { pointer: { touch = false, lock = false, mouse = false } = {} }) {
      this.pointerLock = lock && SUPPORT.pointerLock
      if (SUPPORT.touch && touch) return 'touch'
      if (this.pointerLock) return 'mouse'
      if (SUPPORT.pointer && !mouse) return 'pointer'
      if (SUPPORT.touch) return 'touch'
      return 'mouse'
    },

    preventScrollAxis(value, _k, { preventScroll }) {
      this.preventScrollDelay =
        typeof preventScroll === 'number'
          ? preventScroll
          : preventScroll || (preventScroll === undefined && value)
          ? DEFAULT_PREVENT_SCROLL_DELAY
          : undefined
      if (!SUPPORT.touchscreen || preventScroll === false) return undefined
      return value ? value : preventScroll !== undefined ? 'y' : undefined
    },

    pointerCapture(_v, _k, { pointer: { capture = true, buttons = 1 } = {} }) {
      this.pointerButtons = buttons
      return !this.pointerLock && this.device === 'pointer' && capture
    },

    threshold(value, _k, { filterTaps = false, tapsThreshold = 3, axis = undefined }) {
      const threshold = maths.V.toVector(value, filterTaps ? tapsThreshold : axis ? 1 : 0)
      this.filterTaps = filterTaps
      this.tapsThreshold = tapsThreshold
      return threshold
    },

    swipe({
      velocity = DEFAULT_SWIPE_VELOCITY,
      distance = DEFAULT_SWIPE_DISTANCE,
      duration = DEFAULT_SWIPE_DURATION
    } = {}) {
      return {
        velocity: this.transform(maths.V.toVector(velocity)),
        distance: this.transform(maths.V.toVector(distance)),
        duration
      }
    },

    delay(value = 0) {
      switch (value) {
        case true:
          return DEFAULT_DRAG_DELAY

        case false:
          return 0

        default:
          return value
      }
    },

    axisThreshold(value) {
      if (!value) return DEFAULT_DRAG_AXIS_THRESHOLD
      return _objectSpread2(_objectSpread2({}, DEFAULT_DRAG_AXIS_THRESHOLD), value)
    }
  }
)
