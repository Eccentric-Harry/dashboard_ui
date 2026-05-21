import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Edit2, Loader2, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchLearnings, deleteLearning } from '../../../../lib/api'
import type { LearningLog } from '../../../../lib/api'
import { ConfirmDialog } from '../../../ui/confirm-dialog'
import { extractNotionUrl, getCategoryStyle } from '../learnings-utils'

interface LearningsLogCardProps {
  selectedDate: string
  refreshKey: number
  onRefresh: () => void
  onEditLearning: (learning: LearningLog) => void
}

export function LearningsLogCard({
  selectedDate,
  refreshKey,
  onRefresh,
  onEditLearning,
}: LearningsLogCardProps) {
  const [learnings, setLearnings] = useState<LearningLog[]>([])
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LearningLog | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchLearnings(selectedDate)
      setLearnings(res?.data ?? [])
    } catch {
      setLearnings([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    load()
    setIsEditMode(false)
  }, [load, refreshKey])

  const handleDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteLearning(deleteTarget.id)
      toast.success(`Deleted "${deleteTarget.title}"`)
      setDeleteTarget(null)
      load()
      onRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <section className="learnings-card learnings-log-card-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="learnings-card-eyebrow">Journal</p>
          <h3 className="learnings-card-title">
            <BookOpen size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            Today&apos;s learnings
          </h3>
        </div>
        <button
          type="button"
          className="learnings-icon-btn"
          onClick={() => setIsEditMode(!isEditMode)}
          title="Toggle edit mode"
          style={
            isEditMode
              ? { background: 'rgba(26, 122, 74, 0.1)', color: '#1a7a4a', borderColor: 'rgba(26, 122, 74, 0.2)' }
              : undefined
          }
        >
          <Edit2 size={14} />
        </button>
      </div>

      {loading ? (
        <p className="learnings-loading" style={{ marginTop: 16 }}>
          <Loader2 className="spinner animate-spin" size={14} />
          Loading learnings...
        </p>
      ) : learnings.length === 0 ? (
        <p className="learnings-empty" style={{ marginTop: 16 }}>
          No learning logged for this date.
        </p>
      ) : (
        <div className="learnings-log-list" style={{ marginTop: 14 }}>
          {learnings.map((log) => {
            const badge = getCategoryStyle(log.category)
            const notionUrl = extractNotionUrl(log.description)
            const isOnlyNotion = notionUrl && log.description.trim() === notionUrl

            return (
              <article key={log.id} className="learnings-log-item">
                {isEditMode && (
                  <div className="learnings-log-actions">
                    <button
                      type="button"
                      className="learnings-icon-btn"
                      onClick={() => onEditLearning(log)}
                      aria-label="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="learnings-icon-btn"
                      onClick={() => setDeleteTarget(log)}
                      aria-label="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: badge.bg,
                    color: badge.color,
                    border: badge.border,
                    marginBottom: 8,
                  }}
                >
                  {log.category}
                </span>
                <h4 style={{ fontSize: 15, fontWeight: 650, margin: '0 0 6px' }}>{log.title}</h4>
                {!isOnlyNotion && (
                  <p className="learnings-log-description">{log.description}</p>
                )}
                {notionUrl && (
                  <div className="learnings-notion-wrap">
                    <a
                      href={notionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="learnings-notion-btn"
                      aria-label="Open in Notion"
                      title="Open in Notion"
                    >
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
                      </svg>
                    </a>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete learning?"
        message={`Remove "${deleteTarget?.title}" from your journal?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
