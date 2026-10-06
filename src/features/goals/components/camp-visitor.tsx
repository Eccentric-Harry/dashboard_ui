// Today's visitor (camp-visitors.ts) standing in the meadow — or, for Comet, swimming
// through the night sky — and the guestbook of everyone who has found the camp. A tap
// says hello: the visitor answers (another tap, another line), and their first hello is
// remembered on this device so a newcomer gets the camp's full attention only once.

import { useState } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { arrivedVisitors, nextVisitor, VISITORS, visitorLine, type Visitor } from '../camp-visitors'
import { CampSheet } from './camp-sheet'
import { VisitorArt } from './visitor-art'

type CampVisitorProps = {
  visitor: Visitor
  today: string
  /** Hasn't been greeted on this device yet — wears a sparkle. */
  isNew: boolean
  /** Night: Comet only swims after dark. */
  night: boolean
  onGreet: (id: string) => void
  onOpenGuestbook: (origin: HTMLElement) => void
}

function CampVisitor({ visitor, today, isNew, night, onGreet, onOpenGuestbook }: CampVisitorProps) {
  const [said, setSaid] = useState<number | null>(null)
  if (visitor.place === 'sky' && !night) return null

  const hello = () => {
    setSaid((n) => (n == null ? 0 : n + 1))
    if (isNew) onGreet(visitor.id)
  }

  return (
    <div className={cn('camp-visitor', `camp-visitor--${visitor.place}`, said != null && 'is-talking')}>
      {said != null && (
        <p className="visitor-bubble" aria-live="polite">
          <b>{visitor.name}</b>
          {isNew && said === 0 ? `Hello! I’m ${visitor.name}, ${visitor.kind}. ` : ''}
          {visitorLine(visitor, today, said)}
          <button type="button" className="visitor-book" data-sound="page" onClick={(e) => onOpenGuestbook(e.currentTarget)}>
            <BookOpen size={12} strokeWidth={2.6} aria-hidden="true" /> Guestbook
          </button>
        </p>
      )}
      <button
        type="button"
        className="visitor-hit"
        data-sound="pop"
        onClick={hello}
        aria-label={`${visitor.name}, ${visitor.kind}, is visiting the camp today. Say hello.`}
      >
        <VisitorArt id={visitor.id} talking={said != null} />
        {isNew && (
          <span className="visitor-new" aria-hidden="true">
            <Sparkles size={11} strokeWidth={2.8} /> new
          </span>
        )}
      </button>
    </div>
  )
}

type GuestbookProps = {
  open: boolean
  origin: HTMLElement | null
  grownWeeks: number
  todayVisitor: string | null
  onClose: () => void
}

/** Everyone who's found the camp, and the empty pages still waiting for someone. */
function Guestbook({ open, origin, grownWeeks, todayVisitor, onClose }: GuestbookProps) {
  const here = arrivedVisitors(grownWeeks)
  const next = nextVisitor(grownWeeks)
  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="gb-title" width={520}>
      <div className="gb">
        <header className="gb-head">
          <p className="gb-kicker">The camp guestbook</p>
          <h2 id="gb-title">
            {here.length} of {VISITORS.length} have visited
          </h2>
          <p className="gb-sub">Word gets around when a camp keeps its lanterns. Every kept week counts, forever — nobody ever leaves.</p>
        </header>
        <ol className="gb-grid">
          {VISITORS.map((v) => {
            const met = grownWeeks >= v.arrives
            return (
              <li key={v.id} className={cn('gb-guest', !met && 'is-waiting', v.id === todayVisitor && 'is-today')}>
                <VisitorArt id={v.id} silhouette={!met} />
                <b>{met ? v.name : '???'}</b>
                <small>{met ? v.kind : `at ${v.arrives} kept weeks`}</small>
                {v.id === todayVisitor && <em>here today</em>}
              </li>
            )
          })}
        </ol>
        <p className="gb-foot">
          {next
            ? `Someone new is on the way — they arrive at ${next.arrives} kept weeks. The camp is at ${grownWeeks}.`
            : 'Everyone has found the camp. Even Comet, who mostly hums.'}
        </p>
        {here.length > 0 && (
          <ul className="gb-notes">
            {here.slice(-3).reverse().map((v) => (
              <li key={v.id}>
                <b>{v.name}.</b> {v.about}
              </li>
            ))}
          </ul>
        )}
      </div>
    </CampSheet>
  )
}

export { CampVisitor, Guestbook }
