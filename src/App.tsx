import { useEffect, useState } from 'react'

import { QuantifiedSelfDashboard } from './components/dashboard/quantified-self-dashboard'
import type { AppPath } from './components/dashboard/quantified-self-dashboard/data'
import { FinanceOverview } from './components/views/FinanceOverview'
import { NutritionOverview } from './components/views/NutritionOverview'
import { DashboardProvider } from './contexts/DashboardContext'

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

  let content;
  if (pathname === '/finance') {
    content = <FinanceOverview activePath={pathname} onNavigate={navigateTo} />
  } else if (pathname === '/nutrition') {
    content = <NutritionOverview activePath={pathname} onNavigate={navigateTo} />
  } else if (pathname === '/learnings') {
    content = <LearningsOverview activePath={pathname} onNavigate={navigateTo} searchParams={searchParams} />
  } else {
    content = <QuantifiedSelfDashboard activePath={pathname} onNavigate={navigateTo} />
  }

  return (
    <DashboardProvider>
      {content}
    </DashboardProvider>
  );
}

export default App
