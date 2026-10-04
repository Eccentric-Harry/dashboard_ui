// Sparks fly into the counter. A handful of ✦ glyphs arc from where they were earned (the
// chest, a claimed quest) up to the sparks chip in the top bar, each landing with a coin
// tick and a bump — so the number going up has somewhere to come from. Under reduced
// motion the counter just bumps once. Resolves when the last one lands, so the caller can
// put the new balance in the store at that moment rather than before the sparks arrive.

import { campSound } from './camp-sound'

const TARGET = '[data-sparks-target]'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function bump(target: HTMLElement) {
  target.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
    { duration: 260, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  )
}

export async function flySparks(from: Element | DOMRect | null, amount: number): Promise<void> {
  const target = document.querySelector<HTMLElement>(TARGET)
  if (!target || amount <= 0) return
  if (reduced() || !from) {
    bump(target)
    campSound.play('coin')
    return
  }
  const a = from instanceof Element ? from.getBoundingClientRect() : from
  const b = target.getBoundingClientRect()
  const sx = a.left + a.width / 2
  const sy = a.top + a.height / 2
  const tx = b.left + Math.min(26, b.width / 2)
  const ty = b.top + b.height / 2
  const count = Math.max(4, Math.min(14, Math.round(amount / 6)))

  const flights = Array.from({ length: count }, (_, i) => {
    const el = document.createElement('span')
    el.className = 'spark-fly'
    el.textContent = '✦'
    el.setAttribute('aria-hidden', 'true')
    el.style.left = `${sx}px`
    el.style.top = `${sy}px`
    document.body.appendChild(el)
    // Spray out a little first, then arc up to the counter.
    const spread = 90
    const ox = (Math.cos((i / count) * Math.PI * 2) * spread) / (1 + (i % 3))
    const oy = (Math.sin((i / count) * Math.PI * 2) * spread) / (1 + (i % 3)) - 30
    const duration = 820 + i * 55
    const delay = i * 35
    const anim = el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
        { transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px)) scale(1.15)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(0.7)`, opacity: 0.9 },
      ],
      { duration, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', delay, fill: 'forwards' },
    )
    // A hidden tab pauses animations; never let that hold the sparks back from landing.
    const safety = new Promise((resolve) => window.setTimeout(resolve, duration + delay + 200))
    return Promise.race([anim.finished.catch(() => undefined), safety]).then(() => {
      el.remove()
      bump(target)
      if (i % 2 === 0) campSound.play('coin')
    })
  })
  await Promise.all(flights)
}
