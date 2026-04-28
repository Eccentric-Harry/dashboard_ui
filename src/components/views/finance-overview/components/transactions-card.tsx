import { recentTransactions } from '../data'

function TransactionsCard() {
  return (
    <section className="finance-card finance-transactions-card">
      <div className="finance-section-head compact">
        <div>
          <h2>Recent Transactions</h2>
          <p>Latest account activity</p>
        </div>
        <button type="button">View All</button>
      </div>
      <div className="finance-transaction-list">
        {recentTransactions.map(({ merchant, detail, amount, tone, icon: Icon }) => (
          <div key={`${merchant}-${detail}`}>
            <span>
              <Icon size={16} />
            </span>
            <p>
              <b>{merchant}</b>
              <small>{detail}</small>
            </p>
            <strong className={tone}>{amount}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export { TransactionsCard }
