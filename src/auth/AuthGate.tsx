import { useEffect, useState, type ReactNode } from 'react'
import { ConfigError, createBackend, type AuthUser, type Backend } from '../data/backend'
import { LoginScreen } from './LoginScreen'

type Phase =
  | { kind: 'booting' }
  | { kind: 'config-error'; message: string }
  | { kind: 'signed-out'; backend: Backend }
  | { kind: 'signed-in'; backend: Backend; user: AuthUser }

const LOGIN_PATH = '/login'

/** Keep the address bar honest: /login when signed out, / when signed in. */
function syncPath(signedIn: boolean) {
  const { pathname, search, hash } = window.location
  if (!signedIn && pathname !== LOGIN_PATH) window.history.replaceState(null, '', LOGIN_PATH)
  // Drop the OAuth ?code= once the session is established.
  if (signedIn && (pathname === LOGIN_PATH || search.includes('code='))) window.history.replaceState(null, '', '/' + hash)
}

/**
 * Nothing user-specific renders until a session exists. Signed-out visitors
 * are sent to /login; the data store is only created for a signed-in user
 * and is remounted per account.
 */
export function AuthGate({ children }: { children: (backend: Backend, user: AuthUser) => ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'booting' })

  useEffect(() => {
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      try {
        const backend = await createBackend()
        const user = await backend.getUser()
        if (cancelled) return
        setPhase(user ? { kind: 'signed-in', backend, user } : { kind: 'signed-out', backend })
        unsub = backend.onAuthChange((u) =>
          setPhase((prev) => {
            if (u && prev.kind === 'signed-in' && prev.user.id === u.id) return prev // token refresh
            return u ? { kind: 'signed-in', backend, user: u } : { kind: 'signed-out', backend }
          }),
        )
      } catch (e) {
        if (!cancelled)
          setPhase({ kind: 'config-error', message: e instanceof ConfigError ? e.message : 'Could not start the app.' })
      }
    })()
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  useEffect(() => {
    if (phase.kind === 'signed-in' || phase.kind === 'signed-out') syncPath(phase.kind === 'signed-in')
  }, [phase])

  if (phase.kind === 'booting') return <Splash />
  if (phase.kind === 'config-error') return <Splash message={phase.message} />
  if (phase.kind === 'signed-out') return <LoginScreen backend={phase.backend} />
  return <>{children(phase.backend, phase.user)}</>
}

export function Splash({ message, children }: { message?: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <div>
        <svg viewBox="0 0 24 24" className={`mx-auto size-8 text-ink ${message ? '' : 'anim-breathe'}`} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        </svg>
        {message ? (
          <p role="alert" className="mx-auto mt-4 max-w-sm text-sm text-ink-2">
            {message}
          </p>
        ) : (
          <p className="sr-only">Loading</p>
        )}
        {children && <div className="mt-6 flex justify-center gap-2">{children}</div>}
      </div>
    </div>
  )
}
