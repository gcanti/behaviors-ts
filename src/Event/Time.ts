import { Event } from '../Event'

/** Create an event which fires every specified number of milliseconds */
export function interval(millis: number): Event<number> {
  return new Event<number>(sub => {
    setInterval(() => sub(new Date().getTime()), millis)
  })
}

/** Create an event which fires every frame (using `requestAnimationFrame`) */
export function animationFrame(): Event<void> {
  return new Event<void>(sub => {
    function loop() {
      window.requestAnimationFrame(function() {
        sub(undefined)
        loop()
      })
    }
    loop()
  })
}

export function withTime<A>(fa: Event<A>): Event<{ value: A; time: number }> {
  return new Event<{ value: A; time: number }>(sub => {
    fa.subscribe(a => sub({ value: a, time: new Date().getTime() }))
  })
}
