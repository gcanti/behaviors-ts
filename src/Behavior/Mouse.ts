import { Behavior, step, unfold } from '../Behavior'
import { Option, none, some } from 'fp-ts/lib/Option'
import { move, up, down } from '../Event/Mouse'

/** A `Behavior` which reports the current mouse position, if it is known */
export function position(): Behavior<Option<{ x: number, y: number }>> {
  return step(none, move().map(point => some(point)))
}

/** A `Behavior` which reports the mouse buttons which are currently pressed */
export function buttons(): Behavior<Set<number>> {
  const d = down().map(a => (set: Set<number>) => set.add(a))
  const u = up().map(a => (set: Set<number>) => {
    set.delete(a)
    return set
  })
  return unfold((f, set) => f(set), d.alt(u), new Set())
}
