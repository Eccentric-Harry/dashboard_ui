import { useState } from 'react'
import { Lock, MailOpen, X } from 'lucide-react'
import type { ProgramLetterKey } from '@/types/program'
import { cn } from '@/lib/utils'
import { CampSheet } from '../components/camp-sheet'
import { dayNumber, programLength, type ProgramCtx } from './program-engine'
import type { LighthouseApi } from './lighthouse-api'
import { Seg } from './lh-ui'
import { dayMonth } from './lh-utils'

type LettersSheetProps = {
  open: boolean
  origin: HTMLElement | null
  ctx: ProgramCtx | null
  api: LighthouseApi
  letter?: ProgramLetterKey
  onClose: () => void
}

const COPY: Record<ProgramLetterKey, { tab: string; title: string; prompt: string; placeholder: string; seal?: string }> = {
  to23: {
    tab: 'To 23',
    title: 'A letter to 23-year-old you',
    prompt:
      'It’s your 23rd birthday. Write to yourself as if these 90 days went as well as they realistically could: what did you do, what changed, what do you trust about yourself now? Be specific — the run, the meeting, the morning without the phone.',
    placeholder: 'Dear 23,',
    seal: 'Sealed until your birthday. Not even the app can show it before then.',
  },
  from23: {
    tab: 'From 23',
    title: 'A reply from 23',
    prompt:
      'Now answer as 23-year-old you, writing back to you today. What do they want you to know about the hard days in between? Writing back from the future is the part that makes the future feel real.',
    placeholder: 'Hey — it’s you, from your birthday.',
  },
  to24: {
    tab: 'To 24',
    title: 'A letter to 24',
    prompt: 'Day 90. You’ve read the letter to 23. Now write the next one — sealed for a year.',
    placeholder: 'Dear 24,',
    seal: 'Sealed for a year.',
  },
}

/**
 * Letters across time (Chishima & Wilson: writing a letter *from* your future self, not only
 * to it, strengthens the link to that self). To 23 is a best-possible-self letter the server
 * keeps sealed until the birthday; From 23 is always readable, for the hard days; To 24
 * opens near the end.
 */
function LettersSheet({ open, origin, ctx, api, letter, onClose }: LettersSheetProps) {
  const [tab, setTab] = useState<ProgramLetterKey>(letter ?? 'to23')
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setTab(letter ?? (ctx?.program.letters.to23 ? 'from23' : 'to23'))
  }
  if (!ctx) return null
  const day = dayNumber(ctx.program, ctx.today)
  const nearEnd = day >= programLength(ctx.program) - 5
  const tabs = (['to23', 'from23', 'to24'] as const).filter((k) => k !== 'to24' || nearEnd || ctx.program.letters.to24)

  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="lh-letter-title" width={640} tone="letter" color="berry">
      <div className="lh-sheet lh-letters" data-color="berry">
        <header className="lh-sheet-head">
          <div className="lh-sheet-title">
            <h2 id="lh-letter-title">{COPY[tab].title}</h2>
            <p>Letters in a bottle</p>
          </div>
          <Seg label="Which letter" value={tab} onChange={setTab} options={tabs.map((k) => ({ value: k, label: COPY[k].tab }))} />
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
            <X size={18} strokeWidth={2.6} />
          </button>
        </header>
        <LetterPane key={tab} which={tab} ctx={ctx} api={api} />
      </div>
    </CampSheet>
  )
}

function LetterPane({ which, ctx, api }: { which: ProgramLetterKey; ctx: ProgramCtx; api: LighthouseApi }) {
  const letter = ctx.program.letters[which]
  const copy = COPY[which]
  const [editing, setEditing] = useState(!letter)
  const [text, setText] = useState(letter && !letter.sealed ? letter.text ?? '' : '')
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const ok = await api.writeLetter(which, text)
    setSaving(false)
    if (ok) {
      setEditing(false)
      setConfirm(false)
    }
  }

  if (letter && !editing) {
    if (letter.sealed) {
      return (
        <div className="lh-sheet-body lh-envelope-wrap">
          <div className="lh-envelope" aria-label={`Sealed letter, opens ${letter.opensOn ? dayMonth(letter.opensOn) : ''}`}>
            <span className="lh-seal" aria-hidden="true">
              <Lock size={18} strokeWidth={2.6} />
            </span>
            <p className="lh-envelope-to">{which === 'to23' ? 'To 23' : 'To 24'}</p>
            <p className="lh-small">
              {letter.length.toLocaleString()} characters · written {letter.writtenAt ? dayMonth(letter.writtenAt.slice(0, 10)) : ''} · opens{' '}
              <b>{letter.opensOn ? dayMonth(letter.opensOn) : 'later'}</b>
            </p>
          </div>
          <button type="button" className="lh-link" onClick={() => setEditing(true)}>
            Rewrite it, without reading the old one
          </button>
        </div>
      )
    }
    return (
      <div className="lh-sheet-body">
        <div className={cn('lh-letter-paper', which === 'to23' && 'is-opened')}>
          {which === 'to23' && (
            <p className="lh-kicker">
              <MailOpen size={14} strokeWidth={2.6} aria-hidden="true" /> Opened on your birthday
            </p>
          )}
          <p className="lh-letter-text">{letter.text}</p>
        </div>
        {which === 'from23' && (
          <button type="button" className="lh-link" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="lh-sheet-body">
      <p className="lh-small lh-letter-prompt">{copy.prompt}</p>
      <textarea className="lh-text lh-letter-input" rows={9} maxLength={6000} value={text} onChange={(e) => setText(e.target.value)} placeholder={copy.placeholder} aria-label={copy.title} />
      <div className="lh-row lh-row--between">
        <span className="lh-small">{copy.seal ?? 'Always readable — come back to it on the hard days.'}</span>
        {copy.seal && !confirm ? (
          <button type="button" className="lh-btn lh-btn--primary" disabled={text.trim().length < 20} onClick={() => setConfirm(true)}>
            Seal it
          </button>
        ) : (
          <button type="button" className="lh-btn lh-btn--primary" disabled={saving || text.trim().length < 5} onClick={() => void save()}>
            {copy.seal ? 'Yes — seal it' : 'Keep it'}
          </button>
        )}
      </div>
      {confirm && <p className="lh-note-line">Once sealed, you won’t be able to read it until it opens. Sure?</p>}
    </div>
  )
}

export { LettersSheet }
