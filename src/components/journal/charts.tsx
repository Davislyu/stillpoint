import { useEffect, useRef, useState, type ReactNode } from 'react'

export const COUNTED = 'var(--accent-teal)'
export const JUSTIFIED = 'var(--accent-sand)'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

/** Width of an element, so charts draw at real pixel sizes instead of scaling their text. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

export const Legend = ({ items }: { items: [string, string][] }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted" aria-label="Legend">
    {items.map(([label, color]) => (
      <li key={label} className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: color }} />
        {label}
      </li>
    ))}
  </ul>
)

export const ChartCard = ({ title, note, legend, children }: { title: string; note?: string; legend?: ReactNode; children: ReactNode }) => (
  <section className="rounded-xl border border-line bg-bg p-3.5">
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 className="font-mono text-[11px] tracking-wider text-ink-2 uppercase">{title}</h3>
      {note && <span className="font-mono text-[11px] text-muted">{note}</span>}
    </div>
    {children}
    {legend && <div className="mt-2">{legend}</div>}
  </section>
)

const niceMax = (v: number) => {
  if (v <= 0) return 100
  const p = 10 ** Math.floor(Math.log10(v))
  const m = v / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

/** Compact axis label from cents: 1.2k, 85. */
export const compact = (cents: number) => {
  const v = cents / 100
  return v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(Math.round(v))
}

interface Bar {
  label: string
  /** Shown in the tooltip title. */
  title: string
  counted: number
  justified: number
}

const PAD = { l: 34, r: 6, t: 8, b: 20 }

/** Vertical bars with one or two stacked series, a recessive grid, and a per-bar tooltip. */
export function StackedBars({ bars, height = 150, tickEvery = 1, format, highlight }: { bars: Bar[]; height?: number; tickEvery?: number; format: (c: number) => string; highlight?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(...bars.map((b) => b.counted + b.justified), 1))
  const iw = Math.max(0, w - PAD.l - PAD.r)
  const ih = height - PAD.t - PAD.b
  const slot = bars.length ? iw / bars.length : 0
  const bw = Math.max(2, Math.min(28, slot - 2))
  const y = (v: number) => PAD.t + ih - (v / max) * ih
  const hb = hover === null ? null : bars[hover]
  return (
    <div ref={ref} className="relative" style={{ height }} onPointerLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={`Bar chart: ${bars.map((b) => `${b.title} ${format(b.counted + b.justified)}`).join(', ')}`} onPointerMove={(e) => {
          const x = e.clientX - e.currentTarget.getBoundingClientRect().left - PAD.l
          setHover(Math.min(bars.length - 1, Math.max(0, Math.floor(x / slot))))
        }}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeWidth="1" strokeDasharray={f ? '2 3' : undefined} />
              <text x={PAD.l - 5} y={y(max * f) + 3} textAnchor="end" fontSize="10" fontFamily={MONO} fill="var(--muted)">
                {compact(max * f)}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            const x = PAD.l + i * slot + (slot - bw) / 2
            const hc = (b.counted / max) * ih
            const hj = (b.justified / max) * ih
            const dim = hover !== null && hover !== i
            return (
              <g key={i} opacity={dim ? 0.45 : 1}>
                {b.counted > 0 && <rect x={x} y={y(b.counted)} width={bw} height={Math.max(1, hc)} rx={b.justified ? 0 : 2} fill={COUNTED} />}
                {b.justified > 0 && <rect x={x} y={y(b.counted + b.justified)} width={bw} height={Math.max(1, hj - (b.counted ? 1.5 : 0))} rx={2} fill={JUSTIFIED} />}
                {(i % tickEvery === 0 || i === highlight) && (
                  <text x={x + bw / 2} y={height - 6} textAnchor="middle" fontSize="10" fontFamily={MONO} fill={i === highlight ? 'var(--ink)' : 'var(--muted)'}>
                    {b.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {hb && hover !== null && w > 0 && (
        <div className="pointer-events-none absolute z-10 rounded-lg border border-line-strong bg-bg px-2.5 py-1.5 font-mono text-[11px] shadow-lg" style={{ left: Math.min(Math.max(PAD.l + hover * slot + slot / 2, 70), w - 70), top: 0, transform: 'translateX(-50%)' }}>
          <p className="text-ink">{hb.title}</p>
          <p className="text-ink-2">{format(hb.counted + hb.justified)}</p>
          {hb.justified > 0 && hb.counted > 0 && (
            <p className="text-muted">
              {format(hb.counted)} counted · {format(hb.justified)} justified
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Horizontal ranked bars: identity is the label, so one hue per series is enough. */
export function RankedBars({ rows, format }: { rows: { id: string; label: string; counted: number; justified: number }[]; format: (c: number) => string }) {
  const max = Math.max(...rows.map((r) => r.counted + r.justified), 1)
  const sum = rows.reduce((a, r) => a + r.counted + r.justified, 0) || 1
  return (
    <ul className="grid gap-1.5">
      {rows.map((r) => {
        const t = r.counted + r.justified
        return (
          <li key={r.id} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 font-mono text-[11px]" title={`${r.label}: ${format(t)} (${Math.round((t / sum) * 100)}%)`}>
            <span className="truncate text-ink-2">{r.label}</span>
            <span className="flex h-3 items-center gap-[2px]" aria-hidden="true">
              {r.counted > 0 && <span className="h-full rounded-r-[3px] rounded-l-[2px]" style={{ width: `${(r.counted / max) * 100}%`, background: COUNTED }} />}
              {r.justified > 0 && <span className="h-full rounded-r-[3px] rounded-l-[2px]" style={{ width: `${(r.justified / max) * 100}%`, background: JUSTIFIED }} />}
            </span>
            <span className="text-right text-ink tabular">
              {format(t)} <span className="text-muted">{Math.round((t / sum) * 100)}%</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Running total of this month against last month. One axis, two lines. */
export function PaceChart({ now, before, nowLabel, beforeLabel, elapsed, format, height = 150 }: { now: number[]; before: number[]; nowLabel: string; beforeLabel: string; elapsed: number; format: (c: number) => string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const n = Math.max(now.length, before.length)
  const cur = now.slice(0, Math.max(1, elapsed))
  const max = niceMax(Math.max(...cur, ...before, 1))
  const iw = Math.max(0, w - PAD.l - 10)
  const ih = height - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (n > 1 ? (i / (n - 1)) * iw : 0)
  const y = (v: number) => PAD.t + ih - (v / max) * ih
  const path = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const last = cur.length - 1
  return (
    <div ref={ref} className="relative" style={{ height }} onPointerLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={`Running total this month: ${format(cur[last] ?? 0)} by day ${cur.length}; last month ended at ${format(before[before.length - 1] ?? 0)}`} onPointerMove={(e) => {
          const px = e.clientX - e.currentTarget.getBoundingClientRect().left - PAD.l
          setHover(Math.min(n - 1, Math.max(0, Math.round((px / iw) * (n - 1)))))
        }}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={PAD.l} x2={w - 10} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeDasharray={f ? '2 3' : undefined} />
              <text x={PAD.l - 5} y={y(max * f) + 3} textAnchor="end" fontSize="10" fontFamily={MONO} fill="var(--muted)">
                {compact(max * f)}
              </text>
            </g>
          ))}
          {[1, Math.ceil(n / 2), n].map((d) => (
            <text key={d} x={x(d - 1)} y={height - 6} textAnchor="middle" fontSize="10" fontFamily={MONO} fill="var(--muted)">
              {d}
            </text>
          ))}
          {before.length > 0 && <path d={path(before)} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />}
          {cur.length > 0 && <path d={path(cur)} fill="none" stroke={COUNTED} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
          {cur.length > 0 && <circle cx={x(last)} cy={y(cur[last])} r="4" fill={COUNTED} stroke="var(--bg)" strokeWidth="2" />}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--line-strong)" />}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <div className="pointer-events-none absolute z-10 rounded-lg border border-line-strong bg-bg px-2.5 py-1.5 font-mono text-[11px] shadow-lg" style={{ left: Math.min(Math.max(x(hover), 70), w - 70), top: 0, transform: 'translateX(-50%)' }}>
          <p className="text-ink">Day {hover + 1}</p>
          {hover < cur.length && (
            <p className="text-ink-2">
              {nowLabel} {format(cur[hover])}
            </p>
          )}
          {hover < before.length && (
            <p className="text-muted">
              {beforeLabel} {format(before[hover])}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
