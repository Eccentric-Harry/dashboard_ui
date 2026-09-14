import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Check, ChevronDown, Copy, Loader2, PencilLine, RotateCcw, Sparkles, X } from 'lucide-react'
import type { LearningPursuit } from '@/types/learnings'
import { learningsService } from '@/services/learnings-service'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { PursuitOutlineEditor } from './pursuit-outline-editor'
import { formatMinutes } from '../pursuit-tree'
import {
  LEVEL_OPTIONS,
  PURSUIT_CATEGORIES,
  TIMEFRAME_OPTIONS,
  buildPursuitPrompt,
  createEmptyRow,
  outlineStats,
  parsePursuitJson,
  rowsToInputs,
  type OutlineRow,
  type PursuitLevel,
  type PursuitTimeframe,
} from '../pursuit-import'
import './create-pursuit-modal.css'

type Mode = 'manual' | 'ai'

interface CreatePursuitModalProps {
  onClose: () => void
  onCreated: (pursuit: LearningPursuit) => void
}

/** Mounted only while open, so every open starts from a clean draft. */
export function CreatePursuitModal({ onClose, onCreated }: CreatePursuitModalProps) {
  const [mode, setMode] = useState<Mode>('ai')

  // Shared draft
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(PURSUIT_CATEGORIES[0])
  const [customCategory, setCustomCategory] = useState('')
  const [rows, setRows] = useState<OutlineRow[]>(() => [createEmptyRow()])

  // AI import
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<PursuitLevel>('basics')
  const [timeframe, setTimeframe] = useState<PursuitTimeframe>('two-weeks')
  const [goal, setGoal] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reply, setReply] = useState('')
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [importWarnings, setImportWarnings] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const prompt = useMemo(() => buildPursuitPrompt({ topic, level, timeframe, goal }), [topic, level, timeframe, goal])
  const parsed = useMemo(() => (reply.trim() ? parsePursuitJson(reply) : null), [reply])
  const stats = outlineStats(rows)
  const isCustom = category === 'Custom'
  const finalCategory = (isCustom ? customCategory : category).trim()
  const reviewing = mode === 'manual' || importedCount !== null

  const isDirty = Boolean(title.trim() || stats.count > 0 || reply.trim() || topic.trim() || goal.trim())
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty, onClose)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [requestClose])

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2200)
    return () => window.clearTimeout(t)
  }, [copied])

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
    } catch {
      // Clipboard can be blocked (permissions, some in-app browsers): show it for a manual copy.
      setShowPrompt(true)
    }
  }

  const loadPlan = () => {
    if (!parsed?.ok) return
    const { plan } = parsed
    setRows(plan.rows)
    if (plan.title) setTitle(plan.title)
    if (plan.category) {
      const preset = PURSUIT_CATEGORIES.find((c) => c.toLowerCase() === plan.category.toLowerCase())
      setCategory(preset ?? 'Custom')
      setCustomCategory(preset ? '' : plan.category)
    } else if (!title.trim() && topic.trim()) {
      setTitle(topic.trim())
    }
    setImportedCount(plan.rows.length)
    setImportWarnings(plan.warnings)
    setReply('')
    setError('')
  }

  const handleCreate = async () => {
    const steps = rowsToInputs(rows)
    if (!title.trim()) return setError('Give the pursuit a title.')
    if (!finalCategory) return setError('Pick or type a category.')
    if (steps.length === 0) return setError('Add at least one step.')

    setSaving(true)
    setError('')
    try {
      const res = await learningsService.createPursuit({
        title: title.trim(),
        category: finalCategory,
        goal: goal.trim() || undefined,
        steps,
      })
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'Failed to create pursuit')
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create pursuit'))
      setSaving(false)
    }
  }

  const topCount = parsed?.ok ? parsed.plan.rows.filter((r) => r.depth === 0).length : 0
  const nestedCount = parsed?.ok ? parsed.plan.rows.length - topCount : 0

  return createPortal(
    <>
      <div className="pursuit-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className="pursuit-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pursuit-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="pursuit-modal-header">
            <div>
              <p className="pursuit-eyebrow">Study queue</p>
              <h2 id="pursuit-modal-title" className="pursuit-modal-title">New pursuit</h2>
            </div>
            <button type="button" className="pursuit-close" onClick={requestClose} aria-label="Close">
              <X size={16} />
            </button>
          </header>

          <div className="pursuit-mode-toggle" role="tablist" aria-label="How to build the plan">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'ai'}
              className={cn(mode === 'ai' && 'is-active')}
              onClick={() => setMode('ai')}
            >
              <Sparkles size={13} />
              Plan with AI
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'manual'}
              className={cn(mode === 'manual' && 'is-active')}
              onClick={() => setMode('manual')}
            >
              <PencilLine size={13} />
              Write it myself
            </button>
          </div>

          <div className="pursuit-modal-body">
            {mode === 'ai' && importedCount === null && (
              <>
                <section className="pursuit-ai-step">
                  <div className="pursuit-ai-step-head">
                    <span className="pursuit-ai-step-num">1</span>
                    <div>
                      <h3>Get a plan from your AI</h3>
                      <p>Describe it, copy the prompt, paste it into ChatGPT, Claude or Gemini.</p>
                    </div>
                  </div>

                  <label className="pursuit-label" htmlFor="pursuit-topic">What do you want to learn?</label>
                  <input
                    id="pursuit-topic"
                    className="pursuit-input"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. JavaScript functions in depth, SQL window functions"
                    autoFocus
                  />

                  <div className="pursuit-field-grid">
                    <div>
                      <span className="pursuit-label">Your level</span>
                      <div className="pursuit-chip-row">
                        {LEVEL_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            className={cn('pursuit-chip', level === o.value && 'is-selected')}
                            onClick={() => setLevel(o.value)}
                            aria-pressed={level === o.value}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="pursuit-label">Time you can give it</span>
                      <div className="pursuit-chip-row">
                        {TIMEFRAME_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            className={cn('pursuit-chip', timeframe === o.value && 'is-selected')}
                            onClick={() => setTimeframe(o.value)}
                            aria-pressed={timeframe === o.value}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <label className="pursuit-label" htmlFor="pursuit-goal">
                    Goal <span className="pursuit-optional">optional</span>
                  </label>
                  <input
                    id="pursuit-goal"
                    className="pursuit-input"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. read other people's code confidently, crack a frontend interview"
                  />

                  <div className="pursuit-prompt-actions">
                    <button type="button" className="pursuit-btn-primary" onClick={copyPrompt} disabled={!topic.trim()}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied — now paste it in your AI' : 'Copy prompt'}
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
                      rows={10}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Prompt text"
                    />
                  )}
                </section>

                <section className="pursuit-ai-step">
                  <div className="pursuit-ai-step-head">
                    <span className="pursuit-ai-step-num">2</span>
                    <div>
                      <h3>Paste the reply</h3>
                      <p>The whole reply is fine — the JSON gets picked out of it.</p>
                    </div>
                  </div>
                  <textarea
                    className="pursuit-reply-input"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={'{\n  "title": "…",\n  "steps": [ … ]\n}'}
                    rows={6}
                    spellCheck={false}
                    aria-label="AI reply"
                  />
                  {parsed && !parsed.ok && (
                    <p className="pursuit-parse-status is-error">
                      <AlertCircle size={13} />
                      {parsed.error}
                    </p>
                  )}
                  {parsed?.ok && (
                    <div className="pursuit-parse-ok">
                      <p className="pursuit-parse-status is-ok">
                        <Check size={13} />
                        {parsed.plan.title ? <strong>{parsed.plan.title}</strong> : 'Plan found'}
                        <span>
                          {topCount} step{topCount === 1 ? '' : 's'}
                          {nestedCount > 0 && ` · ${nestedCount} sub-step${nestedCount === 1 ? '' : 's'}`}
                        </span>
                      </p>
                      <button type="button" className="pursuit-btn-primary" onClick={loadPlan}>
                        Review plan
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}

            {reviewing && (
              <>
                {mode === 'ai' && importedCount !== null && (
                  <div className="pursuit-import-banner">
                    <Sparkles size={13} />
                    <span>
                      Imported {importedCount} step{importedCount === 1 ? '' : 's'} — tweak anything before creating.
                    </span>
                    <button type="button" onClick={() => setImportedCount(null)}>
                      <RotateCcw size={12} />
                      Paste another
                    </button>
                  </div>
                )}
                {importWarnings.length > 0 && mode === 'ai' && (
                  <ul className="pursuit-import-warnings">
                    {importWarnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}

                <label className="pursuit-label" htmlFor="pursuit-title">Title</label>
                <input
                  id="pursuit-title"
                  className="pursuit-input is-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. JavaScript Fundamentals"
                  maxLength={120}
                  autoFocus={mode === 'manual'}
                />

                <span className="pursuit-label">Category</span>
                <div className="pursuit-chip-row">
                  {[...PURSUIT_CATEGORIES, 'Custom'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn('pursuit-chip', category === c && 'is-selected')}
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                    >
                      {c === 'Custom' ? (customCategory.trim() && isCustom ? customCategory : '+ Custom') : c}
                    </button>
                  ))}
                </div>
                {isCustom && (
                  <input
                    className="pursuit-input"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Category name, e.g. System Design"
                    maxLength={40}
                    autoFocus={!customCategory}
                  />
                )}

                <label className="pursuit-label" htmlFor="pursuit-goal-review">
                  Goal <span className="pursuit-optional">optional — used in Learn with AI prompts</span>
                </label>
                <input
                  id="pursuit-goal-review"
                  className="pursuit-input"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. read Zustand's source and explain it from first principles"
                  maxLength={300}
                />

                <div className="pursuit-steps-head">
                  <span className="pursuit-label">Steps</span>
                  <span className="pursuit-steps-meta">
                    {stats.count} step{stats.count === 1 ? '' : 's'}
                    {stats.levels > 1 && ` · ${stats.levels} levels`}
                    {stats.minutes > 0 && ` · ≈${formatMinutes(stats.minutes)}`}
                  </span>
                </div>
                <PursuitOutlineEditor rows={rows} onChange={setRows} />
              </>
            )}
          </div>

          <footer className="pursuit-modal-footer">
            {error ? (
              <p className="pursuit-footer-error" role="alert">{error}</p>
            ) : (
              <p className="pursuit-footer-hint">
                {reviewing ? 'A Notion page is created alongside it.' : 'Load a plan to review it before creating.'}
              </p>
            )}
            <div className="pursuit-footer-actions">
              <button type="button" className="pursuit-btn-ghost" onClick={requestClose}>
                Cancel
              </button>
              <button
                type="button"
                className="pursuit-btn-primary"
                onClick={handleCreate}
                disabled={!reviewing || saving || stats.count === 0 || !title.trim() || !finalCategory}
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Create pursuit
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
