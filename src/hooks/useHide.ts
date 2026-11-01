import { useSyncExternalStore } from 'react'

const KEY = 'stillpoint.journal.hide'
const listeners = new Set<() => void>()
const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
let value = read()

/** "Hide on screen": one per-device switch shared by the Journal and the Second brain. */
export function useHide(): [boolean, () => void] {
  const hide = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => value,
  )
  const toggle = () => {
    value = !value
    try {
      localStorage.setItem(KEY, value ? '1' : '0')
    } catch {
      /* private mode: stays per session */
    }
    listeners.forEach((l) => l())
  }
  return [hide, toggle]
}
