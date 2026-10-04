import type { ReactNode } from 'react'
import { Check, Moon, Sprout, X } from 'lucide-react'
import { CampSheet } from '../components/camp-sheet'
import { Pip } from '../components/pip'

type GuideSheetProps = {
  open: boolean
  origin: HTMLElement | null
  buddyName: string
  onClose: () => void
}

// Small drawings of the island's things, in the scene's own colours, so each line of the
// guide points at something you can find in the picture.
const Art = ({ children }: { children: ReactNode }) => (
  <svg className="lh-guide-art" viewBox="0 0 48 48" aria-hidden="true">
    <ellipse cx="24" cy="43" rx="17" ry="3" className="lh-guide-ground" />
    {children}
  </svg>
)

const TowerArt = () => (
  <Art>
    <path d="M17 42 L20 16 H28 L31 42 Z" fill="#fffaf2" stroke="#5d4a5f" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M18.1 33 H29.9 L30.4 37.5 H17.6 Z M19.3 23 H28.7 L29.2 27.5 H18.8 Z" fill="#ff8fa6" />
    <rect x="16" y="14" width="16" height="3" rx="1" fill="#5d4a5f" />
    <rect x="19.5" y="8" width="9" height="6" rx="1" fill="#fff3b0" stroke="#5d4a5f" strokeWidth="1.4" />
    <path d="M18.6 8.5 C 19 3.6, 29 3.6, 29.4 8.5 Z" fill="#ff8fa6" stroke="#5d4a5f" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M22 42 V37.5 a2 2 0 0 1 4 0 V42 Z" fill="#5d4a5f" />
  </Art>
)

const FlagArt = () => (
  <Art>
    <path d="M17 42 V8" stroke="#6b5440" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="17" cy="7.5" r="2.2" fill="#ffcb3d" />
    <path d="M18 10 L36 15 L18 21 Z" fill="#52b4ff" />
  </Art>
)

const BenchArt = () => (
  <Art>
    <path d="M12 28 V16 H36 V28" fill="none" stroke="#9c6536" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="9" y="26" width="30" height="5" rx="2" fill="#c98e57" />
    <path d="M13 31 V41 M35 31 V41" stroke="#9c6536" strokeWidth="2.6" strokeLinecap="round" />
  </Art>
)

const BottleArt = () => (
  <Art>
    <g transform="rotate(-10 24 32)">
      <path d="M8 34 C 8 27, 13 24, 22 24 L 30 24 L 33 21 L 38 21 L 38 28 L 33 28 L 30 33 C 22 36, 12 39, 8 34 Z" fill="rgba(176, 240, 222, 0.92)" stroke="#179f99" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="14" y="27" width="11" height="5" rx="1.6" fill="#fffaf0" />
      <rect x="37" y="21" width="4.5" height="7" rx="1.4" fill="#a8693f" />
    </g>
  </Art>
)

const LogbookArt = () => (
  <Art>
    <rect x="10" y="26" width="28" height="16" rx="2.5" fill="#c98e57" />
    <path d="M10 34 H38 M19 26 V42 M29 26 V42" stroke="#9c6536" strokeWidth="1.2" />
    <g transform="rotate(-8 24 21)">
      <rect x="11" y="16" width="26" height="10" rx="2" fill="#ff6f95" />
      <path d="M24 17 V25" stroke="#fffaf0" strokeWidth="1.4" />
    </g>
  </Art>
)

type Item = { key: string; art: ReactNode; name: string; line: string }

/**
 * What's what: one short line for everything you can touch, in the picture and in the log.
 * It opens from the "?" in the bar, and the first visit gets a dot on that button instead of
 * a pop-up (contextual help, re-readable any time, never in the way).
 */
function GuideSheet({ open, origin, buddyName, onClose }: GuideSheetProps) {
  const island: Item[] = [
    { key: 'tower', art: <TowerArt />, name: 'The tower', line: 'Every promise you keep lays one stone. The lamp room goes up at 25, it lights at 50, the beam turns at 100.' },
    {
      key: 'pip',
      art: (
        <span className="lh-guide-pip">
          <Pip mood="content" size={40} name={buddyName} />
        </span>
      ),
      name: buddyName,
      line: 'Says one thing at a time. When a week goes quiet, offers a smaller step — never a telling-off.',
    },
    { key: 'flag', art: <FlagArt />, name: 'The flag', line: 'Check-ins. It goes up when one is due: photos and well-being every two weeks.' },
    { key: 'bench', art: <BenchArt />, name: 'The bench', line: 'The weekly review, on Saturday or Sunday — the only place targets change.' },
    { key: 'bottle', art: <BottleArt />, name: 'The bottle', line: 'Letters. One to 23-year-old you, sealed until your birthday.' },
    { key: 'logbook', art: <LogbookArt />, name: 'The logbook', line: 'Everything so far, and day 1 next to now.' },
  ]
  const log: Item[] = [
    {
      key: 'sign',
      art: (
        <span className="lh-guide-mini lh-guide-mini--sign" aria-hidden="true">
          <b>Day</b>
        </span>
      ),
      name: 'The sign',
      line: 'Which of the four phases you’re in, and what it asks of you.',
    },
    {
      key: 'hold',
      art: (
        <span className="lh-guide-mini lh-guide-mini--hold" aria-hidden="true">
          <svg viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" className="lh-guide-hold-track" />
            <circle cx="20" cy="20" r="16" className="lh-guide-hold-ring" transform="rotate(-90 20 20)" />
          </svg>
          <Check size={16} strokeWidth={3.4} />
        </span>
      ),
      name: 'Hold the circle',
      line: 'Press and hold until the ring closes — that logs the full version.',
    },
    {
      key: 'small',
      art: (
        <span className="lh-guide-mini lh-guide-mini--small" aria-hidden="true">
          <Sprout size={18} strokeWidth={2.6} />
        </span>
      ),
      name: 'Small version',
      line: 'The bad-day version. It counts as done, every time.',
    },
    {
      key: 'dots',
      art: (
        <span className="lh-guide-mini lh-guide-mini--dots" aria-hidden="true">
          {[1, 0, 1, 0, 2, 3, 3].map((s, i) => (
            <i key={i} data-s={s} />
          ))}
        </span>
      ),
      name: 'The dots',
      line: 'This week, one per day, Monday first. Empty days stay grey.',
    },
  ]

  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="lh-guide-title" width={820}>
      <div className="lh-sheet lh-guide">
        <header className="lh-sheet-head">
          <div className="lh-sheet-title">
            <h2 id="lh-guide-title">What’s what</h2>
            <p>Ninety days, eight small habits, one lighthouse.</p>
          </div>
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
            <X size={18} strokeWidth={2.6} />
          </button>
        </header>
        <div className="lh-sheet-body lh-guide-body">
          <section className="lh-guide-col" aria-labelledby="lh-guide-island">
            <h3 id="lh-guide-island" className="lh-kicker">On the island · tap any of them</h3>
            <ul className="lh-guide-list">
              {island.map((it) => (
                <li key={it.key}>
                  {it.art}
                  <span>
                    <strong>{it.name}</strong>
                    <small>{it.line}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="lh-guide-col" aria-labelledby="lh-guide-log">
            <h3 id="lh-guide-log" className="lh-kicker">In the log</h3>
            <ul className="lh-guide-list">
              {log.map((it) => (
                <li key={it.key}>
                  {it.art}
                  <span>
                    <strong>{it.name}</strong>
                    <small>{it.line}</small>
                  </span>
                </li>
              ))}
            </ul>
            <div className="lh-guide-rules">
              <p>
                <Check size={14} strokeWidth={3} aria-hidden="true" /> Nothing here ever turns red.
              </p>
              <p>
                <Moon size={14} strokeWidth={2.8} aria-hidden="true" /> A new day starts at 4 am, not midnight.
              </p>
            </div>
          </section>
        </div>
      </div>
    </CampSheet>
  )
}

export { GuideSheet }
