import { GitBranch, Code2, Star, Users, BookOpen, Globe, Trophy, Zap } from 'lucide-react'
import {
  dummyGithubProfile,
  dummyGithubRepos,
  dummyLeetcodeStats,
  dummyLeetcodeProfile,
} from '../../../../data/dummydata'

export interface GithubProfile {
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

export interface GithubRepo {
  id: number
  name: string
  html_url: string
  language: string
}

export interface LeetcodeStats {
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalQuestions: number
  ranking: number
  recentSubmissions: { title: string; titleSlug: string; timestamp: string; statusDisplay: string; lang: string }[]
  submissionCalendar: Record<string, number>
}

export interface LeetcodeProfile {
  username: string
  name: string
  avatar: string
  ranking: number
  about: string
  country: string | null
  school: string | null
}

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

/* ─── GitHub Profile Card Component ─────────────────────────────────── */
export function GitHubProfileCard({ profile, repos }: { profile?: GithubProfile; repos?: GithubRepo[] }) {
  const github = profile ?? dummyGithubProfile
  const repoList = repos ?? dummyGithubRepos

  return (
    <section className="learnings-card dev-profile-card learnings-github-card">
      <div className="dev-profile-header">
        <div>
          <p className="learnings-card-eyebrow">GITHUB PROFILE</p>
          <h3 className="learnings-card-title text-sm font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
            <GitBranch size={15} className="text-[#1a7a4a]" />
            Contributions & Repos
          </h3>
        </div>
      </div>

      <div className="dev-tab-content">
        {/* Profile identity */}
        <div className="dev-identity">
          {github.avatar_url ? (
            <img
              src={github.avatar_url}
              alt={github.name || github.login}
              className="dev-avatar"
            />
          ) : (
            <div className="dev-avatar-fallback dev-avatar-fallback--github">
              <GitBranch size={22} />
            </div>
          )}
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
        <div className="dev-meta-pills" style={{ marginTop: 2 }}>
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
        <div className="dev-gh-stats" style={{ marginTop: 4 }}>
          <div className="dev-gh-stat">
            <BookOpen size={12} className="dev-gh-stat-icon" style={{ color: '#1a7a4a' }} />
            <strong>{github.public_repos}</strong>
            <span>Repos</span>
          </div>
          <div className="dev-gh-stat">
            <Users size={12} className="dev-gh-stat-icon" style={{ color: '#0369a1' }} />
            <strong>{github.followers}</strong>
            <span>Followers</span>
          </div>
          <div className="dev-gh-stat">
            <Star size={12} className="dev-gh-stat-icon" style={{ color: '#d97706' }} />
            <strong>{github.following}</strong>
            <span>Following</span>
          </div>
        </div>

        {/* Recent repos list */}
        {repoList.length > 0 && (
          <div className="dev-gh-recent" style={{ marginTop: 4 }}>
            <p className="dev-gh-recent-label">Recent repositories</p>
            <div className="dev-gh-recent-list">
              {repoList.slice(0, 3).map((repo) => (
                <a
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dev-gh-recent-item"
                >
                  <span className="dev-gh-recent-badge">✓</span>
                  <span className="dev-gh-recent-title truncate">{repo.name}</span>
                  {repo.language && (
                    <span className="dev-gh-recent-lang">{repo.language}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        <a
          href={github.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="dev-cta-link text-xs font-semibold"
          id="dev-gh-profile-link"
        >
          View full profile ↗
        </a>
      </div>
    </section>
  )
}

/* ─── LeetCode Profile Card Component ───────────────────────────────── */
export function LeetCodeProfileCard({ stats, profile }: { stats?: LeetcodeStats; profile?: LeetcodeProfile }) {
  const leetStats = stats ?? dummyLeetcodeStats
  const leetProfile = profile ?? dummyLeetcodeProfile

  const activityDots = leetStats?.submissionCalendar ? calcActivityDots(leetStats.submissionCalendar) : []
  const recentAccepted = leetStats?.recentSubmissions
    .filter((s) => s.statusDisplay === 'Accepted')
    .slice(0, 3) ?? []

  const LEET_EASY_TOTAL = 944
  const LEET_MED_TOTAL = 2057
  const LEET_HARD_TOTAL = 934

  return (
    <section className="learnings-card dev-profile-card learnings-leetcode-card">
      <div className="dev-profile-header">
        <div>
          <p className="learnings-card-eyebrow">LEETCODE PROFILE</p>
          <h3 className="learnings-card-title text-sm font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
            <Code2 size={15} className="text-[#f59e0b]" />
            DSA Stats & Submissions
          </h3>
        </div>
      </div>

      <div className="dev-tab-content">
        {/* Identity */}
        <div className="dev-identity">
          {leetProfile?.avatar ? (
            <img
              src={leetProfile.avatar}
              alt={leetProfile.name}
              className="dev-avatar"
            />
          ) : (
            <div className="dev-avatar-fallback dev-avatar-fallback--leetcode">
              <Code2 size={22} />
            </div>
          )}
          <div className="dev-identity-info">
            <strong className="dev-name">{leetProfile?.name}</strong>
            <span className="dev-handle">@{leetProfile?.username}</span>
            {leetProfile?.about && <p className="dev-bio">{leetProfile.about}</p>}
          </div>
        </div>

        {/* Meta pills */}
        <div className="dev-meta-pills" style={{ marginTop: 2 }}>
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

        {/* Total solved ring & Difficulty breakdown */}
        <div className="dev-leet-overview" style={{ marginTop: 4 }}>
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

        {/* Submission heatmap (28d) */}
        {activityDots.length > 0 && (
          <div className="dev-leet-heatmap-wrap" style={{ marginTop: 4 }}>
            <p className="dev-leet-heatmap-label">
              <Zap size={10} style={{ display: 'inline', marginRight: 3, color: '#f59e0b' }} />
              Last 28 days activity
            </p>
            <div className="dev-leet-heatmap" style={{ marginTop: 2 }}>
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

        {/* Recent accepted solved list */}
        {recentAccepted.length > 0 && (
          <div className="dev-leet-recent" style={{ marginTop: 4 }}>
            <p className="dev-leet-recent-label">Recent solved</p>
            <div className="dev-leet-recent-list">
              {recentAccepted.map((s, i) => (
                <a
                  key={`${s.titleSlug}-${i}`}
                  href={`https://leetcode.com/problems/${s.titleSlug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dev-leet-recent-item"
                >
                  <span className="dev-leet-recent-badge">✓</span>
                  <span className="dev-leet-recent-title truncate">{s.title}</span>
                  <span className="dev-leet-recent-lang">{s.lang}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
