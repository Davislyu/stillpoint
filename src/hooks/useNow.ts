import { useEffect, useState } from 'react'

/** Current timestamp, refreshed every `intervalMs` (pass 0 to pause). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!intervalMs) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    // Catch up immediately when the tab comes back from the background.
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])
  return now
}
