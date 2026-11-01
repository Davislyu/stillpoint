import { useEffect, useMemo, useRef } from 'react'
import { buildGraph } from '../../brain/notes'
import { H, Simulation, W } from '../../brain/sim'
import type { Note } from '../../state/types'

/** Side-view brain contour, drawn as a thin reference outline like a glass-brain plot. */
const OUTLINE = new Path2D(
  'M60 130 C40 90 70 40 130 34 C170 12 240 14 276 40 C336 46 372 92 352 140 C346 170 316 186 296 190 C318 206 322 244 292 262 C262 276 232 262 224 246 L236 296 C232 302 216 302 212 296 L206 220 C160 214 100 186 60 130 Z',
)
const CLUSTER_VARS = ['--accent-teal', '--accent-dusk', '--accent-sand', '--accent-mauve', '--accent-sage', '--accent-clay']
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const cssVar = (el: Element, name: string, fallback: string) => getComputedStyle(el).getPropertyValue(name).trim() || fallback

interface Props {
  notes: Note[]
  selectedId: string | null
  onSelect: (noteId: string) => void
  onTag?: (tag: string | null) => void
  activeTag?: string | null
}

/** The notes as a neural network inside a brain. Canvas, paused off-screen and for reduced motion. */
export function BrainGraph({ notes, selectedId, onSelect, onTag, activeTag }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const sim = useRef(new Simulation())
  const graph = useMemo(() => buildGraph(notes), [notes])
  const live = useRef({ graph, selectedId, activeTag, onSelect, onTag })
  live.current = { graph, selectedId, activeTag, onSelect, onTag }
  const hover = useRef<string | null>(null)
  const kick = useRef<() => void>(() => {})

  useEffect(() => {
    sim.current.update(graph)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) sim.current.settle(400)
    kick.current()
  }, [graph])

  useEffect(() => {
    const cv = canvas.current!
    const box = wrap.current!
    const ctx = cv.getContext('2d')!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let visible = true
    let scale = 1
    let t0 = performance.now()
    let drag: { id: string; moved: boolean } | null = null
    let colors = { ink: '#ddd', muted: '#888', line: '#444', accent: '#8bd', warm: '#e96', surface: '#222', clusters: ['#8bd'] as string[] }

    const readColors = () => {
      colors = {
        ink: cssVar(box, '--ink', colors.ink),
        muted: cssVar(box, '--muted', colors.muted),
        line: cssVar(box, '--line-strong', colors.line),
        accent: cssVar(box, '--accent-teal', colors.accent),
        warm: cssVar(box, '--accent-sand', colors.warm),
        surface: cssVar(box, '--surface-2', colors.surface),
        clusters: CLUSTER_VARS.map((v, i) => cssVar(box, v, colors.clusters[i] ?? colors.accent)),
      }
    }
    const resize = () => {
      const r = box.getBoundingClientRect()
      const dpr = Math.min(2, devicePixelRatio || 1)
      cv.width = Math.round(r.width * dpr)
      cv.height = Math.round(r.height * dpr)
      scale = Math.min(r.width / W, r.height / H)
      ctx.setTransform((scale * cv.width) / r.width, 0, 0, (scale * cv.height) / r.height, ((r.width - W * scale) / 2) * dpr, ((r.height - H * scale) / 2) * dpr)
      draw(performance.now())
    }

    const neighbours = (id: string | null) => {
      const s = new Set<string>()
      if (!id) return s
      s.add(id)
      for (const e of live.current.graph.edges) {
        if (e.a === id) s.add(e.b)
        else if (e.b === id) s.add(e.a)
      }
      return s
    }

    function draw(now: number) {
      const { graph: g, selectedId: sel, activeTag: tag } = live.current
      const s = sim.current
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.restore()
      void now

      // plot area: minor and major grid, frame, axis ticks
      ctx.lineWidth = 0.5
      ctx.strokeStyle = colors.muted
      for (let x = 0; x <= W; x += 20) {
        ctx.globalAlpha = x % 100 === 0 ? 0.22 : 0.07
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y <= H; y += 20) {
        ctx.globalAlpha = y % 100 === 0 ? 0.22 : 0.07
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.45
      ctx.fillStyle = colors.muted
      ctx.font = `5.5px ${MONO}`
      ctx.textAlign = 'left'
      for (let x = 100; x < W; x += 100) ctx.fillText(String(x), x + 2, 7)
      for (let y = 100; y < H; y += 100) ctx.fillText(String(y), 2, y - 2)

      // brain contour
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 0.9
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = colors.line
      ctx.stroke(OUTLINE)
      ctx.setLineDash([])

      const idx = new Map(s.nodes.map((n) => [n.id, n]))
      const byId = new Map(g.nodes.map((n) => [n.id, n]))
      const selNode = sel ? `n:${sel}` : null
      const focusId = hover.current ?? selNode
      const focus = neighbours(focusId)
      const hasFocus = focus.size > 0
      const tagSet = tag ? neighbours(`t:${tag}`) : null
      const tone = (cluster: number) => colors.clusters[Math.min(cluster, colors.clusters.length - 1)] ?? colors.accent

      // edges
      for (const e of g.edges) {
        const a = idx.get(e.a)
        const b = idx.get(e.b)
        if (!a || !b) continue
        const lit = hasFocus && (e.a === focusId || e.b === focusId)
        const dim = (hasFocus && !lit) || (tagSet && !(tagSet.has(e.a) && tagSet.has(e.b)))
        ctx.globalAlpha = dim ? 0.1 : lit ? 0.95 : 0.5
        ctx.strokeStyle = lit ? colors.ink : tone(byId.get(e.a)?.cluster ?? 0)
        ctx.lineWidth = lit ? 1.1 : 0.7
        ctx.setLineDash(e.kind === 'tag' ? [1.5, 2.5] : [])
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // nodes
      for (const n of s.nodes) {
        const gn = byId.get(n.id)
        if (!gn) continue
        const dim = (hasFocus && !focus.has(n.id)) || (tagSet && !tagSet.has(n.id))
        const isSel = n.id === selNode
        const col = tone(gn.cluster)
        const r = gn.kind === 'note' ? Math.max(2.2, n.r * 0.55) : gn.kind === 'tag' ? 2.4 : 2
        ctx.globalAlpha = dim ? 0.25 : 1
        ctx.lineWidth = 1
        if (gn.kind === 'tag') {
          ctx.strokeStyle = col
          ctx.strokeRect(n.x - r, n.y - r, r * 2, r * 2)
        } else if (gn.kind === 'ghost') {
          ctx.strokeStyle = colors.muted
          ctx.setLineDash([1.2, 1.6])
          ctx.beginPath()
          ctx.arc(n.x, n.y, r, 0, 7)
          ctx.stroke()
          ctx.setLineDash([])
        } else {
          ctx.fillStyle = col
          ctx.beginPath()
          ctx.arc(n.x, n.y, r, 0, 7)
          ctx.fill()
        }
        if (isSel) {
          // crosshair marker
          ctx.globalAlpha = 1
          ctx.strokeStyle = colors.ink
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 3.5, 0, 7)
          ctx.moveTo(n.x - r - 8, n.y)
          ctx.lineTo(n.x - r - 4, n.y)
          ctx.moveTo(n.x + r + 4, n.y)
          ctx.lineTo(n.x + r + 8, n.y)
          ctx.moveTo(n.x, n.y - r - 8)
          ctx.lineTo(n.x, n.y - r - 4)
          ctx.moveTo(n.x, n.y + r + 4)
          ctx.lineTo(n.x, n.y + r + 8)
          ctx.stroke()
        }
        const showLabel = isSel || hover.current === n.id || (!hasFocus && !tagSet && gn.kind === 'note' && gn.degree >= 2) || (hasFocus && focus.has(n.id)) || (tagSet && tagSet.has(n.id))
        if (showLabel) {
          ctx.globalAlpha = dim ? 0.3 : 0.95
          ctx.font = `${isSel ? 600 : 400} 6.5px ${MONO}`
          ctx.textAlign = 'left'
          ctx.fillStyle = colors.ink
          const label = gn.label.length > 24 ? gn.label.slice(0, 23) + '…' : gn.label
          const lx = n.x + r + 3
          ctx.fillText(label, lx > W - 60 ? n.x - r - 3 - ctx.measureText(label).width : lx, n.y + 2.2)
        }
      }
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      raf = 0
      const s = sim.current
      if (s.active) for (let i = 0; i < 2; i++) s.step()
      draw(now)
      if (visible && (s.active || drag)) raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame)
    }
    kick.current = () => {
      t0 = t0 || performance.now()
      start()
    }

    const toGraph = (e: PointerEvent) => {
      const r = box.getBoundingClientRect()
      return [(e.clientX - r.left - (r.width - W * scale) / 2) / scale, (e.clientY - r.top - (r.height - H * scale) / 2) / scale] as const
    }
    const hit = (x: number, y: number) => {
      let best: string | null = null
      let bd = Infinity
      for (const n of sim.current.nodes) {
        const d = Math.hypot(n.x - x, n.y - y)
        if (d < Math.max(n.r + 6, 11) && d < bd) (bd = d), (best = n.id)
      }
      return best
    }
    const down = (e: PointerEvent) => {
      const [x, y] = toGraph(e)
      const id = hit(x, y)
      if (!id) return
      drag = { id, moved: false }
      cv.setPointerCapture(e.pointerId)
      const n = sim.current.nodes.find((q) => q.id === id)!
      n.pinned = true
      e.preventDefault()
    }
    const move = (e: PointerEvent) => {
      const [x, y] = toGraph(e)
      if (drag) {
        const n = sim.current.nodes.find((q) => q.id === drag!.id)
        if (n) {
          n.x = x
          n.y = y
          drag.moved = true
          sim.current.reheat(0.3)
        }
        start()
        return
      }
      const h = hit(x, y)
      if (h !== hover.current) {
        hover.current = h
        cv.style.cursor = h ? 'pointer' : 'default'
        start()
        if (reduced) draw(performance.now())
      }
    }
    const up = () => {
      if (!drag) return
      const n = sim.current.nodes.find((q) => q.id === drag!.id)
      if (n) n.pinned = false
      if (!drag.moved) {
        const gn = live.current.graph.nodes.find((q) => q.id === drag!.id)
        if (gn?.kind === 'note' && gn.noteId) live.current.onSelect(gn.noteId)
        else if (gn?.kind === 'tag') live.current.onTag?.(live.current.activeTag === gn.label.slice(1) ? null : gn.label.slice(1))
        else if (gn?.kind === 'ghost') live.current.onTag?.(null)
      }
      drag = null
      start()
    }
    const leave = () => {
      hover.current = null
      if (reduced) draw(performance.now())
    }

    readColors()
    const ro = new ResizeObserver(resize)
    ro.observe(box)
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
      if (visible) start()
    })
    io.observe(box)
    const mo = new MutationObserver(() => (readColors(), draw(performance.now())))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-mode', 'style'] })
    cv.addEventListener('pointerdown', down)
    cv.addEventListener('pointermove', move)
    cv.addEventListener('pointerup', up)
    cv.addEventListener('pointercancel', up)
    cv.addEventListener('pointerleave', leave)
    resize()
    start()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      cv.removeEventListener('pointerdown', down)
      cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerup', up)
      cv.removeEventListener('pointercancel', up)
      cv.removeEventListener('pointerleave', leave)
    }
  }, [])

  useEffect(() => kick.current(), [selectedId, activeTag])

  return (
    <div ref={wrap} className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-bg" data-testid="brain-graph">
      <canvas
        ref={canvas}
        className="absolute inset-0 size-full"
        style={{ touchAction: 'pan-y' }}
        role="img"
        aria-label={`Your second brain: ${notes.length} ${notes.length === 1 ? 'note' : 'notes'} connected as a network. The note list below has the same content.`}
      />
    </div>
  )
}
