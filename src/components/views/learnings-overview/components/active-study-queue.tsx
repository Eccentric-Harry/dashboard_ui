import { useState } from 'react'
import { GraduationCap, Plus, Check } from 'lucide-react'

interface StudyTrack {
  id: string
  title: string
  notionUrl: string
  completedSections: number
  totalSections: number
  category: string
}

const DEFAULT_TRACKS: StudyTrack[] = [
  {
    id: '1',
    title: 'Represent Everything Using Binary',
    notionUrl: 'https://notion.so/binary-deep-dive',
    completedSections: 4,
    totalSections: 10,
    category: 'Computer Science',
  },
  {
    id: '2',
    title: 'System Design: Microservices & Eventual Consistency',
    notionUrl: 'https://notion.so/system-design-microservices',
    completedSections: 7,
    totalSections: 10,
    category: 'Architecture',
  },
  {
    id: '3',
    title: 'React 19 Server Components & Actions',
    notionUrl: 'https://notion.so/react-19-deep-dive',
    completedSections: 3,
    totalSections: 5,
    category: 'Frontend',
  },
  {
    id: '4',
    title: 'Spring Boot Security & OAuth2 Flow',
    notionUrl: 'https://notion.so/springboot-security-oauth2',
    completedSections: 8,
    totalSections: 12,
    category: 'Backend',
  },
]

const NotionIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="currentColor" strokeWidth="0.8" aria-hidden="true" className="shrink-0 transition-transform duration-200 group-hover:scale-110">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
  </svg>
)

export function ActiveStudyQueue() {
  const [tracks, setTracks] = useState<StudyTrack[]>(DEFAULT_TRACKS)
  const [newTrackTitle, setNewTrackTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleIncrement = (id: string) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === id && track.completedSections < track.totalSections) {
          return { ...track, completedSections: track.completedSections + 1 }
        }
        return track
      })
    )
  }

  const handleAddNewTrack = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTrackTitle.trim()) return

    const newTrack: StudyTrack = {
      id: Date.now().toString(),
      title: newTrackTitle.trim(),
      notionUrl: 'https://notion.so',
      completedSections: 0,
      totalSections: 8,
      category: 'General',
    }

    setTracks((prev) => [...prev, newTrack])
    setNewTrackTitle('')
    setIsAdding(false)
  }

  return (
    <div className="learnings-card bg-white rounded-3xl p-5 border border-white/50 shadow-[0_22px_52px_rgba(45,60,48,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="learnings-card-eyebrow text-xs uppercase tracking-wider text-gray-400 font-bold">CURRENT PURSUITS</p>
          <h3 className="learnings-card-title text-lg font-bold text-gray-900 flex items-center gap-1.5">
            <GraduationCap size={16} className="text-[#1a7a4a]" />
            Active Study Queue
          </h3>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
          title="Add new pursuit"
        >
          <Plus size={14} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddNewTrack} className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <input
            type="text"
            placeholder="Track Title (e.g. System Design)"
            value={newTrackTitle}
            onChange={(e) => setNewTrackTitle(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white mb-2 focus:outline-none focus:border-green-600"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[11px] px-3 py-1.5 rounded-full text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-[11px] px-3 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800"
            >
              Add Track
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {tracks.map((track) => {
          const percentage = Math.round((track.completedSections / track.totalSections) * 100)
          return (
            <div
              key={track.id}
              className="group relative bg-white border border-gray-100/80 rounded-2xl p-3 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-200"
            >
              {/* Category Badge & Notion Icon */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-[#1a7a4a] bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {track.category}
                </span>
                <a
                  href={track.notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded-full bg-gray-100 hover:bg-neutral-200 flex items-center justify-center text-black hover:text-[#1a7a4a] transition-colors"
                  title="Open deep-dive note in Notion"
                >
                  <NotionIcon />
                </a>
              </div>

              {/* Title & Click to Increment Progress */}
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-gray-900 leading-snug pr-4">
                  {track.title}
                </h4>
              </div>

              {/* Progress Bar & Subtask Status */}
              <div className="flex items-center justify-between gap-4 mt-2">
                <div className="flex-1">
                  <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1a7a4a] h-1 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-gray-400 font-mono">
                    {track.completedSections}/{track.totalSections} done
                  </span>
                  {track.completedSections < track.totalSections ? (
                    <button
                      onClick={() => handleIncrement(track.id)}
                      className="w-5 h-5 rounded-md bg-gray-50 hover:bg-emerald-50 text-neutral-400 hover:text-[#1a7a4a] flex items-center justify-center transition-colors border border-gray-100"
                      title="Mark next section complete"
                    >
                      <Check size={10} />
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                      Done
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
