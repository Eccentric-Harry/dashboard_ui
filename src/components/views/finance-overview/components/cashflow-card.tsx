import { cashflowBars, savingsGoal } from '../data'

function CashflowCard() {
  return (
    <section className="finance-card finance-cashflow-card">
      <div className="finance-section-head compact">
        <div>
          <h2>Cashflow</h2>
          <p>Income and expense pulse</p>
        </div>
        <strong>+12.4%</strong>
      </div>
      <div className="finance-cashflow-bars" aria-hidden="true">
        {cashflowBars.map((height, index) => (
          <span key={index} style={{ height }} className={index % 3 === 0 ? 'dark' : undefined} />
        ))}
      </div>
      <div className="finance-goal">
        <div>
          <b>{savingsGoal.label}</b>
          <small>
            {savingsGoal.value} of {savingsGoal.target}
          </small>
        </div>
        <em>{savingsGoal.progress}%</em>
      </div>
      <div className="finance-goal-track">
        <span style={{ width: `${savingsGoal.progress}%` }} />
      </div>
    </section>
  )
}

export { CashflowCard }
