import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createStravaActivity } from '../../../../lib/api'

type AddActivityModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function AddActivityModal({ isOpen, onClose, onSuccess }: AddActivityModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    activityName: '',
    sportType: 'Run',
    distanceKm: '',
    movingTime: '',
    elevationGainMeters: '',
    date: new Date().toISOString().split('T')[0],
    stravaEmbedId: ''
  })

  if (!isOpen) return null

  const extractEmbedId = (html: string): string | null => {
    const match = html.match(/data-embed-id="(\d+)"/)
    return match ? match[1] : null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // If embed HTML is provided, extract the ID
      let embedId = formData.stravaEmbedId
      if (embedId.includes('<div') || embedId.includes('data-embed-id')) {
        embedId = extractEmbedId(embedId) || ''
      }

      await createStravaActivity({
        ...formData,
        distanceKm: parseFloat(formData.distanceKm) || 0,
        elevationGainMeters: parseInt(formData.elevationGainMeters) || 0,
        stravaEmbedId: embedId
      })
      onSuccess()
      onClose()
      setFormData({
        activityName: '',
        sportType: 'Run',
        distanceKm: '',
        movingTime: '',
        elevationGainMeters: '',
        date: new Date().toISOString().split('T')[0],
        stravaEmbedId: ''
      })
    } catch (err) {
      console.error('Error creating activity:', err)
      alert('Failed to save activity. Please check your inputs.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="workouts-modal-backdrop" onClick={onClose}>
      <div className="workouts-modal-popover" onClick={e => e.stopPropagation()}>
        <button className="workouts-modal-close" onClick={onClose} type="button">
          <X size={16} />
        </button>
        <h2>Record Activity</h2>
        <form className="workouts-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Activity Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Morning Run"
              value={formData.activityName}
              onChange={e => setFormData({ ...formData, activityName: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Sport Type</label>
              <select
                value={formData.sportType}
                onChange={e => setFormData({ ...formData, sportType: e.target.value })}
              >
                <option value="Run">Run</option>
                <option value="Ride">Ride</option>
                <option value="Walk">Walk</option>
                <option value="E-Bike Ride">E-Bike Ride</option>
                <option value="Swim">Swim</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Distance (km)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.distanceKm}
                onChange={e => setFormData({ ...formData, distanceKm: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Moving Time</label>
              <input
                type="text"
                required
                placeholder="HH:MM:SS or MM:SS"
                value={formData.movingTime}
                onChange={e => setFormData({ ...formData, movingTime: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Elevation Gain (m)</label>
            <input
              type="number"
              required
              placeholder="0"
              value={formData.elevationGainMeters}
              onChange={e => setFormData({ ...formData, elevationGainMeters: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Strava Embed (HTML or ID)</label>
            <textarea
              placeholder="Paste Strava embed code here..."
              value={formData.stravaEmbedId}
              onChange={e => setFormData({ ...formData, stravaEmbedId: e.target.value })}
            />
          </div>

          <button className="workouts-form-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save Activity'}
          </button>
        </form>
      </div>
    </div>
  )
}

export { AddActivityModal }
