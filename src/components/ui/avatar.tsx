import type * as React from 'react'

import { cn } from '../../lib/utils'

function Avatar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative flex size-12 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-inner',
        className,
      )}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex size-full items-center justify-center bg-gradient-to-br from-cyan-300 via-violet-400 to-orange-300 text-sm font-black text-slate-950',
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarFallback }
