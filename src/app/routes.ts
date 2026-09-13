/**
 * Route table for the custom pushState router in App.tsx. Adding a route means
 * adding it here, to navItems in ./navigation, and to the route switch in App.tsx.
 */
export const APP_PATHS = [
  '/home',
  '/finance',
  '/nutrition',
  '/learnings',
  '/workouts',
  '/calendar',
  '/prompts',
  '/tasks',
  '/people',
  '/profile',
  '/mind',
] as const

export type AppPath = (typeof APP_PATHS)[number]

const DEFAULT_PATH: AppPath = '/home'

/** Legacy or shorthand URLs that resolve to a real route. */
const PATH_ALIASES: Record<string, AppPath> = {
  '/': '/home',
  '/calender': '/calendar',
}

export function normalizePathname(pathname: string): AppPath {
  if (Object.hasOwn(PATH_ALIASES, pathname)) {
    return PATH_ALIASES[pathname]
  }
  return (APP_PATHS as readonly string[]).includes(pathname) ? (pathname as AppPath) : DEFAULT_PATH
}
