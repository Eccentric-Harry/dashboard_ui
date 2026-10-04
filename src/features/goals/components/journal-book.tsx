import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { CampView, GoalProgressView } from '@/types/goals'
import { cn } from '@/lib/utils'
import type { PipMood } from '../buddy-brain'
import type { PipStage } from '../pip-growth'
import { campSound } from '../camp-sound'
import { useHeld } from '../use-held'
import { useMediaQuery } from '../use-media-query'
import { CampSheet } from './camp-sheet'
import { Moss } from './camp-characters'
import { JournalStickers } from './journal-stickers'
import { JournalWeeks } from './journal-weeks'
import { SeasonMap } from './season-map'

export type JournalPage = 'weeks' | 'stickers' | 'map'

type JournalBookProps = {
  /** Which page it's open at; null = closed. */
  page: JournalPage | null
  origin: HTMLElement | null
  goals: GoalProgressView[]
  camp: CampView | undefined
  pip: { mood: PipMood; stage: PipStage; wear?: { hat?: string | null; neck?: string | null; face?: string | null } }
  onPage: (page: JournalPage) => void
  onEdit: (view: GoalProgressView) => void
  onRestore: (id: string) => Promise<boolean>
  onClose: () => void
}

/** Two-page spreads on a wide screen: the ledger beside the album, then the map across both. */
const spreadOf = (page: JournalPage, wide: boolean) => (wide ? (page === 'map' ? 'map' : 'log') : page)

/**
 * The camp journal, as a book. It flies out of the one lying in the grass and its cover
 * swings open: the weeks-kept ledger on the left page, the sticker album on the right,
 * and — a ribbon away — Moss's map of the season across both. Ribbon bookmarks turn the
 * pages (with a page that actually turns). On a phone it's one page at a time.
 */
function JournalBook({ page: livePage, origin, goals, camp, pip, onPage, onEdit, onRestore, onClose }: JournalBookProps) {
  const open = livePage != null
  const page = useHeld(livePage) ?? 'weeks'
  const wide = useMediaQuery('(min-width: 900px)')
  const spread = spreadOf(page, wide)
  const [turn, setTurn] = useState<{ key: number; dir: 'forward' | 'back' } | null>(null)

  const inChest = useMemo(
    () => new Set((camp?.chest ?? []).flatMap((item) => item.stickers.map((s) => `${item.goalId}:${s.weeks}`))),
    [camp],
  )

  const ribbons: { id: JournalPage; label: string; color: string }[] = wide
    ? [
        { id: 'weeks', label: 'Weeks & stickers', color: 'tangerine' },
        { id: 'map', label: 'Season map', color: 'mint' },
      ]
    : [
        { id: 'weeks', label: 'Weeks', color: 'tangerine' },
        { id: 'stickers', label: 'Stickers', color: 'grape' },
        { id: 'map', label: 'Map', color: 'mint' },
      ]
  const order: JournalPage[] = ribbons.map((r) => r.id)
  const activeRibbon = wide && page === 'stickers' ? 'weeks' : page

  const goTo = (next: JournalPage) => {
    if (spreadOf(next, wide) === spread) {
      onPage(next)
      return
    }
    const from = order.indexOf(activeRibbon)
    const to = order.indexOf(spreadOf(next, wide) === 'log' ? 'weeks' : next)
    setTurn((t) => ({ key: (t?.key ?? 0) + 1, dir: to > from ? 'forward' : 'back' }))
    campSound.play('page')
    onPage(next)
  }

  const map = camp?.season ? (
    <SeasonMap season={camp.season} vertical={!wide} pip={pip} />
  ) : (
    <p className="bk-empty">The map needs the camp to be reachable — try again in a moment.</p>
  )

  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="bk-label" bare>
      <div className={cn('bk', wide ? 'bk--spread' : 'bk--single', `bk--${spread}`)} role="dialog" aria-modal="true" aria-labelledby="bk-label">
        <h2 id="bk-label" className="sr-only">
          Camp journal
        </h2>

        <nav className="bk-ribbons" role="tablist" aria-label="Journal pages">
          {ribbons.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={activeRibbon === r.id}
              className={cn('bk-ribbon', activeRibbon === r.id && 'is-on')}
              data-color={r.color}
              onClick={() => goTo(r.id)}
            >
              {r.label}
            </button>
          ))}
        </nav>

        <button type="button" className="bk-close" onClick={onClose} aria-label="Close the journal" data-autofocus>
          <X size={16} strokeWidth={2.8} />
        </button>

        <div className="bk-pages" key={spread}>
          {spread === 'log' && (
            <>
              <div className="bk-page bk-page--left">
                <JournalWeeks goals={goals} onEdit={onEdit} onRestore={onRestore} />
              </div>
              <div className="bk-page bk-page--right">
                <JournalStickers goals={goals} inChest={inChest} />
                <Moss className="bk-moss" />
              </div>
            </>
          )}
          {spread === 'weeks' && (
            <div className="bk-page">
              <JournalWeeks goals={goals} onEdit={onEdit} onRestore={onRestore} />
            </div>
          )}
          {spread === 'stickers' && (
            <div className="bk-page">
              <JournalStickers goals={goals} inChest={inChest} />
            </div>
          )}
          {spread === 'map' && <div className="bk-page bk-page--map">{map}</div>}
        </div>

        {wide && <span className="bk-spine" aria-hidden="true" />}
        {turn && <span key={turn.key} className={cn('bk-leaf', `bk-leaf--${turn.dir}`)} aria-hidden="true" />}
        {wide && (
          <span className="bk-cover" aria-hidden="true">
            <span className="bk-cover-title">Camp journal</span>
            <span className="bk-cover-sticker" />
          </span>
        )}
      </div>
    </CampSheet>
  )
}

export { JournalBook }
