import { useState } from 'react'
import { X } from 'lucide-react'
import type { LiftPlace, Program } from '@/types/program'
import { CampSheet } from '../components/camp-sheet'
import { Seg } from './lh-ui'

type SettingsSheetProps = {
  open: boolean
  origin: HTMLElement | null
  program: Program | null
  onSave: (patch: { title?: string; startDate?: string; birthday?: string; weightKg?: number; liftPlace?: LiftPlace; answers?: Record<string, string> }) => Promise<boolean>
  onDelete: () => Promise<boolean>
  onClose: () => void
}

/** Everything about the program except its targets (those live in the weekly review). */
function SettingsSheet({ open, origin, program, onSave, onDelete, onClose }: SettingsSheetProps) {
  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="lh-settings-title" width={560}>
      {program && <SettingsBody key={program.updatedAt ?? program.id} program={program} onSave={onSave} onDelete={onDelete} onClose={onClose} />}
    </CampSheet>
  )
}

function SettingsBody({ program, onSave, onDelete, onClose }: { program: Program } & Pick<SettingsSheetProps, 'onSave' | 'onDelete' | 'onClose'>) {
  const [title, setTitle] = useState(program.title)
  const [start, setStart] = useState(program.startDate)
  const [birthday, setBirthday] = useState(program.birthday ?? program.endDate)
  const [weight, setWeight] = useState(program.weightKg ? String(program.weightKg) : '')
  const [place, setPlace] = useState<LiftPlace>(program.liftPlace ?? 'gym')
  const [dopamine, setDopamine] = useState(program.answers.dopamine ?? '')
  const [english, setEnglish] = useState(program.answers.english ?? '')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const ok = await onSave({
      title: title.trim() || undefined,
      startDate: start !== program.startDate ? start : undefined,
      birthday: birthday !== (program.birthday ?? program.endDate) ? birthday : undefined,
      weightKg: Number(weight) > 0 ? Number(weight) : undefined,
      liftPlace: place,
      answers: { dopamine, english },
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="lh-sheet">
      <header className="lh-sheet-head">
        <div className="lh-sheet-title">
          <h2 id="lh-settings-title">The program</h2>
          <p>Targets aren’t here on purpose — they change only in the weekly review.</p>
        </div>
        <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
          <X size={18} strokeWidth={2.6} />
        </button>
      </header>
      <div className="lh-sheet-body lh-form">
        <label className="lh-field">
          <span>Name</span>
          <input className="lh-input" maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="lh-row">
          <label className="lh-field">
            <span>Day 1</span>
            <input className="lh-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="lh-field">
            <span>Birthday (letters open)</span>
            <input className="lh-input" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </label>
        </div>
        <div className="lh-row">
          <label className="lh-field">
            <span>Body weight (kg)</span>
            <input className="lh-input" type="number" inputMode="decimal" min={30} max={250} value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <div className="lh-field">
            <span>Lifting at</span>
            <Seg label="Lifting at" value={place} onChange={setPlace} options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
          </div>
        </div>
        <label className="lh-field">
          <span>What counts as cheap dopamine for you (private)</span>
          <input className="lh-input" maxLength={200} value={dopamine} onChange={(e) => setDopamine(e.target.value)} placeholder="Only you see this" />
        </label>
        <label className="lh-field">
          <span>Where English lets you down most</span>
          <input className="lh-input" maxLength={200} value={english} onChange={(e) => setEnglish(e.target.value)} placeholder="Team meetings" />
        </label>
        <button type="button" className="lh-btn lh-btn--primary lh-btn--wide" disabled={saving} onClick={() => void save()}>
          Save
        </button>
        <details className="lh-how">
          <summary>Start over</summary>
          <p className="lh-small">Deletes this program and everything logged on it — photos and recordings too. Type “start over” to confirm.</p>
          <div className="lh-row">
            <input className="lh-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type start over to confirm" />
            <button
              type="button"
              className="lh-btn lh-btn--soft"
              disabled={confirm.trim().toLowerCase() !== 'start over'}
              onClick={async () => {
                if (await onDelete()) onClose()
              }}
            >
              Delete the program
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}

export { SettingsSheet }
