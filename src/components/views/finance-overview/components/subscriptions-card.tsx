import { subscriptions, subscriptionSummary } from '../data'

function SubscriptionsCard() {
  return (
    <section className="finance-card finance-subscription-card">
      <div className="finance-section-head compact">
        <div>
          <h2>Subscriptions</h2>
          <p>{subscriptionSummary.change}</p>
        </div>
        <strong>{subscriptionSummary.total}</strong>
      </div>
      <div className="finance-subscription-list">
        {subscriptions.map((subscription) => (
          <div key={subscription.service}>
            <span>{subscription.service.slice(0, 1)}</span>
            <p>
              <b>{subscription.service}</b>
              <small>{subscription.detail}</small>
            </p>
            <em>{subscription.status}</em>
            <strong>{subscription.amount}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export { SubscriptionsCard }
