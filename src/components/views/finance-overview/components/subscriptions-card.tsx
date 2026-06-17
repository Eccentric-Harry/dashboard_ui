import { useState, useMemo } from 'react'
import { Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { subscriptions, subscriptionSummary } from '../data'
import { addTransaction } from '../../../../lib/api'

interface SubscriptionsCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    if (s.includes('amazon')) {
      return {
        background: '#fff8e7',
        color: '#ff9900',
        border: 'none',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
      }
    }
    if (s.includes('disney') || s.includes('hotstar')) {
      return {
        background: '#e6f7ff',
        color: '#0747a6',
        border: 'none',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
      }
    }
    if (s.includes('apple') || s.includes('icloud')) {
      return {
        background: '#f0f0f5',
        color: '#555555',
        border: 'none',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
      }
    }
    if (s.includes('notion')) {
      return {
        background: '#f0f0f0',
        color: '#111111',
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
    if (s.includes('spotify')) {
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" style={{ display: 'block' }}>
          <circle cx="12" cy="12" r="12" fill="#1db954" />
          <path d="M17.9 10.9C14.7 9.3 9.3 9 6.1 10.3c-.6.2-1.2-.1-1.4-.7-.2-.6.1-1.2.7-1.4 3.8-1.5 9.9-1.2 13.6.7.5.3.7 1 .4 1.5-.3.5-1 .7-1.5.4v.1zm.2 2.7c-.3.5-.9.7-1.4.4-2.7-1.6-6.8-2.1-10-1.2-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 3.7-1.1 8.5-.5 11.6 1.4.5.3.6.9.3 1.4l.2-.1zm-1.5 2.8c-.2.4-.7.6-1.1.4-2.3-1.4-5.2-1.7-8.6-1-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.7-.8 7-.4 9.6 1.1.4.2.6.7.4 1.1l.2-.1z" fill="#fff" />
        </svg>
      )
    }
    if (s.includes('amazon')) {
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" style={{ display: 'block' }}>
          <path d="M13.4 4.2c-1.3-.2-2.8-.3-4.1-.1-2 .4-3.5 1.6-4.1 3.5-.2.6-.1 1.2.3 1.6.4.4 1 .5 1.6.3.9-.3 1.5-1 1.9-1.8.5-1.2 1.5-1.9 2.8-2.1 1-.2 2.1-.1 3.1.2 1.6.5 2.5 1.7 2.5 3.4v.6c-1 .3-2.1.5-3.2.7-1.8.3-3.4.8-4.6 2.1-1.2 1.3-1.7 3-1.3 4.8.3 1.4 1.3 2.5 2.7 3 .8.3 1.7.3 2.6.2 1-.1 1.9-.5 2.7-1.1.2-.2.5-.3.8-.2.2.1.4.3.5.5.2.4.1.9-.2 1.2-1.2 1.3-2.8 2.1-4.6 2.2-1.6.1-3.1-.3-4.4-1.3-1.5-1.2-2.4-2.9-2.5-4.9-.1-2.4.7-4.5 2.4-6.1 1.5-1.5 3.5-2.3 5.7-2.5 1.3-.1 2.6 0 3.9.3.8.2 1.5.4 2.2.7l.4.2c.2.1.4.2.5.4.1.1.1.3 0 .5-.1.1-.2.2-.3.2v.1c-1.1.7-2.2 1.4-3.2 2.2-.2.1-.4.2-.6 0-.3-.2-.5-.4-.8-.6-.7-.5-1.5-.8-2.4-.9z" fill="#ff9900" />
        </svg>
      )
    }
    if (s.includes('disney') || s.includes('hotstar')) {
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" style={{ display: 'block' }}>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-1-13h2v4h-2V7zm0 6h2v4h-2v-4z" fill="#0747a6" />
          <circle cx="12" cy="9" r="1.5" fill="#0747a6" />
          <circle cx="12" cy="15" r="1.5" fill="#0747a6" />
        </svg>
      )
    }
    if (s.includes('apple') || s.includes('icloud')) {
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" style={{ display: 'block' }}>
          <path d="M18.7 12.5c0 3.2 2.5 4.7 2.5 4.7s-.7 2.3-2.9 3.3c-1.5.7-3.1.8-4.3.8-1.2 0-3.1-.2-5.1-1.1C5.7 18.7 2 14.5 2 10.4c0-3.8 2.7-5.8 5.5-5.8 1.6 0 2.9.6 3.9 1.1.4.3.9.3 1.3 0 1-.6 2.3-1.1 3.9-1.1 2.8 0 5.5 2 5.5 5.8 0 1.5-.5 3.1-1.4 4.3-.2.3-.3.6-.2.9.1.3.2.6.4.8.5.5 1.6 1.4 1.6 1.4s-2.1 1.7-3.6 1.7c-.9 0-1.7-.3-2.3-.8-.6-.5-1.1-1.1-1.6-1.7-.3-.4-.8-.6-1.3-.6h-.2c-.5 0-1 .2-1.3.6-.5.7-1 1.3-1.6 1.7-.6.5-1.4.8-2.3.8-1.5 0-3.6-1.7-3.6-1.7s1.1-.9 1.6-1.4c.2-.2.3-.5.4-.8.1-.3 0-.6-.2-.9-.9-1.2-1.4-2.8-1.4-4.3C6.5 6.6 9.2 4.6 12 4.6s5.5 2 5.5 5.8" fill="#555555" />
        </svg>
      )
    }
    if (s.includes('notion')) {
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" style={{ display: 'block' }}>
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#111111" />
          <path d="M8 7v10M8 7l4 5.5L16 7v10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              <strong className="subscription-price">{subscription.amount}</strong>
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
          )
        })}
      </div>
    </section>
  )
}

export { SubscriptionsCard }
