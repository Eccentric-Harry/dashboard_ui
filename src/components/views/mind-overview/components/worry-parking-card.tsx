import { useState } from 'react'
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Cloud,
  History,
  Inbox,
  Scale,
  Wind,
} from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { MindEntry, MindWorryLedger, MindWorryOutcome, MindWorrySeverity } from '../mind-types'
import { mindFormatDay, mindFormatTimestamp } from '../mind-types'

/**
 * The worry ledger: what the gut predicted, against what actually happened.
 *
 * The band at the top is the point of the whole card. Being told that catastrophic
 * predictions rarely land does nothing; watching your own numbers say it, in rows you
 * wrote yourself, is a different kind of argument. So the copy states the figures and
 * stops — no congratulation, no green badges, nothing that would make this read as a
 * score rather than a record.
 */

const OUTCOME_OPTIONS: { value: MindWorryOutcome; label: string }[] = [
  { value: 'NOT_HAPPENED', label: 'No' },
  { value: 'PARTLY', label: 'Sort of' },
  { value: 'HAPPENED', label: 'Yes' },
]

const SEVERITY_OPTIONS: { value: MindWorrySeverity; label: string }[] = [
  { value: 'BETTER', label: 'Better than I feared' },
  { value: 'AS_FEARED', label: 'About as I feared' },
  { value: 'WORSE', label: 'Worse' },
]

function LedgerBand({ ledger }: { ledger: MindWorryLedger | null }) {
  if (!ledger || ledger.totalPredicted === 0) {
    return (
      <p className="mind-ledger-empty">
        Nothing logged yet. Park a worry with a prediction and this fills itself in.
      </p>
    )
  }

  if (ledger.totalResolved === 0) {
    return (
      <p className="mind-ledger-empty">
        {ledger.totalPredicted} {ledger.totalPredicted === 1 ? 'prediction' : 'predictions'} on record, none
        answered yet. The numbers arrive when the first review date does.
      </p>
    )
  }

  const gut = ledger.meanPredictedProbability
  const real = ledger.actualOccurrenceRate
  const didHappen = ledger.happened + ledger.partly
  const copedBetter = ledger.copedBetter

  return (
    <div className="mind-ledger">
      <p className="mind-ledger-line">
        You've logged <strong>{ledger.totalPredicted}</strong>{' '}
        {ledger.totalPredicted === 1 ? 'worry' : 'worries'}.{' '}
        <strong>{ledger.notHappened}</strong> never happened.
      </p>
      {gut != null && real != null && (
        <div className="mind-ledger-calibration">
          <span className="mind-ledger-stat">
            <em>Your gut said</em>
            <strong>{Math.round(gut)}%</strong>
          </span>
          <span className="mind-ledger-arrow" aria-hidden="true">
            →
          </span>
          <span className="mind-ledger-stat">
            <em>Reality said</em>
            <strong>{Math.round(real)}%</strong>
          </span>
        </div>
      )}
      {didHappen > 0 && copedBetter > 0 && (
        <p className="mind-ledger-cope">
          Of the {didHappen} that did happen, {copedBetter} turned out less bad than you expected.
        </p>
      )}
    </div>
  )
}

type VerdictFormProps = {
  entry: MindEntry
  onVerdict: (id: string, outcome: MindWorryOutcome, severity: MindWorrySeverity | null) => void
}

function VerdictForm({ entry, onVerdict }: VerdictFormProps) {
  const [outcome, setOutcome] = useState<MindWorryOutcome | null>(null)

  const feared = entry.prediction?.fearedOutcome
  const predicted = entry.prediction?.predictedProbability

  return (
    <div className="mind-verdict">
      {feared && (
        <p className="mind-verdict-feared">
          You feared: “{feared}”
          {predicted != null && <span className="mind-verdict-pred"> — felt {predicted}% likely</span>}
        </p>
      )}

      <p className="mind-verdict-question">Did it happen?</p>
      <div className="mind-verdict-options">
        {OUTCOME_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={cn('mind-tag', outcome === o.value && 'is-active')}
            onClick={() => {
              // "No" needs no follow-up — asking how bad a thing that never happened was
              // would be a small absurdity, and a prompt to imagine it anyway.
              if (o.value === 'NOT_HAPPENED') onVerdict(entry.id, o.value, null)
              else setOutcome(o.value)
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {outcome && (
        <>
          <p className="mind-verdict-question">Was it as bad as you feared?</p>
          <div className="mind-verdict-options">
            {SEVERITY_OPTIONS.map((sv) => (
              <button
                key={sv.value}
                type="button"
                className="mind-tag"
                onClick={() => onVerdict(entry.id, outcome, sv.value)}
              >
                {sv.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

type WorryParkingCardProps = {
  parked: MindEntry[]
  awaitingVerdict: MindEntry[]
  released: MindEntry[]
  ledger: MindWorryLedger | null
  onBringBack: (id: string) => void
  onRelease: (id: string) => void
  onVerdict: (id: string, outcome: MindWorryOutcome, severity: MindWorrySeverity | null) => void
}

function WorryParkingCard({
  parked,
  awaitingVerdict,
  released,
  ledger,
  onBringBack,
  onRelease,
  onVerdict,
}: WorryParkingCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const sortedReleased = [...released].sort((a, b) =>
    (b.resolvedAt ?? b.createdAt ?? '').localeCompare(a.resolvedAt ?? a.createdAt ?? ''),
  )

  return (
    <section className="mind-card mind-card--parking mind-tint-mist" aria-label="Worry ledger">
      <Cloud className="mind-card-watermark" size={104} strokeWidth={1.3} aria-hidden="true" />
      <div className="mind-card-head">
        <span className="mind-card-icon">
          <Scale size={16} />
        </span>
        <div>
          <h2 className="mind-card-title">Worry ledger</h2>
          <p className="mind-card-sub">What you predicted, and what actually happened</p>
        </div>
      </div>

      <LedgerBand ledger={ledger} />

      {awaitingVerdict.length > 0 && (
        <ul className="mind-parked-list">
          {awaitingVerdict.map((entry) => (
            <li key={entry.id} className="mind-parked-item is-verdict-due">
              <p className="mind-parked-text">“{entry.text}”</p>
              <span className="mind-parked-date">
                <CalendarClock size={11} />
                Parked {entry.reviewDate ? mindFormatDay(entry.reviewDate) : 'a while ago'} — time to check
              </span>
              <VerdictForm entry={entry} onVerdict={onVerdict} />
            </li>
          ))}
        </ul>
      )}

      {parked.length === 0 && awaitingVerdict.length === 0 ? (
        <div className="mind-empty">
          <Wind size={16} />
          <p>The lot is empty. Nothing waiting on you here.</p>
        </div>
      ) : (
        <ul className="mind-parked-list">
          {parked.map((entry) => (
            <li key={entry.id} className="mind-parked-item">
              <p className="mind-parked-text">“{entry.text}”</p>
              {entry.prediction?.fearedOutcome && (
                <p className="mind-parked-pred">
                  Feared: “{entry.prediction.fearedOutcome}”
                  {entry.prediction.predictedProbability != null && (
                    <span> · {entry.prediction.predictedProbability}%</span>
                  )}
                </p>
              )}
              <span className="mind-parked-date">
                <CalendarClock size={11} />
                Returns {entry.reviewDate ? mindFormatDay(entry.reviewDate) : 'someday'}
              </span>
              <div className="mind-parked-actions">
                <button type="button" className="mind-ghost-btn" onClick={() => onBringBack(entry.id)}>
                  <Inbox size={12} />
                  Bring back
                </button>
                <button type="button" className="mind-ghost-btn" onClick={() => onRelease(entry.id)}>
                  <Wind size={12} />
                  Release
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mind-parked-history">
        <button
          type="button"
          className="mind-parked-history-toggle"
          onClick={() => setShowHistory((s) => !s)}
          disabled={sortedReleased.length === 0}
        >
          <History size={12} />
          {sortedReleased.length === 0
            ? 'Nothing released yet — history is empty.'
            : `${sortedReleased.length} parked ${sortedReleased.length === 1 ? 'worry' : 'worries'} released without ever coming true.`}
          {sortedReleased.length > 0 && (showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </button>

        {showHistory && sortedReleased.length > 0 && (
          <ul className="mind-parked-history-list">
            {sortedReleased.map((entry) => (
              <li key={entry.id} className="mind-parked-history-item">
                <p className="mind-parked-history-text">“{entry.text}”</p>
                <span className="mind-parked-history-date">
                  Released {entry.resolvedAt ? mindFormatTimestamp(entry.resolvedAt) : 'earlier'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export { WorryParkingCard }
