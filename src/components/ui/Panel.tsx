import type { ReactNode } from 'react'
import { useVibe } from '../../themes/vibe'

interface PanelProps {
  title: string
  /** Short supporting line under the title. */
  hint?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

/** A titled section. Hairline border, no shadow: structure, not decoration. */
export function Panel({ title, hint, actions, children, className = '', id }: PanelProps) {
  const vibe = useVibe()
  const headingId = id ? `${id}-title` : undefined
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`panel rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={headingId} data-text={vibe.title(title)} className="panel-title font-display text-[1.05rem] font-semibold tracking-[-0.01em] text-ink">
            {vibe.title(title)}
          </h2>
          {hint && <p className="panel-hint mt-0.5 text-[13px] text-muted">{hint}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>
      {children}
    </section>
  )
}
