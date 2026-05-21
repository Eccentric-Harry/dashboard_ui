import { useEffect, useState } from 'react'
import { GitBranch, Code2, Flame } from 'lucide-react'
import { useDashboard } from '../../../../contexts/DashboardContext'

const GITHUB_USERNAME = 'Eccentric-Harry'
const LEETCODE_USERNAME = 'harinathrao13'

const intensityColors = [
  'rgba(164, 200, 177, 0.45)',
  'rgba(122, 191, 147, 0.6)',
  'rgba(76, 175, 115, 0.8)',
  'rgba(39, 142, 85, 0.95)',
  '#0d6b3a',
]

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/** Count GitHub push-event commits in the 7 days ending on (and including) anchorDate */
async function fetchGithubCommits7d(anchorDate: string): Promise<number> {
  const anchor = new Date(anchorDate + 'T23:59:59')
  const cutoff = new Date(anchorDate + 'T00:00:00')
  cutoff.setDate(cutoff.getDate() - 6)

  // GitHub public events API — up to 300 most recent events
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=100`,
  )
  if (!res.ok) return 0
  const events: Array<{ type: string; created_at: string; payload: { commits?: unknown[] } }> =
    await res.json()

  return events
    .filter((e) => {
      if (e.type !== 'PushEvent') return false
      const d = new Date(e.created_at)
      return d >= cutoff && d <= anchor
    })
    .reduce((sum, e) => sum + (e.payload.commits?.length ?? 1), 0)
}

/** Count LeetCode submissions in the 7 days ending on (and including) anchorDate */
async function fetchLeetcodeSolved7d(anchorDate: string): Promise<number> {
  const anchor = new Date(anchorDate + 'T23:59:59')
  const cutoff = new Date(anchorDate + 'T00:00:00')
  cutoff.setDate(cutoff.getDate() - 6)
  const cutoffTs = Math.floor(cutoff.getTime() / 1000)
  const anchorTs = Math.floor(anchor.getTime() / 1000)

  const res = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${LEETCODE_USERNAME}`)
  if (!res.ok) return 0
  const data: { submissionCalendar?: Record<string, number> } = await res.json()
  if (!data.submissionCalendar) return 0

  return Object.entries(data.submissionCalendar)
    .filter(([ts]) => {
      const t = Number(ts)
      return t >= cutoffTs && t <= anchorTs
    })
    .reduce((sum, [, count]) => sum + count, 0)
}

/** Compute commit streak: how many consecutive days (ending at anchorDate) have ≥1 push event */
async function fetchGithubStreak(anchorDate: string): Promise<number> {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=100`,
  )
  if (!res.ok) return 0
  const events: Array<{ type: string; created_at: string }> = await res.json()

  const pushDays = new Set(
    events
      .filter((e) => e.type === 'PushEvent')
      .map((e) => e.created_at.slice(0, 10)),
  )

  let streak = 0
  let cursor = new Date(anchorDate)
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (pushDays.has(key)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

interface CodingPulseCardProps {
  streakDays?: number
  githubCommits?: number
  leetCodeSolved?: number
  selectedDate?: string
}

export function CodingPulseCard({
  streakDays,
  githubCommits,
  leetCodeSolved,
  selectedDate,
}: CodingPulseCardProps) {
  const { data, isLoading } = useDashboard()
  const coding = data?.coding
  const heatmap = coding?.learningHeatmap ?? []

  // Live stats fetched from APIs
  const [liveGithub, setLiveGithub] = useState<number | null>(null)
  const [liveLeet, setLiveLeet] = useState<number | null>(null)
  const [liveStreak, setLiveStreak] = useState<number | null>(null)
  const [liveLoading, setLiveLoading] = useState(true)

  const anchorDate = selectedDate ?? new Date().toISOString().slice(0, 10)

  useEffect(() => {
    let cancelled = false
    setLiveLoading(true)

    Promise.allSettled([
      fetchGithubCommits7d(anchorDate),
      fetchLeetcodeSolved7d(anchorDate),
      fetchGithubStreak(anchorDate),
    ]).then(([gh, lc, str]) => {
      if (cancelled) return
      setLiveGithub(gh.status === 'fulfilled' ? gh.value : null)
      setLiveLeet(lc.status === 'fulfilled' ? lc.value : null)
      setLiveStreak(str.status === 'fulfilled' ? str.value : null)
      setLiveLoading(false)
    })

    return () => { cancelled = true }
  }, [anchorDate])

  // Prefer live API data; fall back to backend summary; fall back to 0
  const github  = liveGithub  ?? coding?.github?.solved  ?? githubCommits  ?? 0
  const leetcode = liveLeet   ?? coding?.leetCode?.solved ?? leetCodeSolved ?? 0
  const streak  = liveStreak  ?? coding?.stats?.streakDays ?? streakDays   ?? 0

  const loading = isLoading || liveLoading

  return (
    <section className="learnings-card learnings-coding-card">
      <p className="learnings-card-eyebrow">Coding pulse</p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
        <h3 className="learnings-card-title" style={{ margin: 0 }}>Platform activity</h3>
        {selectedDate && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(23,28,25,0.42)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            {formatDate(selectedDate)}
          </span>
        )}
      </div>

      <div className="learnings-coding-metrics">
        <a
          href={`https://github.com/${GITHUB_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="learnings-coding-metric"
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          id="coding-pulse-github-link"
        >
          <small>
            <GitBranch size={12} style={{ display: 'inline', marginRight: 4 }} />
            GitHub commits (7d)
          </small>
          <b>{loading ? '…' : github}</b>
        </a>
        <a
          href={`https://leetcode.com/u/${LEETCODE_USERNAME}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="learnings-coding-metric"
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          id="coding-pulse-leetcode-link"
        >
          <small>
            <Code2 size={12} style={{ display: 'inline', marginRight: 4 }} />
            LeetCode solved (7d)
          </small>
          <b>{loading ? '…' : leetcode}</b>
        </a>
        <div className="learnings-coding-metric">
          <small>
            <Flame size={12} style={{ display: 'inline', marginRight: 4 }} />
            Commit streak
          </small>
          <b>{loading ? '…' : `${streak}d`}</b>
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
