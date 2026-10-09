import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { buttonStyles } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <Logo />
      <h1 className="mt-6 text-3xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-muted">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/dashboard" className={buttonStyles()}>Go to dashboard</Link>
    </div>
  )
}
