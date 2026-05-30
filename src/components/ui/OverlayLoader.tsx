interface OverlayLoaderProps {
  show: boolean
}

export function OverlayLoader({ show }: OverlayLoaderProps) {
  if (!show) return null

  return (
    <div className="global-overlay-loader" aria-label="Loading page contents" id="global-route-loader">
      <div className="overlay-loader-content">
        <div className="overlay-hourglass-loader" aria-hidden="true">
          <svg className="hourglass-svg" viewBox="0 0 100 100" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
            <g className="hourglass-rotating">
              {/* Top Frame Base */}
              <path className="hourglass-frame" d="M30,18 L70,18 M35,18 L35,22 L65,22 L65,18" stroke="#101312" strokeWidth="3" strokeLinecap="round" fill="none" />
              {/* Bottom Frame Base */}
              <path className="hourglass-frame" d="M30,82 L70,82 M35,82 L35,78 L65,78 L65,82" stroke="#101312" strokeWidth="3" strokeLinecap="round" fill="none" />
              
              {/* Glass Bulbs Outline */}
              <path className="hourglass-glass" d="M35,22 C35,42 46,49 46,50 C46,51 35,58 35,78 L65,78 C65,58 54,51 54,50 C54,49 65,42 65,22 Z" stroke="rgba(16, 19, 18, 0.35)" strokeWidth="3.5" strokeLinejoin="round" fill="none" />
              
              {/* Top Sand */}
              <path className="hourglass-sand-top" d="M38,24 L62,24 C62,24 61,36 50,48 C39,36 38,24 38,24 Z" fill="url(#sandGradient)" />
              
              {/* Bottom Sand */}
              <path className="hourglass-sand-bottom" d="M37,76 L63,76 C63,76 60,65 50,65 C40,65 37,76 37,76 Z" fill="url(#sandGradient)" />
              
              {/* Dripping Sand Stream */}
              <line className="hourglass-sand-stream" x1="50" y1="48" x2="50" y2="76" stroke="#101312" strokeWidth="2.5" strokeDasharray="4, 4" strokeLinecap="round" />
            </g>
            <defs>
              <linearGradient id="sandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4b4f4c" />
                <stop offset="100%" stopColor="#101312" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="overlay-loader-text">Loading...</p>
      </div>
    </div>
  )
}
