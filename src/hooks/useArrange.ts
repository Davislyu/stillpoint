import { useSyncExternalStore } from 'react'

/** Whether the dashboard is in drag-and-drop arranging mode (not saved; always starts off). */
let on = false
const listeners = new Set<() => void>()
export const setArranging = (v: boolean) => {
  if (on === v) return
  on = v
  listeners.forEach((l) => l())
}
export const useArranging = () =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => on,
  )

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
  )
}
