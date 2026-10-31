import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthGate } from './auth/AuthGate'
import { AuthActionsContext } from './auth/authActions'
import { ToastProvider, useToast } from './components/ui/Toast'
import type { AuthUser, Backend } from './data/backend'
import { StoreProvider } from './state/store'
import { ThemeProvider } from './themes/vibe'
import './index.css'

function SignedIn({ backend, user }: { backend: Backend; user: AuthUser }) {
  const toast = useToast()
  return (
    <AuthActionsContext.Provider value={{ signOut: () => backend.signOut() }}>
      {/* key: a different account always gets a fresh store */}
      <StoreProvider
        key={user.id}
        backend={backend}
        user={user}
        onRejected={() => toast('A change couldn’t be saved and was undone. Your data has been refreshed.')}
      >
        <App />
      </StoreProvider>
    </AuthActionsContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthGate>{(backend, user) => <SignedIn backend={backend} user={user} />}</AuthGate>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)

// Installable PWA: cache the app shell for instant, offline-capable launches.
if (import.meta.env.PROD && 'serviceWorker' in navigator && import.meta.env.VITE_E2E_MEMORY_BACKEND !== 'true') {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}

// After a deploy, an open tab may ask for a code-split chunk that no longer exists: reload once to pick up the new build.
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('stillpoint:reloaded')) return
    sessionStorage.setItem('stillpoint:reloaded', '1')
  } catch {
    /* ignore */
  }
  window.location.reload()
})
