import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'

import { QuantifiedSelfDashboard } from './components/dashboard/quantified-self-dashboard'
import type { AppPath } from './components/dashboard/quantified-self-dashboard/data'
import { FinanceOverview } from './components/views/finance-view'
import { NutritionOverview } from './components/views/nutrition-view'
import { WorkoutsOverview } from './components/views/workouts-view'
import { DashboardProvider } from './contexts/DashboardContext'
import { LearningsOverview } from './components/views/learnings-view'

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

  if (pathname === '/workouts') {
    return '/workouts'
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
  } else if (pathname === '/workouts') {
    content = <WorkoutsOverview activePath={pathname} onNavigate={navigateTo} />
  } else {
    content = <QuantifiedSelfDashboard activePath={pathname} onNavigate={navigateTo} />
  }

  const currentDate = searchParams.get('date') || undefined;

  return (
    <DashboardProvider date={currentDate}>
      <Toaster 
        position="top-center" 
        containerStyle={{
          top: 40,
        }}
        toastOptions={{
          style: {
            background: 'rgba(20, 24, 22, 0.85)',
            color: '#ffffff',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '100px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            letterSpacing: '0.02em',
          },
          success: {
            iconTheme: {
              primary: '#35b64b',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#d83542',
              secondary: '#ffffff',
            },
          },
        }} 
      />
      {content}
    </DashboardProvider>
  );
}

export default App
