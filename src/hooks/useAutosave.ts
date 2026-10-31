import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Local draft for a synced text value. Typing never waits on the network:
 * the draft saves after a pause (and on blur), and remote changes replace
 * the draft only while you're not editing it.
 */
export function useAutosave(stored: string, save: (value: string) => void, delay = 700) {
  const [draft, setDraftState] = useState(stored)
  const dirty = useRef(false)
  const editing = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveRef = useRef(save)
  saveRef.current = save
  const draftRef = useRef(draft)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (!dirty.current) return
    dirty.current = false
    saveRef.current(draftRef.current)
  }, [])

  const setDraft = useCallback(
    (value: string) => {
      draftRef.current = value
      setDraftState(value)
      dirty.current = true
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, delay)
    },
    [delay, flush],
  )

  // Adopt remote/other-day values when not mid-edit.
  useEffect(() => {
    if (!dirty.current && !editing.current && stored !== draftRef.current) {
      draftRef.current = stored
      setDraftState(stored)
    }
  }, [stored])

  // Save anything pending when the component goes away or the page hides.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [flush])

  return {
    draft,
    setDraft,
    pending: draft !== stored,
    bind: {
      onFocus: () => {
        editing.current = true
      },
      onBlur: () => {
        editing.current = false
        flush()
      },
    },
  }
}
