import { proteinSources } from '../data'

function ProteinCompletenessCard() {
  const completeTotal = proteinSources
    .filter((source) => source.type === 'Complete')
    .reduce((sum, source) => sum + source.percentage, 0)
  const incompleteTotal = 100 - completeTotal

  return (
    <section className="nutrition-card nutrition-completeness-card">
      <div className="nutrition-section-head">
        <div>
          <p>Protein Completeness Insight</p>
          <h2>Amino balance by source</h2>
        </div>
        <span>{completeTotal}% complete</span>
      </div>

      <div className="nutrition-complete-meter" aria-label={`${completeTotal}% complete protein`}>
        <span style={{ width: `${completeTotal}%` }} />
      </div>

      <div className="nutrition-complete-split">
        <div>
          <strong>{completeTotal}%</strong>
          <small>Complete protein</small>
        </div>
        <div>
          <strong>{incompleteTotal}%</strong>
          <small>Complement needed</small>
        </div>
      </div>

      <div className="nutrition-source-grid">
        {proteinSources.map(({ name, type, grams, percentage, icon: Icon, color }) => (
          <article key={name}>
            <span style={{ background: color }}>
              <Icon size={22} />
            </span>
            <div>
              <b>{name}</b>
              <small>{type}</small>
            </div>
            <em>{grams}g</em>
            <i>{percentage}%</i>
          </article>
        ))}
      </div>
    </section>
  )
}

export { ProteinCompletenessCard }
