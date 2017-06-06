import { Event } from '../Event'

/** Create an `Event` which fires when the mouse moves */
export function move(): Event<{ x: number, y: number }> {
  return new Event<{ x: number, y: number }>(sub => {
    addEventListener('mousemove', e => sub({ x: e.clientX, y: e.clientY }))
  })
}

/** Create an `Event` which fires when a mouse button is pressed */
export function down(): Event<number> {
  return new Event<number>(sub => {
    addEventListener('mousedown', e => sub(e.button))
  })
}

/** Create an `Event` which fires when a mouse button is released */
export function up(): Event<number> {
  return new Event<number>(sub => {
    addEventListener('mouseup', e => sub(e.button))
  })
}
