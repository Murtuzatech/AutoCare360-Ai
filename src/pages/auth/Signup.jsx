import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Feedback'
import { AuthLayout } from './AuthLayout'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const pwError = form.password && form.password.length < 8 ? 'Use at least 8 characters.' : ''

  const submit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) return
    setError(''); setBusy(true)
    const { data, error } = await signUp(form.email.trim(), form.password, form.name.trim())
    setBusy(false)
    if (error) { setError(error.message); return }
    // Supabase returns an empty identities list when the email is already registered
    if (data.user && data.user.identities?.length === 0) { setError('An account with this email already exists. Try signing in.'); return }
    if (data.session) navigate('/dashboard', { replace: true })
    else setConfirmSent(true)
  }

  if (confirmSent) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${form.email}. Open it to finish creating your account.`}>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand"><MailCheck className="h-6 w-6" /></div>
        <Link to="/login" className={buttonStyles({ variant: 'secondary', size: 'lg', className: 'w-full' })}>Back to sign in</Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start tracking your vehicles in minutes."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-brand hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Input label="Full name" autoComplete="name" required value={form.name} onChange={set('name')} maxLength={100} />
        <Input label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Input label="Password" type="password" autoComplete="new-password" required value={form.password} onChange={set('password')}
          error={pwError} hint={pwError ? undefined : 'At least 8 characters.'} />
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!form.name.trim() || !form.email || form.password.length < 8}>Create account</Button>
      </form>
    </AuthLayout>
  )
}
