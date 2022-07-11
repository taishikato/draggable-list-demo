import { CoordinatesEngine } from './CoordinatesEngine'
import { _defineProperty } from './_defineProperty'
import { coordinatesConfigResolver } from './coordinatesConfigResolver'
import { getValueEvent } from './getValueEvent'
import { isTouch } from './isTouch'
import { pointerValues } from './pointerValues'
import { getPointerType } from './getPointerType'
import * as maths from './maths'
import { persistEvent } from './persistEvent'

const DISPLACEMENT = 10
const KEYS_DELTA_MAP = {
  ArrowRight: (factor = 1) => [DISPLACEMENT * factor, 0],
  ArrowLeft: (factor = 1) => [-DISPLACEMENT * factor, 0],
  ArrowUp: (factor = 1) => [0, -DISPLACEMENT * factor],
  ArrowDown: (factor = 1) => [0, DISPLACEMENT * factor]
}

function pointerId(event) {
  const valueEvent = getValueEvent(event)
  return isTouch(event) ? valueEvent.identifier : valueEvent.pointerId
}

export class DragEngine extends CoordinatesEngine {
  constructor(...args) {
    super(...args)

    _defineProperty(this, 'ingKey', 'dragging')
  }

  reset() {
    super.reset()
    const state = this.state
    state._pointerId = undefined
    state._pointerActive = false
    state._keyboardActive = false
    state._preventScroll = false
    state._delayed = false
    state.swipe = [0, 0]
    state.tap = false
    state.canceled = false
    state.cancel = this.cancel.bind(this)
  }

  setup() {
    const state = this.state

    if (state._bounds instanceof HTMLElement) {
      const boundRect = state._bounds.getBoundingClientRect()

      const targetRect = state.currentTarget.getBoundingClientRect()
      const _bounds = {
        left: boundRect.left - targetRect.left + state.offset[0],
        right: boundRect.right - targetRect.right + state.offset[0],
        top: boundRect.top - targetRect.top + state.offset[1],
        bottom: boundRect.bottom - targetRect.bottom + state.offset[1]
      }
      state._bounds = coordinatesConfigResolver.bounds(_bounds)
    }
  }

  cancel() {
    const state = this.state
    if (state.canceled) return
    state.canceled = true
    state._active = false
    setTimeout(() => {
      this.compute()
      this.emit()
    }, 0)
  }

  setActive() {
    this.state._active = this.state._pointerActive || this.state._keyboardActive
  }

  clean() {
    this.pointerClean()
    this.state._pointerActive = false
    this.state._keyboardActive = false
    super.clean()
  }

  pointerDown(event) {
    const config = this.config
    const state = this.state
    if (
      event.buttons != null &&
      (Array.isArray(config.pointerButtons)
        ? !config.pointerButtons.includes(event.buttons)
        : config.pointerButtons !== -1 && config.pointerButtons !== event.buttons)
    )
      return
    const ctrlIds = this.ctrl.setEventIds(event)

    if (config.pointerCapture) {
      event.target.setPointerCapture(event.pointerId)
    }

    if (ctrlIds && ctrlIds.size > 1 && state._pointerActive) return
    this.start(event)
    this.setupPointer(event)
    state._pointerId = pointerId(event)
    state._pointerActive = true
    this.computeValues(pointerValues(event))
    this.computeInitial()

    if (config.preventScrollAxis && getPointerType(event) !== 'mouse') {
      state._active = false
      this.setupScrollPrevention(event)
    } else if (config.delay > 0) {
      this.setupDelayTrigger(event)

      if (config.triggerAllEvents) {
        this.compute(event)
        this.emit()
      }
    } else {
      this.startPointerDrag(event)
    }
  }

  startPointerDrag(event) {
    const state = this.state
    state._active = true
    state._preventScroll = true
    state._delayed = false
    this.compute(event)
    this.emit()
  }

  pointerMove(event) {
    const state = this.state
    const config = this.config
    if (!state._pointerActive) return
    if (state.type === event.type && event.timeStamp === state.timeStamp) return
    const id = pointerId(event)
    if (state._pointerId !== undefined && id !== state._pointerId) return

    const _values = pointerValues(event)

    if (document.pointerLockElement === event.target) {
      state._delta = [event.movementX, event.movementY]
    } else {
      state._delta = maths.V.sub(_values, state._values)
      this.computeValues(_values)
    }

    maths.V.addTo(state._movement, state._delta)
    this.compute(event)

    if (state._delayed && state.intentional) {
      this.timeoutStore.remove('dragDelay')
      state.active = false
      this.startPointerDrag(event)
      return
    }

    if (config.preventScrollAxis && !state._preventScroll) {
      if (state.axis) {
        if (state.axis === config.preventScrollAxis || config.preventScrollAxis === 'xy') {
          state._active = false
          this.clean()
          return
        } else {
          this.timeoutStore.remove('startPointerDrag')
          this.startPointerDrag(event)
          return
        }
      } else {
        return
      }
    }

    this.emit()
  }

  pointerUp(event) {
    this.ctrl.setEventIds(event)

    try {
      if (this.config.pointerCapture && event.target.hasPointerCapture(event.pointerId)) {
        event.target.releasePointerCapture(event.pointerId)
      }
    } catch (_unused) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[@use-gesture]: If you see this message, it's likely that you're using an outdated version of \`@react-three/fiber\`. \n\nPlease upgrade to the latest version.`
        )
      }
    }

    const state = this.state
    const config = this.config
    if (!state._active || !state._pointerActive) return
    const id = pointerId(event)
    if (state._pointerId !== undefined && id !== state._pointerId) return
    this.state._pointerActive = false
    this.setActive()
    this.compute(event)
    const [dx, dy] = state._distance
    state.tap = dx <= config.tapsThreshold && dy <= config.tapsThreshold

    if (state.tap && config.filterTaps) {
      state._force = true
    } else {
      const [dirx, diry] = state.direction
      const [vx, vy] = state.velocity
      const [mx, my] = state.movement
      const [svx, svy] = config.swipe.velocity
      const [sx, sy] = config.swipe.distance
      const sdt = config.swipe.duration

      if (state.elapsedTime < sdt) {
        if (Math.abs(vx) > svx && Math.abs(mx) > sx) state.swipe[0] = dirx
        if (Math.abs(vy) > svy && Math.abs(my) > sy) state.swipe[1] = diry
      }
    }

    this.emit()
  }

  pointerClick(event) {
    if (!this.state.tap) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  setupPointer(event) {
    const config = this.config
    const device = config.device

    if (process.env.NODE_ENV === 'development') {
      try {
        if (device === 'pointer' && config.preventScrollDelay === undefined) {
          const currentTarget = 'uv' in event ? event.sourceEvent.currentTarget : event.currentTarget
          const style = window.getComputedStyle(currentTarget)

          if (style.touchAction === 'auto') {
            console.warn(
              `[@use-gesture]: The drag target has its \`touch-action\` style property set to \`auto\`. It is recommended to add \`touch-action: 'none'\` so that the drag gesture behaves correctly on touch-enabled devices. For more information read this: https://use-gesture.netlify.app/docs/extras/#touch-action.\n\nThis message will only show in development mode. It won't appear in production. If this is intended, you can ignore it.`,
              currentTarget
            )
          }
        }
      } catch (_unused2) {}
    }

    if (config.pointerLock) {
      event.currentTarget.requestPointerLock()
    }

    if (!config.pointerCapture) {
      this.eventStore.add(this.sharedConfig.window, device, 'change', this.pointerMove.bind(this))
      this.eventStore.add(this.sharedConfig.window, device, 'end', this.pointerUp.bind(this))
      this.eventStore.add(this.sharedConfig.window, device, 'cancel', this.pointerUp.bind(this))
    }
  }

  pointerClean() {
    if (this.config.pointerLock && document.pointerLockElement === this.state.currentTarget) {
      document.exitPointerLock()
    }
  }

  preventScroll(event) {
    if (this.state._preventScroll && event.cancelable) {
      event.preventDefault()
    }
  }

  setupScrollPrevention(event) {
    this.state._preventScroll = false
    persistEvent(event)
    const remove = this.eventStore.add(this.sharedConfig.window, 'touch', 'change', this.preventScroll.bind(this), {
      passive: false
    })
    this.eventStore.add(this.sharedConfig.window, 'touch', 'end', remove)
    this.eventStore.add(this.sharedConfig.window, 'touch', 'cancel', remove)
    this.timeoutStore.add('startPointerDrag', this.startPointerDrag.bind(this), this.config.preventScrollDelay, event)
  }

  setupDelayTrigger(event) {
    this.state._delayed = true
    this.timeoutStore.add(
      'dragDelay',
      () => {
        this.state._step = [0, 0]
        this.startPointerDrag(event)
      },
      this.config.delay
    )
  }

  keyDown(event) {
    const deltaFn = KEYS_DELTA_MAP[event.key]

    if (deltaFn) {
      const state = this.state
      const factor = event.shiftKey ? 10 : event.altKey ? 0.1 : 1
      this.start(event)
      state._delta = deltaFn(factor)
      state._keyboardActive = true
      maths.V.addTo(state._movement, state._delta)
      this.compute(event)
      this.emit()
    }
  }

  keyUp(event) {
    if (!(event.key in KEYS_DELTA_MAP)) return
    this.state._keyboardActive = false
    this.setActive()
    this.compute(event)
    this.emit()
  }

  bind(bindFunction) {
    const device = this.config.device
    bindFunction(device, 'start', this.pointerDown.bind(this))

    if (this.config.pointerCapture) {
      bindFunction(device, 'change', this.pointerMove.bind(this))
      bindFunction(device, 'end', this.pointerUp.bind(this))
      bindFunction(device, 'cancel', this.pointerUp.bind(this))
      bindFunction('lostPointerCapture', '', this.pointerUp.bind(this))
    }

    bindFunction('key', 'down', this.keyDown.bind(this))
    bindFunction('key', 'up', this.keyUp.bind(this))

    if (this.config.filterTaps) {
      bindFunction('click', '', this.pointerClick.bind(this), {
        capture: true,
        passive: false
      })
    }
  }
}
