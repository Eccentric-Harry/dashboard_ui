import { useState } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'
import type { CampQuest, CampQuestClaimResult } from '@/types/goals'
import { cn } from '@/lib/utils'
import { campSound } from '../camp-sound'
import { letterGreeting, questProgress, questTitle } from '../camp-quests'
import { flySparks } from '../spark-fly'
import { CampSheet } from './camp-sheet'
import { Wren } from './camp-characters'

type QuestLetterProps = {
  open: boolean
  origin: HTMLElement | null
  today: string
  quests: CampQuest[]
  leftovers: CampQuest[]
  onClaim: (questId: string) => Promise<CampQuestClaimResult | null>
  onSettled: (result: CampQuestClaimResult) => void
  onClose: () => void
}

const dayStamp = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()
}

/**
 * Wren's letter — the day's three small quests. A done quest is claimed with a tap and its
 * sparks fly up to the counter; an unfinished one just says how far along it is, and at
 * the end of the day it quietly fades (yesterday's done-but-unclaimed ones stay claimable
 * one more day). There is no "failed" anywhere on this paper.
 */
function QuestLetter({ open, origin, today, quests, leftovers, onClaim, onSettled, onClose }: QuestLetterProps) {
  const [claiming, setClaiming] = useState<string | null>(null)
  const [justClaimed, setJustClaimed] = useState<string | null>(null)

  const claim = async (q: CampQuest, button: HTMLElement) => {
    if (claiming) return
    setClaiming(q.id)
    const res = await onClaim(q.id)
    if (!res) {
      setClaiming(null)
      campSound.play('soft-no')
      return
    }
    campSound.play('chime')
    setJustClaimed(q.id)
    await flySparks(button, res.reward)
    onSettled(res)
    setClaiming(null)
  }

  const row = (q: CampQuest) => {
    const pct = q.target > 0 ? Math.min(100, Math.round((q.progress / q.target) * 100)) : 0
    return (
      <li key={q.id} className={cn('ql-quest', q.done && 'is-done', q.claimed && 'is-claimed', justClaimed === q.id && 'just-claimed')}>
        <span className="ql-seal" aria-hidden="true">
          {(q.done || q.claimed) && <Check size={15} strokeWidth={3.4} />}
        </span>
        <span className="ql-text">
          <strong>{questTitle(q)}</strong>
          <small>{questProgress(q)}</small>
          {!q.done && q.target > 1 && (
            <span className="ql-bar" aria-hidden="true">
              <i style={{ width: `${pct}%` }} />
            </span>
          )}
        </span>
        {q.claimed ? (
          <span className="ql-reward is-claimed">+{q.reward} ✦</span>
        ) : q.done ? (
          <button
            type="button"
            className="ql-claim"
            onClick={(e) => void claim(q, e.currentTarget)}
            disabled={claiming != null}
            aria-label={`Claim ${q.reward} sparks for ${questTitle(q)}`}
          >
            {claiming === q.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={2.6} />}+{q.reward}
          </button>
        ) : (
          <span className="ql-reward">+{q.reward} ✦</span>
        )}
      </li>
    )
  }

  return (
    <CampSheet
      open={open}
      onRequestClose={onClose}
      origin={origin}
      labelledBy="ql-title"
      hero={<Wren className="ql-wren" talking={open} />}
      tone="letter"
      width={440}
    >
      <div className="ql">
        <header className="ql-head">
          <div>
            <p className="ql-kicker">Camp post · from Wren</p>
            <h2 id="ql-title">Today’s letter</h2>
          </div>
          <span className="ql-postmark" aria-hidden="true">
            <b>{dayStamp(today)}</b>
            <small>CAMP POST</small>
          </span>
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close the letter" data-autofocus>
            <X size={16} strokeWidth={2.6} />
          </button>
        </header>

        <p className="ql-greeting">{quests.length ? letterGreeting(today) : 'No post today — hang a lantern and I’ll bring you quests tomorrow.'}</p>

        {quests.length > 0 && <ul className="ql-list">{quests.map(row)}</ul>}

        {leftovers.length > 0 && (
          <div className="ql-leftovers">
            <p className="ql-kicker">Still in yesterday’s post</p>
            <ul className="ql-list">{leftovers.map(row)}</ul>
          </div>
        )}

        <footer className="ql-foot">
          <p>New letter every morning. Anything left undone just fades — no harm done.</p>
          <span className="ql-sign">— Wren</span>
        </footer>
      </div>
    </CampSheet>
  )
}

export { QuestLetter }
