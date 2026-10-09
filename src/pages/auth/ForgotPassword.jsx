import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Feedback'
import { AuthLayout } from './AuthLayout'

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await sendPasswordReset(email.trim())
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link."
      footer={<Link to="/login" className="font-medium text-brand hover:underline">Back to sign in</Link>}>
      {sent ? (
        <Alert tone="ok">If an account exists for {email}, a reset link is on its way.</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  )
}
