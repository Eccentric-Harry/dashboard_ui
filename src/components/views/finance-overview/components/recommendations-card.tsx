import { recommendations } from '../data'

function RecommendationsCard() {
  return (
    <section className="finance-card finance-recommendations-card">
      <div className="finance-section-head compact">
        <div>
          <h2>AI Recommendations</h2>
          <p>Based on your spending rhythm</p>
        </div>
        <button type="button">View All</button>
      </div>
      <div className="finance-recommendation-list">
        {recommendations.map(({ title, detail, icon: Icon }) => (
          <article key={title}>
            <span>
              <Icon size={18} />
            </span>
            <b>{title}</b>
            <p>{detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export { RecommendationsCard }
