import { Engine } from './Engine'
import { _defineProperty } from './_defineProperty'
import * as maths from './maths'
import { selectAxis } from './selectAxis'
import { getPointerType } from './getPointerType'

export class CoordinatesEngine extends Engine {
  constructor(...args) {
    super(...args)

    _defineProperty(this, 'aliasKey', 'xy')
  }

  reset() {
    super.reset()
    this.state.axis = undefined
  }

  init() {
    this.state.offset = [0, 0]
    this.state.lastOffset = [0, 0]
  }

  computeOffset() {
    this.state.offset = maths.V.add(this.state.lastOffset, this.state.movement)
  }

  computeMovement() {
    this.state.movement = maths.V.sub(this.state.offset, this.state.lastOffset)
  }

  axisIntent(event) {
    const state = this.state
    const config = this.config

    if (!state.axis && event) {
      const threshold =
        typeof config.axisThreshold === 'object' ? config.axisThreshold[getPointerType(event)] : config.axisThreshold
      state.axis = selectAxis(state._movement, threshold)
    }

    state._blocked =
      ((config.lockDirection || !!config.axis) && !state.axis) || (!!config.axis && config.axis !== state.axis)
  }

  restrictToAxis(v) {
    if (this.config.axis || this.config.lockDirection) {
      switch (this.state.axis) {
        case 'x':
          v[1] = 0
          break

        case 'y':
          v[0] = 0
          break
      }
    }
  }
}
