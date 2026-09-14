import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, CheckCircle2, Info, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { LearningPursuit, PursuitStep, UpdatePursuitStepRequest } from '@/types/learnings'
import { learningsService } from '@/services/learnings-service'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { formatMinutes } from '../pursuit-tree'
import { extractTakeaways, hasTakeawaysBlock } from '../pursuit-tutor'
import './create-pursuit-modal.css'
import './pursuit-next-up.css'

interface SessionWrapUpModalProps {
  pursuit: LearningPursuit
  step: PursuitStep
  /** Length of the session that just ended. */
  minutes: number
  onClose: () => void
  /** Called after anything was written, so the route can re-sync. */
  onSaved: () => void
}

/** Shown when a step-linked focus session ends: resume note, takeaways, done? */
export function SessionWrapUpModal({ pursuit, step, minutes, onClose, onSaved }: SessionWrapUpModalProps) {
  const [resumeNote, setResumeNote] = useState(step.resumeNote ?? '')
  const [takeawaysRaw, setTakeawaysRaw] = useState('')
  const [markDone, setMarkDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const takeaways = useMemo(() => extractTakeaways(takeawaysRaw), [takeawaysRaw])
  const foundBlock = hasTakeawaysBlock(takeawaysRaw)
  const bulletCount = takeaways ? takeaways.split('\n').length : 0

  const isDirty = Boolean(takeawaysRaw.trim() || markDone || resumeNote.trim() !== (step.resumeNote ?? ''))
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty, onClose)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [requestClose])

  const handleSave = async () => {
    const dto: UpdatePursuitStepRequest = {}
    if (resumeNote.trim() !== (step.resumeNote ?? '')) dto.resumeNote = resumeNote.trim()
    if (takeaways) dto.takeaways = step.takeaways ? `${step.takeaways}\n${takeaways}` : takeaways

    setSaving(true)
    setError('')
    try {
      if (Object.keys(dto).length > 0) {
        const res = await learningsService.updatePursuitStep(pursuit.id, step.id, dto)
        if (res.error) throw new Error(res.error.message)
      }
      if (markDone && !step.isCompleted) {
        const res = await learningsService.togglePursuitStep(pursuit.id, step.id)
        if (res.error) throw new Error(res.error.message)
        if (res.data?.status === 'COMPLETED') toast.success(`"${pursuit.title}" completed! Moved to All Learnings.`)
        else toast.success('Step done — Up next has moved on.')
      } else {
        toast.success('Session saved')
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save this session'))
      setSaving(false)
    }
  }

  return createPortal(
    <>
      <div className="pursuit-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className="pursuit-modal wrapup-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wrapup-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="pursuit-modal-header">
            <div className="tutor-heading">
              <p className="pursuit-eyebrow tutor-eyebrow">
                <CheckCircle2 size={11} />
                Session complete
              </p>
              <h2 id="wrapup-title" className="pursuit-modal-title">{formatMinutes(minutes)} on this step</h2>
              <p className="tutor-trail">{step.text}</p>
            </div>
            <button type="button" className="pursuit-close" onClick={requestClose} aria-label="Close">
              <X size={16} />
            </button>
          </header>

          <div className="pursuit-modal-body">
            <label className="pursuit-label" htmlFor="wrapup-resume">Where did you leave off?</label>
            <input
              id="wrapup-resume"
              className="pursuit-input"
              value={resumeNote}
              onChange={(e) => setResumeNote(e.target.value)}
              placeholder="e.g. getState works; next: why listeners live in a Set"
              maxLength={300}
              autoFocus
            />
            <p className="wrapup-hint">Shown on Up next when you pick this step up again.</p>

            <label className="pursuit-label" htmlFor="wrapup-takeaways">
              Takeaways <span className="pursuit-optional">optional</span>
            </label>
            <textarea
              id="wrapup-takeaways"
              className="pursuit-reply-input wrapup-takeaways"
              value={takeawaysRaw}
              onChange={(e) => setTakeawaysRaw(e.target.value)}
              placeholder="Paste Claude's whole reply, or jot a few bullets yourself"
              rows={5}
            />
            {takeawaysRaw.trim() && (
              <p className={cn('pursuit-parse-status', foundBlock ? 'is-ok' : 'is-info')}>
                {foundBlock ? <Check size={13} /> : <Info size={13} />}
                {foundBlock
                  ? `Takeaways block found — ${bulletCount} line${bulletCount === 1 ? '' : 's'} will be saved`
                  : 'No takeaways block found — the text is saved as written'}
              </p>
            )}

            <button
              type="button"
              role="switch"
              aria-checked={markDone}
              className={cn('wrapup-done', markDone && 'is-on')}
              onClick={() => setMarkDone((v) => !v)}
              disabled={step.isCompleted}
            >
              <span className="wrapup-done-text">
                <strong>{step.isCompleted ? 'Step already done' : 'This step is done'}</strong>
                <span>Up next moves on to the following step.</span>
              </span>
              <span className="wrapup-switch" aria-hidden="true" />
            </button>
          </div>

          <footer className="pursuit-modal-footer">
            {error ? (
              <p className="pursuit-footer-error" role="alert">{error}</p>
            ) : (
              <p className="pursuit-footer-hint">Takeaways carry into All Learnings when the pursuit finishes.</p>
            )}
            <div className="pursuit-footer-actions">
              <button type="button" className="pursuit-btn-ghost" onClick={onClose}>
                Skip
              </button>
              <button type="button" className="pursuit-btn-primary" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                Save session
              </button>
            </div>
          </footer>
        </div>
      </div>
      {confirmCloseDialog}
    </>,
    document.body,
  )
}
