import { useState, useEffect } from 'react'
import { Flame, Play, Pause, Square, RotateCcw, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

export interface FocusSessionState {
  isCounting: boolean
  elapsedTime: number // in seconds
  selectedActivity: string
}

interface FocusBlockWidgetProps {
  onSessionComplete: (durationMinutes: number, activityType: string) => void
}

const ACTIVITIES = [
  { label: 'Coding 💻', value: 'Coding' },
  { label: 'DSA/LeetCode 🤓', value: 'DSA/LeetCode' },
  { label: 'Reading Notes 📚', value: 'Reading Notes' },
]

const DURATIONS = [
  { label: '25m', value: 25 },
  { label: '45m', value: 45 },
  { label: '60m', value: 60 },
  { label: '1m (Test)', value: 1 }, // Easy to demo/test
]

export function FocusBlockWidget({ onSessionComplete }: FocusBlockWidgetProps) {
  const [selectedActivity, setSelectedActivity] = useState('Coding')
  const [selectedDuration, setSelectedDuration] = useState(25) // in minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60) // in seconds
  const [elapsedTime, setElapsedTime] = useState(0) // in seconds
  const [isCounting, setIsCounting] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Update timer when duration changes
  useEffect(() => {
    if (!isCounting) {
      setTimeLeft(selectedDuration * 60)
      setElapsedTime(0)
    }
  }, [selectedDuration, isCounting])

  // Timer tick effect
  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null

    if (isCounting) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsCounting(false)
            if (timerId) clearInterval(timerId)
            // Save complete session
            const totalSessionMins = selectedDuration
            onSessionComplete(totalSessionMins, selectedActivity)
            toast.success(`Congratulations! You completed your ${totalSessionMins}m focus session!`)
            return selectedDuration * 60
          }
          return prev - 1
        })
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (timerId) clearInterval(timerId)
    }
  }, [isCounting, selectedDuration, selectedActivity, onSessionComplete])

  const toggleTimer = () => {
    setIsCounting(!isCounting)
  }

  const handleReset = () => {
    setIsCounting(false)
    setTimeLeft(selectedDuration * 60)
    setElapsedTime(0)
    toast.success('Timer reset.')
  }

  const handleStopAndSave = () => {
    const elapsedMins = Math.round(elapsedTime / 60)
    setIsCounting(false)
    
    if (elapsedTime < 10) {
      toast.error('Session too short to save (must be at least 10 seconds).')
      setTimeLeft(selectedDuration * 60)
      setElapsedTime(0)
      return
    }

    const finalMins = elapsedMins || 1 // minimum 1 minute
    onSessionComplete(finalMins, selectedActivity)
    toast.success(`Logged ${finalMins}m focus session. Well done!`)
    
    // Reset
    setTimeLeft(selectedDuration * 60)
    setElapsedTime(0)
  }

  // Format time display as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  };

  const activeActivityLabel = ACTIVITIES.find(a => a.value === selectedActivity)?.label || selectedActivity

  return (
    <div className={`learnings-card bg-white rounded-3xl p-5 border border-white/50 shadow-[0_22px_52px_rgba(45,60,48,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md transition-all duration-300 ${isCounting ? 'focus-active-pulse' : ''}`}>
      <div>
        <p className="learnings-card-eyebrow text-xs uppercase tracking-wider text-gray-400 font-bold">FOCUS SESSION</p>
        <h3 className="learnings-card-title text-lg font-bold text-gray-900 flex items-center gap-1.5 mb-4">
          <Flame size={16} className={`text-orange-500 ${isCounting ? 'animate-bounce' : ''}`} />
          Deep Work Focus
        </h3>
      </div>

      {/* Activity Selector */}
      <div className="relative mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
          Active Pursuit
        </label>
        <button
          onClick={() => !isCounting && setIsDropdownOpen(!isDropdownOpen)}
          disabled={isCounting}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-800 font-medium text-left transition-all ${isCounting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100/60'}`}
        >
          <span>{activeActivityLabel}</span>
          {!isCounting && <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {isDropdownOpen && !isCounting && (
          <div className="absolute top-[100%] left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
            {ACTIVITIES.map((activity) => (
              <button
                key={activity.value}
                onClick={() => {
                  setSelectedActivity(activity.value)
                  setIsDropdownOpen(false)
                }}
                className="w-full px-4 py-2.5 text-xs text-left text-gray-700 hover:bg-emerald-50 hover:text-[#1a7a4a] font-medium transition-colors border-b border-gray-50 last:border-b-0"
              >
                {activity.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Duration Pills */}
      <div className="mb-5">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
          Session Length
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DURATIONS.map((dur) => (
            <button
              key={dur.value}
              disabled={isCounting}
              onClick={() => setSelectedDuration(dur.value)}
              className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${isCounting ? 'opacity-50 cursor-not-allowed' : ''} ${selectedDuration === dur.value ? 'bg-[#1a7a4a] border-[#1a7a4a] text-white shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100/60'}`}
            >
              {dur.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center my-6">
        <div className="text-6xl font-light font-mono text-gray-900 tracking-tight select-none">
          {formatTime(timeLeft)}
        </div>
        {isCounting && (
          <p className="text-[10px] font-bold text-[#1a7a4a] uppercase tracking-wider mt-2 animate-pulse">
            Session in progress...
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={toggleTimer}
          className={`w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition-all ${isCounting ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md' : 'bg-black hover:bg-neutral-800 text-white shadow-sm'}`}
        >
          {isCounting ? (
            <>
              <Pause size={14} fill="currentColor" />
              Pause Session
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              Start Session
            </>
          )}
        </button>

        {/* Optional Secondary Controls (Reset / Stop & Save) */}
        {(isCounting || elapsedTime > 0) && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black py-2 rounded-full bg-gray-50 border border-gray-100 transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
            <button
              onClick={handleStopAndSave}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 py-2 rounded-full bg-red-50/40 border border-red-100/50 transition-colors"
            >
              <Square size={12} fill="currentColor" />
              End & Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
