import { Layers, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import './in-development-modal.css'

interface InDevelopmentModalProps {
  open: boolean
  onClose: () => void
}

export function InDevelopmentModal({ open, onClose }: InDevelopmentModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!isVisible && !open) return null

  return (
    <div className={`dev-modal-backdrop ${open ? 'fade-in' : 'fade-out'}`} onClick={onClose}>
      <div className={`dev-modal-popover ${open ? 'slide-up' : 'slide-down'}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dev-modal-close" onClick={onClose}>
          <X size={16} />
        </button>

        <div className="dev-modal-icon-container">
          <Layers className="dev-modal-icon" size={28} strokeWidth={1.5} />
        </div>

        <h2 className="dev-modal-title">Home Dashboard in Development</h2>
        
        <p className="dev-modal-description">
          The central hub for your quantified self is currently being engineered. We are building a deeply personalized environment for cross-module analytics.
        </p>

        <div className="dev-modal-features">
          <div className="dev-feature-item">
            <span className="dev-feature-line" />
            <span>AI-Driven Insights</span>
          </div>
          <div className="dev-feature-item">
            <span className="dev-feature-line" />
            <span>Cross-Module Analytics</span>
          </div>
          <div className="dev-feature-item">
            <span className="dev-feature-line" />
            <span>Predictive Modeling</span>
          </div>
        </div>

        <button type="button" className="dev-modal-action-btn" onClick={onClose}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
