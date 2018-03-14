import { Behavior, animate } from './Behavior'
import { Drawing } from 'graphics-ts/lib/drawing'
import * as drawing from 'graphics-ts/lib/drawing'
import { IO } from 'fp-ts/lib/IO'
import * as c from 'graphics-ts/lib/canvas'
import { millisSinceEpoch } from './Behavior/Time'
import { position, buttons } from './Behavior/Mouse'
import { black } from 'graphics-ts/lib/color'

export function live(scene: Behavior<Drawing>): IO<void> {
  const canvas = c.unsafeGetCanvasElementById('canvas')
  const ctx = c.unsafeGetContext2D(canvas)
  return c
    .getDimensions(canvas)
    .chain(({ width, height }) =>
      animate(scene, frame => c.clearRect(ctx, { x: 0, y: 0, width, height }).chain(() => drawing.render(frame, ctx)))
    )
}

export function seconds(): Behavior<number> {
  return millisSinceEpoch().map(a => a / 1000)
}

export function mouse(): Behavior<{ x: number; y: number }> {
  return position().map(point => point.getOrElseL(() => ({ x: 0, y: 0 })))
}

export function click(): Behavior<boolean> {
  return buttons().map(set => set.size > 0)
}

export function dot(x: number, y: number, r: number): Drawing {
  const inner = drawing.fill(drawing.circle(x, y, r), drawing.fillColor(black))
  const outer = drawing.outline(drawing.circle(x, y, r * 1.2), drawing.lineWidth(r / 4))
  return drawing.monoidDrawing.concat(inner, outer)
}
