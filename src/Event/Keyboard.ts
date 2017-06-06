import { Event } from '../Event'

/** Create an `Event` which fires when a key is pressed */
export function down(): Event<number> {
  return new Event<number>(sub => {
    addEventListener('keydown', e => sub(e.keyCode))
  })
}

/** Create an `Event` which fires when a key is released */
export function up(): Event<number> {
  return new Event<number>(sub => {
    addEventListener('keyup', e => sub(e.keyCode))
  })
}
