import type * as React from 'react'

import { cn } from '../../lib/utils'

interface ProgressProps extends React.ComponentProps<'div'> {
  value: number
  indicatorClassName?: string
}

function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  return (
    <div
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full bg-cyan-300 transition-all', indicatorClassName)}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

export { Progress }
