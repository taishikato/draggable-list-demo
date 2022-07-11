import React from 'react'
import * as core from '@use-gesture/core'

function _interopDefault(e) {
  return e && e.__esModule ? e : { default: e }
}
const React__default = /*#__PURE__*/ _interopDefault(React)

export const useRecognizers = (handlers, config = {}, gestureKey, nativeHandlers) => {
  console.log('yyoooo')
  const ctrl = React__default['default'].useMemo(() => new core.Controller(handlers), [])
  console.log('yyoooo 1')
  ctrl.applyHandlers(handlers, nativeHandlers)
  console.log('yyoooo 2')

  console.log({ config })
  console.log({ gestureKey })
  console.log({ ctrl })
  ctrl.applyConfig(config, gestureKey)
  console.log('yyoooo 3')
  React__default['default'].useEffect(ctrl.effect.bind(ctrl))
  React__default['default'].useEffect(() => {
    return ctrl.clean.bind(ctrl)
  }, [])

  if (config.target === undefined) {
    return ctrl.bind.bind(ctrl)
  }

  return undefined
}
