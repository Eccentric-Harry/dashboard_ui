import { useEffect, useState } from 'react'

import { QuantifiedSelfDashboard } from './components/dashboard/quantified-self-dashboard'
import type { AppPath } from './components/dashboard/quantified-self-dashboard/data'
import { FinanceOverview } from './components/views/FinanceOverview'
import { NutritionOverview } from './components/views/NutritionOverview'

import { LearningsOverview } from './components/views/LearningsOverview'

function normalizePathname(pathname: string): AppPath {
  if (pathname === '/home' || pathname === '/') {
    return '/home'
  }

  if (pathname === '/nutrition') {
    return '/nutrition'
  }

  if (pathname === '/finance') {
    return '/finance'
  }

  if (pathname === '/learnings') {
    return '/learnings'
  }

  return '/home'
}

function App() {
  const [pathname, setPathname] = useState<AppPath>(() => normalizePathname(window.location.pathname))
  const [searchParams, setSearchParams] = useState(() => new URLSearchParams(window.location.search))

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname))
      setSearchParams(new URLSearchParams(window.location.search))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigateTo = (nextPathname: AppPath, search?: string) => {
    const newUrl = search ? `${nextPathname}${search}` : nextPathname
    if (newUrl === window.location.pathname + window.location.search) {
      return
    }

    window.history.pushState({}, '', newUrl)
    setPathname(normalizePathname(nextPathname))
    setSearchParams(new URLSearchParams(search || ''))
  }

  if (pathname === '/finance') {
    return <FinanceOverview activePath={pathname} onNavigate={navigateTo} />
  }

  if (pathname === '/nutrition') {
    return <NutritionOverview activePath={pathname} onNavigate={navigateTo} />
  }

  if (pathname === '/learnings') {
    return <LearningsOverview activePath={pathname} onNavigate={navigateTo} searchParams={searchParams} />
  }

  return <QuantifiedSelfDashboard activePath={pathname} onNavigate={navigateTo} />
}

export default App
