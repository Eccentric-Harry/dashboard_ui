import { useState, useMemo } from 'react'
import { Video, Tv, Wifi, Check, Loader2 } from 'lucide-react'
import { subscriptions, subscriptionSummary } from '../data'
import { addTransaction } from '../../../../lib/api'

interface SubscriptionsCardProps {
  transactions: any[]
  onRefresh?: () => void
}

function SubscriptionsCard({ transactions, onRefresh }: SubscriptionsCardProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [optimisticPaidIds, setOptimisticPaidIds] = useState<Set<string>>(new Set())

  const paidIds = useMemo(() => {
    const ids = new Set<string>()
    
    // Check transactions for subscription payments
    transactions.forEach(tx => {
      subscriptions.forEach(sub => {
        // Match by description containing service name
        if (tx.merchant.toLowerCase().includes(sub.service.toLowerCase())) {
          ids.add(sub.service)
        }
      })
    })
    
    // Add optimistic updates
    optimisticPaidIds.forEach(id => ids.add(id))
    
    return ids
  }, [transactions, optimisticPaidIds])

  const getIcon = (service: string) => {
    const s = service.toLowerCase()
    if (s.includes('youtube')) return <Video size={16} />
    if (s.includes('netflix')) return <Tv size={16} />
    if (s.includes('jio')) return <Wifi size={16} />
    return <span>{service.slice(0, 1)}</span>
  }

  const handlePay = async (subscription: typeof subscriptions[0]) => {
    const id = subscription.service
    setProcessingId(id)
    
    try {
      // Parse amount string like "₹89" to number 89
      const numericAmount = parseInt(subscription.amount.replace(/[^0-9]/g, ''), 10)
      
      const today = new Date().toISOString().split('T')[0]
      
      await addTransaction({
        description: `${subscription.service} Subscription`,
        amount: numericAmount,
        category: subscription.service.toLowerCase().includes('jio') ? 'Bills & Utilities' : 'Entertainment',
        type: 'Expense',
        date: today
      })
      
      setOptimisticPaidIds(prev => new Set(prev).add(id))
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Failed to record subscription payment:', error)
    } finally {
      setProcessingId(null)
    }
  }

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
        {subscriptions.map((subscription) => {
          const isProcessing = processingId === subscription.service
          const isPaid = paidIds.has(subscription.service)
          
          return (
            <div key={subscription.service} className={isPaid ? 'paid' : ''}>
              <span className="service-icon">{getIcon(subscription.service)}</span>
              <p>
                <b>{subscription.service}</b>
                <small>{subscription.detail}</small>
              </p>
              <div className="subscription-actions">
                <strong>{subscription.amount}</strong>
                <button 
                  className={`pay-button ${isPaid ? 'success' : ''}`}
                  onClick={() => !isPaid && !isProcessing && handlePay(subscription)}
                  disabled={isProcessing || isPaid}
                >
                  {isProcessing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isPaid ? (
                    <Check size={12} />
                  ) : (
                    'Pay'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export { SubscriptionsCard }
