import { Behavior } from '../Behavior'
import { Event } from '../Event'
import { withTime } from '../Event/Time'

/** Get the current time in milliseconds since the epoch */
export function millisSinceEpoch(): Behavior<number> {
  return new Behavior<number>(<B>(e: Event<(a: number) => B>) => {
    return withTime<(a: number) => B>(e).map(({ value, time }) => value(time))
  })
}
