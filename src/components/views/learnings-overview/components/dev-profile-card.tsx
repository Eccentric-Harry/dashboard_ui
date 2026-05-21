import { useEffect, useState } from 'react'
import { GitBranch, Code2, Star, Users, BookOpen, Globe, Trophy, Zap } from 'lucide-react'

/* ─── Types ────────────────────────────────────────────────────────── */
interface GitHubProfile {
  login: string
  name: string
  avatar_url: string
  bio: string
  public_repos: number
  followers: number
  following: number
  html_url: string
  company: string | null
  blog: string | null
  location: string | null
}

interface LeetCodeStats {
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalQuestions: number
  ranking: number
  recentSubmissions: Array<{
    title: string
    titleSlug: string
    timestamp: string
    statusDisplay: string
    lang: string
  }>
  submissionCalendar: Record<string, number>
}

interface LeetCodeProfile {
  username: string
  name: string
  avatar: string
  ranking: number
  about: string
  country: string
  school: string
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const GITHUB_USERNAME = 'Eccentric-Harry'
const LEETCODE_USERNAME = 'harinathrao13'

/* ─── Helpers ───────────────────────────────────────────────────────── */
function calcActivityDots(calendar: Record<string, number>): { ts: number; count: number }[] {
  const now = Date.now() / 1000
  const fourWeeksAgo = now - 28 * 86400
  return Object.entries(calendar)
    .map(([ts, count]) => ({ ts: Number(ts), count }))
    .filter((e) => e.ts >= fourWeeksAgo)
    .sort((a, b) => a.ts - b.ts)
}

function dotColor(count: number): string {
  if (count === 0) return 'rgba(0,0,0,0.06)'
  if (count === 1) return 'rgba(255, 180, 60, 0.4)'
  if (count <= 3) return 'rgba(255, 160, 20, 0.65)'
  if (count <= 6) return 'rgba(255, 140, 10, 0.85)'
  return '#e07000'
}

/* ─── Sub-components ────────────────────────────────────────────────── */
function DifficultyBar({
  label,
  solved,
  total,
  color,
}: {
  label: string
  solved: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.min(100, (solved / total) * 100) : 0
  return (
    <div className="dev-diff-row">
      <span className="dev-diff-label">{label}</span>
      <div className="dev-diff-track">
        <div className="dev-diff-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="dev-diff-count">{solved}</span>
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export function DevProfileCard() {
  const [github, setGithub] = useState<GitHubProfile | null>(null)
  const [leetStats, setLeetStats] = useState<LeetCodeStats | null>(null)
  const [leetProfile, setLeetProfile] = useState<LeetCodeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'github' | 'leetcode'>('github')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [ghRes, lcStatsRes, lcProfRes] = await Promise.allSettled([
          fetch(`https://api.github.com/users/${GITHUB_USERNAME}`).then((r) => r.json()),
          fetch(`https://leetcode-api-faisalshohag.vercel.app/${LEETCODE_USERNAME}`).then((r) =>
            r.json()
          ),
          fetch(`https://alfa-leetcode-api.onrender.com/${LEETCODE_USERNAME}`).then((r) => r.json()),
        ])

        if (!cancelled) {
          if (ghRes.status === 'fulfilled') setGithub(ghRes.value)
          if (lcStatsRes.status === 'fulfilled') setLeetStats(lcStatsRes.value)
          if (lcProfRes.status === 'fulfilled') setLeetProfile(lcProfRes.value)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const activityDots = leetStats ? calcActivityDots(leetStats.submissionCalendar) : []
  const recentAccepted = leetStats?.recentSubmissions
    .filter((s) => s.statusDisplay === 'Accepted')
    .slice(0, 4) ?? []

  const LEET_EASY_TOTAL = 944
  const LEET_MED_TOTAL = 2057
  const LEET_HARD_TOTAL = 934

  return (
    <section className="learnings-card dev-profile-card">
      {/* Header */}
      <div className="dev-profile-header">
        <p className="learnings-card-eyebrow">Developer Profile</p>
        <div className="dev-profile-tabs">
          <button
            id="dev-tab-github"
            className={`dev-tab-btn${activeTab === 'github' ? ' active' : ''}`}
            onClick={() => setActiveTab('github')}
          >
            <GitBranch size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
            GitHub
          </button>
          <button
            id="dev-tab-leetcode"
            className={`dev-tab-btn${activeTab === 'leetcode' ? ' active' : ''}`}
            onClick={() => setActiveTab('leetcode')}
          >
            <Code2 size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
            LeetCode
          </button>
        </div>
      </div>

      {loading ? (
        <div className="dev-skeleton-wrap">
          <div className="dev-skeleton dev-skeleton--avatar" />
          <div style={{ flex: 1 }}>
            <div className="dev-skeleton dev-skeleton--line" style={{ width: '60%' }} />
            <div className="dev-skeleton dev-skeleton--line" style={{ width: '40%', marginTop: 6 }} />
          </div>
        </div>
      ) : activeTab === 'github' ? (
        /* ── GitHub tab ─────────────────────────────────────── */
        <div className="dev-tab-content">
          {github && (
            <>
              {/* Profile identity */}
              <div className="dev-identity">
                <img
                  src={github.avatar_url}
                  alt={github.name || github.login}
                  className="dev-avatar"
                />
                <div className="dev-identity-info">
                  <strong className="dev-name">{github.name || github.login}</strong>
                  <a
                    href={github.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dev-handle"
                  >
                    @{github.login}
                  </a>
                  {github.bio && <p className="dev-bio">{github.bio}</p>}
                </div>
              </div>

              {/* Meta pills */}
              <div className="dev-meta-pills">
                {github.location && (
                  <span className="dev-meta-pill">
                    <Globe size={10} style={{ display: 'inline', marginRight: 3 }} />
                    {github.location}
                  </span>
                )}
                {github.company && (
                  <span className="dev-meta-pill">🏢 {github.company}</span>
                )}
                {github.blog && (
                  <a
                    href={github.blog.startsWith('http') ? github.blog : `https://${github.blog}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dev-meta-pill dev-meta-pill--link"
                  >
                    🔗 Blog
                  </a>
                )}
              </div>

              {/* Stats grid */}
              <div className="dev-gh-stats">
                <div className="dev-gh-stat">
                  <BookOpen size={14} className="dev-gh-stat-icon" style={{ color: '#1a7a4a' }} />
                  <strong>{github.public_repos}</strong>
                  <span>Repos</span>
                </div>
                <div className="dev-gh-stat">
                  <Users size={14} className="dev-gh-stat-icon" style={{ color: '#4f46e5' }} />
                  <strong>{github.followers}</strong>
                  <span>Followers</span>
                </div>
                <div className="dev-gh-stat">
                  <Star size={14} className="dev-gh-stat-icon" style={{ color: '#d97706' }} />
                  <strong>{github.following}</strong>
                  <span>Following</span>
                </div>
              </div>

              {/* Contribution heatmap preview */}
              <div className="dev-gh-contrib-label">
                <Zap size={11} style={{ display: 'inline', marginRight: 4, color: '#1a7a4a' }} />
                Live contribution graph
              </div>
              <img
                src={`https://ghchart.rshah.org/1a7a4a/${GITHUB_USERNAME}`}
                alt="GitHub contributions"
                className="dev-gh-chart"
                loading="lazy"
              />

              <a
                href={github.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="dev-cta-link"
                id="dev-gh-profile-link"
              >
                View full profile ↗
              </a>
            </>
          )}
        </div>
      ) : (
        /* ── LeetCode tab ───────────────────────────────────── */
        <div className="dev-tab-content">
          {/* Identity */}
          <div className="dev-identity">
            {leetProfile?.avatar && (
              <img
                src={leetProfile.avatar}
                alt={leetProfile.name || LEETCODE_USERNAME}
                className="dev-avatar"
              />
            )}
            <div className="dev-identity-info">
              <strong className="dev-name">{leetProfile?.name || LEETCODE_USERNAME}</strong>
              <a
                href={`https://leetcode.com/u/${LEETCODE_USERNAME}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="dev-handle"
              >
                @{LEETCODE_USERNAME}
              </a>
              {leetProfile?.about && <p className="dev-bio">{leetProfile.about}</p>}
            </div>
          </div>

          {/* Meta pills */}
          <div className="dev-meta-pills">
            {leetProfile?.country && (
              <span className="dev-meta-pill">🌏 {leetProfile.country}</span>
            )}
            {leetProfile?.school && (
              <span className="dev-meta-pill">🎓 {leetProfile.school}</span>
            )}
            {leetStats && (
              <span className="dev-meta-pill">
                <Trophy size={10} style={{ display: 'inline', marginRight: 3 }} />
                #{leetStats.ranking.toLocaleString()}
              </span>
            )}
          </div>

          {/* Total solved ring */}
          {leetStats && (
            <div className="dev-leet-overview">
              <div className="dev-leet-ring-wrap">
                <svg viewBox="0 0 42 42" className="dev-leet-ring">
                  <circle cx="21" cy="21" r="15.915" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    strokeDasharray={`${(leetStats.totalSolved / leetStats.totalQuestions) * 100} ${100 - (leetStats.totalSolved / leetStats.totalQuestions) * 100}`}
                    strokeDashoffset="25"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="dev-leet-ring-center">
                  <strong>{leetStats.totalSolved}</strong>
                  <span>solved</span>
                </div>
              </div>

              {/* Difficulty breakdown */}
              <div className="dev-diff-bars">
                <DifficultyBar
                  label="Easy"
                  solved={leetStats.easySolved}
                  total={LEET_EASY_TOTAL}
                  color="#22c55e"
                />
                <DifficultyBar
                  label="Med"
                  solved={leetStats.mediumSolved}
                  total={LEET_MED_TOTAL}
                  color="#f59e0b"
                />
                <DifficultyBar
                  label="Hard"
                  solved={leetStats.hardSolved}
                  total={LEET_HARD_TOTAL}
                  color="#ef4444"
                />
              </div>
            </div>
          )}

          {/* Submission heatmap (28d) */}
          {activityDots.length > 0 && (
            <div className="dev-leet-heatmap-wrap">
              <p className="dev-leet-heatmap-label">
                <Zap size={11} style={{ display: 'inline', marginRight: 4, color: '#f59e0b' }} />
                Last 28 days activity
              </p>
              <div className="dev-leet-heatmap">
                {activityDots.map((d) => (
                  <div
                    key={d.ts}
                    className="dev-leet-dot"
                    title={`${new Date(d.ts * 1000).toLocaleDateString()}: ${d.count} submissions`}
                    style={{ background: dotColor(d.count) }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent accepted */}
          {recentAccepted.length > 0 && (
            <div className="dev-leet-recent">
              <p className="dev-leet-recent-label">Recent solved</p>
              {recentAccepted.map((s, i) => (
                <a
                  key={`${s.titleSlug}-${i}`}
                  href={`https://leetcode.com/problems/${s.titleSlug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dev-leet-recent-item"
                >
                  <span className="dev-leet-recent-badge">✓</span>
                  <span className="dev-leet-recent-title">{s.title}</span>
                  <span className="dev-leet-recent-lang">{s.lang}</span>
                </a>
              ))}
            </div>
          )}

          <a
            href={`https://leetcode.com/u/${LEETCODE_USERNAME}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="dev-cta-link dev-cta-link--leet"
            id="dev-leet-profile-link"
          >
            View LeetCode profile ↗
          </a>
        </div>
      )}
    </section>
  )
}
