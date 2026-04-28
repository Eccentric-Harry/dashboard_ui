import { ChevronsUpDown } from 'lucide-react'
import { savingsMonths } from '../data'

function SavingsCard() {
  return (
    <section className="savings-panel">
      <div className="saving-head">
        <div>
          <h2>Wow, Great!</h2>
          <p>Saved $990</p>
        </div>
        <button type="button">
          Saving
          <ChevronsUpDown size={12} />
        </button>
      </div>
      <div className="saving-chart" aria-hidden="true">
        <div className="soft-bars">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <svg viewBox="0 0 255 120" preserveAspectRatio="none">
          <path d="M7 79 C31 73 33 42 59 36 C86 29 99 50 113 72 C126 92 142 98 158 82 C176 61 189 47 214 57 C228 63 238 66 249 66" />
        </svg>
        <b>$990</b>
        <div className="chart-months">
          {savingsMonths.map((month) => (
            <small key={month}>{month}</small>
          ))}
        </div>
      </div>
    </section>
  )
}

export { SavingsCard }
