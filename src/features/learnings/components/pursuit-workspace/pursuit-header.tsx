import { useId, useState, type FormEvent } from 'react'
import { Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { LearningPursuit } from '@/types/learnings'
import { toneStyle } from '@/lib/tone'
import type { PursuitDetailsPatch } from '../../use-pursuit-actions'
import { getConsistentColor } from '../../learnings-utils'
import { PURSUIT_CATEGORIES } from '../../pursuit-import'
import { countLeaves, formatMinutes, hasMilestones, sumEstimates, sumSpent } from '../../pursuit-tree'
import { NotionIcon } from '../notion-icon'
import { PursuitMilestoneBar } from '../pursuit-milestone-bar'

interface PursuitHeaderProps {
  pursuit: LearningPursuit
  isMain: boolean
  /** The Main badge only means something when there's more than one pursuit. */
  showMainBadge: boolean
  currentStepId?: string | null
  onSetPrimary: () => void
  /** Resolves true once saved, which closes the form. */
  onSave: (patch: PursuitDetailsPatch) => Promise<boolean>
  onDelete: () => void
}

type Draft = { title: string; category: string; customCategory: string; goal: string }

const CUSTOM = 'Custom'

function draftFrom(pursuit: LearningPursuit): Draft {
  const known = PURSUIT_CATEGORIES.includes(pursuit.category)
  return {
    title: pursuit.title,
    category: known ? pursuit.category : CUSTOM,
    customCategory: known ? '' : pursuit.category,
    goal: pursuit.goal ?? '',
  }
}

export function PursuitHeader({ pursuit, isMain, showMainBadge, currentStepId, onSetPrimary, onSave, onDelete }: PursuitHeaderProps) {
  const fieldId = useId()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  const { steps } = pursuit
  const { done, total } = countLeaves(steps)
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0
  const remaining = sumEstimates(steps, true)
  const logged = sumSpent(steps)
  const grouped = hasMilestones(steps)
  const milestonesDone = steps.filter((step) => step.isCompleted).length
  const hue = getConsistentColor(pursuit.category)

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft) return
    const title = draft.title.trim()
    const category = draft.category === CUSTOM ? draft.customCategory.trim() : draft.category
    if (!title || !category) return
    setSaving(true)
    const ok = await onSave({ title, category, goal: draft.goal.trim() })
    setSaving(false)
    if (ok) setDraft(null)
  }

  if (draft) {
    return (
      <header className="learnings-card pw-header is-editing">
        <form
          className="pw-edit"
          onSubmit={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDraft(null)
          }}
        >
          <div className="pw-field">
            <label className="pw-field-label" htmlFor={`${fieldId}-title`}>Title</label>
            <input
              id={`${fieldId}-title`}
              className="pw-input is-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              maxLength={120}
              required
              autoFocus
            />
          </div>

          <div className="pw-field-row">
            <div className="pw-field">
              <label className="pw-field-label" htmlFor={`${fieldId}-category`}>Category</label>
              <select
                id={`${fieldId}-category`}
                className="pw-input"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {PURSUIT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
                <option value={CUSTOM}>Custom…</option>
              </select>
            </div>
            {draft.category === CUSTOM && (
              <div className="pw-field">
                <label className="pw-field-label" htmlFor={`${fieldId}-custom`}>Custom category</label>
                <input
                  id={`${fieldId}-custom`}
                  className="pw-input"
                  value={draft.customCategory}
                  onChange={(e) => setDraft({ ...draft, customCategory: e.target.value })}
                  maxLength={40}
                  required
                />
              </div>
            )}
          </div>

          <div className="pw-field">
            <label className="pw-field-label" htmlFor={`${fieldId}-goal`}>
              Goal <span className="pw-field-hint">What "done" looks like. Learn with AI uses it.</span>
            </label>
            <textarea
              id={`${fieldId}-goal`}
              className="pw-input"
              rows={2}
              maxLength={300}
              value={draft.goal}
              onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
              placeholder="e.g. Explain every design choice well enough to teach it"
            />
          </div>

          <div className="pw-edit-actions">
            <button type="button" className="pnu-btn is-quiet" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button type="submit" className="pnu-btn is-primary" disabled={saving}>
              {saving && <Loader2 size={13} className="animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </header>
    )
  }

  return (
    <header className="learnings-card pw-header">
      <div className="pw-header-top">
        <div className="pw-header-tags">
          <span className="pw-category" style={toneStyle({ hue, bg: `color-mix(in srgb, ${hue} 11%, white)`, ink: hue })}>
            {pursuit.category}
          </span>
          {isMain && showMainBadge && (
            <span className="pursuit-main-badge">
              <Star size={8} fill="currentColor" strokeWidth={0} />
              Main
            </span>
          )}
        </div>
        <div className="pw-header-actions">
          {!isMain && (
            <button type="button" className="pw-icon-btn" onClick={onSetPrimary} title="Make this your main pursuit" aria-label="Make this your main pursuit">
              <Star size={14} />
            </button>
          )}
          <button type="button" className="pw-icon-btn" onClick={() => setDraft(draftFrom(pursuit))} title="Edit title, category and goal" aria-label="Edit pursuit details">
            <Pencil size={13} />
          </button>
          <button type="button" className="pw-icon-btn is-danger" onClick={onDelete} title="Delete pursuit" aria-label="Delete pursuit">
            <Trash2 size={13} />
          </button>
          {pursuit.notionUrl && (
            <a
              className="pw-icon-btn group"
              href={pursuit.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open deep-dive note in Notion"
              aria-label="Open deep-dive note in Notion"
            >
              <NotionIcon size={14} />
            </a>
          )}
        </div>
      </div>

      <h1 className="pw-title">{pursuit.title}</h1>
      {pursuit.goal ? (
        <p className="pw-goal">{pursuit.goal}</p>
      ) : (
        <button type="button" className="pw-goal-add" onClick={() => setDraft(draftFrom(pursuit))}>
          <Plus size={11} />
          Add a goal
        </button>
      )}

      <dl className="pw-stats">
        <div className="pw-stat">
          <dt>complete</dt>
          <dd>{percentage}%</dd>
        </div>
        <div className="pw-stat">
          <dt>steps done</dt>
          <dd>{done}/{total}</dd>
        </div>
        {grouped && (
          <div className="pw-stat">
            <dt>milestones</dt>
            <dd>{milestonesDone}/{steps.length}</dd>
          </div>
        )}
        {remaining.minutes > 0 && (
          <div className="pw-stat">
            <dt>left</dt>
            <dd>≈{formatMinutes(remaining.minutes)}</dd>
          </div>
        )}
        {logged > 0 && (
          <div className="pw-stat">
            <dt>logged</dt>
            <dd>{formatMinutes(logged)}</dd>
          </div>
        )}
      </dl>

      {steps.length > 0 && <PursuitMilestoneBar steps={steps} currentStepId={currentStepId} large />}
    </header>
  )
}
