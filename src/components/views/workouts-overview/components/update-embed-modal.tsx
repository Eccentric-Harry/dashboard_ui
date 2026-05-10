import { useState } from 'react'
import { X } from 'lucide-react'
import { updateFeaturedStravaEmbed } from '../../../../lib/api'

interface UpdateEmbedModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (info: { id: string; token?: string }) => void
}

export function UpdateEmbedModal({ isOpen, onClose, onSuccess }: UpdateEmbedModalProps) {
  const [embedHtml, setEmbedHtml] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const extractEmbedInfo = (html: string): { id: string; token?: string } | null => {
    let idMatch = html.match(/data-embed-id="(\d+)"/) || html.match(/activity\/(\d+)/) || html.match(/\b\d{10,12}\b/)
    if (!idMatch) return null
    const id = idMatch[1] || idMatch[0]
    const tokenMatch = html.match(/data-token="([^"]+)"/) || html.match(/token=([^&" \s]+)/)
    return { id, token: tokenMatch ? tokenMatch[1] : undefined }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const info = extractEmbedInfo(embedHtml)
      if (info) {
        await updateFeaturedStravaEmbed(info)
        onSuccess(info)
        onClose()
        setEmbedHtml('')
      } else {
        alert('Could not find a valid Strava activity ID in the provided code.')
      }
    } catch (error) {
      console.error('Error updating featured embed:', error)
      alert('Failed to update featured activity.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="workouts-modal-backdrop">
      <div className="workouts-modal-popover" style={{ maxWidth: '480px' }}>
        <button className="workouts-modal-close" onClick={onClose}><X size={20} /></button>
        
        <h2>Feature Activity</h2>
        
        <form onSubmit={handleSubmit} className="workouts-form">
          <div className="form-group">
            <label>Strava Embed Code</label>
            <textarea
              required
              value={embedHtml}
              onChange={e => setEmbedHtml(e.target.value)}
              placeholder='Paste Strava embed HTML here...'
              style={{ height: '120px', resize: 'vertical' }}
            />
            <p style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', marginTop: '4px' }}>
              Paste the full embed snippet from Strava to pin it to your dashboard.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="workouts-btn-secondary" onClick={onClose} style={{ flex: 1, height: '40px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="workouts-form-submit" disabled={loading || !embedHtml.trim()} style={{ flex: 2, margin: 0 }}>
              {loading ? 'Updating...' : 'Pin Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
