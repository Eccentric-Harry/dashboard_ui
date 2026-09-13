interface OverlayLoaderProps {
  show: boolean
}

export function OverlayLoader({ show }: OverlayLoaderProps) {
  return (
    <div 
      className={`global-top-progress-bar ${show ? 'visible' : ''}`} 
      aria-label="Loading page contents" 
      id="global-route-loader" 
    />
  )
}

