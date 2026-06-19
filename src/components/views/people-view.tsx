import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BadgeCheck,
  Coffee,
  type LucideIcon,
  Target,
  X,
} from 'lucide-react'

import avatarOne from '../../assets/avatars/avatar1.png'
import avatarTwo from '../../assets/avatars/avatar2.png'
import avatarThree from '../../assets/avatars/avatar3.png'
import avatarFour from '../../assets/avatars/avatar4.png'
import avatarFive from '../../assets/reference-crops/avatar.png'
import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'
import './people-view.css'

interface SeniorInteraction {
  id: string
  name: string
  role: string
  avatarUrl: string
  date: string
  highlightQuote: string
  tags: string[]
  feedback: {
    strengths: string[]
    improvements: string[]
  }
  funnyIncident?: string
}

const seniorInteractions: SeniorInteraction[] = [
  {
    id: 'anika-release-review',
    name: 'Anika Rao',
    role: 'Principal Frontend Engineer',
    avatarUrl: avatarOne,
    date: '18 Jun 2026',
    highlightQuote:
      'Your UI instincts are sharp. The next level is making every state feel inevitable, not merely beautiful.',
    tags: ['Design systems', 'State quality', 'Frontend craft'],
    feedback: {
      strengths: [
        'Transforms ambiguous product asks into calm, navigable interfaces without losing the user goal.',
        'Strong eye for spacing, hierarchy, and small interaction details that make complex dashboards feel lighter.',
        'Excellent at quickly spotting visual regressions before they become review churn.',
      ],
      improvements: [
        'Write state matrices before building modal-heavy flows so empty, loading, failure, and offline states are intentional.',
        'Document component contracts earlier when a pattern is likely to be reused across multiple routes.',
      ],
    },
    funnyIncident:
      'During a design review, Anika called a misaligned status chip "a tiny table wobble." The phrase stuck, and now every pixel-nudge PR gets one approving wobble check.',
  },
  {
    id: 'marcus-architecture',
    name: 'Marcus Ellison',
    role: 'Staff Platform Architect',
    avatarUrl: avatarTwo,
    date: '11 Jun 2026',
    highlightQuote:
      'You debug like someone reading intent, not just stack traces. Keep that, but leave better breadcrumbs for everyone else.',
    tags: ['Architecture', 'Observability', 'Systems thinking'],
    feedback: {
      strengths: [
        'Patient root-cause analysis across frontend, API, and deployment layers.',
        'Comfortable challenging assumptions when a bug looks obvious but the evidence says otherwise.',
      ],
      improvements: [
        'Add sharper telemetry around user-facing retries and background sync paths.',
        'Prefer small architecture decision records for tradeoffs that will surprise a future maintainer.',
        'When proposing a migration, pair the ideal end state with a cheaper rollback plan.',
      ],
    },
  },
  {
    id: 'priya-product-feedback',
    name: 'Priya Menon',
    role: 'Senior Product Lead',
    avatarUrl: avatarThree,
    date: '30 May 2026',
    highlightQuote:
      'You have a rare habit of protecting momentum and taste at the same time.',
    tags: ['Product judgment', 'Prioritization', 'User empathy'],
    feedback: {
      strengths: [
        'Frames tradeoffs in plain language that helps product, design, and engineering make decisions together.',
        'Keeps scope honest without draining ambition from the work.',
        'Brings useful prototypes to conversations instead of only presenting opinions.',
      ],
      improvements: [
        'Surface dependency risk earlier when a shiny user experience relies on uncertain backend readiness.',
        'For executive demos, lead with the user change before showing implementation polish.',
      ],
    },
    funnyIncident:
      'Priya still mentions the time the demo data had "Meditate with CFO" scheduled at 2 AM. It somehow became the team shorthand for suspicious seed data.',
  },
  {
    id: 'daniel-code-review',
    name: 'Daniel Cho',
    role: 'Engineering Manager',
    avatarUrl: avatarFour,
    date: '22 May 2026',
    highlightQuote:
      'The code is thoughtful. Now make the review surface smaller so your ideas travel faster.',
    tags: ['Code review', 'Delivery', 'Team leverage'],
    feedback: {
      strengths: [
        'Breaks down complicated UI problems into shippable increments without losing sight of the cohesive product.',
        'Mentors through examples, especially around naming, component boundaries, and pragmatic testing.',
      ],
      improvements: [
        'Open draft PRs earlier when the shape is clear but the final styling is still moving.',
        'Include a compact verification note so reviewers know exactly what behavior was exercised.',
        'Resist bundling cleanup with feature work unless it directly reduces the feature risk.',
      ],
    },
  },
  {
    id: 'lena-security-memory',
    name: 'Lena Fischer',
    role: 'Security Engineering Lead',
    avatarUrl: avatarFive,
    date: '09 May 2026',
    highlightQuote:
      'You ask security questions like a product person, which is exactly why they land.',
    tags: ['Security', 'Trust', 'Review habits'],
    feedback: {
      strengths: [
        'Spots privacy and permission implications inside everyday product flows.',
        'Balances caution with user experience instead of treating security as a late gate.',
        'Clear written summaries after review meetings help teams act without re-litigating context.',
      ],
      improvements: [
        'Add threat-model notes to routes that store personal data or sensitive histories.',
        'Create reusable copy patterns for destructive actions, exports, and third-party integrations.',
      ],
    },
    funnyIncident:
      'Lena once approved a launch after saying, "I am emotionally prepared to trust this button." It became the highest compliment a CTA could receive.',
  },
  {
    id: 'zack-security',
    name: 'Zack Chen',
    role: 'Senior Security Specialist',
    avatarUrl: avatarTwo,
    date: '24 Apr 2026',
    highlightQuote:
      'Secure by design is cheaper than secure by audit. You nailed the balance here.',
    tags: ['Security', 'API safety', 'Risk mitigation'],
    feedback: {
      strengths: [
        'Proactively designs APIs with principle of least privilege in mind.',
        'Helps frontend engineers understand secure cookie and token workflows without friction.',
      ],
      improvements: [
        'Run automated secret scanners in developer pre-commit hooks.',
        'Encourage teammates to rotate test credentials on a regular schedule.',
      ],
    },
  },
  {
    id: 'emily-design-system',
    name: 'Emily Watson',
    role: 'Design Systems Lead',
    avatarUrl: avatarThree,
    date: '15 Apr 2026',
    highlightQuote:
      'Your component boundaries are clean. A pleasure to consume and build on top of.',
    tags: ['Design systems', 'React craft', 'Refactoring'],
    feedback: {
      strengths: [
        'Maintains high visual fidelity when implementing complex responsive layouts.',
        'Advocates for accessibility standards in component libraries.',
      ],
      improvements: [
        'Provide interactive stories or documentation for custom hook lifecycle side effects.',
        'Establish clearer guidelines on when to extend a component versus creating a new variant.',
      ],
    },
  },
  {
    id: 'vikram-management',
    name: 'Vikram Malhotra',
    role: 'VP of Engineering',
    avatarUrl: avatarFour,
    date: '02 Apr 2026',
    highlightQuote:
      'Excellent focus on user-centric telemetry. The business feels the impact of this stability.',
    tags: ['Telemetry', 'Performance', 'Team scale'],
    feedback: {
      strengths: [
        'Links raw engineering efforts to tangible user-satisfaction metrics.',
        'Excellent at helping new engineers navigate architectural patterns during onboarding.',
      ],
      improvements: [
        'Delegate high-level architectural proposals to senior peers to grow their ownership.',
        'Provide regular quarterly roadmap summaries to cross-functional stakeholders.',
      ],
    },
  },
  {
    id: 'sofia-data',
    name: 'Sofia Alvarez',
    role: 'Staff Data Engineer',
    avatarUrl: avatarFive,
    date: '22 Mar 2026',
    highlightQuote:
      'Your database access patterns are optimal for a frontend engineer. Great database empathy.',
    tags: ['Database', 'Caching', 'Optimizations'],
    feedback: {
      strengths: [
        'Designs normalized Redux/Zustand frontend state mirroring relational databases.',
        'Optimizes redundant API refetches with local storage or state-based memoization.',
      ],
      improvements: [
        'Document schema relationships in data model migrations for frontend caching strategies.',
        'Reduce payload sizes by requesting only required fields from primary indexes.',
      ],
    },
  },
]

const tagTones = ['mint', 'sky', 'amber', 'rose', 'violet'] as const

function getTagTone(tag: string) {
  const charTotal = tag.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  return tagTones[charTotal % tagTones.length]
}

type PeopleOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function PeopleOverview({ activePath, onNavigate }: PeopleOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage people-stage" aria-label="Mentorship and interactions log">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <PeopleDashboard />
      </div>
    </main>
  )
}

function PeopleDashboard() {
  const [selectedInteraction, setSelectedInteraction] = useState<SeniorInteraction | null>(null)

  useEffect(() => {
    if (!selectedInteraction) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedInteraction(null)
      }
    }

    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedInteraction])

  return (
    <section className="people-dashboard" aria-label="Mentorship and memories">
      <header className="people-header">
        <div className="people-header-title">
          <p>People archive</p>
          <h1>Mentorship &amp; Memories</h1>
        </div>
      </header>

      <div className="people-collage">
        {seniorInteractions.map((interaction, index) => (
          <InteractionCard
            key={interaction.id}
            interaction={interaction}
            index={index}
            onSelect={() => setSelectedInteraction(interaction)}
          />
        ))}
      </div>

      {selectedInteraction && (
        <InteractionModal interaction={selectedInteraction} onClose={() => setSelectedInteraction(null)} />
      )}
    </section>
  )
}

type InteractionCardProps = {
  interaction: SeniorInteraction
  index: number
  onSelect: () => void
}

function InteractionCard({ interaction, index, onSelect }: InteractionCardProps) {
  const variantIndex = index % 5

  if (variantIndex === 0) {
    return (
      <button type="button" className="people-card people-card--v1" onClick={onSelect}>
        <div className="people-card-quote-floating">“</div>
        <div className="people-card-header">
          <img src={interaction.avatarUrl} alt={interaction.name} className="people-card-avatar" />
          <div className="people-card-identity">
            <strong>{interaction.name}</strong>
            <small>{interaction.role}</small>
          </div>
        </div>
        <blockquote className="people-card-quote-text">{interaction.highlightQuote}</blockquote>
        <div className="people-tags">
          {interaction.tags.map((tag) => (
            <span key={tag} className={`people-tag people-tag--${getTagTone(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
      </button>
    )
  }

  if (variantIndex === 1) {
    return (
      <button type="button" className="people-card people-card--v2" onClick={onSelect}>
        <img src={interaction.avatarUrl} alt={interaction.name} className="people-card-avatar-top" />
        <div className="people-card-content">
          <div className="people-card-identity">
            <strong>{interaction.name}</strong>
            <small>{interaction.role}</small>
          </div>
          <blockquote className="people-card-quote-text">{interaction.highlightQuote}</blockquote>
          <div className="people-tags">
            {interaction.tags.map((tag) => (
              <span key={tag} className={`people-tag people-tag--${getTagTone(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="people-card-quote-floating-bottom">”</div>
      </button>
    )
  }

  if (variantIndex === 2) {
    return (
      <button type="button" className="people-card people-card--v3" onClick={onSelect}>
        <div className="people-card-split-image" style={{ backgroundImage: `url(${interaction.avatarUrl})` }} />
        <div className="people-card-split-content">
          <div className="people-card-identity">
            <strong>{interaction.name}</strong>
            <small>{interaction.role}</small>
          </div>
          <blockquote className="people-card-quote-text">{interaction.highlightQuote}</blockquote>
          <div className="people-tags">
            {interaction.tags.map((tag) => (
              <span key={tag} className={`people-tag people-tag--${getTagTone(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </button>
    )
  }

  if (variantIndex === 3) {
    return (
      <button type="button" className="people-card people-card--v4" onClick={onSelect}>
        <div className="people-card-identity centered">
          <strong>{interaction.name}</strong>
          <small>{interaction.role}</small>
        </div>
        <blockquote className="people-card-quote-text centered">“{interaction.highlightQuote}”</blockquote>
        <div className="people-tags centered">
          {interaction.tags.map((tag) => (
            <span key={tag} className={`people-tag people-tag--${getTagTone(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
        <div className="people-avatar-stack">
          <img src={interaction.avatarUrl} alt={interaction.name} className="people-stack-avatar" />
          <img src={avatarThree} alt="Priya Menon" className="people-stack-avatar" />
          <img src={avatarTwo} alt="Marcus Ellison" className="people-stack-avatar" />
        </div>
      </button>
    )
  }

  // variantIndex === 4 (Variant 5 / default)
  return (
    <button type="button" className="people-card people-card--v5" onClick={onSelect}>
      <div className="people-bubble-body">
        <blockquote className="people-card-quote-text">{interaction.highlightQuote}</blockquote>
        <div className="people-tags">
          {interaction.tags.map((tag) => (
            <span key={tag} className={`people-tag people-tag--${getTagTone(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
        <div className="people-bubble-tail" />
      </div>
      <div className="people-bubble-author">
        <img src={interaction.avatarUrl} alt={interaction.name} className="people-bubble-avatar" />
        <div className="people-bubble-identity">
          <strong>{interaction.name}</strong>
          <small>{interaction.role}</small>
        </div>
      </div>
    </button>
  )
}

type InteractionModalProps = {
  interaction: SeniorInteraction
  onClose: () => void
}

function InteractionModal({ interaction, onClose }: InteractionModalProps) {
  return createPortal(
    <div className="people-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="people-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="people-modal-close" onClick={onClose} aria-label="Close mentorship log">
          <X size={18} />
        </button>

        <header className="people-modal-hero">
          <img className="people-modal-avatar" src={interaction.avatarUrl} alt={interaction.name} />
          
          <div className="people-modal-identity">
            <h2 id="people-modal-title">{interaction.name}</h2>
            <p>{interaction.role}</p>
          </div>
        </header>

        <section className="people-modal-statement">
          <div className="quote-mark left">“</div>
          <blockquote className="people-modal-quote">{interaction.highlightQuote}</blockquote>
          <div className="quote-mark right">”</div>
        </section>

        <div className="people-modal-tags">
          {interaction.tags.map((tag) => (
            <span key={tag} className={`people-tag people-tag--${getTagTone(tag)}`}>
              {tag}
            </span>
          ))}
        </div>

        <div className="people-detail-grid">
          <FeedbackBlock
            title="What they like"
            subtitle="Strengths"
            icon={BadgeCheck}
            items={interaction.feedback.strengths}
            tone="strength"
          />
          <FeedbackBlock
            title="Areas for growth"
            subtitle="Action items"
            icon={Target}
            items={interaction.feedback.improvements}
            tone="growth"
          />
        </div>

        {interaction.funnyIncident && (
          <section className="people-watercooler">
            <div className="people-watercooler-icon">
              <Coffee size={18} />
            </div>
            <div>
              <span>Watercooler</span>
              <p>{interaction.funnyIncident}</p>
            </div>
          </section>
        )}
      </article>
    </div>,
    document.body
  )
}

type FeedbackBlockProps = {
  title: string
  subtitle: string
  icon: LucideIcon
  items: string[]
  tone: 'strength' | 'growth'
}

function FeedbackBlock({ title, subtitle, icon: Icon, items, tone }: FeedbackBlockProps) {
  return (
    <section className={`people-feedback-card ${tone}`}>
      <div className="people-feedback-head">
        <span>
          <Icon size={18} />
        </span>
        <div>
          <small>{subtitle}</small>
          <h3>{title}</h3>
        </div>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export { PeopleOverview }
