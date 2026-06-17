import { useState, useEffect } from 'react'
import { Plus, Search, Loader2, Edit2, Trash2, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'
import type { Prompt } from '../../lib/api'
import { fetchPrompts, createPrompt, updatePrompt, deletePrompt } from '../../lib/api'
import { ConfirmDialog } from '../ui/confirm-dialog'
import './prompts-overview.css'

type PromptsOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function PromptsOverviewDashboard() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  
  // Pagination State
  const itemsPerPage = 5
  const [currentPage, setCurrentPage] = useState(1)
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      const res = await fetchPrompts()
      setPrompts(res.data)
    } catch (error) {
      console.error('Failed to load prompts:', error)
      toast.error('Failed to load prompts.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setSelectedPrompt(null)
    setEditTitle('')
    setEditContent('')
    setIsEditing(true)
  }

  const handleEdit = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setEditTitle(prompt.title)
    setEditContent(prompt.content)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editTitle.trim()) {
      toast.error('Prompt title is required')
      return
    }
    if (!editContent.trim()) {
      toast.error('Prompt content is required')
      return
    }

    try {
      setIsSaving(true)
      if (selectedPrompt) {
        await updatePrompt(selectedPrompt.id, {
          title: editTitle.trim(),
          content: editContent.trim()
        })
        toast.success('Prompt updated')
      } else {
        const res = await createPrompt({
          title: editTitle.trim(),
          content: editContent.trim()
        })
        toast.success('Prompt created')
        setSelectedPrompt(res.data) // Auto select the new prompt
      }
      setIsEditing(false)
      loadPrompts()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to save prompt:', error)
      toast.error(error.message || 'Failed to save prompt')
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!promptToDelete) return
    try {
      await deletePrompt(promptToDelete.id)
      if (selectedPrompt?.id === promptToDelete.id) {
        setIsEditing(false)
        setSelectedPrompt(null)
      }
      toast.success('Prompt deleted')
      loadPrompts()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to delete prompt:', error)
      toast.error(error.message || 'Failed to delete prompt')
    } finally {
      setPromptToDelete(null)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      toast.success('Prompt copied to clipboard')
      setTimeout(() => setIsCopied(false), 2000)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error('Failed to copy prompt')
    }
  }

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / itemsPerPage))
  const paginatedPrompts = filteredPrompts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const isSaveDisabled = isSaving

  return (
    <section className="prompts-dashboard" aria-label="Prompts overview dashboard">
      <div className="prompts-header">
        <h1>Prompts Library</h1>
        <button className="prompts-add-btn" onClick={handleCreateNew}>
          <Plus size={16} /> <span>Add Prompt</span>
        </button>
      </div>

      <div className="prompts-dashboard-grid">
        <div className="prompts-card prompts-list-wrap">
          <div className="prompts-search">
            <Search size={16} color="rgba(16, 19, 18, 0.5)" />
            <input 
              type="text" 
              placeholder="Search prompts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="prompts-list">
            {loading ? (
              <div className="prompt-placeholder"><Loader2 className="animate-spin" /></div>
            ) : paginatedPrompts.length === 0 ? (
              <div className="prompt-placeholder">No prompts found.</div>
            ) : (
              paginatedPrompts.map(prompt => (
                <div 
                  key={prompt.id} 
                  className={`prompt-list-item ${selectedPrompt?.id === prompt.id && !isEditing ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedPrompt(prompt)
                    setIsEditing(false)
                  }}
                >
                  <h3>{prompt.title}</h3>
                  <p>{prompt.content.length > 80 ? prompt.content.substring(0, 80) + '...' : prompt.content}</p>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className="prompts-pagination">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="prompts-card prompts-editor-wrap">
          {isEditing ? (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(16, 19, 18, 0.6)', marginBottom: '8px' }}>Prompt Title <span style={{ color: '#d44752' }}>*</span></label>
                <input 
                  type="text" 
                  className="prompt-title-input" 
                  placeholder="e.g. Code Review Prompt" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(16, 19, 18, 0.6)', marginBottom: '8px' }}>Content <span style={{ color: '#d44752' }}>*</span></label>
                <textarea 
                  className="prompt-content-input" 
                  placeholder="Write your prompt content here..."
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <div className="prompt-editor-actions">
                <button className="btn-cancel" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</button>
                <button className="btn-save" onClick={handleSave} disabled={isSaveDisabled}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Prompt'}
                </button>
              </div>
            </>
          ) : selectedPrompt ? (
            <>
              <div className="prompt-editor-header">
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>{selectedPrompt.title}</h2>
                </div>
                <div className="prompt-actions">
                  <button onClick={() => handleCopy(selectedPrompt.content)} title="Copy prompt">
                    {isCopied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                  </button>
                  <button onClick={() => handleEdit(selectedPrompt)} title="Edit prompt"><Edit2 size={16} /></button>
                  <button className="delete-btn" onClick={() => setPromptToDelete(selectedPrompt)} title="Delete prompt"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="prompt-viewer-content">
                {selectedPrompt.content}
              </div>
            </>
          ) : (
            <div className="prompt-placeholder">
              <p>Select a prompt to view or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!promptToDelete}
        title="Delete Prompt"
        message={promptToDelete ? `Are you sure you want to delete "${promptToDelete.title}"?` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setPromptToDelete(null)}
      />
    </section>
  )
}

function PromptsOverview({ activePath, onNavigate }: PromptsOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Prompts overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <PromptsOverviewDashboard />
      </div>
    </main>
  )
}

export { PromptsOverview }
