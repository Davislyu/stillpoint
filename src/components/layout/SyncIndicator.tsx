import { useStore } from '../../state/store'

/** One quiet line about where your data is. Never blocks anything. */
export function SyncIndicator() {
  const { sync } = useStore()
  const { status, pending } = sync
  const label =
    status === 'offline'
      ? pending
        ? `Offline. ${pending} ${pending === 1 ? 'change' : 'changes'} will sync later`
        : 'Offline'
      : status === 'saving'
        ? 'Saving…'
        : status === 'loading'
          ? 'Syncing…'
          : 'Synced'
  const dot =
    status === 'synced' ? 'bg-accent-sage' : status === 'offline' ? 'bg-accent-clay' : 'bg-muted anim-breathe'

  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-[12px] text-muted" title={label}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
      <span className={status === 'synced' ? 'sr-only sm:not-sr-only' : 'max-w-[11rem] truncate sm:max-w-none'}>
        {label}
      </span>
    </span>
  )
}
