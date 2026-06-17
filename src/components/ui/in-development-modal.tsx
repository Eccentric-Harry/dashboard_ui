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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <button type="button" className="dev-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={16} />
        </button>

        <div className="dev-modal-icon-container">
          <Layers className="dev-modal-icon" size={24} strokeWidth={2.2} />
        </div>

        <h2 className="dev-modal-title">Crafting Your Command Center</h2>
        
        <p className="dev-modal-description">
          The ultimate cockpit for your quantified self is currently under active engineering. We are shaping a deeply intelligent personal portal designed to seamlessly integrate and decode your lifestyle telemetry.
        </p>

        <div className="dev-modal-features">
          <div className="dev-feature-item">
            <span className="dev-feature-indicator" />
            <div className="dev-feature-info">
              <h4>Cross-Module Telemetry</h4>
              <p>Correlate nutrition habits, training loads, and financial trends under one unified command interface.</p>
            </div>
          </div>
          <div className="dev-feature-item">
            <span className="dev-feature-indicator" />
            <div className="dev-feature-info">
              <h4>AI Pattern Recognition</h4>
              <p>Reveal deep, hidden relationships between active recovery, athletic performance, and smart budgets.</p>
            </div>
          </div>
          <div className="dev-feature-item">
            <span className="dev-feature-indicator" />
            <div className="dev-feature-info">
              <h4>Predictive Lifestyle Modeling</h4>
              <p>Simulate training loads, recovery curves, and financial runway projections effortlessly.</p>
            </div>
          </div>
        </div>

        <button type="button" className="dev-modal-action-btn" onClick={onClose}>
          Acknowledge
        </button>
      </div>
    </div>
  )
}
