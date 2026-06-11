import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, Minimize2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useFocus } from '../../../../contexts/FocusContext'

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
  const {
    session,
    remainingSeconds,
    start,
    pause,
    resume,
    cancel,
  } = useFocus()

  const [isExpanded, setIsExpanded] = useState(false)
  const [activity, setActivity] = useState(PRESET_ACTIVITIES[0])
  const [duration, setDuration] = useState(25)
  const [customMin, setCustomMin] = useState('')
  const [editCustom, setEditCustom] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showActivityPicker, setShowActivityPicker] = useState(false)
  const [customActivity, setCustomActivity] = useState('')

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
    if (session?.activePursuit) setActivity(session.activePursuit)
    if (session?.durationMinutes) setDuration(session.durationMinutes)
  }, [session?.id])

  useEffect(() => {
    if (session?.status === 'COMPLETED' && prevStatusRef.current === 'RUNNING') {
      onSessionComplete(session.durationMinutes, session.activePursuit)
    }
    prevStatusRef.current = session?.status ?? undefined
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
    ? 'text-[12rem] font-light font-mono text-gray-900 tracking-tight select-none tabular-nums leading-none'
    : 'text-5xl font-light font-mono text-gray-900 tracking-tight select-none tabular-nums'

  const renderTimer = (fs: boolean) => (
    <div className={`text-center${fs ? '' : ''}`} style={fs ? { marginBottom: 56 } : {}}>
      <div className={timerClass}>{timerDisplay}</div>
      {(isRunning || isPaused) && (
        <p className={`text-sm font-semibold uppercase tracking-widest mt-4 ${isRunning ? 'text-emerald-600' : 'text-amber-500'}`}>
          {isRunning ? 'focusing' : 'paused'}
        </p>
      )}
      <div className="flex flex-col gap-3 max-w-80 w-full mx-auto mt-8">
        {isIdle && (
          <button onClick={handleStart} disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold transition-all bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm disabled:opacity-50">
            <Play size={15} fill="currentColor" />{actionLoading ? 'Starting...' : 'Start'}
          </button>
        )}
        {isRunning && (
          <button onClick={handlePause} disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-md disabled:opacity-50">
            <Pause size={15} fill="currentColor" />{actionLoading ? '...' : 'Pause'}
          </button>
        )}
        {isPaused && (
          <button onClick={handleResume} disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold transition-all bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm disabled:opacity-50">
            <Play size={15} fill="currentColor" />{actionLoading ? '...' : 'Resume'}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className={`learnings-card rounded-3xl p-8 transition-all duration-300 ${isRunning ? 'focus-active-pulse' : ''}`}>
        {/* Row 1: Header & Expand Toggle */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-400">FOCUS SESSION</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg">🔥</span>
              <h3 className="text-lg font-bold text-black">Deep Work Focus</h3>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="focus-block-expand-btn"
            aria-label="Enter fullscreen focus mode"
          >
            <span className="text-lg leading-none font-light">⤢</span>
          </button>
        </div>

        {/* Row 2: Active Pursuit Dropdown */}
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-wider text-gray-400 mb-1.5">ACTIVE PURSUIT</p>
          <div className="relative">
            <button
              onClick={() => setShowActivityPicker(v => !v)}
              className="w-full flex items-center justify-between px-0 py-1.5 text-base font-medium text-slate-800 bg-transparent border-none focus:outline-none"
            >
              <span>{activity}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-400">
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showActivityPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg z-30 overflow-hidden p-1 flex flex-col gap-0.5 min-w-[170px]">
                {PRESET_ACTIVITIES.map(a => (
                  <button
                    key={a}
                    onClick={() => { setActivity(a); setShowActivityPicker(false); setCustomActivity('') }}
                    className={`w-full px-3 py-2 text-sm text-left rounded-lg font-medium transition-colors ${activity === a && !customActivity ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    {a}
                  </button>
                ))}
                <div className="border-t border-neutral-100 my-0.5" />
                {customActivity ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); if (customActivity.trim()) { setActivity(customActivity.trim()); setShowActivityPicker(false) } }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 p-1"
                  >
                    <input
                      type="text" placeholder="Name..." value={customActivity}
                      onChange={(e) => setCustomActivity(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 text-neutral-800"
                      autoFocus
                    />
                    <button type="submit" className="px-2 py-1 text-[10px] font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800">Set</button>
                  </form>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCustomActivity('') }}
                    className="w-full px-3 py-2 text-sm text-left text-emerald-600 hover:bg-emerald-50/50 rounded-lg font-semibold transition-colors"
                  >
                    + Custom
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Session Length Selectors */}
        {isIdle && (
          <div className="mt-5">
            <p className="text-xs font-semibold tracking-wider text-gray-400 mb-2">SESSION LENGTH</p>
            <div className="flex items-center gap-2.5 flex-wrap">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => { setDuration(d); setEditCustom(false) }}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    duration === d && !editCustom
                      ? 'bg-[#2D6A4F] text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200/60'
                  }`}
                >
                  {d}m
                </button>
              ))}
              {editCustom ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); const v = parseInt(customMin, 10); if (v > 0) { setDuration(v); setEditCustom(false); setCustomMin('') } }}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex"
                >
                  <input
                    type="number" min="1" max="360" placeholder="min"
                    value={customMin}
                    onChange={(e) => setCustomMin(e.target.value)}
                    className="w-14 px-2 py-1.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-gray-400 text-gray-800 text-center bg-white"
                    autoFocus
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditCustom(true)}
                  className="px-5 py-1.5 rounded-full text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 border border-gray-200/60 transition-all"
                >
                  + Custom
                </button>
              )}
            </div>
          </div>
        )}

        {/* Row 4: Main Timer Display */}
        <div className="my-6 text-center">
          <span className="text-7xl font-bold font-mono text-gray-900 tracking-tight tabular-nums slashed-zero leading-none">
            {timerDisplay}
          </span>
        </div>

        {/* Row 5: Action CTA Button */}
        <div>
          {isIdle && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold bg-black text-white hover:bg-gray-800 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              <Play size={16} fill="currentColor" /> {actionLoading ? 'Starting...' : 'Start Session'}
            </button>
          )}
          {isRunning && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              <Pause size={16} fill="currentColor" /> {actionLoading ? 'Pausing...' : 'Pause Session'}
            </button>
          )}
          {isPaused && (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold bg-black hover:bg-gray-800 text-white transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              <Play size={16} fill="currentColor" /> {actionLoading ? 'Resuming...' : 'Resume Session'}
            </button>
          )}
        </div>

        {/* Reset/End for active sessions */}
        {(isRunning || isPaused) && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              onClick={handleReset}
              disabled={actionLoading}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              Reset
            </button>
            <span className="text-gray-200 select-none">·</span>
            <button
              onClick={handleEndAndSave}
              disabled={actionLoading}
              className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              End & Save
            </button>
          </div>
        )}
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
                    className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition-all ${duration === d && !editCustom ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white/60 border-neutral-200 text-neutral-500 hover:bg-neutral-100'}`}
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
