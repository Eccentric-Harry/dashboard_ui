import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { MindDistortionTag, MindEntry, MindSummary, MindValueTag } from './mind-types'
import { AFFIRMATIONS, buildSeedEntries, mindAddDays, mindIsoDate } from './mind-types'
import {
  convertMindEntry,
  createMindEntry,
  fetchMindEntries,
  fetchMindSummary,
  saveMindMood,
  updateMindStatus,
} from '../../../lib/api'
import { MindHeader } from './components/mind-header'
import { MindInboxCard } from './components/mind-inbox-card'
import { TodaysAnchorCard } from './components/todays-anchor-card'
import { EvidenceLockerCard } from './components/evidence-locker-card'
import { WorryParkingCard } from './components/worry-parking-card'
import { GratitudeCard } from './components/gratitude-card'
import { BreatheCard, GroundingCard } from './components/calm-tools-card'
import { SosOverlay } from './components/sos-overlay'
import './mind-overview.css'

const RELEASE_ANIMATION_MS = 620

let localIdCounter = 0
function tempId(): string {
  localIdCounter += 1
  return `mind-temp-${Date.now()}-${localIdCounter}`
}

function MindOverviewDashboard() {
  // The redesigned header has no date navigation — the Mind tab is always "today".
  const [selectedDate] = useState(() => mindIsoDate())
  const [entries, setEntries] = useState<MindEntry[]>([])
  const [summary, setSummary] = useState<MindSummary | null>(null)
  const [releasingIds, setReleasingIds] = useState<ReadonlySet<string>>(new Set())
  const [mood, setMood] = useState<number | null>(null)
  const [sosOpen, setSosOpen] = useState(false)
  const [intention, setIntention] = useState('Finish the calendar sync fix, calmly.')
  const [valueTag, setValueTag] = useState<MindValueTag | null>('Calm')
  const [affirmationIndex, setAffirmationIndex] = useState(0)

  const load = useCallback(async () => {
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        fetchMindEntries(),
        fetchMindSummary(selectedDate),
      ])
      setEntries(entriesRes.data ?? [])
      setSummary(summaryRes.data ?? null)
      setMood(summaryRes.data?.moodScore ?? null)
    } catch {
      // Never leave the tab blank in dev / offline — fall back to local seeds.
      setEntries(buildSeedEntries(selectedDate))
      setSummary(null)
    }
  }, [selectedDate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const refreshSummary = useCallback(async () => {
    try {
      const res = await fetchMindSummary(selectedDate)
      setSummary(res.data ?? null)
    } catch {
      /* keep the last-known summary */
    }
  }, [selectedDate])

  const patchEntry = useCallback((id: string, patch: Partial<MindEntry>) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }, [])

  const handleCapture = useCallback(
    async (text: string) => {
      const optimistic: MindEntry = {
        id: tempId(),
        type: 'THOUGHT',
        text,
        status: 'OPEN',
        date: selectedDate,
        createdAt: new Date().toISOString(),
      }
      setEntries((prev) => [optimistic, ...prev])
      try {
        const res = await createMindEntry({ text, date: selectedDate })
        setEntries((prev) => prev.map((e) => (e.id === optimistic.id ? res.data : e)))
      } catch {
        setEntries((prev) => prev.filter((e) => e.id !== optimistic.id))
        toast.error('Could not save that — try again.')
      }
    },
    [selectedDate],
  )

  const handleDo = useCallback(
    async (id: string) => {
      patchEntry(id, { status: 'CONVERTED', resolvedAt: new Date().toISOString() })
      toast.success('Turned into a task. It has a home now — not your head.')
      try {
        const res = await convertMindEntry(id)
        patchEntry(id, res.data)
        void refreshSummary()
      } catch {
        toast.error('Could not create the task — bringing it back.')
        void load()
      }
    },
    [patchEntry, refreshSummary, load],
  )

  const handlePark = useCallback(
    async (id: string, days: number) => {
      const reviewDate = mindAddDays(selectedDate, days)
      patchEntry(id, { status: 'PARKED', reviewDate })
      toast.success('Parked. It will come back when you said — not before.')
      try {
        await updateMindStatus(id, { status: 'PARKED', reviewDate })
      } catch {
        toast.error('Could not park that — try again.')
        void load()
      }
    },
    [patchEntry, selectedDate, load],
  )

  const handleRelease = useCallback(
    (id: string) => {
      setReleasingIds((prev) => new Set(prev).add(id))
      window.setTimeout(async () => {
        patchEntry(id, { status: 'RELEASED', resolvedAt: new Date().toISOString() })
        setReleasingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        try {
          await updateMindStatus(id, { status: 'RELEASED' })
          void refreshSummary()
        } catch {
          /* the thought is already gone from view; a reload will reconcile */
        }
      }, RELEASE_ANIMATION_MS)
    },
    [patchEntry, refreshSummary],
  )

  const handleReframeSave = useCallback(
    async (id: string, reframedText: string, distortionTag: MindDistortionTag | null) => {
      patchEntry(id, {
        status: 'RESOLVED',
        reframedText,
        distortionTag,
        resolvedAt: new Date().toISOString(),
      })
      toast.success("Reframed. That's a rep for your mind.")
      try {
        await updateMindStatus(id, { status: 'RESOLVED', reframedText, distortionTag })
        void refreshSummary()
      } catch {
        toast.error('Could not save the reframe — try again.')
        void load()
      }
    },
    [patchEntry, refreshSummary, load],
  )

  const handleAddWin = useCallback(
    async (text: string) => {
      const optimistic: MindEntry = {
        id: tempId(),
        type: 'WIN',
        text,
        status: 'OPEN',
        date: selectedDate,
        createdAt: new Date().toISOString(),
      }
      setEntries((prev) => [...prev, optimistic])
      toast.success('Filed as evidence.')
      try {
        const res = await createMindEntry({ type: 'WIN', text, date: selectedDate })
        setEntries((prev) => prev.map((e) => (e.id === optimistic.id ? res.data : e)))
      } catch {
        setEntries((prev) => prev.filter((e) => e.id !== optimistic.id))
        toast.error('Could not save that win — try again.')
      }
    },
    [selectedDate],
  )

  const handleAddGratitude = useCallback(
    async (text: string) => {
      const optimistic: MindEntry = {
        id: tempId(),
        type: 'GRATITUDE',
        text,
        status: 'OPEN',
        date: selectedDate,
        createdAt: new Date().toISOString(),
      }
      setEntries((prev) => [...prev, optimistic])
      try {
        const res = await createMindEntry({ type: 'GRATITUDE', text, date: selectedDate })
        setEntries((prev) => prev.map((e) => (e.id === optimistic.id ? res.data : e)))
      } catch {
        setEntries((prev) => prev.filter((e) => e.id !== optimistic.id))
        toast.error('Could not save that — try again.')
      }
    },
    [selectedDate],
  )

  const handleBringBack = useCallback(
    async (id: string) => {
      patchEntry(id, { status: 'OPEN', reviewDate: null })
      try {
        await updateMindStatus(id, { status: 'OPEN' })
      } catch {
        void load()
      }
    },
    [patchEntry, load],
  )

  const handleMoodSelect = useCallback(
    async (value: number) => {
      const next = mood === value ? null : value
      setMood(next)
      if (next != null) {
        try {
          await saveMindMood(selectedDate, next)
        } catch {
          /* mood is a soft signal; don't nag on failure */
        }
      }
    },
    [mood, selectedDate],
  )

  const thoughts = useMemo(() => entries.filter((e) => e.type === 'THOUGHT'), [entries])
  const openThoughts = useMemo(() => thoughts.filter((e) => e.status === 'OPEN'), [thoughts])
  const parked = useMemo(() => thoughts.filter((e) => e.status === 'PARKED'), [thoughts])
  const wins = useMemo(() => entries.filter((e) => e.type === 'WIN'), [entries])
  const gratitude = useMemo(() => entries.filter((e) => e.type === 'GRATITUDE'), [entries])
  const closedLoops = useMemo(
    () => thoughts.filter((e) => e.status === 'CONVERTED' || e.status === 'RESOLVED').slice(-1),
    [thoughts],
  )
  const stats = useMemo(
    () => ({
      captured: thoughts.length,
      converted: thoughts.filter((e) => e.status === 'CONVERTED').length,
      reframed: thoughts.filter((e) => Boolean(e.reframedText)).length,
      released: thoughts.filter((e) => e.status === 'RELEASED').length,
    }),
    [thoughts],
  )

  return (
    <div className="mind-dashboard">
      <MindHeader
        dateIso={selectedDate}
        mood={mood}
        onMoodSelect={handleMoodSelect}
        streakDays={summary?.streakDays ?? 0}
        onOpenSos={() => setSosOpen(true)}
      />

      <div className="mind-grid">
        <BreatheCard />

        <GroundingCard />

        <TodaysAnchorCard
          intention={intention}
          onIntentionChange={setIntention}
          valueTag={valueTag}
          onValueTagChange={setValueTag}
          affirmation={AFFIRMATIONS[affirmationIndex]}
          onNextAffirmation={() => setAffirmationIndex((i) => (i + 1) % AFFIRMATIONS.length)}
        />

        <MindInboxCard
          openThoughts={openThoughts}
          closedLoops={closedLoops}
          releasingIds={releasingIds}
          stats={stats}
          onCapture={handleCapture}
          onDo={handleDo}
          onPark={handlePark}
          onRelease={handleRelease}
          onReframeSave={handleReframeSave}
        />

        <EvidenceLockerCard wins={wins} autoEvidence={summary} onAddWin={handleAddWin} />

        <WorryParkingCard parked={parked} onBringBack={handleBringBack} onRelease={handleRelease} />

        <GratitudeCard gratitude={gratitude} onAddGratitude={handleAddGratitude} />
      </div>

      <SosOverlay open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  )
}

export { MindOverviewDashboard }
