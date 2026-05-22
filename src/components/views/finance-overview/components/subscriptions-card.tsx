import { useState, useMemo } from 'react'
import { Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
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

  const getSubColorStyles = (service: string) => {
    const s = service.toLowerCase()
    if (s.includes('youtube')) {
      return {
        background: '#ffebee',
        color: '#ef4444',
        border: 'none',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
      }
    }
    if (s.includes('netflix')) {
      return {
        background: '#040303ff',
        color: '#ac0810ff',
        border: 'none',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
      }
    }
    if (s.includes('jio')) {
      return {
        background: '#e6eeff',
        color: '#0f3cc9',
        border: 'none',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
      }
    }
    if (s.includes('spotify')) {
      return {
        background: '#eafaf1',
        color: '#1db954',
        border: 'none',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
      }
    }
    return {
      background: '#f5f2ff',
      color: '#8b5cf6',
      border: 'none',
      borderRadius: '10px',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
    }
  }

  const getIcon = (service: string) => {
    const s = service.toLowerCase()
    if (s.includes('youtube')) {
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" style={{ display: 'block' }}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#ef4444" />
          <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#ffffff" />
        </svg>
      )
    }
    if (s.includes('netflix')) {
      return (
        <svg viewBox="0 0 24 24" width="16" height="18" style={{ display: 'block' }}>
          <path d="M5 1h4v22q-2 -1.5 -4 0z" fill="#b9090b" />
          <path d="M5 1h4l10 22h-4z" fill="#e50914" />
          <path d="M15 1h4v22q-2 -1.5 -4 0z" fill="#b9090b" />
        </svg>
      )
    }
    if (s.includes('jio')) {
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" style={{ display: 'block' }}>
          <circle cx="12" cy="12" r="12" fill="#0f3cc9" />
          <path d="M17.587 14.559c-.883 0-1.49-.648-1.49-1.574 0-.912.62-1.56 1.49-1.56s1.491.648 1.491 1.573c0 .897-.634 1.56-1.49 1.56zm.03-5.152c-2.265 0-3.772 1.437-3.772 3.576 0 2.195 1.451 3.604 3.729 3.604 2.264 0 3.755-1.409 3.755-3.59 0-2.153-1.475-3.59-3.713-3.59zM11.78 6.272c-.856 0-1.395.483-1.395 1.243 0 .774.552 1.257 1.435 1.257.857 0 1.395-.483 1.395-1.257 0-.773-.552-1.243-1.435-1.243zm.152 3.204h-.277c-.675 0-1.187.317-1.187 1.285v4.42c0 .98.496 1.284 1.216 1.284h.275c.677 0 1.16-.33 1.16-1.285v-4.419c0-.995-.47-1.285-1.187-1.285zM8.316 7.392h-.4c-.76 0-1.174.43-1.174 1.285v4.13c0 1.063-.36 1.436-1.2 1.436-.662 0-1.201-.29-1.63-.816C3.87 13.373 3 13.786 3 14.81c0 1.104 1.035 1.781 2.955 1.781 2.334 0 3.563-1.173 3.563-3.742V8.675c0-.856-.413-1.283-1.202-1.283z" fill="#fff" />
        </svg>
      )
    }
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
      toast.success(`Paid ${subscription.service} subscription`)
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast.error(error.message || `Failed to record payment for ${subscription.service}`)
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
              <span className="service-icon" style={getSubColorStyles(subscription.service)}>{getIcon(subscription.service)}</span>
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
