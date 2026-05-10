import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { StravaActivityStats } from '../../../../lib/api'

type StravaEmbedCardProps = {
  stats: StravaActivityStats | null
}

function StravaEmbedCard({ stats }: StravaEmbedCardProps) {
  const [embedHtml, setEmbedHtml] = useState('')
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null)

  const extractEmbedId = (html: string): string | null => {
    // Match data-embed-id="..." from Strava embed HTML
    const match = html.match(/data-embed-id="(\d+)"/)
    return match ? match[1] : null
  }

  const handleLoadEmbed = () => {
    const id = extractEmbedId(embedHtml)
    if (id) {
      setActiveEmbedId(id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleLoadEmbed()
    }
  }

  return (
    <div className="workouts-card workouts-embed-card">
      <div className="workouts-section-head">
        <div>
          <h2>Strava Embed</h2>
          <p>Paste embed code to preview</p>
        </div>
        {activeEmbedId && (
          <a
            href={`https://www.strava.com/activities/${activeEmbedId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#3dc152', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, textDecoration: 'none' }}
          >
            Open in Strava <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div className="workouts-embed-input-area">
        <textarea
          value={embedHtml}
          onChange={e => setEmbedHtml(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={'Paste Strava embed HTML here…\ne.g. <div class="strava-embed-placeholder" data-embed-id="18451565806" ...>'}
        />
        <button
          className="workouts-embed-load-btn"
          onClick={handleLoadEmbed}
          disabled={!embedHtml.trim()}
          type="button"
        >
          Load Embed
        </button>
      </div>

      <div className="workouts-embed-frame-wrapper">
        {activeEmbedId ? (
          <iframe
            src={`https://strava-embeds.com/activity/${activeEmbedId}`}
            title="Strava Activity Embed"
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div className="workouts-embed-placeholder">
            <ExternalLink size={28} />
            <span>Paste a Strava embed snippet above to preview your activity here</span>
          </div>
        )}
      </div>
    </div>
  )
}

export { StravaEmbedCard }
