import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Feedback'
import { AuthLayout } from './AuthLayout'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const linkError = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await signIn(email.trim(), password)
    setBusy(false)
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message)
      return
    }
    navigate(location.state?.from || '/dashboard', { replace: true })
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see your vehicles."
      footer={<>New to AutoCare 360? <Link to="/signup" className="font-medium text-brand hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {(error || linkError) && <Alert>{error || linkError.replace(/\+/g, ' ')}</Alert>}
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Link to="/forgot-password" className="mt-2 inline-block text-sm text-brand hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email || !password}>Sign in</Button>
      </form>
    </AuthLayout>
  )
}
