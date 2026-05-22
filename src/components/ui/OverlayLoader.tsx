interface OverlayLoaderProps {
  show: boolean
}

export function OverlayLoader({ show }: OverlayLoaderProps) {
  if (!show) return null

  return (
    <div className="global-overlay-loader" aria-label="Loading page contents" id="global-route-loader">
      <div className="overlay-loader-content">
        <div className="overlay-gift-loader" aria-hidden="true">
          <span className="overlay-gift-paper overlay-gift-paper-left" />
          <span className="overlay-gift-paper overlay-gift-paper-right" />
          <span className="overlay-gift-box" />
          <span className="overlay-gift-ribbon overlay-gift-ribbon-vertical" />
          <span className="overlay-gift-ribbon overlay-gift-ribbon-horizontal" />
          <span className="overlay-gift-bow overlay-gift-bow-left" />
          <span className="overlay-gift-bow overlay-gift-bow-right" />
        </div>
      </div>
    </div>
  )
}
