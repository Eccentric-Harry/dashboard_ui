// "Learn with AI": builds a context-rich tutoring prompt for one pursuit step, a
// standing context document for a Claude Project, and pulls the takeaways block back
// out of the reply. Paste-only by design — nothing here calls an AI service.
import type { LearningPursuit, PursuitStep } from '@/types/learnings'
import { childrenOf, formatMinutes } from './pursuit-tree'

export type TutorMode = 'explain' | 'practice' | 'quiz' | 'stuck'

export const TUTOR_MODES: { value: TutorMode; label: string; description: string }[] = [
  { value: 'explain', label: 'Explain', description: 'First principles, code in your stack, a diagram, one exercise' },
  { value: 'practice', label: 'Practice', description: 'Hands-on problems — hints before answers' },
  { value: 'quiz', label: 'Quiz me', description: 'Check what you have finished so far' },
  { value: 'stuck', label: "I'm stuck", description: 'Paste code or an error and work through it' },
]

/**
 * Starting draft of "About you" for the signed-in owner until they save their own —
 * written from what's known about them so the form needs a review, not a blank page.
 * Guests start blank (see LearnWithAiModal).
 */
export const DEFAULT_LEARNER_PROFILE = `Background: Full-stack developer. I build and run my own "Life OS" dashboard — React 19 + TypeScript, Vite, Tailwind CSS 4, Zustand + Immer and Axios on the frontend; Spring Boot 4 on Java 21 with MongoDB on the backend.
Already comfortable with: React components and hooks, TypeScript types, REST APIs, Spring Boot services and MongoDB documents. I use tools like Zustand every day but want to understand how they work underneath.
How I learn best: step by step, from first principles — the mental model first, then a small runnable example in my stack, then a diagram when there's a flow or structure.
Time: about an hour on weekday evenings, longer sessions at weekends.
What I want from explanations: short, structured answers rather than walls of text, code snippets I can run, illustrations or Mermaid diagrams, the common mistakes, and one exercise to check I really understood.`

export const LEARNER_PROFILE_PLACEHOLDER = `Background: e.g. full-stack developer, 3 years in React + TypeScript, Spring Boot on the backend
Already comfortable with: …
How I learn best: e.g. code first, then the why; real examples over theory
What I want from explanations: e.g. first principles, diagrams, common mistakes`

/** Ancestors of a step, outermost first; empty when it is top-level or missing. */
export function stepTrail(steps: PursuitStep[], stepId: string, trail: PursuitStep[] = []): PursuitStep[] {
  for (const step of steps) {
    if (step.id === stepId) return trail
    const nested = stepTrail(childrenOf(step), stepId, [...trail, step])
    if (nested.length > trail.length || childrenOf(step).some((c) => c.id === stepId)) return nested
  }
  return trail.length ? [] : trail
}

function renderOutline(steps: PursuitStep[], currentId: string | null, depth = 0, lines: string[] = []): string[] {
  for (const step of steps) {
    const children = childrenOf(step)
    const mark = step.isCompleted ? '✓' : step.id === currentId ? '▶' : '○'
    const estimate = children.length === 0 && step.estimateMinutes ? ` (${formatMinutes(step.estimateMinutes)})` : ''
    const here = step.id === currentId ? '   ← this session' : ''
    lines.push(`${'  '.repeat(depth)}${mark} ${step.text}${estimate}${here}`)
    renderOutline(children, currentId, depth + 1, lines)
  }
  return lines
}

function aboutMe(learnerProfile: string): string {
  return learnerProfile.trim()
    ? learnerProfile.trim()
    : '(No learner profile yet. Before teaching, ask me two short questions about my background and how I like to learn.)'
}

function pursuitHeader(pursuit: LearningPursuit): string {
  return [`Pursuit: ${pursuit.title} (${pursuit.category})`, pursuit.goal ? `My goal: ${pursuit.goal}` : null]
    .filter(Boolean)
    .join('\n')
}

const TAKEAWAYS_INSTRUCTION = `Finish with a takeaways block exactly like this — 3 to 5 bullets, each under 20 words — so I can save it to my tracker:
\`\`\`takeaways
- …
\`\`\``

const MODE_INSTRUCTIONS: Record<TutorMode, (minutes: string) => string> = {
  explain: (minutes) => `## What I want
1. Start from first principles: the problem this solves and the mental model, in plain language.
2. Show a small, runnable code example in the stack from my profile (TypeScript if unsure), commenting only the lines that matter.
3. If a flow, structure or lifecycle is involved, include a diagram as a \`\`\`mermaid code block.
4. Point out the one or two mistakes people most often make here.
5. End with one short exercise I can finish within ${minutes} — no solution.
${TAKEAWAYS_INSTRUCTION}`,
  practice: (minutes) => `## What I want
1. Give me 2–3 hands-on exercises for this step, easiest first, sized to fit ${minutes} in total.
2. For each: the goal, starter code or setup, and what "done" looks like.
3. Do not show solutions. When I reply with an attempt, review it and give hints before answers.
4. When I say "wrap up", ${TAKEAWAYS_INSTRUCTION.charAt(0).toLowerCase()}${TAKEAWAYS_INSTRUCTION.slice(1)}`,
  quiz: () => `## What I want
1. Quiz me on the steps marked ✓ plus this step: 6 questions mixing concepts, "predict the output" code, and one "explain it to a junior developer".
2. Ask one question at a time and wait for my answer. After each, say what I got right and exactly what to revisit.
3. After the last question, ${TAKEAWAYS_INSTRUCTION.charAt(0).toLowerCase()}${TAKEAWAYS_INSTRUCTION.slice(1)}`,
  stuck: () => `## What I want
1. Ask at most one clarifying question, and only if you truly need it.
2. Guide me with hints first, from the smallest nudge to bigger ones; give the full fix only if I ask.
3. Name the underlying concept I was missing so this doesn't happen again.
${TAKEAWAYS_INSTRUCTION}`,
}

export interface TutorPromptOptions {
  mode: TutorMode
  pursuit: LearningPursuit
  step: PursuitStep
  minutes: number
  learnerProfile: string
  stuckDetail?: string
}

export function buildTutorPrompt({ mode, pursuit, step, minutes, learnerProfile, stuckDetail }: TutorPromptOptions): string {
  const trail = stepTrail(pursuit.steps, step.id)
  const time = formatMinutes(minutes)
  const sessionLines = [
    `Step: ${[...trail.map((t) => t.text), step.text].join(' › ')}`,
    step.note ? `Note on this step: ${step.note}` : null,
    step.resumeNote ? `Where I left off last time: ${step.resumeNote}` : null,
    step.spentMinutes ? `Time already spent on it: ${formatMinutes(step.spentMinutes)}` : null,
    `Time I have now: ${time}`,
  ].filter(Boolean)

  const stuckBlock =
    mode === 'stuck' && stuckDetail?.trim() ? `\n## Where I'm stuck\n\`\`\`\n${stuckDetail.trim()}\n\`\`\`\n` : ''

  return `You're my personal tutor for one focused study session. Teach me — don't just summarise.

## About me
${aboutMe(learnerProfile)}

## What I'm learning
${pursuitHeader(pursuit)}
Plan (✓ done, ▶ this session, ○ later):
${renderOutline(pursuit.steps, step.id).join('\n')}

## This session
${sessionLines.join('\n')}
${stuckBlock}
${MODE_INSTRUCTIONS[mode](time)}

## Ground rules
- Stay inside this step. Don't teach later steps in the plan; mention them only where they matter here.
- Match my level and skip what my profile says I already know.
- Keep it tight enough to finish in ${time}.`
}

/** Standing context for a Claude Project: who I am, the plan, and how to teach me. */
export function buildProjectContext({ pursuit, learnerProfile }: { pursuit: LearningPursuit; learnerProfile: string }): string {
  return `# Learning context

Use this as standing context for every chat in this project. I'll start each session by naming the step I'm on.

## About me
${aboutMe(learnerProfile)}

## What I'm learning
${pursuitHeader(pursuit)}
Plan (✓ done, ○ not yet):
${renderOutline(pursuit.steps, null).join('\n')}

## How to teach me
- Teach from first principles, with runnable code in my stack and a \`\`\`mermaid diagram when a flow or structure is involved.
- Stay within the step I name; don't jump ahead in the plan.
- Prefer exercises that produce something, and give hints before answers.
- ${TAKEAWAYS_INSTRUCTION.replace('\n', '\n  ')}`
}

const TAKEAWAYS_BLOCK = /```[ \t]*takeaways[ \t]*\r?\n([\s\S]*?)```/i

export const hasTakeawaysBlock = (text: string) => TAKEAWAYS_BLOCK.test(text)

/** The takeaways block's lines when present; otherwise the pasted text itself, tidied. */
export function extractTakeaways(text: string): string {
  const match = text.match(TAKEAWAYS_BLOCK)
  const body = match ? match[1] : text
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)
}
