import { ExternalLink, Pin } from 'lucide-react'
import type { StravaActivityStats } from '@/types/workouts'
import { useWorkoutsStore } from '@/store/workouts-store'
import { isAwaitingData } from '@/store/zustand-utils'

type StravaEmbedCardProps = {
  stats: StravaActivityStats | null
  onEditClick: () => void
}

function StravaEmbedCard({ stats, onEditClick }: StravaEmbedCardProps) {
  const featuredState = useWorkoutsStore.use.featuredEmbed()
  // A pinned activity wins; otherwise fall back to the most recent one.
  const activeEmbed = featuredState.data ?? stats?.recentEmbeds?.[0] ?? null
  const loading = isAwaitingData(featuredState)

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
