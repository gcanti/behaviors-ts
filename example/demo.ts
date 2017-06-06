import { Behavior, integral_ } from '../src/Behavior'
import { live, mouse, dot, click, seconds } from '../src/Live'
import { IO } from 'fp-ts/lib/IO'
import { fieldNumber } from 'fp-ts/lib/Field'

// adapted from https://github.com/paf31/purescript-behaviors-demo

export const a = live(mouse().map(({ x, y }) => dot(x, y, 50)))

export function withRadius(radius: Behavior<number>): IO<void> {
  return live(radius.ap(mouse().map(point => (r: number) => dot(point.x, point.y, r))))
}

export const b = withRadius(click().map(b => (b ? 100 : 50)))

export const c = withRadius(integral_(fieldNumber)(50, seconds(), click().map(b => (b ? 50 : 0))))
