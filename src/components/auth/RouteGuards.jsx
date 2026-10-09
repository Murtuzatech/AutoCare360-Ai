import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { FullScreenLoader, ErrorState } from '../ui/Feedback'

export function ProtectedRoute() {
  const { session, loading, profileError, reloadProfile } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profileError) {
    return <div className="flex min-h-screen items-center justify-center bg-bg">
      <ErrorState title="Couldn't load your account" message={`${profileError} If this is a new setup, make sure migration 001 has been run in Supabase.`} onRetry={reloadProfile} />
    </div>
  }
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
