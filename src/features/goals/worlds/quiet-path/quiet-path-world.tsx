import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft, BookOpen, Footprints, LifeBuoy, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import type { GoalCheckInPayload, GoalJourney, GoalKitPage, GoalPractice } from '@/types/goals'
import { goalsService } from '@/services/goals-service'
import { goalsActions, useGoalsStore } from '@/store/goals-store'
import { celebrationActions } from '@/store/celebration-store'
import { spiralActions } from '@/store/spiral-store'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { addDays, goalDay } from '../../goal-format'
import { campSound, useCampSoundPrefs } from '../../camp-sound'
import { buddyNameOf } from '../../camp-catalog'
import { pipGrowth } from '../../pip-growth'
import { GREETING, skyPhase } from '../../sky-phase'
import { COURSE, chapterOf, type BreathPatternKey, type Chapter, type Session } from './course'
import { CHAPTER_COLORS, kiriLine, lastWeek, readPath, type KiriMoment } from './path-data'
import { layoutPath, NARROW } from './path-layout'
import { PathScene, type NodeState, type SatchelState } from './path-scene'
import { RESIDENTS, type ResidentKey } from './residents'
import type { KitKey } from './kit'
import { PocketCardReveal } from './pocket-card-reveal'
import { SessionPlayer } from './session-player'
import { ChapterGuide, StoneSheet } from './path-sheets'
import { AnytimeSheet } from './anytime-sheet'
import { BreatheTool, SitTimer } from './tool-players'
import { StepSheet } from './step-sheet'
import { PathJournal, type PathJournalTab } from './path-journal'
import { TrailMap } from './trail-map'
import '../../camp-ui.css'
import './quiet-path.css'

type QuietPathWorldProps = {
  goalId: string
  onBack: () => void
}

type Origin = HTMLElement | null

const LOOKBACK_KEY = 'qp.lookback'
const satchelKey = (goalId: string) => `qp.satchels.${goalId}`
const readKey = (key: string) => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const readOpened = (goalId: string): number[] => {
  try {
    const v = JSON.parse(window.localStorage.getItem(satchelKey(goalId)) ?? '[]')
    return Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}

const COURSE_PLACE = (n: number) => (COURSE.find((c) => c.n === n)?.place ?? 'the path').replace(/^The /, 'the ')

const isMinutes = (unit?: string | null) => !!unit && /^(min|mins|minutes?)$/i.test(unit.trim())

// Seeded spots for the drifting air — petals by day, fireflies at night.
const AIR = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  delay: -(i * 1.7) % 11,
  dur: 9 + (i % 5) * 2.2,
}))

/**
 * The Quiet Path — a goal's own world for a journey rather than a target. A guided course
 * up a mountain: nine places, each with a resident who tells its story, four short
 * practices, and a stone where you pack that place's page of your kit — one new stone a
 * day (course.ts). A satchel on each chapter's path holds a pocket card. Beside the path,
 * Anytime holds Calm's everyday tools — breathing, soundscapes, a sitting timer, quick
 * help, your heavy-day plan — and the notebook keeps the kit, the cards, postcards and
 * what helps. No streaks, no scores, no mood questions; the Spiral Breaker is one tap away.
 */
function QuietPathWorld({ goalId, onBack }: QuietPathWorldProps) {
  const board = useGoalsStore.use.board()
  const [today, setToday] = useState(goalDay)
  const [now, setNow] = useState(() => new Date())
  const [journey, setJourney] = useState<GoalJourney | null>(null)
  const [journeyFailed, setJourneyFailed] = useState(false)
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1000 : window.innerWidth))
  const [player, setPlayer] = useState<{ session: Session; chapter: Chapter; mode: 'walk' | 'replay' } | null>(null)
  const [stone, setStone] = useState<{ session: Session; chapter: Chapter; state: NodeState; origin: Origin } | null>(null)
  const [guide, setGuide] = useState<{ chapter: Chapter; origin: Origin } | null>(null)
  const [anytime, setAnytime] = useState<{ origin: Origin } | null>(null)
  const [breath, setBreath] = useState<BreathPatternKey | null>(null)
  const [sit, setSit] = useState<{ minutes: number; interval: number } | null>(null)
  const [other, setOther] = useState<{ origin: Origin } | null>(null)
  const [journal, setJournal] = useState<{ tab: PathJournalTab; origin: Origin; page?: KitKey } | null>(null)
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<string | null>(null)
  const [opened, setOpened] = useState<number[]>(() => readOpened(goalId))
  const [card, setCard] = useState<{ chapter: number; fresh: boolean } | null>(null)
  const [talking, setTalking] = useState<{ who: ResidentKey; line: string } | null>(null)
  const lineIndex = useRef<Partial<Record<ResidentKey, number>>>({})
  const [moment, setMoment] = useState<KiriMoment | null>(null)
  const [postcard, setPostcard] = useState<Chapter | null>(null)
  const [kiriTalking, setKiriTalking] = useState(false)
  const [cheer, setCheer] = useState(false)
  const [lookbackSeen, setLookbackSeen] = useState(() => readKey(LOOKBACK_KEY))
  const rootRef = useRef<HTMLDivElement | null>(null)
  const placed = useRef(false)
  const { enabled: soundOn } = useCampSoundPrefs()

  useEffect(() => {
    if (!board.data) void goalsActions.loadBoard(today)
  }, [board.data, today])

  const loadJourney = async () => {
    const res = await goalsService.getJourney(goalId, today)
    if (res.data) {
      setJourney(res.data)
      setJourneyFailed(false)
    } else setJourneyFailed(true)
    return res.data ?? null
  }

  useEffect(() => {
    let alive = true
    void goalsService.getJourney(goalId, today).then((res) => {
      if (!alive) return
      if (res.data) {
        setJourney(res.data)
        setJourneyFailed(false)
      } else setJourneyFailed(true)
    })
    return () => {
      alive = false
    }
  }, [goalId, today])

  // The sky follows the clock; crossing 04:00 moves the path to the new day.
  useEffect(() => {
    const tick = () => {
      setNow(new Date())
      const day = goalDay()
      if (day !== today) setToday(day)
    }
    const timer = window.setInterval(tick, 60_000)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', tick)
    }
  }, [today])

  // Sounds stop when you leave the path.
  useEffect(() => () => campSound.stopScape(0.6), [])

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!cheer) return
    const t = window.setTimeout(() => setCheer(false), 2400)
    return () => window.clearTimeout(t)
  }, [cheer])

  useEffect(() => {
    if (!moment) return
    const t = window.setTimeout(() => setMoment(null), 9000)
    return () => window.clearTimeout(t)
  }, [moment])

  useEffect(() => {
    if (!talking) return
    const t = window.setTimeout(() => setTalking(null), 6000)
    return () => window.clearTimeout(t)
  }, [talking])

  useEffect(() => {
    if (!kiriTalking) return
    const t = window.setTimeout(() => setKiriTalking(false), 1400)
    return () => window.clearTimeout(t)
  }, [kiriTalking])

  const view = board.data?.goals.find((g) => g.goal.id === goalId) ?? null
  const camp = board.data?.camp
  const days = useMemo(() => journey?.days ?? [], [journey])
  const read = useMemo(() => readPath(days, today), [days, today])
  const layout = useMemo(() => layoutPath(width), [width])
  const phase = skyPhase(now)
  const hour = now.getHours()
  const weekStart = board.data?.weekStart ?? today
  const lookback = lastWeek(days, weekStart)
  const showLookback = lookback.days > 0 && lookbackSeen !== weekStart && today < addDays(weekStart, 3)
  const satchelReady = read.satchels.some((n) => !opened.includes(n))
  const line = kiriLine(read, today, hour, moment, { satchel: satchelReady && !read.walkedToday })
  const kit = journey?.kit ?? {}
  const growth = pipGrowth(camp?.grownWeeks ?? 0)
  const pipLook = { stage: growth.stage, name: buddyNameOf(camp?.buddyName), wear: camp?.equipped }
  const currentNode = layout.nodes.find((n) => n.session.id === read.next.id) ?? layout.nodes[0]

  // The camera: today's stone a little below the middle.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el || !journey) return
    const top = Math.max(0, currentNode.y - el.clientHeight * 0.55)
    el.scrollTo({ top, behavior: placed.current ? 'smooth' : 'auto' })
    placed.current = true
  }, [journey, currentNode.y])

  const valueFor = (minutes: number) => (view?.goal.measure === 'COUNT' ? (isMinutes(view.goal.unit) ? minutes : 1) : undefined)

  /** Saves one check-in, refreshes the path and the camp, and plays whatever it earned. */
  const save = async (payload: GoalCheckInPayload) => {
    setBusy(true)
    const before = read.walked.length
    const chaptersBefore = read.chaptersDone.length
    try {
      const res = await goalsService.addCheckIn(goalId, payload, today)
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'Couldn’t save that.')
      goalsActions.applyGoal(res.data)
      void goalsActions.refreshCamp(today)
      const next = await loadJourney()
      const after = next ? readPath(next.days, today) : read
      if (after.walked.length > before) {
        setFresh(after.walked.at(-1)?.session.id ?? null)
        setCheer(true)
        campSound.play('step')
        const walked = after.walked.at(-1)
        if (walked) setMoment({ kind: 'session', session: walked.session })
        if (after.chaptersDone.length > chaptersBefore) {
          const chapter = after.chaptersDone.at(-1)?.chapter
          if (chapter) {
            window.setTimeout(() => {
              setPostcard(chapter)
              setMoment({ kind: 'chapter', chapter })
              campSound.play('bell')
              celebrationActions.celebrate({
                anchor: document.querySelector<HTMLElement>('.qp-pip'),
                palette: 'path',
                intensity: 'echo',
                label: `${chapter.place} — chapter walked`,
                once: { key: `path-${goalId}-ch${chapter.n}-${after.loop}`, scope: goalId },
              })
            }, 1200)
          }
        }
      } else {
        campSound.play('sparkle')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Couldn’t save that — try again.'))
      throw err
    } finally {
      setBusy(false)
    }
  }

  /** Saves one page of the kit; the journey keeps the kit, so the whole world sees it at once. */
  const saveKit = async (page: KitKey, draft: GoalKitPage) => {
    const res = await goalsService.saveKitPage(goalId, page, { picks: draft.picks, fields: draft.fields })
    if (res.error || !res.data) {
      toast.error(getErrorMessage(res.error, 'Couldn’t save your kit — try again.'))
      throw new Error(res.error?.message ?? 'kit')
    }
    const saved = res.data
    setJourney((j) => (j ? { ...j, kit: saved } : j))
  }

  const finishSession = async (session: Session, note: string, draft: GoalKitPage | null) => {
    if (session.kind === 'kit' && session.kit && draft) await saveKit(session.kit, draft)
    await save({ date: today, practice: session.practice, session: session.id, minutes: session.minutes, note: note || undefined, value: valueFor(session.minutes) })
  }

  const onSatchel = (chapter: Chapter, state: SatchelState) => {
    if (state === 'closed') {
      campSound.play('soft-no')
      setMoment({ kind: 'say', text: `That satchel opens once the first three stones of ${COURSE_PLACE(chapter.n)} are walked.` })
      setKiriTalking(true)
      return
    }
    campSound.play(state === 'ready' ? 'chest-open' : 'page')
    setCard({ chapter: chapter.n, fresh: state === 'ready' })
    if (state === 'ready') {
      const next = [...new Set([...opened, chapter.n])]
      setOpened(next)
      try {
        window.localStorage.setItem(satchelKey(goalId), JSON.stringify(next))
      } catch {
        // It just shows as unopened again next visit.
      }
    }
  }

  const onResident = (who: ResidentKey) => {
    const r = RESIDENTS.find((x) => x.key === who)
    if (!r) return
    const k = lineIndex.current[who] ?? 0
    lineIndex.current[who] = k + 1
    const far = r.chapter > read.nextChapter.n + 1
    const text = far ? `See you up at ${COURSE_PLACE(r.chapter)}!` : r.lines[k % r.lines.length]
    setTalking({ who, line: text })
    campSound.voice(who, text)
  }

  const logPractice = (practice: GoalPractice, minutes: number) => save({ date: today, practice, minutes: Math.min(240, minutes), value: valueFor(minutes) })

  const undo = async (checkInId: string) => {
    setBusy(true)
    try {
      const res = await goalsService.deleteCheckIn(goalId, checkInId, today)
      if (res.data) goalsActions.applyGoal(res.data)
      await loadJourney()
      void goalsActions.refreshCamp(today)
      campSound.play('close')
    } finally {
      setBusy(false)
    }
  }

  const play = (session: Session, mode: 'walk' | 'replay') => {
    setStone(null)
    setGuide(null)
    setAnytime(null)
    setPlayer({ session, chapter: chapterOf(session.id), mode })
  }

  const onNode = (node: { session: Session; chapter: Chapter }, state: NodeState, el: HTMLElement) => {
    campSound.play('tap')
    if (state === 'next') play(node.session, 'walk')
    else if (state === 'done') play(node.session, 'replay')
    else setStone({ session: node.session, chapter: node.chapter, state, origin: el })
  }

  const jumpTo = (chapter: number) => {
    const el = rootRef.current
    const banner = layout.banners.find((b) => b.chapter.n === chapter)
    if (el && banner) el.scrollTo({ top: Math.max(0, banner.y - el.clientHeight * 0.45), behavior: 'smooth' })
  }

  const anyOverlay =
    player != null || stone != null || guide != null || anytime != null || breath != null || sit != null || other != null || journal != null || postcard != null || card != null

  if (board.data && !view) {
    return (
      <div className="qp-world qp--day qp-missing">
        <div className="qp-missing-card">
          <p>This path belongs to a goal that isn’t at camp any more.</p>
          <button type="button" className="qs-cta" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={2.6} /> Back to camp
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={cn('qp-world', `qp--${phase}`)} aria-label={`The Quiet Path — ${view?.goal.title ?? 'a journey'}`}>
      <div className="qp-air" aria-hidden="true">
        {AIR.map((a, i) => (
          <i key={i} style={{ left: `${a.left}%`, top: `${a.top}%`, animationDelay: `${a.delay}s`, animationDuration: `${a.dur}s` }} />
        ))}
      </div>

      <header className="qp-bar" inert={anyOverlay}>
        <button type="button" className="qp-pill" onClick={onBack} aria-label="Back to the camp">
          <ArrowLeft size={16} strokeWidth={2.8} />
          <span>Camp</span>
        </button>
        <div className="qp-title">
          <strong>The Quiet Path</strong>
          <small>
            {view?.goal.title ?? '…'} · {GREETING[phase].toLowerCase()}
          </small>
        </div>
        <div className="qp-bar-right">
          <span className="qp-pill qp-steps" title="Days you've tended this, in any way — it only ever grows">
            <Footprints size={15} strokeWidth={2.6} aria-hidden="true" />
            <strong>{read.daysTended}</strong>
            <small>{read.daysTended === 1 ? 'day' : 'days'}</small>
          </span>
          <button type="button" className="qp-round" onClick={() => campSound.setEnabled(!soundOn)} aria-label={soundOn ? 'Mute sound effects' : 'Turn sound effects on'} title="Sound effects">
            {soundOn ? <Volume2 size={16} strokeWidth={2.4} /> : <VolumeX size={16} strokeWidth={2.4} />}
          </button>
          <button type="button" className="qp-round" onClick={() => spiralActions.open()} aria-label="Spiral breaker" title="Spiral breaker">
            <LifeBuoy size={16} strokeWidth={2.4} />
          </button>
        </div>
      </header>

      {showLookback && (
        <aside className="qp-lookback" inert={anyOverlay}>
          <p>
            <strong>Last week on the path:</strong> {lookback.days} {lookback.days === 1 ? 'day' : 'days'} tended
            {lookback.sessions > 0 && `, ${lookback.sessions} ${lookback.sessions === 1 ? 'session' : 'sessions'}`}
            {lookback.minutes > 0 && `, ${lookback.minutes} quiet minutes`}.
          </p>
          <button
            type="button"
            aria-label="Put it away"
            onClick={() => {
              setLookbackSeen(weekStart)
              try {
                window.localStorage.setItem(LOOKBACK_KEY, weekStart)
              } catch {
                // It just shows again next visit.
              }
            }}
          >
            <X size={14} strokeWidth={2.8} />
          </button>
        </aside>
      )}

      <div className="qp-content" style={{ height: layout.height }} inert={anyOverlay}>
        <PathScene
          layout={layout}
          read={read}
          fresh={fresh}
          opened={opened}
          talking={talking}
          pip={{ mood: cheer ? 'celebrating' : read.walkedToday ? 'proud' : hour >= 21 || hour < 5 ? 'cozy' : 'content', ...pipLook }}
          kiriLine={line}
          kiriTalking={kiriTalking}
          bubble={width >= NARROW}
          onNode={onNode}
          onGuide={(chapter, el) => setGuide({ chapter, origin: el })}
          onKiri={() => {
            setKiriTalking(true)
            campSound.voice('kiri', line)
          }}
          onSatchel={(chapter, state) => onSatchel(chapter, state)}
          onResident={onResident}
        />
      </div>

      {journeyFailed && !journey && (
        <div className="qp-missing-card qp-missing-card--float">
          <p>The path is hidden in the mist just now.</p>
          <button type="button" className="qs-cta" onClick={() => void loadJourney()}>
            Try again
          </button>
        </div>
      )}

      <div inert={anyOverlay}>
        <TrailMap read={read} onJump={jumpTo} />
      </div>

      {width < NARROW && journey && (
        <p className="qp-kiri-strip" aria-live="polite" inert={anyOverlay}>
          <span className="qp-bubble-name">Kiri</span>
          {line}
        </p>
      )}

      <nav className="qp-dock" aria-label="On the path" inert={anyOverlay}>
        <button type="button" className="qp-dock-side" onClick={(e) => setJournal({ tab: 'kit', origin: e.currentTarget })} aria-label="The path's notebook">
          <BookOpen size={18} strokeWidth={2.4} />
          <span>Notebook</span>
          {read.chaptersDone.length > 0 && <em>{read.chaptersDone.length}</em>}
        </button>
        {read.walkedToday ? (
          <button type="button" className="qp-dock-main is-done" onClick={(e) => setAnytime({ origin: e.currentTarget })}>
            <Footprints size={20} strokeWidth={2.6} />
            Today’s stone is down
            <small>next opens tomorrow · tools in Anytime</small>
          </button>
        ) : (
          <button type="button" className="qp-dock-main" onClick={() => play(read.next, 'walk')} disabled={!view || !journey}>
            <Footprints size={20} strokeWidth={2.6} />
            Today’s session
            <small>
              {read.next.title} · {read.next.minutes} min
            </small>
          </button>
        )}
        <button type="button" className="qp-dock-side" onClick={(e) => setAnytime({ origin: e.currentTarget })}>
          <Sparkles size={18} strokeWidth={2.4} />
          <span>Anytime</span>
        </button>
      </nav>

      <SessionPlayer
        session={player?.session ?? null}
        chapter={player?.chapter ?? null}
        mode={player?.mode ?? 'walk'}
        busy={busy}
        kit={kit}
        pip={pipLook}
        onFinish={(note, draft) => (player ? finishSession(player.session, note, draft) : Promise.resolve())}
        onClose={() => setPlayer(null)}
      />

      <StoneSheet stone={stone} onPlay={(s) => play(s, 'replay')} onClose={() => setStone(null)} />
      <ChapterGuide guide={guide} read={read} onPlay={(s) => play(s, 'replay')} onClose={() => setGuide(null)} />

      <AnytimeSheet
        open={anytime != null}
        origin={anytime?.origin ?? null}
        onBreathe={(p) => {
          setAnytime(null)
          setBreath(p)
        }}
        onSit={(minutes, interval) => {
          setAnytime(null)
          setSit({ minutes, interval })
        }}
        onSession={(s) => play(s, 'replay')}
        kit={kit}
        onOpenKit={(page) => {
          const origin = anytime?.origin ?? null
          setAnytime(null)
          setJournal({ tab: 'kit', origin, page })
        }}
        onLogOther={() => {
          const origin = anytime?.origin ?? null
          setAnytime(null)
          setOther({ origin })
        }}
        onClose={() => setAnytime(null)}
      />

      <BreatheTool pattern={breath} busy={busy} onLog={(m) => logPractice('breathe', m)} onClose={() => setBreath(null)} />
      <SitTimer sit={sit} busy={busy} onLog={(m) => logPractice('still', m)} onClose={() => setSit(null)} />

      <StepSheet
        open={other != null}
        origin={other?.origin ?? null}
        view={view}
        today={today}
        busy={busy}
        onLog={async (payload) => {
          await save(payload)
          setOther(null)
        }}
        onUndo={undo}
        onClose={() => setOther(null)}
      />

      <PathJournal
        tab={journal?.tab ?? null}
        origin={journal?.origin ?? null}
        focusPage={journal?.page ?? null}
        read={read}
        kit={kit}
        opened={opened}
        onSaveKit={saveKit}
        onCard={(chapter) => setCard({ chapter, fresh: false })}
        onTab={(tab) => setJournal((j) => (j ? { ...j, tab, page: undefined } : j))}
        onClose={() => setJournal(null)}
      />

      <PocketCardReveal card={card} onClose={() => setCard(null)} />

      {postcard && (
        <div className="qp-postcard" role="dialog" aria-modal="true" aria-labelledby="qp-postcard-title">
          <div className="qp-postcard-scrim" onClick={() => setPostcard(null)} />
          <div className="qp-postcard-card">
            <span className="pj-stamp" style={{ ['--stamp' as string]: CHAPTER_COLORS[postcard.color].fill }} aria-hidden="true">
              {postcard.n}
            </span>
            <p className="qp-postcard-kicker">A postcard from Kiri · chapter {postcard.n} walked</p>
            <h2 id="qp-postcard-title">{postcard.place}</h2>
            <p className="qp-postcard-line">“{postcard.postcard}”</p>
            <button type="button" className="qs-cta" onClick={() => setPostcard(null)} autoFocus>
              Keep walking
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export { QuietPathWorld }
