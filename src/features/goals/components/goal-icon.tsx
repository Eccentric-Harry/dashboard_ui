import { createElement } from 'react'
import type { LucideProps } from 'lucide-react'
import { goalIcon } from '../goal-icons'

/** A goal's icon by its stored key (unknown keys fall back to a target). */
function GoalIcon({ icon, ...props }: LucideProps & { icon: string | null | undefined }) {
  return createElement(goalIcon(icon), props)
}

export { GoalIcon }
