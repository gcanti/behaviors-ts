import { Event } from './Event'
import { event, sampleOn, fold, withLast, create, subscribe } from './Event'
import { Semigroup } from 'fp-ts/lib/Semigroup'
import { liftA2 } from 'fp-ts/lib/Apply'
import { Monoid } from 'fp-ts/lib/Monoid'
import { Field } from 'fp-ts/lib/Field'
import { Semiring } from 'fp-ts/lib/Semiring'
import { Ring } from 'fp-ts/lib/Ring'
import { identity, constant } from 'fp-ts/lib/function'
import { Option } from 'fp-ts/lib/Option'
import { IO } from 'fp-ts/lib/IO'
import { animationFrame } from './Event/Time'
import { Applicative1 } from 'fp-ts/lib/Applicative'

export const URI = 'Behavior'

export type URI = typeof URI

declare module 'fp-ts/lib/HKT' {
  interface URI2HKT<A> {
    Behavior: Behavior<A>
  }
}

export class Behavior<A> {
  readonly _A!: A
  readonly _URI!: URI
  constructor(public readonly value: <B>(e: Event<(a: A) => B>) => Event<B>) {}
  map<B>(f: (a: A) => B): Behavior<B> {
    return new Behavior<B>(<C>(e: Event<(a: B) => C>): Event<C> => {
      return this.value<C>(e.map(bc => (a: A) => bc(f(a))))
    })
  }
  of<B>(b: B): Behavior<B> {
    return of(b)
  }
  ap<B>(fab: Behavior<(a: A) => B>): Behavior<B> {
    return new Behavior<B>(<C>(e: Event<(a: B) => C>): Event<C> => {
      return this.value<C>(fab.value<(a: A) => C>(e.map(bc => (ab: any): any => (a: A) => bc(ab(a)))))
    })
  }
}

function map<A, B>(fa: Behavior<A>, f: (a: A) => B): Behavior<B> {
  return fa.map(f)
}

function of<A>(a: A): Behavior<A> {
  return new Behavior<A>(<B>(e: Event<(a: A) => B>) => e.map(f => f(a)))
}

function ap<A, B>(fab: Behavior<(a: A) => B>, fa: Behavior<A>): Behavior<B> {
  return fa.ap(fab)
}

/** @instance */
export const behavior: Applicative1<URI> = {
  URI,
  map,
  of,
  ap
}

export function getSemigroup<A>(semigroup: Semigroup<A>): Semigroup<Behavior<A>> {
  const concat = liftA2(behavior)((a: A) => (b: A) => semigroup.concat(a, b))
  return {
    concat: (x, y) => concat(x)(y)
  }
}

export function getMonoid<A>(monoid: Monoid<A>): Monoid<Behavior<A>> {
  const semigroup = getSemigroup(monoid)
  return {
    ...semigroup,
    empty: of(monoid.empty)
  }
}

/**
 * Create a `Behavior` which is updated when an `Event` fires, by providing
 * an initial value
 */
export function step<A>(a: A, fa: Event<A>): Behavior<A> {
  return new Behavior<A>(<B>(e: Event<(a: A) => B>) => sampleOn(event.of(a).alt(fa), e))
}

/**
 * Create a `Behavior` which is updated when an `Event` fires, by providing
 * an initial value and a function to combine the current value with a new event
 * to create a new value
 */
export function unfold<A, B>(fa: Event<A>, b: B, f: (a: A, b: B) => B): Behavior<B> {
  return step(b, fold(fa, b, f))
}

/** Sample a `Behavior` on some `Event` */
export function sample<A, B>(ba: Behavior<A>, eab: Event<(a: A) => B>): Event<B> {
  return ba.value(eab)
}

/** Sample a `Behavior` on some `Event` by providing a combining function */
export function sampleBy<A, B, C>(ba: Behavior<A>, eb: Event<B>, f: (a: A) => (b: B) => C): Event<C> {
  return sample(ba.map(f), eb.map(b => (f: (b: B) => C) => f(b)))
}

/** Sample a `Behavior` on some `Event`, discarding the event's values */
export function sample_<A, B>(ba: Behavior<A>, eb: Event<B>): Event<A> {
  return sampleBy(ba, eb, constant)
}

type Approx<T, A> = {
  now: [T, A]
  last: Option<[T, A]>
}

export function integral<T, A>(
  field: Field<T>,
  semiring: Semiring<A>,
  g: (h: (f: (a: A) => T) => T) => A,
  initial: A,
  bt: Behavior<T>,
  ba: Behavior<A>
): Behavior<A> {
  return new Behavior<A>(<B>(e: Event<(a: A) => B>) => {
    const two = field.add(field.one, field.one)

    function approx({ now, last }: Approx<T, A>, a: A): A {
      return last.fold(a, ([t0, a0]) => {
        const [t1, a1] = now
        const delta = field.sub(t1, t0)
        const semidelta = field.div(delta, two)
        return semiring.add(a, g(f => field.mul(f(semiring.add(a0, a1)), semidelta)))
      })
    }

    const x = sample<A, A>(ba, e.map(() => identity))
    const y = withLast(sampleBy(bt, x, t => a => [t, a]))
    const z = fold(y, initial, approx)
    return z.ap(e)
  })
}

export function integral_<T>(field: Field<T>): (t: T, bt: Behavior<T>, ba: Behavior<T>) => Behavior<T> {
  return (t: T, bt: Behavior<T>, ba: Behavior<T>) => integral(field, field, h => h(identity), t, bt, ba)
}

export function derivative<T, A>(
  field: Field<T>,
  ring: Ring<A>,
  g: (h: (f: (a: A) => T) => T) => A,
  bt: Behavior<T>,
  ba: Behavior<A>
): Behavior<A> {
  return new Behavior<A>(<B>(e: Event<(a: A) => B>) => {
    function approx({ now, last }: Approx<T, A>): A {
      return last.fold(ring.zero, ([t0, a0]) => {
        const [t1, a1] = now
        const delta = field.sub(t1, t0)
        return g(f => field.mul(f(ring.sub(a1, a0)), delta))
      })
    }

    const x = sample<A, A>(ba, e.map(() => identity))
    const y = withLast(sampleBy(bt, x, t => a => [t, a]))
    const z = y.map(approx)
    return z.ap(e)
  })
}

export function derivative_<T>(field: Field<T>): (bt: Behavior<T>, ba: Behavior<T>) => Behavior<T> {
  return (bt: Behavior<T>, ba: Behavior<T>) => derivative(field, field, h => h(identity), bt, ba)
}

/** Compute a fixed point */
export function fixB<A>(a: A, f: (ba: Behavior<A>) => Behavior<A>): Behavior<A> {
  return new Behavior<A>(<B>(s: Event<(a: A) => B>) => {
    const { event: evt, push } = create<A>().run()
    const b = f(step(a, evt))
    sample_(b, s).subscribe(a => push(a).run())
    return sampleOn(evt, s)
  })
}

/** Animate a `Behavior` by providing a rendering function */
export function animate<S>(scene: Behavior<S>, render: (s: S) => IO<void>): IO<void> {
  return subscribe(sample_(scene, animationFrame()), render)
}
