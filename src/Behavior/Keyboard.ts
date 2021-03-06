import { Behavior, unfold } from '../Behavior'
import { up, down } from '../Event/Keyboard'

/** A `Behavior` which reports the keys which are currently pressed */
export function keys(): Behavior<Set<number>> {
  const d = down().map(a => (set: Set<number>) => set.add(a))
  const u = up().map(a => (set: Set<number>) => {
    set.delete(a)
    return set
  })
  return unfold(d.alt(u), new Set<number>(), (f, s) => f(s))
}
