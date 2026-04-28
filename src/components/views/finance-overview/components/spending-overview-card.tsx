import { spendingCategories, spendingOverview } from '../data'

function SpendingOverviewCard() {
  return (
    <section className="finance-card finance-spending-card">
      <div className="finance-section-head">
        <div>
          <h2>Spending Overview</h2>
          <p>Total spent</p>
          <strong>
            {spendingOverview.total}
            <small>{spendingOverview.cents}</small>
          </strong>
        </div>
        <button type="button">This Week</button>
      </div>

      <div className="finance-spending-body">
        <div className="finance-donut" aria-label={`Top category ${spendingOverview.topCategory}`}>
          <div>
            <span>Top Category</span>
            <b>{spendingOverview.topCategory}</b>
          </div>
        </div>

        <div className="finance-category-list">
          {spendingCategories.map(({ label, value, share, tone, icon: Icon }) => (
            <div key={label}>
              <span style={{ background: tone }}>
                <Icon size={12} />
              </span>
              <p>{label}</p>
              <b>{value}</b>
              <small>{share}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { SpendingOverviewCard }
