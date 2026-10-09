import { Logo } from './Logo'

export function SetupRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-lg rounded-card border border-line bg-surface p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">Connect Supabase to continue</h1>
        <p className="mt-2 text-muted">This app needs two environment variables before it can start.</p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm">
          <li>Copy <code className="rounded bg-surface-2 px-1.5 py-0.5">.env.example</code> to <code className="rounded bg-surface-2 px-1.5 py-0.5">.env</code></li>
          <li>In Supabase, open Project Settings → API</li>
          <li>Paste the Project URL into <code className="rounded bg-surface-2 px-1.5 py-0.5">VITE_SUPABASE_URL</code></li>
          <li>Paste the anon public key into <code className="rounded bg-surface-2 px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code></li>
          <li>Restart <code className="rounded bg-surface-2 px-1.5 py-0.5">npm run dev</code></li>
        </ol>
      </div>
    </div>
  )
}
