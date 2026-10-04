import { Check, Lock, Moon, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CampSheet } from '../../components/camp-sheet'
import { useHeld } from '../../use-held'
import type { Chapter, Session } from './course'
import { CHAPTER_COLORS, type PathRead } from './path-data'
import type { NodeState } from './path-scene'
import { SessionIcon } from './session-icon'

type StoneSheetProps = {
  stone: { session: Session; chapter: Chapter; state: NodeState; origin: HTMLElement | null } | null
  onPlay: (session: Session) => void
  onClose: () => void
}

/** A stone that can't be walked yet — what it is, and why it waits. */
function StoneSheet({ stone: live, onPlay, onClose }: StoneSheetProps) {
  const stone = useHeld(live)
  if (!stone) return null
  const c = CHAPTER_COLORS[stone.chapter.color]
  return (
    <CampSheet open={live != null} onRequestClose={onClose} origin={live?.origin ?? stone.origin} labelledBy="qs-stone-title" width={400}>
      <div className="qps" style={{ ['--ch' as string]: c.fill, ['--ch-lip' as string]: c.lip, ['--ch-soft' as string]: c.soft }}>
        <button type="button" className="cs-icon qps-x" onClick={onClose} aria-label="Close">
          <X size={16} strokeWidth={2.6} />
        </button>
        <span className={cn('qps-badge', `is-${stone.state}`)} aria-hidden="true">
          {stone.state === 'soon' ? <Moon size={30} strokeWidth={2.4} /> : <SessionIcon icon={stone.session.icon} size={30} />}
        </span>
        <p className="qps-kicker">
          Chapter {stone.chapter.n} · {stone.chapter.theme} · {stone.session.minutes} min
        </p>
        <h2 id="qs-stone-title">{stone.session.title}</h2>
        <p className="qps-why">{stone.session.why}</p>
        {stone.state === 'soon' ? (
          <p className="qps-wait">
            <Moon size={15} strokeWidth={2.6} /> Opens tomorrow. One new stone a day — spacing it out helps it stay with you. Anything you’ve walked can be replayed meanwhile.
          </p>
        ) : stone.state === 'locked' ? (
          <p className="qps-wait">
            <Lock size={15} strokeWidth={2.6} /> Waits further up the path. Each stone builds on the ones before it.
          </p>
        ) : (
          <button type="button" className="qs-cta" onClick={() => onPlay(stone.session)} data-autofocus>
            <Play size={17} strokeWidth={2.8} /> Replay
          </button>
        )}
      </div>
    </CampSheet>
  )
}

type ChapterGuideProps = {
  guide: { chapter: Chapter; origin: HTMLElement | null } | null
  read: PathRead
  onPlay: (session: Session) => void
  onClose: () => void
}

/** A chapter's guide: what it is, why it helps, and its six stones — story, practices, kit. */
function ChapterGuide({ guide: live, read, onPlay, onClose }: ChapterGuideProps) {
  const guide = useHeld(live)
  if (!guide) return null
  const { chapter } = guide
  const c = CHAPTER_COLORS[chapter.color]
  const walkedIds = read.doneNow
  return (
    <CampSheet open={live != null} onRequestClose={onClose} origin={live?.origin ?? guide.origin} labelledBy="qs-guide-title" width={470} tone="letter">
      <div className="qpg" style={{ ['--ch' as string]: c.fill, ['--ch-lip' as string]: c.lip, ['--ch-soft' as string]: c.soft }}>
        <header className="qpg-head">
          <div>
            <p className="qps-kicker">
              Chapter {chapter.n} · {chapter.place}
            </p>
            <h2 id="qs-guide-title">{chapter.theme}</h2>
          </div>
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
            <X size={16} strokeWidth={2.6} />
          </button>
        </header>
        <p className="qpg-intention">{chapter.intention}</p>
        {chapter.guide.map((g, i) => (
          <p key={i} className="qpg-para">
            {g}
          </p>
        ))}
        <ul className="qpg-list">
          {chapter.sessions.map((s) => {
            const walked = walkedIds.has(s.id)
            return (
              <li key={s.id} className={cn(walked && 'is-walked')}>
                <span className="qpg-icon" aria-hidden="true">
                  {walked ? <Check size={16} strokeWidth={3.2} /> : <SessionIcon icon={s.icon} size={17} />}
                </span>
                <span className="qpg-text">
                  <strong>{s.title}</strong>
                  <small>
                    {s.minutes} min · {s.why}
                  </small>
                </span>
                {walked && (
                  <button type="button" className="qpg-play" onClick={() => onPlay(s)} aria-label={`Replay ${s.title}`}>
                    <Play size={14} strokeWidth={2.8} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </CampSheet>
  )
}

export { ChapterGuide, StoneSheet }
