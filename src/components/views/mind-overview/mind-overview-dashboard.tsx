import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import type { MindDistortionTag, MindEntry } from './mind-types'
import { AFFIRMATIONS, buildSeedEntries, mindAddDays, mindIsoDate, MIND_VALUE_TAGS } from './mind-types'
import { mindService } from '../../../services/mind-service'
import { mindActions, useMindStore } from '../../../store/mind-store'
import { MindHeader } from './components/mind-header'
import { MindInboxCard } from './components/mind-inbox-card'
import { MindIntelligenceCard } from './components/mind-intelligence'
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
  const [selectedDate] = useState(() => mindIsoDate())
  // Entries/summary/mood live in the mind store (plain shared state); the view
  // keeps its own load + seed-fallback orchestration and optimistic updates.
  const entries = useMindStore.use.entries()
  const summary = useMindStore.use.summary()
  const mood = useMindStore.use.mood()
  const [releasingIds, setReleasingIds] = useState<ReadonlySet<string>>(new Set())
  const [sosOpen, setSosOpen] = useState(false)
  const [affirmationIndex, setAffirmationIndex] = useState(0)

  // Anchor persistence state
  const [intention, setIntention] = useState('')
  const [valueTag, setValueTag] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimeoutRef = useRef<number | null>(null)

  // Bottom-dock quick-add bubble — Mind has no dedicated add flow yet
  useEffect(() => {
    const handler = () => toast('Quick add for Mind is coming soon')
    window.addEventListener('mobile-quick-add', handler)
    return () => window.removeEventListener('mobile-quick-add', handler)
  }, [])

  // Custom tags list (with localStorage fallback)
  const [availableTags, setAvailableTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_mind_tags')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return Array.from(new Set([...MIND_VALUE_TAGS, ...parsed]))
        }
      } catch (e) {
        console.error('Failed to parse custom tags', e)
      }
    }
    return [...MIND_VALUE_TAGS]
  })

  const load = useCallback(async () => {
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        mindService.getEntries(),
        mindService.getSummary(selectedDate),
      ])
      if (entriesRes.error || summaryRes.error) throw entriesRes.error ?? summaryRes.error
      const fetched = entriesRes.data ?? []
      mindActions.setEntries(fetched)
      mindActions.setSummary(summaryRes.data ?? null)
      mindActions.setMood(summaryRes.data?.moodScore ?? null)

      // Sync intention from backend
      const anchor = fetched.find((e) => e.type === 'INTENTION' && e.date === selectedDate)
      if (anchor) {
        setIntention(anchor.text)
        setValueTag(anchor.valueTag || null)
      } else {
        setIntention('')
        setValueTag(null)
      }
    } catch {
      // Never leave the tab blank in dev / offline — fall back to local seeds.
      const seeds = buildSeedEntries(selectedDate)
      mindActions.setEntries(seeds)
      mindActions.setSummary(null)

      // Sync intention from seeds
      const anchor = seeds.find((e) => e.type === 'INTENTION' && e.date === selectedDate)
      if (anchor) {
        setIntention(anchor.text)
        setValueTag(anchor.valueTag || null)
      } else {
        setIntention('')
        setValueTag(null)
      }
    }
  }, [selectedDate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const refreshSummary = useCallback(async () => {
    try {
      const res = await mindService.getSummary(selectedDate)
      if (res.error) return
      mindActions.setSummary(res.data ?? null)
    } catch {
      /* keep the last-known summary */
    }
  }, [selectedDate])

  const saveIntention = useCallback(async (text: string, tag: string | null) => {
    setSaving(true)
    try {
      const existing = entries.find((e) => e.type === 'INTENTION' && e.date === selectedDate)
      if (existing) {
        const res = await mindService.updateEntry(existing.id, {
          text: text.trim(),
          type: 'INTENTION',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          valueTag: tag as any,
          date: selectedDate
        })
        if (res.error || !res.data) throw new Error(res.error?.message ?? 'Failed to save intention')
        const savedEntry = res.data
        mindActions.setEntries((prev) => prev.map((e) => (e.id === existing.id ? savedEntry : e)))
      } else {
        const res = await mindService.createEntry({
          text: text.trim(),
          type: 'INTENTION',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          valueTag: tag as any,
          date: selectedDate
        })
        if (res.error || !res.data) throw new Error(res.error?.message ?? 'Failed to save intention')
        const savedEntry = res.data
        mindActions.setEntries((prev) => [...prev, savedEntry])
      }
    } catch (err) {
      console.error('Failed to save today\'s anchor', err)
      toast.error('Failed to save intention.')
    } finally {
      setSaving(false)
    }
  }, [entries, selectedDate])

  const handleValueTagChange = useCallback((newTag: string | null) => {
    setValueTag(newTag)
    void saveIntention(intention, newTag)
  }, [intention, saveIntention])

  const handleIntentionChange = useCallback((newText: string) => {
    setIntention(newText)
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      void saveIntention(newText, valueTag)
    }, 800)
  }, [valueTag, saveIntention])

  const handleAddTag = useCallback((newTag: string) => {
    const trimmed = newTag.trim()
    if (!trimmed) return
    setAvailableTags((prev) => {
      if (prev.includes(trimmed)) return prev
      const next = [...prev, trimmed]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customTagsOnly = next.filter((t) => !MIND_VALUE_TAGS.includes(t as any))
      localStorage.setItem('custom_mind_tags', JSON.stringify(customTagsOnly))
      return next
    })
  }, [])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (MIND_VALUE_TAGS.includes(tagToRemove as any)) return
    setAvailableTags((prev) => {
      const next = prev.filter((t) => t !== tagToRemove)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customTagsOnly = next.filter((t) => !MIND_VALUE_TAGS.includes(t as any))
      localStorage.setItem('custom_mind_tags', JSON.stringify(customTagsOnly))
      return next
    })
    if (valueTag === tagToRemove) {
      setValueTag(null)
      void saveIntention(intention, null)
    }
  }, [valueTag, intention, saveIntention])

  // Log breathing cycles to database and update streak in real-time
  const handleBreatheLogged = useCallback(async (currentCycles: number) => {
    const todayBreathEntry = entries.find((e) => e.type === 'BREATH' && e.date === selectedDate)
    const text = `Breathed for ${currentCycles} ${currentCycles === 1 ? 'cycle' : 'cycles'}`
    try {
      if (todayBreathEntry) {
        const res = await mindService.updateEntry(todayBreathEntry.id, {
          text,
          type: 'BREATH',
          date: selectedDate
        })
        if (res.error || !res.data) throw new Error(res.error?.message ?? 'Failed to log breathing')
        const savedEntry = res.data
        mindActions.setEntries((prev) => prev.map((e) => (e.id === todayBreathEntry.id ? savedEntry : e)))
      } else {
        const res = await mindService.createEntry({
          text,
          type: 'BREATH',
          date: selectedDate
        })
        if (res.error || !res.data) throw new Error(res.error?.message ?? 'Failed to log breathing')
        const savedEntry = res.data
        mindActions.setEntries((prev) => [...prev, savedEntry])
        toast.success('Mindful breathing logged! Streak updated 🔥')
      }
      void refreshSummary()
    } catch (err) {
      console.error('Failed to log breathe cycle', err)
    }
  }, [entries, selectedDate, refreshSummary])

  const patchEntry = useCallback((id: string, patch: Partial<MindEntry>) => {
    mindActions.setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
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
      mindActions.setEntries((prev) => [optimistic, ...prev])
      try {
        const res = await mindService.createEntry({ text, date: selectedDate })
        if (res.error || !res.data) throw new Error(res.error?.message ?? 'Failed to save thought')
        const savedEntry = res.data
        mindActions.setEntries((prev) => prev.map((e) => (e.id === optimistic.id ? savedEntry : e)))
      } catch {
        mindActions.setEntries((prev) => prev.filter((e) => e.id !== optimistic.id))
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
        const res = await mindService.convertEntry(id)
        if (res.error || !res.data) throw new Error(res.error?.message ?? 'Failed to convert entry')
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
      patchEntry(id, { status: 'PARKED', reviewDate, wasParked: true })
      toast.success('Parked. It will come back when you said — not before.')
      try {
        const res = await mindService.updateStatus(id, { status: 'PARKED', reviewDate })
        if (res.error) throw new Error(res.error.message)
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
          const res = await mindService.updateStatus(id, { status: 'RELEASED' })
          if (res.error) throw new Error(res.error.message)
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
        const res = await mindService.updateStatus(id, { status: 'RESOLVED', reframedText, distortionTag })
        if (res.error) throw new Error(res.error.message)
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
      mindActions.setEntries((prev) => [...prev, optimistic])
      toast.success('Filed as evidence.')
      try {
        const res = await mindService.createEntry({ type: 'WIN', text, date: selectedDate })
        if (res.error || !res.data) throw new Error(res.error?.message ?? 'Failed to save win')
        const savedEntry = res.data
        mindActions.setEntries((prev) => prev.map((e) => (e.id === optimistic.id ? savedEntry : e)))
      } catch {
        mindActions.setEntries((prev) => prev.filter((e) => e.id !== optimistic.id))
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
      mindActions.setEntries((prev) => [...prev, optimistic])
      try {
        const res = await mindService.createEntry({ type: 'GRATITUDE', text, date: selectedDate })
        if (res.error || !res.data) throw new Error(res.error?.message ?? 'Failed to save gratitude')
        const savedEntry = res.data
        mindActions.setEntries((prev) => prev.map((e) => (e.id === optimistic.id ? savedEntry : e)))
      } catch {
        mindActions.setEntries((prev) => prev.filter((e) => e.id !== optimistic.id))
        toast.error('Could not save that — try again.')
      }
    },
    [selectedDate],
  )

  const handleBringBack = useCallback(
    async (id: string) => {
      patchEntry(id, { status: 'OPEN', reviewDate: null })
      try {
        const res = await mindService.updateStatus(id, { status: 'OPEN' })
        if (res.error) throw new Error(res.error.message)
      } catch {
        void load()
      }
    },
    [patchEntry, load],
  )

  const handleMoodSelect = useCallback(
    async (value: number) => {
      const next = mood === value ? null : value
      mindActions.setMood(next)
      if (next != null) {
        const res = await mindService.saveMood(selectedDate, next)
        if (res.error) {
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
        <BreatheCard onCycleComplete={handleBreatheLogged} />

        <GroundingCard />

        <TodaysAnchorCard
          intention={intention}
          onIntentionChange={handleIntentionChange}
          valueTag={valueTag}
          onValueTagChange={handleValueTagChange}
          availableTags={availableTags}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          saving={saving}
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

        <MindIntelligenceCard entries={thoughts} />

        <WorryParkingCard parked={parked} onBringBack={handleBringBack} onRelease={handleRelease} />

        <GratitudeCard gratitude={gratitude} onAddGratitude={handleAddGratitude} />
      </div>

      <SosOverlay open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  )
}

export { MindOverviewDashboard }
