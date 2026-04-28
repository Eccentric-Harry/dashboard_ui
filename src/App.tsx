import { useEffect, useState } from 'react'

import { QuantifiedSelfDashboard } from './components/dashboard/quantified-self-dashboard'
import type { AppPath } from './components/dashboard/quantified-self-dashboard/data'
import { FinanceOverview } from './components/views/FinanceOverview'
import { NutritionOverview } from './components/views/NutritionOverview'

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

  return '/home'
}

function App() {
  const [pathname, setPathname] = useState<AppPath>(() => normalizePathname(window.location.pathname))

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigateTo = (nextPathname: AppPath) => {
    if (nextPathname === pathname) {
      return
    }

    window.history.pushState({}, '', nextPathname)
    setPathname(nextPathname)
  }

  if (pathname === '/finance') {
    return <FinanceOverview activePath={pathname} onNavigate={navigateTo} />
  }

  if (pathname === '/nutrition') {
    return <NutritionOverview activePath={pathname} onNavigate={navigateTo} />
  }

  return <QuantifiedSelfDashboard activePath={pathname} onNavigate={navigateTo} />
}

export default App
