import { Behavior, animate, fixB, integral_, derivative_, getSemigroup, behavior } from '../src/Behavior'
import { Drawing } from 'graphics-ts/lib/drawing'
import * as d from 'graphics-ts/lib/drawing'
import { IO } from 'fp-ts/lib/IO'
import * as c from 'graphics-ts/lib/canvas'
import { white, black } from 'graphics-ts/lib/color'
import { foldMap } from 'fp-ts/lib/Foldable'
import { array } from 'fp-ts/lib/Array'
import { seconds } from '../src/Live'
import { fieldNumber } from 'fp-ts/lib/Field'
import { buttons, position } from '../src/Behavior/Mouse'
import { Option } from 'fp-ts/lib/Option'

// adapted from https://github.com/paf31/purescript-behaviors/blob/master/test/Main.purs

export type Circle = {
  x: number
  y: number
  size: number
}

type Size = {
  width: number
  height: number
}

type Point = {
  x: number
  y: number
}

function scene({ width, height }: Size): Behavior<Drawing> {
  const background: Drawing = d.fill(d.rectangle(0, 0, width, height), d.fillColor(white))
  const scaleFactor: number = Math.max(width, height) / 16

  function renderCircle({ x, y, size }: Circle): Drawing {
    const outlineStyle = d.monoidOutlineStyle.concat(d.outlineColor(black), d.lineWidth((1 + 2 * size) / scaleFactor))
    return d.scale(
      scaleFactor,
      scaleFactor,
      d.translate(x, y, d.scale(size, size, d.outline(d.circle(0, 0, 0.5), outlineStyle)))
    )
  }

  function renderCircles(circles: Array<Circle>): Drawing {
    return foldMap(array, d.monoidDrawing)(circles, renderCircle)
  }

  const integral = integral_(fieldNumber)
  const derivative = derivative_(fieldNumber)
  const secs = seconds()

  const swell = fixB(2, b => {
    const f = (bs: Set<number>) => (s: number) => (ds: number): number => {
      if (bs.size === 0) {
        return -8 * (s - 1) - ds * 2
      }
      return 2 * (4 - s)
    }
    return integral(2, secs, integral(0, secs, derivative(secs, b).ap(b.ap(buttons().map(f)))))
  })

  function dist(x: number, y: number, m: Option<Point>): number {
    return m.fold(Infinity, ({ x: mx, y: my }) => {
      const dx = x - mx / scaleFactor
      const dy = y - my / scaleFactor
      return dx * dx + dy * dy
    })
  }

  function toCircles(m: Option<Point>) {
    return function(sw: number): Array<Circle> {
      const ns = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
      const ret: Array<Circle> = []
      for (let x = 0; x < ns.length; x++) {
        for (let y = 0; y < ns.length; y++) {
          const d = dist(x, y, m)
          ret.push({
            x,
            y,
            size: 0.1 + (1 + sw) / (d + 1.5)
          })
        }
      }
      return ret.sort(({ x, y }) => -dist(x, y, m))
    }
  }

  const circles = swell.ap(position().map(toCircles))

  return getSemigroup(d.monoidDrawing).concat(behavior.of(background), circles.map(renderCircles))
}

export function main(): IO<void> {
  const canvas = c.unsafeGetCanvasElementById('canvas')
  const ctx = c.unsafeGetContext2D(canvas)
  return c.getDimensions(canvas).chain(position => animate(scene(position), drawing => d.render(drawing, ctx)))
}
