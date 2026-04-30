import { recentTransactions } from '../data'

function TransactionsCard() {
  return (
    <section className="finance-card finance-transactions-card">
      <div className="finance-section-head compact">
        <div>
          <h2>Recent Transactions</h2>
          <p>Latest spending and income activity</p>
        </div>
        <button type="button">View All</button>
      </div>
      <div className="finance-transaction-table" role="table" aria-label="Recent transactions">
        <div className="finance-transaction-row header" role="row">
          <span role="columnheader">Merchant</span>
          <span role="columnheader">Category</span>
          <span role="columnheader">Amount (INR)</span>
        </div>
        <div className="finance-transaction-list" role="rowgroup">
          {recentTransactions.map(({ merchant, detail, category, amount, tone, icon: Icon }) => (
            <div className="finance-transaction-row" key={`${merchant}-${detail}`} role="row">
              <div className="finance-transaction-merchant" role="cell">
                <span>
                  <Icon size={16} />
                </span>
                <p>
                  <b>{merchant}</b>
                  <small>{detail}</small>
                </p>
              </div>
              <em role="cell">{category}</em>
              <strong className={tone} role="cell">
                {amount}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { TransactionsCard }
