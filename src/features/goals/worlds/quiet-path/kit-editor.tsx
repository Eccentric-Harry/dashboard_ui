import { Check, Phone } from 'lucide-react'
import type { GoalKitPage } from '@/types/goals'
import { HELPLINES } from '@/lib/helplines'
import { cn } from '@/lib/utils'
import { campSound } from '../../camp-sound'
import { picksIn, type KitPageDef } from './kit'

type KitEditorProps = {
  page: KitPageDef
  value: GoalKitPage
  onChange: (next: GoalKitPage) => void
  /** Inside the session player (light on dark) or on paper (the notebook). */
  tone?: 'player' | 'paper'
}

/**
 * One page of the trail kit: chips to pick from (a group with `max: 1` is a single
 * choice; others stop at their max) and a few lines in the user's own words. Nothing is
 * required — an empty page is a fine page. The heavy-day page shows the helplines too.
 */
function KitEditor({ page, value, onChange, tone = 'paper' }: KitEditorProps) {
  const toggle = (group: KitPageDef['groups'][number], chip: string) => {
    const on = value.picks.includes(chip)
    let picks = value.picks
    if (on) picks = picks.filter((p) => p !== chip)
    else {
      const inGroup = picksIn(value, group)
      if (group.max === 1) picks = [...picks.filter((p) => !group.chips.includes(p)), chip]
      else if (group.max && inGroup.length >= group.max) picks = [...picks.filter((p) => p !== inGroup[0]), chip]
      else picks = [...picks, chip]
    }
    campSound.play(on ? 'step-down' : 'pop', { step: picks.length })
    onChange({ ...value, picks })
  }

  return (
    <div className={cn('kit-ed', `kit-ed--${tone}`)}>
      {page.groups.map((group) => (
        <fieldset key={group.label} className="kit-ed-group">
          <legend>
            {group.label}
            {group.max && group.max > 1 && <small> · up to {group.max}</small>}
          </legend>
          <div className="kit-ed-chips" role={group.max === 1 ? 'radiogroup' : 'group'} aria-label={group.label}>
            {group.chips.map((chip) => {
              const on = value.picks.includes(chip)
              return (
                <button
                  key={chip}
                  type="button"
                  className={cn('kit-chip', on && 'is-on')}
                  role={group.max === 1 ? 'radio' : undefined}
                  aria-checked={group.max === 1 ? on : undefined}
                  aria-pressed={group.max === 1 ? undefined : on}
                  onClick={() => toggle(group, chip)}
                >
                  {on && <Check size={13} strokeWidth={3.2} aria-hidden="true" />}
                  {chip}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      {page.fields.map((field) => {
        const v = value.fields[field.key] ?? ''
        const set = (text: string) => onChange({ ...value, fields: { ...value.fields, [field.key]: text } })
        return (
          <label key={field.key} className="kit-ed-field">
            <span>{field.label}</span>
            {field.multiline ? (
              <textarea value={v} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} rows={2} maxLength={field.maxLength ?? 300} />
            ) : (
              <input value={v} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} maxLength={field.maxLength ?? 300} />
            )}
          </label>
        )
      })}

      {page.helplines && (
        <div className="kit-ed-help">
          <p>Real people, any hour — free and confidential:</p>
          <ul>
            {HELPLINES.map((h) => (
              <li key={h.tel}>
                <a href={h.tel}>
                  <Phone size={13} strokeWidth={2.6} aria-hidden="true" />
                  <strong>{h.display}</strong> {h.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export { KitEditor }
