import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, BookOpen, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { mockTasksData } from '../../../dashboard/quantified-self-dashboard/data'
import { fetchLearnings, deleteLearning } from '../../../../lib/api'
import type { LearningLog } from '../../../../lib/api'
import { AddLearningModal } from './add-learning-modal'

function extractNotionUrl(text: string): string | null {
  if (!text) return null
  const match = text.match(/(https?:\/\/(?:www\.)?notion\.so\/[^\s\)]+)/i)
  return match ? match[0] : null
}

interface LearningDetailsCardProps {
  selectedDate: string
  onRefresh?: () => void
}

function getCategoryStyle(category: string) {
  const cat = category.toLowerCase()
  if (['github', 'development', 'ai', 'devops', 'tech'].includes(cat)) {
    return {
      bg: 'rgba(26, 122, 74, 0.08)',
      color: '#1a7a4a',
      border: '1px solid rgba(26, 122, 74, 0.15)'
    }
  } else if (cat === 'personal') {
    return {
      bg: 'rgba(14, 165, 233, 0.08)',
      color: '#0369a1',
      border: '1px solid rgba(14, 165, 233, 0.16)'
    }
  } else {
    return {
      bg: 'rgba(13, 148, 136, 0.08)',
      color: '#0d9488',
      border: '1px solid rgba(13, 148, 136, 0.15)'
    }
  }
}

export function LearningDetailsCard({ selectedDate, onRefresh }: LearningDetailsCardProps) {
  const [learnings, setLearnings] = useState<LearningLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)

  // Modal control
  const [modalOpen, setModalOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [selectedLearning, setSelectedLearning] = useState<LearningLog | undefined>(undefined)

  const dayOfMonth = new Date(selectedDate).toString() !== 'Invalid Date' ? new Date(selectedDate).getDate() : null
  const tasksForDate = dayOfMonth && mockTasksData[dayOfMonth] ? mockTasksData[dayOfMonth] : []

  const formattedDate = new Date(selectedDate).toString() !== 'Invalid Date'
    ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : selectedDate

  const loadLearnings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchLearnings(selectedDate)
      if (res && res.data) {
        setLearnings(res.data)
      } else {
        setLearnings([])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load learnings')
      setLearnings([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadLearnings()
    setIsEditMode(false)
  }, [loadLearnings])

  const handleOpenAddModal = () => {
    setIsEdit(false)
    setSelectedLearning(undefined)
    setModalOpen(true)
  }

  const handleOpenEditModal = (learning: LearningLog) => {
    setIsEdit(true)
    setSelectedLearning(learning)
    setModalOpen(true)
  }

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the learning log: "${title}"?`)) {
      try {
        await deleteLearning(id)
        toast.success(`Deleted "${title}"`)
        loadLearnings()
        if (onRefresh) onRefresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete learning log')
      }
    }
  }

  const handleSuccess = () => {
    loadLearnings()
    if (onRefresh) onRefresh()
  }

  return (
    <div className="learning-details-card">

      {/* Date Header and Add Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#101312', margin: 0 }}>
          Activity for {formattedDate}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleOpenAddModal}
            style={{
              background: '#1a7a4a',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(26, 122, 74, 0.15)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#15623b'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1a7a4a'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={14} />
            Add Learning
          </button>

          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            title="Toggle edit mode"
            style={{
              background: isEditMode ? 'rgba(26, 122, 74, 0.08)' : 'transparent',
              border: isEditMode ? '1px solid rgba(26, 122, 74, 0.15)' : '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: '12px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isEditMode ? '#1a7a4a' : '#526057',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isEditMode ? '0 2px 8px rgba(26, 122, 74, 0.08)' : 'none'
            }}
            onMouseEnter={e => {
              if (isEditMode) {
                e.currentTarget.style.background = 'rgba(26, 122, 74, 0.12)';
              } else {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.color = '#1a7a4a';
                e.currentTarget.style.border = '1px solid rgba(26, 122, 74, 0.15)';
              }
            }}
            onMouseLeave={e => {
              if (isEditMode) {
                e.currentTarget.style.background = 'rgba(26, 122, 74, 0.08)';
                e.currentTarget.style.color = '#1a7a4a';
                e.currentTarget.style.border = '1px solid rgba(26, 122, 74, 0.15)';
              } else {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#526057';
                e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)';
              }
            }}
          >
            <Edit2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Learning Logs Section */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#101312', marginBottom: '16px' }}>
            Learnings
          </h3>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#526057', padding: '16px 20px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '16px' }}>
              <Loader2 className="spinner animate-spin" size={16} />
              <span style={{ fontSize: '14px' }}>Loading learnings...</span>
            </div>
          ) : error ? (
            <div style={{ color: '#d83542', fontSize: '14px', padding: '16px 20px', background: 'rgba(216, 53, 66, 0.05)', borderRadius: '16px', border: '1px solid rgba(216, 53, 66, 0.1)' }}>
              {error}
            </div>
          ) : learnings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {learnings.map((log) => {
                const badgeStyle = getCategoryStyle(log.category)
                return (
                  <div
                    key={log.id}
                    className="learning-item-card"
                    style={{
                      padding: '18px 20px',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.8)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.015)',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Hover controls for editing/deleting */}
                    {isEditMode && (
                      <div className="learning-item-actions" style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        display: 'flex',
                        gap: '8px'
                      }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(log)}
                          title="Edit Learning"
                          style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '8px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#526057',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#1a7a4a'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'; e.currentTarget.style.color = '#526057'; }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => log.id && handleDelete(log.id, log.title)}
                          title="Delete Learning"
                          style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '8px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#526057',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#d83542'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'; e.currentTarget.style.color = '#526057'; }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: isEditMode ? '64px' : '0px' }}>
                      <span style={{
                        alignSelf: 'flex-start',
                        fontWeight: 700,
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.color,
                        border: badgeStyle.border
                      }}>
                        {log.category}
                      </span>

                      <h4 style={{ fontSize: '15px', fontWeight: 650, color: '#101312', margin: '4px 0 2px 0' }}>
                        {log.title}
                      </h4>

                      {(() => {
                        const notionUrl = log.notionUrl || extractNotionUrl(log.description)
                        const isOnlyNotionUrl = notionUrl && log.description.trim() === notionUrl

                        return (
                          <>
                            {!isOnlyNotionUrl && (
                              <p style={{ fontSize: '13.5px', lineHeight: 1.5, color: '#4a5550', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {log.description}
                              </p>
                            )}

                            {notionUrl && (
                              <a
                                href={notionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="notion-link-btn"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  marginTop: '12px',
                                  padding: '10px 18px',
                                  borderRadius: '14px',
                                  background: 'rgba(16, 19, 18, 0.05)',
                                  border: '1px solid rgba(16, 19, 18, 0.1)',
                                  color: '#101312',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                  width: 'fit-content',
                                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                                  backdropFilter: 'blur(8px)'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = '#101312'
                                  e.currentTarget.style.color = '#ffffff'
                                  e.currentTarget.style.transform = 'translateY(-2px)'
                                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 19, 18, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'rgba(16, 19, 18, 0.05)'
                                  e.currentTarget.style.color = '#101312'
                                  e.currentTarget.style.transform = 'none'
                                  e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.6)'
                                }}
                              >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: '8px', flexShrink: 0 }}>
                                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
                                </svg>
                                <span>Notion</span>
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', flexShrink: 0, opacity: 0.8 }}>
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              </a>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <BookOpen size={24} style={{ color: '#889890', marginBottom: '8px' }} />
              <div style={{ color: '#526057', fontStyle: 'italic', fontSize: '14px' }}>
                No learning data logged for this date.
              </div>
              <button
                type="button"
                onClick={handleOpenAddModal}
                style={{ background: 'none', border: 'none', color: '#1a7a4a', fontWeight: 600, fontSize: '13px', marginTop: '8px', cursor: 'pointer' }}
              >
                Log your first learning!
              </button>
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#101312', marginBottom: '16px' }}>
            Tasks
          </h3>
          {tasksForDate.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasksForDate.map((task, idx) => (
                <div key={idx} style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.015)'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#526057', width: '70px' }}>
                    {task.time}
                  </span>
                  <span style={{ fontSize: '14px', color: '#101312', fontWeight: 500 }}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#526057', fontStyle: 'italic', fontSize: '14px', padding: '16px 20px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '16px' }}>
              No tasks scheduled for this date.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AddLearningModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        isEdit={isEdit}
        initialData={selectedLearning}
        defaultDate={selectedDate}
      />
    </div>
  )
}
