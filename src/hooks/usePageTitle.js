import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Order matters: the first matching fragment wins.
const TITLES = [
  ['/vehicles/new', 'Add vehicle'], ['/edit', 'Edit vehicle'], ['/vehicles', 'Vehicles'], ['/dashboard', 'Dashboard'], ['/service', 'Service & Maintenance'],
  ['/analyzer', 'Analyzer'], ['/documents', 'Documents'], ['/expenses', 'Expenses'], ['/reports', 'Reports'], ['/assistant', 'AI Assistant'],
  ['/notifications', 'Notifications'], ['/profile', 'Profile'], ['/settings', 'Settings'],
]

/** Sets a meaningful document title per route and moves focus to <main> after navigation, for screen-reader and keyboard users. */
export function usePageTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const match = TITLES.find(([p]) => pathname.includes(p))
    document.title = match ? `${match[1]} · AutoCare 360` : 'AutoCare 360'
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
}
