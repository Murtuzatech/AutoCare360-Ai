import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, FullScreenLoader } from '@/components/ui/Feedback'
import { AuthLayout } from './AuthLayout'

export default function ResetPassword() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <FullScreenLoader />

  if (!session) {
    return (
      <AuthLayout title="Link expired" subtitle="This reset link is invalid or has expired. Request a new one to continue.">
        <Link to="/forgot-password" className={buttonStyles({ size: 'lg', className: 'w-full' })}>Request a new link</Link>
      </AuthLayout>
    )
  }

  const mismatch = confirm && password !== confirm ? 'Passwords do not match.' : ''
  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
          error={password && password.length < 8 ? 'Use at least 8 characters.' : ''} />
        <Input label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch} />
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={password.length < 8 || password !== confirm}>Update password</Button>
      </form>
    </AuthLayout>
  )
}
