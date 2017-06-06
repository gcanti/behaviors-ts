import { Semigroup } from 'fp-ts/lib/Semigroup'
import { Monoid } from 'fp-ts/lib/Monoid'
import { liftA2 } from 'fp-ts/lib/Apply'
import { Option, isSome, none, some } from 'fp-ts/lib/Option'
import { Predicate, identity } from 'fp-ts/lib/function'
import { IO } from 'fp-ts/lib/IO'

export const URI = 'Event'

export type URI = typeof URI

declare module 'fp-ts/lib/HKT' {
  interface HKT<A> {
    Event: Event<A>
  }
}

export type Subscriber<A> = (a: A) => void

export class Event<A> {
  constructor(public readonly value: (sub: Subscriber<A>) => void) {}
  subscribe(sub: Subscriber<A>): void {
    this.value(sub)
  }
  of<B>(b: B): Event<B> {
    return of(b)
  }
  map<B>(f: (a: A) => B): Event<B> {
    return new Event<B>(sub => this.subscribe(a => sub(f(a))))
  }
  ap<B>(fab: Event<(a: A) => B>): Event<B> {
    return new Event<B>(sub => {
      let ab_latest: (a: A) => B
      let a_latest: A
      let ab_fired = false
      let a_fired = false

      fab.subscribe(ab => {
        ab_latest = ab
        ab_fired = true
        if (a_fired) {
          sub(ab_latest(a_latest))
        }
      })

      this.subscribe(a => {
        a_latest = a
        a_fired = true
        if (ab_fired) {
          sub(ab_latest(a_latest))
        }
      })
    })
  }
  alt(y: Event<A>): Event<A> {
    return new Event<A>(sub => {
      this.subscribe(sub)
      y.subscribe(sub)
    })
  }
}

export const never = new Event<any>(sub => { return undefined })

export function of<A>(a: A): Event<A> {
  return new Event(sub => sub(a))
}

export function map<A, B>(f: (a: A) => B, fa: Event<A>): Event<B> {
  return fa.map(f)
}

export function ap<A, B>(fab: Event<(a: A) => B>, fa: Event<A>): Event<B> {
  return fa.ap(fab)
}

export function alt<A>(x: Event<A>, y: Event<A>): Event<A> {
  return x.alt(y)
}

export function zero<A>(): Event<A> {
  return never
}

export function getSemigroup<A>(semigroup: Semigroup<A>): Semigroup<Event<A>> {
  const concat = liftA2({ URI, map, ap }, (a: A) => (b: A) => semigroup.concat(a, b))
  return { concat }
}

export function getMonoid<A>(monoid: Monoid<A>): Monoid<Event<A>> {
  const semigroup = getSemigroup(monoid)
  const empty = of(monoid.empty())
  return { ...semigroup, empty: () => empty }
}

/** Fold over values received from some `Event`, creating a new `Event` */
export function fold<A, B>(f: (a: A, b: B) => B, fa: Event<A>, b: B): Event<B> {
  return new Event<B>(sub => {
    let result = b
    fa.subscribe(a => sub(result = f(a, result)))
  })
}

/** Count the number of events received */
export function count<A>(fa: Event<A>): Event<number> {
  return fold((_, n) => n + 1, fa, 0)
}

/** fold the event received in a monoid */
export function folded<A>(monoid: Monoid<A>, fa: Event<A>): Event<A> {
  return fold((acc, a) => monoid.concat(acc, a), fa, monoid.empty())
}

/** Create an `Event` which only fires when a predicate holds */
export function filter<A>(predicate: Predicate<A>, fa: Event<A>): Event<A> {
  return new Event<A>(sub => fa.subscribe(a => {
    if (predicate(a)) {
      sub(a)
    }
  }))
}

/** Filter out any `None` events */
export function mapOption<A, B>(f: (a: A) => Option<B>, fa: Event<A>): Event<B> {
  return new Event<B>(sub => fa.subscribe(a => {
    const o = f(a)
    if (isSome(o)) {
      sub(o.value)
    }
  }))
}

/** Compute differences between successive event values */
export function withLast<A>(fa: Event<A>): Event<{ now: A, last: Option<A> }> {
  return mapOption(identity, fold((a, b) => {
    return b.fold(
      () => some({ now: a, last: none }),
      ({ now }) => some({ now: a, last: some(now) })
    )
  }, fa, none))
}

/** Create an `Event` which samples the latest values from the first event
 * at the times when the second event fires
 */
export function sampleOn<A, B>(fa: Event<A>, fab: Event<(a: A) => B>): Event<B> {
  return new Event<B>(sub => {
    let latest: A
    let fired = false

    fa.subscribe(a => {
      latest = a
      fired = true
    })

    fab.subscribe(f => {
      if (fired) {
        sub(f(latest))
      }
    })
  })
}

/** Create an `Event` which samples the latest values from the first event
 * at the times when the second event fires, ignoring the values produced by
 * the second event
 */
export function sampleOn_<A, B>(fa: Event<A>, fb: Event<B>): Event<A> {
  return sampleOn(fa, fb.map(() => identity))
}

/** Subscribe to an `Event` by providing a callback */
export function subscribe<A, R>(fa: Event<A>, f: (a: A) => IO<R>): IO<void> {
  return new IO(() => fa.subscribe(a => f(a).run()))
}

/** Create an event and a function which supplies a value to that event */
export function create<A>(): IO<{ event: Event<A>, push: (a: A) => IO<void> }> {
  return new IO(() => {
    const subs: Array<Subscriber<A>> = []
    return {
      event: new Event<A>(sub => subs.push(sub)),
      push(a: A): IO<void> {
        return new IO(() => subs.forEach(sub => sub(a)))
      }
    }
  })
}
