import type { CSSProperties } from 'react'

import { quickLogShortcuts } from '../data'

function QuickLogCard() {
  return (
    <section className="nutrition-card nutrition-quick-log-card">
      <div className="nutrition-section-head compact">
        <div>
          <p>Quick-Log Shortcuts</p>
          <h2>One tap nutrition entries</h2>
        </div>
        <button type="button">Edit</button>
      </div>

      <div className="nutrition-shortcut-grid">
        {quickLogShortcuts.map(({ label, amount, calories, icon: Icon, tone }) => (
          <button key={label} type="button">
            <span style={{ '--shortcut-tone': tone } as CSSProperties}>
              <Icon size={24} />
            </span>
            <b>{label}</b>
            <small>{amount}</small>
            <em>{calories}</em>
          </button>
        ))}
      </div>
    </section>
  )
}

export { QuickLogCard }
