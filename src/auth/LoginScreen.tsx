import { useState } from 'react'
import type { Backend } from '../data/backend'
import { Button } from '../components/ui/Button'

export function LoginScreen({ backend }: { backend: Backend }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    setBusy(true)
    setError(null)
    try {
      await backend.signInWithGoogle() // redirects away on success
    } catch {
      setError('Google sign-in didn’t start. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 py-12">
      <div className="anim-rise w-full max-w-sm">
        <svg viewBox="0 0 24 24" className="size-9 text-ink" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        </svg>
        <h1 className="mt-6 font-display text-[2.5rem] leading-none font-medium tracking-[-0.04em] text-ink">
          Stillpoint
        </h1>
        <p className="mt-3 max-w-[32ch] font-display text-lg leading-snug tracking-[-0.01em] text-ink-2">
          Habits, meals, workouts and notes, kept quietly in sync on every device you use.
        </p>

        <Button variant="primary" size="lg" className="mt-10 w-full" onClick={signIn} disabled={busy}>
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </Button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-ink-2">
            {error}
          </p>
        )}
        <p className="mt-6 text-[13px] leading-relaxed text-muted">
          Your entries are private to your account. Only you can read them, on any device you sign in from.
        </p>
      </div>
    </main>
  )
}
