import { useEffect, useLayoutEffect, useState } from 'react'
import toast, { Toaster, resolveValue } from 'react-hot-toast'
import { Info, Check, AlertTriangle, AlertCircle, Loader2, X } from 'lucide-react'

import { HomeOverview } from '../features/home/home-page'
import { normalizePathname, type AppPath } from './routes'
import { FinanceOverview } from '../features/finance/finance-page'
import { NutritionOverview } from '../features/nutrition/nutrition-page'
import { WorkoutsOverview } from '../features/workouts/workouts-page'
import { LearningsOverview } from '../features/learnings/learnings-page'
import { CalendarOverview } from '../features/calendar/calendar-page'
import { PromptsOverview } from '../features/prompts/prompts-page'
import { TasksOverview } from '../features/tasks/tasks-page'
import { PeopleOverview } from '../features/people/people-page'
import { ProfileOverview } from '../features/profile/profile-page'
import { MindOverview } from '../features/mind/mind-page'
import { getAvatarImage } from '../lib/avatar'
import { isStandalone } from '../lib/utils'
// Imported from lib/api (which re-exports it from axios-client) rather than from
// axios-client directly: lib/api installs the window.fetch patch that injects the
// bearer token and feeds the active-GET counter as an import side effect, and it
// has to be loaded before the first request goes out. Phase B removes both.
import { subscribeToActiveRequests } from '../lib/api'
import { resolveAuthGate } from '../services/http/axios-client'
import { userService } from '../services/user-service'
import { dashboardActions } from '../store/dashboard-store'
import { appearanceActions } from '../store/appearance-store'
import { focusActions } from '../store/focus-store'
import { notificationActions, useNotifications } from '../store/notification-store'
import { OverlayLoader } from '../components/ui/overlay-loader'
import { NotificationCenter } from '../components/layout/notification-center'
import { SpiralBreakerOverlay } from '../features/spiral-breaker/spiral-breaker-overlay';
import { VisitorAuthPopup } from '../features/auth/visitor-auth-popup'
import { enableGuestInterceptor } from '../lib/guest-interceptor'

const isGuest = localStorage.getItem('isGuest') === 'true';
const authToken = localStorage.getItem('authToken');

if (isGuest) {
  enableGuestInterceptor();
}

function MobileProfileTrigger({ onNavigate, activePath }: { onNavigate: (path: AppPath) => void; activePath: AppPath }) {
  const [avatar, setAvatar] = useState(() => localStorage.getItem('avatarUrl') || 'luffy');
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const handleUpdate = () => {
      setAvatar(localStorage.getItem('avatarUrl') || 'luffy');
    };
    window.addEventListener('profile-updated', handleUpdate);
    return () => window.removeEventListener('profile-updated', handleUpdate);
  }, []);

  const handleClick = () => {
    onNavigate('/profile');
  };

  if (activePath === '/profile') {
    return null;
  }

  return (
    <button
      type="button"
      className="mobile-profile-trigger"
      onClick={handleClick}
      aria-label="Open Profile"
    >
      <img src={getAvatarImage(avatar)} alt="Profile" className="mobile-profile-avatar" />
      {unreadCount > 0 && (
        <span className="mobile-notification-badge">{unreadCount}</span>
      )}
    </button>
  );
}

function App() {
  const [pathname, setPathname] = useState<AppPath>(() => {
    if (isStandalone()) {
      const savedPath = localStorage.getItem('pwa_last_path') as AppPath | null
      if (savedPath) {
        return normalizePathname(savedPath)
      }
    }
    return normalizePathname(window.location.pathname)
  })
  const [searchParams, setSearchParams] = useState(() => {
    if (isStandalone()) {
      const savedSearch = localStorage.getItem('pwa_last_search')
      if (savedSearch !== null) {
        return new URLSearchParams(savedSearch)
      }
    }
    return new URLSearchParams(window.location.search)
  })

  // Layout effect so a route that flips the theme never paints a frame in the old one.
  useLayoutEffect(() => {
    appearanceActions.syncActivePath(pathname)
  }, [pathname])

  const [activeRequests, setActiveRequests] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [showOverlay, setShowOverlay] = useState(true)

  // Arm the Axios auth gate, then prefetch the profile to sync the global avatar
  // and name into localStorage.
  //
  // resolveAuthGate MUST run here, and before anything else can issue a request:
  // every non-bypassed Axios request parks on a 25ms poll loop until the gate is
  // resolved (services/http/axios-client.ts). If this call is ever dropped, the
  // whole app hangs on a permanent loading overlay with no error anywhere.
  useEffect(() => {
    resolveAuthGate(isGuest || !!authToken)

    async function prefetchProfile() {
      try {
        const res = await userService.getProfile()
        if (res?.data) {
          localStorage.setItem('avatarUrl', res.data.avatarUrl || 'luffy')
          localStorage.setItem('displayName', res.data.displayName || 'User')
          window.dispatchEvent(new Event('profile-updated'))
        }
      } catch (err) {
        console.error('Failed to prefetch profile', err)
      }
    }
    if (isGuest || authToken) {
      prefetchProfile()
    }
  }, [])

  // Track active API calls
  useEffect(() => {
    return subscribeToActiveRequests((count) => {
      setActiveRequests(count)
    })
  }, [])

  // One-time store bootstraps that used to live in FocusProvider /
  // NotificationProvider. Both are internally guarded against double-invocation
  // (StrictMode mounts effects twice in dev).
  useEffect(() => {
    focusActions.refresh()
    notificationActions.bootstrap()
  }, [])

  const currentDate = searchParams.get('date') || undefined;

  // Dashboard fetching is owned here and nowhere else — useDashboard() is a
  // read-only compatibility hook, so if these two effects go missing every
  // consumer silently renders empty. bootstrapListener wires the app-wide
  // 'dashboard-updated' event; load() re-runs whenever ?date= changes.
  useEffect(() => {
    dashboardActions.bootstrapListener()
  }, [])

  useEffect(() => {
    dashboardActions.load(currentDate)
  }, [currentDate])

  // Trigger loading state on route change (pathname or search changes)
  useEffect(() => {
    const handleTransition = () => {
      setIsTransitioning(true)
    }
    handleTransition()
  }, [pathname, searchParams])

  // Manage overlay transition state
  useEffect(() => {
    if (isTransitioning) {
      if (activeRequests === 0) {
        // Debounce transition completion to prevent flickers
        const timer = setTimeout(() => {
          setIsTransitioning(false)
          setShowOverlay(false)
        }, 300)
        return () => clearTimeout(timer)
      } else {
        const handleShowOverlay = () => {
          setShowOverlay(true)
        }
        handleShowOverlay()
      }
    }
  }, [isTransitioning, activeRequests])

  // Failsafe timeout to prevent permanent lockouts (max 3 seconds)
  useEffect(() => {
    if (isTransitioning) {
      const failsafe = setTimeout(() => {
        setIsTransitioning(false)
        setShowOverlay(false)
      }, 3000)
      return () => clearTimeout(failsafe)
    }
  }, [isTransitioning])

  useEffect(() => {
    const handlePopState = () => {
      if (isStandalone()) {
        const savedPath = localStorage.getItem('pwa_last_path') as AppPath | null
        if (savedPath) {
          setPathname(normalizePathname(savedPath))
        }
        setSearchParams(new URLSearchParams(window.location.search))
        return
      }

      setPathname(normalizePathname(window.location.pathname))
      setSearchParams(new URLSearchParams(window.location.search))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Sync URL with normalized route on mount/initial load
  useEffect(() => {
    if (isStandalone()) {
      return
    }

    const currentPath = window.location.pathname
    const normalized = normalizePathname(currentPath)
    if (currentPath !== normalized) {
      window.history.replaceState({}, '', normalized + window.location.search)
    }
  }, [])

  const navigateTo = (nextPathname: AppPath, search?: string) => {
    const normalized = normalizePathname(nextPathname)

    if (isStandalone()) {
      // Keep the browser URL path constant to prevent iOS standalone PWA from opening
      // Safari browser navigation elements, but allow query/search parameters to update.
      const newUrl = search ? `${window.location.pathname}${search}` : window.location.pathname
      window.history.replaceState({}, '', newUrl)

      localStorage.setItem('pwa_last_path', normalized)
      localStorage.setItem('pwa_last_search', search || '')

      setPathname(normalized)
      setSearchParams(new URLSearchParams(search || ''))
      return
    }

    const newUrl = search ? `${normalized}${search}` : normalized
    if (newUrl === window.location.pathname + window.location.search) {
      return
    }

    window.history.pushState({}, '', newUrl)
    setPathname(normalized)
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
  } else if (pathname === '/calendar') {
    content = <CalendarOverview activePath={pathname} onNavigate={navigateTo} searchParams={searchParams} />
  } else if (pathname === '/prompts') {
    content = <PromptsOverview activePath={pathname} onNavigate={navigateTo} />
  } else if (pathname === '/tasks') {
    content = <TasksOverview activePath={pathname} onNavigate={navigateTo} searchParams={searchParams} />
  } else if (pathname === '/people') {
    content = <PeopleOverview activePath={pathname} onNavigate={navigateTo} />
  } else if (pathname === '/profile') {
    content = <ProfileOverview activePath={pathname} onNavigate={navigateTo} />
  } else if (pathname === '/mind') {
    content = <MindOverview activePath={pathname} onNavigate={navigateTo} />
  } else {
    content = <HomeOverview activePath={pathname} onNavigate={navigateTo} />
  }

  if (!isGuest && !authToken) {
    return <VisitorAuthPopup />;
  }

  return (
    <>
      <Toaster
        position="top-center"
        containerStyle={{
          top: 40,
          zIndex: 100000,
        }}
      >
        {(t) => {
          const message = resolveValue(t.message, t);

          let type: 'info' | 'success' | 'warning' | 'error' = 'info';
          let title = 'Information';

          if (t.type === 'success') {
            type = 'success';
            title = 'Success';
          } else if (t.type === 'error') {
            type = 'error';
            title = 'Error';
          } else if (t.type === 'loading') {
            type = 'info';
            title = 'Loading';
          } else if (t.icon === '⚠️' || (typeof message === 'string' && message.toLowerCase().includes('warning'))) {
            type = 'warning';
            title = 'Warning';
          }

          const renderIcon = () => {
            const size = 16;
            if (t.type === 'loading') {
              return <Loader2 size={size} className="toast-icon-loading animate-spin" />;
            }
            switch (type) {
              case 'success':
                return <Check size={size} className="toast-icon-check" />;
              case 'error':
                return <AlertCircle size={size} className="toast-icon-error" />;
              case 'warning':
                return <AlertTriangle size={size} className="toast-icon-warning" />;
              case 'info':
              default:
                return <Info size={size} className="toast-icon-info" />;
            }
          };

          return (
            <div
              className={`custom-toast custom-toast--${type} ${t.visible ? 'toast-enter' : 'toast-leave'}`}
              style={{
                ...t.style,
                opacity: t.visible ? 1 : 0,
              }}
            >
              <div className="toast-glow-bg" />
              <div className="toast-icon-wrapper">
                <div className="toast-icon-box">
                  {renderIcon()}
                </div>
              </div>
              <div className="toast-content">
                <span className="toast-title">{title}</span>
                <span className="toast-message">{message}</span>
              </div>
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => toast.dismiss(t.id)}
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        }}
      </Toaster>
      <div key={pathname} className="route-view-container">
        {content}
      </div>
      <MobileProfileTrigger onNavigate={navigateTo} activePath={pathname} />
      <NotificationCenter onNavigate={navigateTo} />
      {/* Mounted once at the root so the Spiral Breaker is one tap from any route. */}
      <SpiralBreakerOverlay />
      <OverlayLoader show={showOverlay} />
    </>
  );
}

export default App
