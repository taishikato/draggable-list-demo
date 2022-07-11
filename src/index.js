// Original: https://github.com/chenglou/react-motion/tree/master/demos/demo8-draggable-list

import { render } from 'react-dom'
import React, { useRef } from 'react'
import clamp from 'lodash-es/clamp'
import swap from 'lodash-move'
// import { useDrag } from '@use-gesture/react'
import { useSprings, animated, to } from '@react-spring/web'
import './styles.css'
import { DragEngine } from './DragEngine'
import { dragConfigResolver } from './dragConfigResolver'
import { useRecognizers } from './useRecognizers'

const EngineMap = new Map()
const ConfigResolverMap = new Map()

function registerAction(action) {
  EngineMap.set(action.key, action.engine)
  ConfigResolverMap.set(action.key, action.resolver)
}

const dragAction = {
  key: 'drag',
  engine: DragEngine,
  resolver: dragConfigResolver
}

function useDrag(handler, config) {
  console.log({ handler })
  registerAction(dragAction)
  console.log('koko ha')
  return useRecognizers(
    {
      drag: handler
    },
    config || {},
    'drag'
  )
}

// WHEN dragging, this function will be fed with all arguments.
// OTHERWISE, only the list order is relevant.
const fn = (order, down, originalIndex, curIndex, y) => index =>
  down && index === originalIndex
    ? /*
      No need to transition the following properties:
      - z-index, the elevation of the item related to the root of the view; it should pop straight up to 1, from 0.
      - y, the translated distance from the top; it's already being updated dinamically, smoothly, from react-gesture.
      Thus immediate returns `true` for both.
    */
      { y: curIndex * 100 + y, scale: 1.1, zIndex: '1', shadow: 15, immediate: n => n === 'y' || n === 'zIndex' }
    : { y: order.indexOf(index) * 100, scale: 1, zIndex: '0', shadow: 1, immediate: false }

const DraggableList = ({ items }) => {
  const order = useRef(items.map((_, index) => index)) // Store indices as a local ref, this represents the item order

  console.log({ order })

  /*
    Curries the default order for the initial, "rested" list state.
    Only the order array is relevant when the items aren't being dragged, thus
    the other arguments from fn don't need to be supplied initially.
  */
  const [springs, api] = useSprings(items.length, fn(order.current))

  console.log('here!')

  const bind = useDrag(({ args: [originalIndex], down, movement: [, y] }) => {
    console.log({ originalIndex })
    const curIndex = order.current.indexOf(originalIndex)
    const curRow = clamp(Math.round((curIndex * 100 + y) / 100), 0, items.length - 1)
    const newOrder = swap(order.current, curIndex, curRow)

    // api.start({ x: down ? mx : 0, y: down ? y : 0, immediate: down })
    api.start(fn(newOrder, down, originalIndex, curIndex, y))

    if (!down) order.current = newOrder
  })

  console.log('here! 2')

  const testt = bind(3)

  console.log({ testt })

  return (
    <>
      <div className="content" style={{ height: items.length * 100 }}>
        {springs.map(({ zIndex, shadow, y, scale }, i) => {
          return (
            <animated.div
              {...bind(i)}
              key={i}
              style={{
                zIndex,
                boxShadow: shadow.to(s => `rgba(0, 0, 0, 0.15) 0px ${s}px ${2 * s}px 0px`),
                transform: to([y, scale], (y, s) => `translate3d(0,${y}px,0) scale(${s})`),
                touchAction: 'none'
              }}
              children={items[i]}
            />
          )
        })}
      </div>
      {/* <div className="content" style={{ height: items.length * 100 }}>
        {springs.map(({ zIndex, shadow, y, scale }, i) => {
          return (
            <div
              {...bind(i)}
              key={i}
              style={{
                zIndex,
                boxShadow: shadow.to(s => `rgba(0, 0, 0, 0.15) 0px ${s}px ${2 * s}px 0px`),
                transform: to([y, scale], (y, s) => `translate3d(0,${y}px,0) scale(${s})`),
                touchAction: 'none'
              }}
              children={items[i]}
            />
          )
        })}
      </div> */}
    </>
  )
}

render(<DraggableList items={'Lorem ipsum dolor sit'.split(' ')} />, document.getElementById('root'))
