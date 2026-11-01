import { useHide } from '../../hooks/useHide'

const LockIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d={open ? 'M8 11V8a4 4 0 0 1 7.5-2' : 'M8 11V8a4 4 0 0 1 8 0v3'} />
  </svg>
)

/** Blurs private text on screen, for when someone is looking over your shoulder. */
export function HideToggle() {
  const [hide, toggle] = useHide()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hide}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-2.5 font-mono text-[11px] text-ink-2 hover:bg-surface-2"
      title="Blur the text on screen, for when someone is looking over your shoulder"
    >
      <LockIcon open={!hide} /> {hide ? 'hidden' : 'visible'}
    </button>
  )
}
