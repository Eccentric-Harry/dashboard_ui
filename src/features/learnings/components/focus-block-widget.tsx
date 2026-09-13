import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, Minimize2, Maximize2, Timer, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useFocusStore, focusActions } from '@/store/focus-store'

export interface FocusSessionState {
  isCounting: boolean
  elapsedTime: number
  selectedActivity: string
}

interface FocusBlockWidgetProps {
  onSessionComplete: (durationMinutes: number, activityType: string) => void
}

const PRESET_ACTIVITIES = ['Coding', 'DSA/LeetCode', 'Reading Notes']
const DURATIONS = [25, 45, 60]

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function FocusBlockWidget({ onSessionComplete }: FocusBlockWidgetProps) {
  const session = useFocusStore.use.session()
  const remainingSeconds = useFocusStore.use.remainingSeconds()
  const { start, pause, resume, cancel } = focusActions

  const [isExpanded, setIsExpanded] = useState(false)
  const [activity, setActivity] = useState(PRESET_ACTIVITIES[0])
  const [duration, setDuration] = useState(25)
  const [customMin, setCustomMin] = useState('')
  const [editCustom, setEditCustom] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showActivityPicker, setShowActivityPicker] = useState(false)
  const [customActivity, setCustomActivity] = useState('')
  const [editActivity, setEditActivity] = useState(false)

  const prevStatusRef = useRef(session?.status)

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isExpanded])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session?.activePursuit) setActivity(session.activePursuit)
    if (session?.durationMinutes) setDuration(session.durationMinutes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  useEffect(() => {
    if (session?.status === 'COMPLETED' && prevStatusRef.current === 'RUNNING') {
      onSessionComplete(session.durationMinutes, session.activePursuit)
    }
    prevStatusRef.current = session?.status ?? undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status])

  const isRunning = session?.status === 'RUNNING'
  const isPaused = session?.status === 'PAUSED'
  const isIdle = !session || session.status === 'IDLE' || session.status === 'COMPLETED'
  const timerDisplay = isIdle
    ? formatTime(duration * 60 * 1000)
    : formatTime(remainingSeconds)

  const handleStart = async () => {
    setActionLoading(true)
    try {
      await start(activity, duration)
    } finally {
      setActionLoading(false)
    }
  }

  const handlePause = async () => {
    setActionLoading(true)
    try {
      await pause()
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    setActionLoading(true)
    try {
      await resume()
    } finally {
      setActionLoading(false)
    }
  }

  const handleEndAndSave = async () => {
    setActionLoading(true)
    try {
      const elapsedMins = Math.max(1, Math.round((session?.durationMinutes ?? duration) - remainingSeconds / 60000))
      await cancel()
      onSessionComplete(elapsedMins, activity)
      toast.success(`Logged ${elapsedMins}m focus session. Well done!`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReset = async () => {
    setActionLoading(true)
    try {
      await cancel()
      toast.success('Timer reset.')
    } finally {
      setActionLoading(false)
    }
  }

  const timerClass = isExpanded
    ? 'text-[5.5rem] sm:text-[8rem] md:text-[10rem] lg:text-[12rem] font-bold font-mono text-gray-900 tracking-tight select-none tabular-nums leading-none'
    : 'text-5xl font-light font-mono text-gray-800 tracking-tight select-none tabular-nums'

  const renderTimer = (fs: boolean) => (
    <div className={`text-center${fs ? '' : ''}`} style={fs ? { marginBottom: 56 } : {}}>
      <div className={timerClass}>{timerDisplay}</div>
      {(isRunning || isPaused) && (
        <p className={`text-sm font-semibold uppercase tracking-widest mt-4 ${isRunning ? 'text-emerald-600' : 'text-amber-500'}`}>
          {isRunning ? 'focusing' : 'paused'}
        </p>
      )}
      <div className="flex flex-col gap-3 max-w-80 w-full mx-auto mt-8 px-4 sm:px-0">
        {isIdle && (
          <button onClick={handleStart} disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold transition-all focus-liquid-btn shadow-sm disabled:opacity-50">
            <Play size={15} fill="currentColor" />{actionLoading ? 'Starting...' : 'Start'}
          </button>
        )}
        {isRunning && (
          <button onClick={handlePause} disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold transition-all focus-liquid-btn shadow-md disabled:opacity-50">
            <Pause size={15} fill="currentColor" />{actionLoading ? '...' : 'Pause'}
          </button>
        )}
        {isPaused && (
          <button onClick={handleResume} disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold transition-all focus-liquid-btn shadow-sm disabled:opacity-50">
            <Play size={15} fill="currentColor" />{actionLoading ? '...' : 'Resume'}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Compact card. Every row shares one left edge and one grid: the length
          choices are a 4-cell segmented control so "Custom" can't wrap onto a
          line of its own, and the pursuit is a real field rather than bare text. */}
      <div className={`learnings-card fbw${isRunning ? ' focus-active-pulse is-running' : ''}${isPaused ? ' is-paused' : ''}`}>
        <div className="fbw-head">
          <span className="fbw-head-ic" aria-hidden="true">
            <Timer size={16} strokeWidth={2.2} />
          </span>
          <div className="fbw-head-text">
            <p className="fbw-eyebrow">Focus session</p>
            <h3 className="fbw-title">Deep Work Focus</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(v => !v)}
            className="fbw-icon-btn"
            aria-label="Enter fullscreen focus mode"
          >
            <Maximize2 size={14} strokeWidth={2.2} />
          </button>
        </div>

        <div className="fbw-field">
          <p className="fbw-label">Active pursuit</p>
          <div className="fbw-picker">
            <button
              type="button"
              onClick={() => { setShowActivityPicker(v => !v); setEditActivity(false) }}
              className="fbw-select"
              aria-haspopup="listbox"
              aria-expanded={showActivityPicker}
            >
              <span>{activity}</span>
              <ChevronDown size={15} strokeWidth={2.2} className={showActivityPicker ? 'is-open' : ''} />
            </button>
            {showActivityPicker && (
              <div className="fbw-menu" role="listbox" aria-label="Active pursuit">
                {PRESET_ACTIVITIES.map(a => (
                  <button
                    key={a}
                    type="button"
                    role="option"
                    aria-selected={activity === a}
                    onClick={() => { setActivity(a); setShowActivityPicker(false); setEditActivity(false); setCustomActivity('') }}
                    className={`fbw-menu-item${activity === a ? ' is-active' : ''}`}
                  >
                    {a}
                  </button>
                ))}
                <div className="fbw-menu-divider" />
                {editActivity ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const name = customActivity.trim()
                      if (name) { setActivity(name); setShowActivityPicker(false); setEditActivity(false) }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="fbw-menu-form"
                  >
                    <input
                      type="text"
                      placeholder="Pursuit name…"
                      value={customActivity}
                      onChange={(e) => setCustomActivity(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setEditActivity(false) }}
                      className="fbw-menu-input"
                      aria-label="Custom pursuit name"
                      autoFocus
                    />
                    <button type="submit" className="fbw-menu-set">Set</button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditActivity(true) }}
                    className="fbw-menu-item is-add"
                  >
                    + Custom pursuit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {isIdle && (
          <div className="fbw-field">
            <p className="fbw-label">Session length</p>
            <div className="fbw-segment" role="radiogroup" aria-label="Session length">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={duration === d && !editCustom}
                  onClick={() => { setDuration(d); setEditCustom(false) }}
                  className={`fbw-seg${duration === d && !editCustom ? ' is-active' : ''}`}
                >
                  {d}m
                </button>
              ))}
              {editCustom ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const v = parseInt(customMin, 10)
                    if (v > 0) { setDuration(v); setEditCustom(false); setCustomMin('') }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="fbw-seg is-editing"
                >
                  <input
                    type="number"
                    min="1"
                    max="360"
                    placeholder="min"
                    value={customMin}
                    onChange={(e) => setCustomMin(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditCustom(false) }}
                    onBlur={() => { if (!customMin) setEditCustom(false) }}
                    className="fbw-seg-input"
                    aria-label="Custom length in minutes"
                    autoFocus
                  />
                </form>
              ) : (
                <button
                  type="button"
                  role="radio"
                  aria-checked={!DURATIONS.includes(duration)}
                  onClick={() => setEditCustom(true)}
                  className={`fbw-seg${!DURATIONS.includes(duration) ? ' is-active' : ''}`}
                >
                  {DURATIONS.includes(duration) ? 'Custom' : `${duration}m`}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="fbw-timer">
          {(isRunning || isPaused) && (
            <span className={`fbw-status ${isRunning ? 'is-running' : 'is-paused'}`}>
              <i aria-hidden="true" />
              {isRunning ? 'Focusing' : 'Paused'}
            </span>
          )}
          <span className="fbw-time">{timerDisplay}</span>
          {isIdle && <span className="fbw-time-sub">{duration} min of {activity}</span>}
        </div>

        <div className="fbw-actions">
          {isIdle && (
            <button type="button" onClick={handleStart} disabled={actionLoading} className="fbw-cta">
              <span className="fbw-cta-ic"><Play size={12} fill="currentColor" strokeWidth={0} /></span>
              {actionLoading ? 'Starting…' : 'Start session'}
            </button>
          )}
          {isRunning && (
            <button type="button" onClick={handlePause} disabled={actionLoading} className="fbw-cta is-secondary">
              <span className="fbw-cta-ic"><Pause size={12} fill="currentColor" strokeWidth={0} /></span>
              {actionLoading ? 'Pausing…' : 'Pause session'}
            </button>
          )}
          {isPaused && (
            <button type="button" onClick={handleResume} disabled={actionLoading} className="fbw-cta">
              <span className="fbw-cta-ic"><Play size={12} fill="currentColor" strokeWidth={0} /></span>
              {actionLoading ? 'Resuming…' : 'Resume session'}
            </button>
          )}
          {(isRunning || isPaused) && (
            <div className="fbw-links">
              <button type="button" onClick={handleReset} disabled={actionLoading} className="fbw-link">
                Reset
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={handleEndAndSave} disabled={actionLoading} className="fbw-link is-danger">
                End &amp; save
              </button>
            </div>
          )}
        </div>
      </div>

      {isExpanded && createPortal(
        <div className="focus-block-fullscreen-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="focus-block-fullscreen-backdrop" onClick={() => setIsExpanded(false)} />

          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="focus-block-fullscreen-close"
            aria-label="Exit fullscreen focus mode"
          >
            <Minimize2 size={20} />
          </button>

          <div className="focus-block-fullscreen-content">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-[0.15em] mb-1">{activity}</p>

            {isIdle && (
              <div className="mb-12 flex items-center justify-center gap-3">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => { setDuration(d); setEditCustom(false) }}
                    className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition-all ${duration === d && !editCustom ? 'focus-liquid-btn' : 'bg-white/60 border-neutral-200 text-neutral-500 hover:bg-neutral-100'}`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            )}

            {renderTimer(true)}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
