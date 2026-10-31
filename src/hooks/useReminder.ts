import { useEffect } from 'react'
import { useToast } from '../components/ui/Toast'
import { activeHabits, completionOn } from '../state/selectors'
import { useStore } from '../state/store'
import { useThemeCtx } from '../themes/vibe'

/**
 * The evening reminder. While Stillpoint is open (or an installed copy is alive
 * in the background) it nudges once a day, after your chosen time, if habits
 * are still left. Phones don't wake a closed web app, so this never fires then.
 */
export function useReminder() {
  const { state, today, user } = useStore()
  const { prefs } = useThemeCtx()
  const toast = useToast()
  const { enabled, time } = prefs.reminder

  useEffect(() => {
    if (!enabled) return
    const check = () => {
      const now = new Date()
      const [h, m] = time.split(':').map(Number)
      if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return
      if (activeHabits(state, today).length === 0) return
      const { done, total } = completionOn(state, today)
      if (done >= total) return
      const key = `stillpoint:reminded:${user.id}:${today}`
      try {
        if (localStorage.getItem(key)) return
        localStorage.setItem(key, '1')
      } catch {
        /* ignore */
      }
      const body = `${total - done} ${total - done === 1 ? 'habit' : 'habits'} still waiting today.`
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        navigator.serviceWorker?.ready
          .then((r) => r.showNotification('Stillpoint', { body, icon: '/icon-192.png', tag: 'daily-reminder' }))
          .catch(() => new Notification('Stillpoint', { body, icon: '/icon-192.png' }))
      } else {
        toast(body)
      }
    }
    check()
    const id = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [enabled, time, state, today, user.id, toast])
}
