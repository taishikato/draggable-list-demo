import { call } from './call'
import { getEventDetails } from './getEventDetails'
import * as maths from './maths'
import { _objectSpread2 } from './_objectSpread2'

const BEFORE_LAST_KINEMATICS_DELAY = 32

export class Engine {
  constructor(ctrl, args, key) {
    this.ctrl = ctrl
    this.args = args
    this.key = key

    if (!this.state) {
      this.state = {}
      this.computeValues([0, 0])
      this.computeInitial()
      if (this.init) this.init()
      this.reset()
    }
  }

  get state() {
    return this.ctrl.state[this.key]
  }

  set state(state) {
    this.ctrl.state[this.key] = state
  }

  get shared() {
    return this.ctrl.state.shared
  }

  get eventStore() {
    return this.ctrl.gestureEventStores[this.key]
  }

  get timeoutStore() {
    return this.ctrl.gestureTimeoutStores[this.key]
  }

  get config() {
    return this.ctrl.config[this.key]
  }

  get sharedConfig() {
    return this.ctrl.config.shared
  }

  get handler() {
    return this.ctrl.handlers[this.key]
  }

  reset() {
    const { state, shared, ingKey, args } = this
    shared[ingKey] = state._active = state.active = state._blocked = state._force = false
    state._step = [false, false]
    state.intentional = false
    state._movement = [0, 0]
    state._distance = [0, 0]
    state._direction = [0, 0]
    state._delta = [0, 0]
    state._bounds = [
      [-Infinity, Infinity],
      [-Infinity, Infinity]
    ]
    state.args = args
    state.axis = undefined
    state.memo = undefined
    state.elapsedTime = 0
    state.direction = [0, 0]
    state.distance = [0, 0]
    state.overflow = [0, 0]
    state._movementBound = [false, false]
    state.velocity = [0, 0]
    state.movement = [0, 0]
    state.delta = [0, 0]
    state.timeStamp = 0
  }

  start(event) {
    const state = this.state
    const config = this.config

    if (!state._active) {
      this.reset()
      this.computeInitial()
      state._active = true
      state.target = event.target
      state.currentTarget = event.currentTarget
      state.lastOffset = config.from ? call(config.from, state) : state.offset
      state.offset = state.lastOffset
    }

    state.startTime = state.timeStamp = event.timeStamp
  }

  computeValues(values) {
    const state = this.state
    state._values = values
    state.values = this.config.transform(values)
  }

  computeInitial() {
    const state = this.state
    state._initial = state._values
    state.initial = state.values
  }

  compute(event) {
    const { state, config, shared } = this
    state.args = this.args
    let dt = 0

    if (event) {
      state.event = event
      if (config.preventDefault && event.cancelable) state.event.preventDefault()
      state.type = event.type
      shared.touches = this.ctrl.pointerIds.size || this.ctrl.touchIds.size
      shared.locked = !!document.pointerLockElement
      Object.assign(shared, getEventDetails(event))
      shared.down = shared.pressed = shared.buttons % 2 === 1 || shared.touches > 0
      dt = event.timeStamp - state.timeStamp
      state.timeStamp = event.timeStamp
      state.elapsedTime = state.timeStamp - state.startTime
    }

    if (state._active) {
      const _absoluteDelta = state._delta.map(Math.abs)

      maths.V.addTo(state._distance, _absoluteDelta)
    }

    if (this.axisIntent) this.axisIntent(event)
    const [_m0, _m1] = state._movement
    const [t0, t1] = config.threshold
    const { _step, values } = state

    if (config.hasCustomTransform) {
      if (_step[0] === false) _step[0] = Math.abs(_m0) >= t0 && values[0]
      if (_step[1] === false) _step[1] = Math.abs(_m1) >= t1 && values[1]
    } else {
      if (_step[0] === false) _step[0] = Math.abs(_m0) >= t0 && Math.sign(_m0) * t0
      if (_step[1] === false) _step[1] = Math.abs(_m1) >= t1 && Math.sign(_m1) * t1
    }

    state.intentional = _step[0] !== false || _step[1] !== false
    if (!state.intentional) return
    const movement = [0, 0]

    if (config.hasCustomTransform) {
      const [v0, v1] = values
      movement[0] = _step[0] !== false ? v0 - _step[0] : 0
      movement[1] = _step[1] !== false ? v1 - _step[1] : 0
    } else {
      movement[0] = _step[0] !== false ? _m0 - _step[0] : 0
      movement[1] = _step[1] !== false ? _m1 - _step[1] : 0
    }

    if (this.restrictToAxis && !state._blocked) this.restrictToAxis(movement)
    const previousOffset = state.offset
    const gestureIsActive = (state._active && !state._blocked) || state.active

    if (gestureIsActive) {
      state.first = state._active && !state.active
      state.last = !state._active && state.active
      state.active = shared[this.ingKey] = state._active

      if (event) {
        if (state.first) {
          if ('bounds' in config) state._bounds = call(config.bounds, state)
          if (this.setup) this.setup()
        }

        state.movement = movement
        this.computeOffset()
      }
    }

    const [ox, oy] = state.offset
    const [[x0, x1], [y0, y1]] = state._bounds
    state.overflow = [ox < x0 ? -1 : ox > x1 ? 1 : 0, oy < y0 ? -1 : oy > y1 ? 1 : 0]
    state._movementBound[0] = state.overflow[0]
      ? state._movementBound[0] === false
        ? state._movement[0]
        : state._movementBound[0]
      : false
    state._movementBound[1] = state.overflow[1]
      ? state._movementBound[1] === false
        ? state._movement[1]
        : state._movementBound[1]
      : false
    const rubberband = state._active ? config.rubberband || [0, 0] : [0, 0]
    state.offset = maths.computeRubberband(state._bounds, state.offset, rubberband)
    state.delta = maths.V.sub(state.offset, previousOffset)
    this.computeMovement()

    if (gestureIsActive && (!state.last || dt > BEFORE_LAST_KINEMATICS_DELAY)) {
      state.delta = maths.V.sub(state.offset, previousOffset)
      const absoluteDelta = state.delta.map(Math.abs)
      maths.V.addTo(state.distance, absoluteDelta)
      state.direction = state.delta.map(Math.sign)
      state._direction = state._delta.map(Math.sign)

      if (!state.first && dt > 0) {
        state.velocity = [absoluteDelta[0] / dt, absoluteDelta[1] / dt]
      }
    }
  }

  emit() {
    const state = this.state
    const shared = this.shared
    const config = this.config
    if (!state._active) this.clean()
    if ((state._blocked || !state.intentional) && !state._force && !config.triggerAllEvents) return
    const memo = this.handler(
      _objectSpread2(
        _objectSpread2(_objectSpread2({}, shared), state),
        {},
        {
          [this.aliasKey]: state.values
        }
      )
    )
    if (memo !== undefined) state.memo = memo
  }

  clean() {
    this.eventStore.clean()
    this.timeoutStore.clean()
  }
}
