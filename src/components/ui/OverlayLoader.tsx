import { Hourglass } from 'lucide-react'

interface OverlayLoaderProps {
  show: boolean
}

export function OverlayLoader({ show }: OverlayLoaderProps) {
  if (!show) return null

  return (
    <div className="global-overlay-loader" aria-label="Loading page contents" id="global-route-loader">
      <div className="overlay-loader-content">
        <div className="overlay-hourglass-wrapper">
          <Hourglass className="overlay-hourglass-icon" size={24} />
        </div>
        <p className="overlay-loader-text">Loading...</p>
      </div>
    </div>
  )
}
