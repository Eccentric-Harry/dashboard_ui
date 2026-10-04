// The clock in the canvas beside the stage — the one thing left of the old gutter
// HUD, which the user didn't use. Set like a lock screen: the date small above, the
// time large below, and a hairline that sweeps once a minute so the seconds are felt
// rather than read. No card; type on the canvas.
//
// It renders once a minute. The sweep is a CSS animation re-keyed on each minute and
// started at the current second, so nothing re-renders every second. Desktop only, and
// only where the band beside the stage is wide enough (a container query in the CSS) —
// on a windowed session there is no spare canvas and the clock simply isn't there.

import { useEffect, useState } from 'react'
import './gutter-clock.css'

/** Ticks on the minute boundary, and resyncs when the tab comes back into view. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer = 0
    const schedule = () => {
      const msToNextMinute = 60_000 - (Date.now() % 60_000)
      timer = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, msToNextMinute + 20)
    }
    const onVisibility = () => {
      window.clearTimeout(timer)
      if (document.hidden) return
      setNow(new Date())
      schedule()
    }
    schedule()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return now
}

function GutterClock() {
  const now = useMinuteClock()
  const hours = now.getHours()
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' })
  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

  return (
    <aside className="gutter-clock" aria-label="Clock">
      <time className="gutter-clock-face" dateTime={now.toISOString()}>
        <span className="gutter-clock-date">
          {weekday}, {date}
        </span>
        <span className="gutter-clock-time">
          {h12}
          <span className="gutter-clock-colon">:</span>
          {minutes}
          <span className="gutter-clock-ap">{hours < 12 ? 'am' : 'pm'}</span>
        </span>
        <span className="gutter-clock-track" aria-hidden="true">
          {/* Keyed per minute so the sweep restarts on the boundary, offset to the current second. */}
          <i key={now.getTime()} style={{ animationDelay: `-${now.getSeconds() + now.getMilliseconds() / 1000}s` }} />
        </span>
      </time>
    </aside>
  )
}

export { GutterClock }
