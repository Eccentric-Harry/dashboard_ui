import { cn } from '@/lib/utils'
import { COURSE, SESSIONS } from './course'
import { CHAPTER_COLORS, type PathRead } from './path-data'

type TrailMapProps = {
  read: PathRead
  /** Scrolls the world to a chapter's banner. */
  onJump: (chapter: number) => void
}

/**
 * A slim map of the mountain down the side of the screen: the nine chapters as dots (the
 * finished ones filled in their colour), and a marker for where you are. Tap a chapter to
 * look at it on the path.
 */
function TrailMap({ read, onJump }: TrailMapProps) {
  const n = SESSIONS.length
  const here = read.doneNow.size
  const at = (i: number) => `${(i / n) * 100}%`
  const starts = COURSE.map((_, i) => COURSE.slice(0, i).reduce((sum, c) => sum + c.sessions.length, 0))
  return (
    <nav className="qp-map" aria-label="Chapters on the path">
      <span className="qp-map-line" aria-hidden="true">
        <i style={{ height: at(here) }} />
      </span>
      {COURSE.map((c, ci) => {
        const from = starts[ci]
        const done = c.sessions.every((s) => read.doneNow.has(s.id))
        const isHere = !done && read.nextChapter.n === c.n
        return (
          <button
            key={c.n}
            type="button"
            className={cn('qp-map-stop', done && 'is-reached', isHere && 'is-next')}
            style={{ bottom: at(from), ['--ch' as string]: CHAPTER_COLORS[c.color].fill }}
            onClick={() => onJump(c.n)}
            aria-label={`Chapter ${c.n}, ${c.theme}${done ? ' — walked' : isHere ? ' — you are here' : ''}`}
          >
            <span className="qp-map-label">
              {c.theme}
              <small>{done ? 'walked' : isHere ? 'you are here' : c.place}</small>
            </span>
          </button>
        )
      })}
      <span className="qp-map-you" style={{ bottom: at(here) }} aria-hidden="true" />
    </nav>
  )
}

export { TrailMap }
