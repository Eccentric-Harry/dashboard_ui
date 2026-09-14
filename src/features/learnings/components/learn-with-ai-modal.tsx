import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, Check, ChevronDown, Copy, Dumbbell, FolderOpen, LifeBuoy, ListChecks, Loader2, Sparkles, X, type LucideIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import type { LearningPursuit, PursuitStep } from '@/types/learnings'
import { useUserStore, userActions } from '@/store/user-store'
import { isGuestSession } from '@/services/http/session'
import { cn } from '@/lib/utils'
import { findStepById, formatMinutes } from '../pursuit-tree'
import {
  DEFAULT_LEARNER_PROFILE,
  LEARNER_PROFILE_PLACEHOLDER,
  TUTOR_MODES,
  buildProjectContext,
  buildTutorPrompt,
  stepTrail,
  type TutorMode,
} from '../pursuit-tutor'
import './create-pursuit-modal.css'
import './pursuit-next-up.css'

const MINUTE_OPTIONS = [15, 30, 45, 60, 90]

const MODE_ICONS: Record<TutorMode, LucideIcon> = {
  explain: BookOpen,
  practice: Dumbbell,
  quiz: ListChecks,
  stuck: LifeBuoy,
}

/** The session length closest to what's left of the step's estimate. */
function defaultMinutes(step: PursuitStep | null): number {
  const left = step?.estimateMinutes ? step.estimateMinutes - (step.spentMinutes ?? 0) : 45
  return MINUTE_OPTIONS.reduce((best, m) => (Math.abs(m - left) < Math.abs(best - left) ? m : best), MINUTE_OPTIONS[0])
}

interface LearnWithAiModalProps {
  pursuit: LearningPursuit
  stepId: string
  onClose: () => void
}

export function LearnWithAiModal({ pursuit, stepId, onClose }: LearnWithAiModalProps) {
  const savedProfile = useUserStore.use.profile().data?.learnerProfile ?? ''
  const step = findStepById(pursuit.steps, stepId)

  const [mode, setMode] = useState<TutorMode>('explain')
  const [minutes, setMinutes] = useState(() => defaultMinutes(step))
  const [stuckDetail, setStuckDetail] = useState('')
  // Until a profile is saved, start from a ready-made draft so the form needs a review, not typing.
  const suggestedProfile = isGuestSession() ? '' : DEFAULT_LEARNER_PROFILE
  const [editingProfile, setEditingProfile] = useState(!savedProfile)
  const [profileDraft, setProfileDraft] = useState(savedProfile || suggestedProfile)
  const [savingProfile, setSavingProfile] = useState(false)
  const [copied, setCopied] = useState<'prompt' | 'context' | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  const learnerProfile = editingProfile ? profileDraft : savedProfile
  const showingSuggestion = !savedProfile && Boolean(suggestedProfile) && profileDraft === suggestedProfile

  const prompt = useMemo(
    () => (step ? buildTutorPrompt({ mode, pursuit, step, minutes, learnerProfile, stuckDetail }) : ''),
    [mode, pursuit, step, minutes, learnerProfile, stuckDetail],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), 2200)
    return () => window.clearTimeout(t)
  }, [copied])

  if (!step) return null
  const trail = stepTrail(pursuit.steps, step.id)

  const copy = async (kind: 'prompt' | 'context') => {
    const text = kind === 'prompt' ? prompt : buildProjectContext({ pursuit, learnerProfile })
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
    } catch {
      if (kind === 'prompt') setShowPrompt(true)
      else toast.error('Clipboard is blocked here — copy the prompt preview instead.')
    }
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    const res = await userActions.saveLearnerProfile(profileDraft.trim())
    setSavingProfile(false)
    if (res.error) {
      toast.error(res.error.message || 'Could not save your learner profile')
      return
    }
    toast.success('Learner profile saved')
    setEditingProfile(false)
  }

  return createPortal(
    <div className="pursuit-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pursuit-modal tutor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutor-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pursuit-modal-header">
          <div className="tutor-heading">
            <p className="pursuit-eyebrow tutor-eyebrow">
              <Sparkles size={11} />
              Learn with AI
            </p>
            <h2 id="tutor-modal-title" className="pursuit-modal-title tutor-title">{step.text}</h2>
            <p className="tutor-trail">{[pursuit.title, ...trail.map((t) => t.text)].join(' › ')}</p>
          </div>
          <button type="button" className="pursuit-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="pursuit-modal-body">
          <section className="tutor-profile">
            <div className="tutor-section-head">
              <span className="pursuit-label">About you</span>
              {!editingProfile && (
                <button
                  type="button"
                  className="tutor-link"
                  onClick={() => {
                    setProfileDraft(savedProfile)
                    setEditingProfile(true)
                  }}
                >
                  Edit
                </button>
              )}
            </div>
            {editingProfile ? (
              <>
                <textarea
                  className="pursuit-reply-input tutor-profile-input"
                  value={profileDraft}
                  onChange={(e) => setProfileDraft(e.target.value)}
                  placeholder={LEARNER_PROFILE_PLACEHOLDER}
                  rows={5}
                  maxLength={2000}
                  aria-label="About you as a learner"
                />
                <div className="tutor-profile-actions">
                  <span className="tutor-hint">
                    {showingSuggestion
                      ? 'Pre-filled from what I know about you and already used in the prompt. Tweak it and save to keep it.'
                      : 'Saved to your profile and reused in every prompt.'}
                  </span>
                  {savedProfile && (
                    <button type="button" className="pursuit-btn-ghost is-small" onClick={() => setEditingProfile(false)}>
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    className="pursuit-btn-ghost is-small"
                    onClick={saveProfile}
                    disabled={savingProfile || !profileDraft.trim()}
                  >
                    {savingProfile && <Loader2 size={12} className="animate-spin" />}
                    Save to profile
                  </button>
                </div>
              </>
            ) : (
              <p className="tutor-profile-text">{savedProfile}</p>
            )}
          </section>

          <span className="pursuit-label">Session type</span>
          <div className="tutor-mode-grid" role="radiogroup" aria-label="Session type">
            {TUTOR_MODES.map((m) => {
              const Icon = MODE_ICONS[m.value]
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.value}
                  className={cn('tutor-mode', mode === m.value && 'is-selected')}
                  onClick={() => setMode(m.value)}
                >
                  <span className="tutor-mode-icon">
                    <Icon size={14} />
                  </span>
                  <span className="tutor-mode-text">
                    <strong>{m.label}</strong>
                    <span>{m.description}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {mode === 'stuck' && (
            <>
              <label className="pursuit-label" htmlFor="tutor-stuck">What isn't working</label>
              <textarea
                id="tutor-stuck"
                className="pursuit-reply-input"
                value={stuckDetail}
                onChange={(e) => setStuckDetail(e.target.value)}
                placeholder="Paste the error, the code, or describe what isn't clicking"
                rows={5}
                spellCheck={false}
              />
            </>
          )}

          <span className="pursuit-label">Time you have</span>
          <div className="pursuit-chip-row">
            {MINUTE_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                className={cn('pursuit-chip', minutes === m && 'is-selected')}
                onClick={() => setMinutes(m)}
                aria-pressed={minutes === m}
              >
                {formatMinutes(m)}
              </button>
            ))}
          </div>

          <div className="pursuit-prompt-actions">
            <button
              type="button"
              className="pursuit-btn-primary"
              onClick={() => copy('prompt')}
              disabled={mode === 'stuck' && !stuckDetail.trim()}
            >
              {copied === 'prompt' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'prompt' ? 'Copied — paste it into Claude' : 'Copy prompt'}
            </button>
            <button
              type="button"
              className={cn('pursuit-btn-ghost', showPrompt && 'is-open')}
              onClick={() => setShowPrompt((v) => !v)}
              aria-expanded={showPrompt}
            >
              {showPrompt ? 'Hide prompt' : 'See prompt'}
              <ChevronDown size={13} />
            </button>
          </div>
          {showPrompt && (
            <textarea
              className="pursuit-prompt-preview"
              readOnly
              value={prompt}
              rows={12}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Prompt text"
            />
          )}

          <section className="tutor-project">
            <FolderOpen size={16} className="tutor-project-icon" />
            <div className="tutor-project-copy">
              <h3>Using a Claude Project?</h3>
              <p>Paste this once into the project instructions. Every chat there will already know you and this plan.</p>
            </div>
            <button type="button" className="pursuit-btn-ghost" onClick={() => copy('context')}>
              {copied === 'context' ? <Check size={13} /> : <Copy size={13} />}
              {copied === 'context' ? 'Copied' : 'Copy project context'}
            </button>
          </section>
        </div>

        <footer className="pursuit-modal-footer">
          <p className="pursuit-footer-hint">Claude ends with a takeaways block — paste it in when your session wraps up.</p>
          <div className="pursuit-footer-actions">
            <button type="button" className="pursuit-btn-ghost" onClick={onClose}>
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
