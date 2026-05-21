import { GitBranch, Code2, Flame } from 'lucide-react'
import { useDashboard } from '../../../../contexts/DashboardContext'

const intensityColors = [
  'rgba(164, 200, 177, 0.45)',
  'rgba(122, 191, 147, 0.6)',
  'rgba(76, 175, 115, 0.8)',
  'rgba(39, 142, 85, 0.95)',
  '#0d6b3a',
]

interface CodingPulseCardProps {
  streakDays?: number
  githubCommits?: number
  leetCodeSolved?: number
}

export function CodingPulseCard({ streakDays, githubCommits, leetCodeSolved }: CodingPulseCardProps) {
  const { data, isLoading } = useDashboard()
  const coding = data?.coding

  const github = coding?.github?.solved ?? githubCommits ?? 0
  const leetcode = coding?.leetCode?.solved ?? leetCodeSolved ?? 0
  const streak = coding?.stats?.streakDays ?? streakDays ?? 0
  const heatmap = coding?.learningHeatmap ?? []

  return (
    <section className="learnings-card learnings-coding-card">
      <p className="learnings-card-eyebrow">Coding pulse</p>
      <h3 className="learnings-card-title">Platform activity</h3>

      <div className="learnings-coding-metrics">
        <div className="learnings-coding-metric">
          <small>
            <GitBranch size={12} style={{ display: 'inline', marginRight: 4 }} />
            GitHub commits (7d)
          </small>
          <b>{isLoading ? '…' : github}</b>
        </div>
        <div className="learnings-coding-metric">
          <small>
            <Code2 size={12} style={{ display: 'inline', marginRight: 4 }} />
            LeetCode solved (7d)
          </small>
          <b>{isLoading ? '…' : leetcode}</b>
        </div>
        <div className="learnings-coding-metric">
          <small>
            <Flame size={12} style={{ display: 'inline', marginRight: 4 }} />
            Commit streak
          </small>
          <b>{isLoading ? '…' : `${streak}d`}</b>
        </div>
      </div>

      {heatmap.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginTop: 14,
          }}
        >
          {heatmap.slice(-7).map((entry: { date: string; intensity: number }) => (
            <div
              key={entry.date}
              title={entry.date}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                background: intensityColors[Math.min(entry.intensity ?? 0, 4)],
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
