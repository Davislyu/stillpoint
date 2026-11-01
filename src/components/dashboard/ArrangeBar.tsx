import { useEffect } from 'react'
import { setArranging } from '../../hooks/useArrange'
import { Button } from '../ui/Button'

/** Floating controls while arranging the dashboard (wide screens only). */
export function ArrangeBar({ onReset }: { onReset: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setArranging(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div role="region" aria-label="Arrange dashboard" className="fixed inset-x-0 bottom-6 z-40 hidden justify-center px-4 lg:flex">
      <div className="flex items-center gap-4 rounded-full border border-line-strong bg-float px-5 py-2.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]">
        <p className="text-[13px] text-ink-2">
          <span className="font-medium text-ink">Arranging.</span> Drag a panel by its label. Pull the corner to resize.
        </p>
        <Button size="sm" variant="ghost" onClick={onReset}>
          Reset to classic
        </Button>
        <Button size="sm" variant="primary" onClick={() => setArranging(false)}>
          Done
        </Button>
      </div>
    </div>
  )
}
