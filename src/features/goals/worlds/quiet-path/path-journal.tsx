import { useEffect, useRef, useState } from 'react'
import { Backpack, Lightbulb, Loader2, Mail, PenLine, Sprout, X } from 'lucide-react'
import type { GoalKit, GoalKitPage } from '@/types/goals'
import { cn } from '@/lib/utils'
import { dayLabel } from '../../goal-format'
import { campSound } from '../../camp-sound'
import { CampSheet } from '../../components/camp-sheet'
import { COURSE } from './course'
import { CHAPTER_COLORS, type PathRead } from './path-data'
import { EMPTY_PAGE, KIT_PAGES, hasContent, packedCount, type KitKey, type KitPageDef } from './kit'
import { KitEditor } from './kit-editor'
import { POCKET_CARDS } from './pocket-cards'
import { PracticeIcon } from './step-sheet'

export type PathJournalTab = 'kit' | 'cards' | 'postcards' | 'helps'

type PathJournalProps = {
  tab: PathJournalTab | null
  origin: HTMLElement | null
  /** A kit page to open straight into (from Anytime's heavy-day plan). */
  focusPage: KitKey | null
  read: PathRead
  kit: GoalKit
  /** Satchels opened on this device. */
  opened: number[]
  onSaveKit: (page: KitKey, draft: GoalKitPage) => Promise<void>
  onCard: (chapter: number) => void
  onTab: (tab: PathJournalTab) => void
  onClose: () => void
}

const TABS: { key: PathJournalTab; label: string; icon: typeof Mail }[] = [
  { key: 'kit', label: 'Kit', icon: Backpack },
  { key: 'cards', label: 'Cards', icon: Lightbulb },
  { key: 'postcards', label: 'Postcards', icon: Mail },
  { key: 'helps', label: 'Helps', icon: Sprout },
]

const placeOf = (n: number) => COURSE.find((c) => c.n === n)?.place ?? ''
/** "the birch wood", "Fern hollow" — a place in the middle of a sentence. */
const placeIn = (n: number) => placeOf(n).replace(/^The /, 'the ')

/**
 * The path's notebook: the totals (only ever growing), then four pages — the trail kit
 * (your own plan, page by page, editable any time), the pocket cards found in satchels,
 * the postcard Kiri sent from each chapter, and "what helps" — the practices you lean on
 * and your own lines about what stayed with you. Nothing here is a score.
 */
function PathJournal({ tab: liveTab, origin, focusPage, read, kit, opened, onSaveKit, onCard, onTab, onClose }: PathJournalProps) {
  const open = liveTab != null
  const tab = liveTab ?? 'kit'
  const maxTally = Math.max(1, ...read.tally.map((t) => t.count))
  const hours = Math.floor(read.minutes / 60)
  const packed = packedCount(kit)

  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="pj-title" width={500} tone="letter">
      <div className="pj">
        <header className="pj-head">
          <h2 id="pj-title" className="sr-only">
            The path’s notebook
          </h2>
          <div className="pj-tabs" role="tablist" aria-label="Notebook pages">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={cn(tab === t.key && 'is-on')} onClick={() => onTab(t.key)}>
                  <Icon size={15} strokeWidth={2.5} /> {t.label}
                </button>
              )
            })}
          </div>
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
            <X size={16} strokeWidth={2.6} />
          </button>
        </header>

        <ul className="pj-stats">
          <li>
            <strong>{read.walked.length}</strong>
            <small>{read.walked.length === 1 ? 'stone walked' : 'stones walked'}</small>
          </li>
          <li>
            <strong>{read.daysTended}</strong>
            <small>{read.daysTended === 1 ? 'day tended' : 'days tended'}</small>
          </li>
          <li>
            <strong>{hours > 0 ? `${hours}h ${read.minutes % 60}m` : `${read.minutes}m`}</strong>
            <small>of practice</small>
          </li>
          <li>
            <strong>{packed}</strong>
            <small>{packed === 1 ? 'page packed' : 'pages packed'}</small>
          </li>
        </ul>

        {tab === 'kit' && <KitPages key={`${open ? 'open' : 'shut'}-${focusPage ?? ''}`} kit={kit} read={read} focusPage={open ? focusPage : null} onSave={onSaveKit} />}

        {tab === 'cards' && (
          <div className="pj-body">
            <p className="pj-lede">One practical idea from each place, found in the satchel on its path.</p>
            <ul className="pj-pocket">
              {POCKET_CARDS.map((pc) => {
                const found = read.satchels.includes(pc.chapter)
                const chapter = COURSE.find((c) => c.n === pc.chapter)
                const color = chapter ? CHAPTER_COLORS[chapter.color] : CHAPTER_COLORS.sky
                return (
                  <li key={pc.chapter}>
                    {found ? (
                      <button
                        type="button"
                        className={cn('pj-pocket-card', !opened.includes(pc.chapter) && 'is-new')}
                        style={{ ['--ch' as string]: color.fill, ['--ch-soft' as string]: color.soft }}
                        onClick={() => onCard(pc.chapter)}
                      >
                        <small>{placeOf(pc.chapter)}</small>
                        <strong>{pc.title}</strong>
                        <span>{pc.tryIt}</span>
                      </button>
                    ) : (
                      <span className="pj-pocket-card is-hidden">
                        <small>{placeOf(pc.chapter)}</small>
                        <strong>?</strong>
                        <span>In the satchel on this place’s path</span>
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {tab === 'postcards' && (
          <div className="pj-body">
            {read.chaptersDone.length === 0 && <p className="pj-empty">Finish a chapter’s six stones and Kiri sends a postcard from that place.</p>}
            <ul className="pj-cards">
              {[...read.chaptersDone].reverse().map(({ chapter, date, loop }, i) => (
                <li
                  key={`${loop}-${chapter.n}`}
                  className="pj-card"
                  style={{ ['--tilt' as string]: `${((i % 3) - 1) * 1.2}deg`, ['--stamp' as string]: CHAPTER_COLORS[chapter.color].fill }}
                >
                  <span className="pj-stamp" aria-hidden="true">
                    {chapter.n}
                  </span>
                  <strong>{chapter.place}</strong>
                  <small>
                    {chapter.theme} · {dayLabel(date)}
                    {loop > 0 ? ` · walk ${loop + 1}` : ''}
                  </small>
                  <p>“{chapter.postcard}”</p>
                  <span className="pj-sign">— Kiri</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'helps' && (
          <div className="pj-body">
            {read.tally.length === 0 ? (
              <p className="pj-empty">As you walk and practise, the things that help you show up here — so on a heavy day you can see what has worked before.</p>
            ) : (
              <>
                <p className="pj-kicker">What you lean on</p>
                <ul className="pj-tally">
                  {read.tally.map(({ practice, count }) => (
                    <li key={practice.key}>
                      <span className="pj-tally-icon" style={{ background: practice.fill }} aria-hidden="true">
                        <PracticeIcon practice={practice.key} size={15} />
                      </span>
                      <span className="pj-tally-name">{practice.label}</span>
                      <span className="pj-tally-bar" aria-hidden="true">
                        <i style={{ width: `${Math.round((count / maxTally) * 100)}%`, background: practice.fill }} />
                      </span>
                      <span className="pj-tally-count">{count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {read.helped.length > 0 && (
              <>
                <p className="pj-kicker">In your own words</p>
                <ul className="pj-helped">
                  {read.helped.map((h, i) => (
                    <li key={`${h.date}-${i}`}>
                      <p>“{h.note}”</p>
                      <small>{dayLabel(h.date)}</small>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </CampSheet>
  )
}

type KitPagesProps = {
  kit: GoalKit
  read: PathRead
  focusPage: KitKey | null
  onSave: (page: KitKey, draft: GoalKitPage) => Promise<void>
}

/** The trail kit, page by page: what's on each, and an editor that opens in place. */
function KitPages({ kit, read, focusPage, onSave }: KitPagesProps) {
  const [editing, setEditing] = useState<KitKey | null>(focusPage)
  const [draft, setDraft] = useState<GoalKitPage>(() => (focusPage ? (kit[focusPage] ?? EMPTY_PAGE) : EMPTY_PAGE))
  const [saving, setSaving] = useState(false)
  const listRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => {
    if (!editing) return
    listRef.current?.querySelector<HTMLElement>(`[data-page="${editing}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [editing])

  const edit = (page: KitPageDef) => {
    setEditing(page.key)
    setDraft(kit[page.key] ?? EMPTY_PAGE)
    campSound.play('page')
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await onSave(editing, draft)
      setEditing(null)
      campSound.play('chime')
    } catch {
      // The world shows the reason; the editor stays open with what was typed.
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pj-body">
      <p className="pj-lede">Your own plan, packed a page at the end of each place. Change any of it, any time.</p>
      <ul className="pj-kit" ref={listRef}>
        {KIT_PAGES.map((page) => {
          const chapter = COURSE.find((c) => c.n === page.chapter)
          const color = chapter ? CHAPTER_COLORS[chapter.color] : CHAPTER_COLORS.sky
          const value = kit[page.key]
          const filled = hasContent(value)
          const isEditing = editing === page.key
          const reached = read.nextChapter.n > page.chapter || read.loop > 0 || read.chaptersDone.some((c) => c.chapter.n === page.chapter)
          return (
            <li
              key={page.key}
              data-page={page.key}
              className={cn('pj-kit-page', filled && 'is-filled', isEditing && 'is-editing')}
              style={{ ['--ch' as string]: color.fill, ['--ch-lip' as string]: color.lip, ['--ch-soft' as string]: color.soft }}
            >
              <header>
                <span className="pj-kit-stamp" aria-hidden="true">
                  {page.chapter}
                </span>
                <div>
                  <strong>{page.title}</strong>
                  <small>
                    {filled && value?.updatedAt ? `Packed ${dayLabel(value.updatedAt.slice(0, 10))}` : reached ? 'Ready to fill in' : `Packed at ${placeIn(page.chapter)} — or now`}
                  </small>
                </div>
                {!isEditing && (
                  <button type="button" className="pj-kit-edit" onClick={() => edit(page)} aria-label={`${filled ? 'Edit' : 'Fill in'} ${page.title}`}>
                    <PenLine size={14} strokeWidth={2.6} /> {filled ? 'Edit' : 'Fill in'}
                  </button>
                )}
              </header>
              {isEditing ? (
                <>
                  <p className="pj-kit-blurb">{page.blurb}</p>
                  <KitEditor page={page} value={draft} onChange={setDraft} />
                  <div className="pj-kit-actions">
                    <button type="button" className="pj-kit-cancel" onClick={() => setEditing(null)} disabled={saving}>
                      Cancel
                    </button>
                    <button type="button" className="qs-cta" onClick={() => void save()} disabled={saving}>
                      {saving && <Loader2 size={15} className="animate-spin" />} Save page
                    </button>
                  </div>
                </>
              ) : filled && value ? (
                <div className="pj-kit-show">
                  {value.picks.length > 0 && (
                    <ul className="pj-kit-picks">
                      {value.picks.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                  {page.fields.map((f) =>
                    value.fields[f.key]?.trim() ? (
                      <p key={f.key} className="pj-kit-field">
                        <small>{f.label}</small>
                        {value.fields[f.key]}
                      </p>
                    ) : null,
                  )}
                </div>
              ) : (
                <p className="pj-kit-blurb">{page.blurb}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { PathJournal }
