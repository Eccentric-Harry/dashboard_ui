import { Lightbulb } from 'lucide-react'

import { insight } from '../data'

function SmartInsightCard() {
  return (
    <section className="finance-card finance-insight-card">
      <div>
        <p>
          <Lightbulb size={14} />
          {insight.title}
        </p>
        <h2>{insight.body}</h2>
        <button type="button">{insight.action}</button>
      </div>
      <span aria-hidden="true">
        <Lightbulb size={58} />
      </span>
    </section>
  )
}

export { SmartInsightCard }
