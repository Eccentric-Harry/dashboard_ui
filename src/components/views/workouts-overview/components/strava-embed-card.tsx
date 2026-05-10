import { useState, useEffect } from 'react'
import { ExternalLink, Pin } from 'lucide-react'
import type { StravaActivityStats } from '../../../../lib/api'
import { fetchFeaturedStravaEmbed } from '../../../../lib/api'

type StravaEmbedCardProps = {
  stats: StravaActivityStats | null
  onEditClick: () => void
}

function StravaEmbedCard({ stats, onEditClick }: StravaEmbedCardProps) {
  const [activeEmbed, setActiveEmbed] = useState<{ id: string; token?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Load featured embed on mount
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const featured = await fetchFeaturedStravaEmbed()
        if (featured) {
          setActiveEmbed(featured)
        } else if (stats?.recentEmbeds?.length) {
          // Fallback to most recent activity if no pinned featured activity exists
          setActiveEmbed(stats.recentEmbeds[0])
        }
      } catch (err) {
        console.error('Error loading featured embed:', err)
      } finally {
        setLoading(false)
      }
    }
    loadFeatured()
  }, [stats])

  const iframeSrc = activeEmbed 
    ? `https://strava-embeds.com/activity/${activeEmbed.id}${activeEmbed.token ? `?token=${activeEmbed.token}` : ''}`
    : ''

  return (
    <div className="workouts-card workouts-embed-card">
      <div className="workouts-section-head">
        <div>
          <h2>Strava Embed</h2>
          <p>Featured Activity</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activeEmbed && (
            <a
              href={`https://www.strava.com/activities/${activeEmbed.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="workouts-embed-external-link"
              title="Open in Strava"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button 
            className="workouts-embed-pin-btn" 
            onClick={onEditClick}
            title="Pin New Activity"
          >
            <Pin size={14} />
          </button>
        </div>
      </div>

      <div className="workouts-embed-frame-wrapper" style={{ marginTop: 0 }}>
        {loading ? (
          <div className="workouts-loading" style={{ minHeight: '300px' }}>
            <span className="workouts-loading-dot">Loading…</span>
          </div>
        ) : activeEmbed ? (
          <iframe
            key={iframeSrc} // Force reload when src changes
            src={iframeSrc}
            title="Strava Activity Embed"
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div className="workouts-embed-placeholder" onClick={onEditClick} style={{ cursor: 'pointer' }}>
            <Pin size={28} />
            <span>Click the pin icon to feature a Strava activity here</span>
          </div>
        )}
      </div>
    </div>
  )
}

export { StravaEmbedCard }
