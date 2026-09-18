// Route scroll containers (.route-scroll) hide their scrollbar thumb at rest and
// fade it in only while they're being scrolled — the macOS overlay behaviour.
// CSS can't tell "scrolling" from "idle", so this marks the container with
// [data-scrolling] on each scroll and clears it once scrolling has stopped.
// The look lives in styles/index.css under "Quiet scrollbar".

const IDLE_MS = 900

const timers = new WeakMap<Element, number>()
let installed = false

function handleScroll(event: Event) {
  const el = event.target
  if (!(el instanceof HTMLElement) || !el.classList.contains('route-scroll')) return

  if (!el.hasAttribute('data-scrolling')) el.setAttribute('data-scrolling', '')
  window.clearTimeout(timers.get(el))
  timers.set(el, window.setTimeout(() => el.removeAttribute('data-scrolling'), IDLE_MS))
}

/** Call once at startup. Scroll events don't bubble, so one capture listener sees every container. */
export function installQuietScrollbars() {
  if (installed) return
  installed = true
  document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
}
