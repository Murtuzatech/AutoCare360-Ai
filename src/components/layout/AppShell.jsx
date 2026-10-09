import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { MoreHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { mainNav, mobileTabs } from './nav'
import { ErrorBoundary } from '../ErrorBoundary'
import { GarageProvider, useGarage } from '@/contexts/GarageContext'
import { ErrorState, Skeleton } from '../ui/Feedback'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useOnline } from '@/hooks/useOnline'

export function AppShell() {
  return <GarageProvider><Shell /></GarageProvider>
}

const GARAGE_FREE = ['/profile', '/settings']

function Shell() {
  const { error, reload } = useGarage()
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()
  const drawerRef = useRef(null)
  const online = useOnline()
  usePageTitle()
  useFocusTrap(drawerRef, drawer)

  useEffect(() => { setDrawer(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    const onKey = (e) => { if (e.key === 'Escape') setDrawer(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey) }
  }, [drawer])

  const tabs = mainNav.filter((n) => mobileTabs.includes(n.to))

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-ctl focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line lg:block"><Sidebar /></aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div ref={drawerRef} tabIndex={-1} className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-[pop-in_.18s_ease-out] border-r border-line shadow-pop">
            <button onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-ctl text-muted hover:bg-surface-2"><X className="h-5 w-5" /></button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar onMenu={() => setDrawer(true)} />
        {!online && <div role="status" className="bg-warn px-4 py-2 text-center text-sm font-medium text-brand-ink">You're offline. Changes won't save until your connection returns.</div>}
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 outline-none lg:px-8 lg:pb-12 lg:pt-8">
          <ErrorBoundary key={pathname}>
            {error && !GARAGE_FREE.includes(pathname) ? <ErrorState title="Couldn't load your vehicle data" message={error} onRetry={reload} /> : <Suspense fallback={<Skeleton className="h-64" />}><Outlet /></Suspense>}
          </ErrorBoundary>
        </main>
      </div>

      <nav aria-label="Quick navigation" className="pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        {tabs.map(({ to, label, short, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium', isActive ? 'text-brand' : 'text-muted')}>
            <Icon className="h-5 w-5" aria-hidden />{short || label}
          </NavLink>
        ))}
        <button onClick={() => setDrawer(true)} className="flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted">
          <MoreHorizontal className="h-5 w-5" aria-hidden />More
        </button>
      </nav>
    </div>
  )
}
