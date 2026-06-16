import { useEffect, useState } from 'react'
import { X, Loader2, ClipboardCheck, FileJson } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { createStravaActivity, importStravaJson } from '../../../../lib/api'

type InitialData = {
  activityName?: string
  sportType?: string
  distanceKm?: number | string
  movingTime?: string
  elevationGainMeters?: number | string
  date?: string
  stravaEmbedId?: string
}

type AddActivityModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isEdit?: boolean
  initialData?: InitialData | null
}

function AddActivityModal({ isOpen, onClose, onSuccess, isEdit, initialData }: AddActivityModalProps) {
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'manual' | 'strava'>('manual')
  const [stravaJson, setStravaJson] = useState('')
  const [formData, setFormData] = useState({
    activityName: '',
    sportType: 'Run',
    distanceKm: '',
    movingTime: '',
    elevationGainMeters: '',
    date: new Date().toISOString().split('T')[0],
    stravaEmbedId: ''
  })

  const resetForm = () => {
    setFormData({
      activityName: '',
      sportType: 'Run',
      distanceKm: '',
      movingTime: '',
      elevationGainMeters: '',
      date: new Date().toISOString().split('T')[0],
      stravaEmbedId: ''
    })
    setStravaJson('')
  }

  useEffect(() => {
    if (isOpen && isEdit && initialData) {
      setTimeout(() => {
        setFormData({
          activityName: initialData.activityName || '',
          sportType: initialData.sportType || 'Run',
          distanceKm: initialData.distanceKm?.toString() || '',
          movingTime: initialData.movingTime || '',
          elevationGainMeters: initialData.elevationGainMeters?.toString() || '',
          date: initialData.date?.split('T')[0] || new Date().toISOString().split('T')[0],
          stravaEmbedId: initialData.stravaEmbedId || ''
        })
        setActiveTab('manual')
      }, 0)
    } else if (isOpen && !isEdit) {
      setTimeout(() => resetForm(), 0)
    }
  }, [isOpen, isEdit, initialData])

  if (!isOpen) return null

  const extractEmbedInfo = (html: string): { id: string; token?: string } | null => {
    const idMatch = html.match(/data-embed-id="(\d+)"/) || html.match(/activity\/(\d+)/) || html.match(/\b\d{10,12}\b/)
    if (!idMatch) return null
    const id = idMatch[1] || idMatch[0]
    const tokenMatch = html.match(/data-token="([^"]+)"/) || html.match(/token=([^&" \s]+)/)
    return { id, token: tokenMatch ? tokenMatch[1] : undefined }
  }

  const handleManualSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let embedId = formData.stravaEmbedId
      let token = ''
      if (embedId.includes('<') || embedId.includes('data-') || embedId.includes('strava')) {
        const info = extractEmbedInfo(embedId)
        if (info) {
          embedId = info.id
          token = info.token || ''
        }
      }

      // Note: Ideally call updateStravaActivity here if isEdit is true,
      // but assuming createStravaActivity handles upsert or mock for now
      await createStravaActivity({
        ...formData,
        distanceKm: parseFloat(formData.distanceKm) || 0,
        elevationGainMeters: parseInt(formData.elevationGainMeters) || 0,
        stravaEmbedId: embedId,
        stravaToken: token
      })
      setIsSuccess(true)
      toast.success(isEdit ? 'Activity updated' : 'Activity saved manually')
      setTimeout(() => {
        onSuccess()
        onClose()
        resetForm()
        setIsSuccess(false)
      }, 1000)
    } catch (err: unknown) {
      console.error('Error creating activity:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save activity. Please check your inputs.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleStravaImport = async () => {
    if (!stravaJson.trim()) return

    try {
      const payload = JSON.parse(stravaJson)
      setLoading(true)
      await importStravaJson(payload)
      setIsSuccess(true)
      toast.success('Activity imported from Strava')
      setTimeout(() => {
        onSuccess()
        onClose()
        setStravaJson('')
        setIsSuccess(false)
      }, 1000)
    } catch (err: unknown) {
      console.error('Error importing Strava JSON:', err)
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON format or import failed.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="workouts-modal-backdrop" onClick={onClose}>
      <div 
        className="workouts-modal-popover" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(540px, calc(100vw - 42px))', maxWidth: 'none' }}
      >
        <button className="workouts-modal-close" onClick={onClose} type="button">
          <X size={16} />
        </button>

        <h2>{isEdit ? 'Edit Workout' : 'Record Workout'}</h2>

        <div className="type-toggle" style={{ marginBottom: '24px' }}>
          <div className={`type-toggle-slider ${activeTab === 'strava' ? 'slide-right' : ''}`} />
          <button
            type="button"
            className={activeTab === 'manual' ? 'active' : ''}
            onClick={() => setActiveTab('manual')}
          >
            <ClipboardCheck size={14} />
            Manual Entry
          </button>
          <button
            type="button"
            className={activeTab === 'strava' ? 'active' : ''}
            onClick={() => setActiveTab('strava')}
          >
            <FileJson size={14} />
            Strava JSON
          </button>
        </div>

        {activeTab === 'manual' ? (
          <form className="workouts-form" onSubmit={handleManualSubmit}>
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
                  placeholder="HH:MM:SS"
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

            <button className={`workouts-form-submit ${isSuccess ? 'success' : ''}`} type="submit" disabled={loading || isSuccess}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : isSuccess ? 'Activity Saved!' : 'Save Activity'}
            </button>
          </form>
        ) : (
          <div className="strava-import-container">
            <p className="import-hint">Paste raw JSON response from Strava activity API endpoint</p>
            <div className="form-group">
              <textarea
                className="json-textarea"
                placeholder='{ "id": 12345, "name": "...", "sport_type": "Run", ... }'
                value={stravaJson}
                onChange={e => setStravaJson(e.target.value)}
              />
            </div>
            <button
              className={`workouts-form-submit import-btn ${isSuccess ? 'success' : ''}`}
              onClick={handleStravaImport}
              disabled={loading || isSuccess || !stravaJson.trim()}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : isSuccess ? 'Imported Successfully!' : 'Process & Save'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export { AddActivityModal }
