import { useEffect, useMemo, useRef } from 'react'
import { buildGraph } from '../../brain/notes'
import { H, Simulation, W } from '../../brain/sim'
import type { Note } from '../../state/types'

/** Side-view brain outline plus a few gyri folds, in graph space. */
const OUTLINE = new Path2D(
  'M60 130 C40 90 70 40 130 34 C170 12 240 14 276 40 C336 46 372 92 352 140 C346 170 316 186 296 190 C318 206 322 244 292 262 C262 276 232 262 224 246 L236 296 C232 302 216 302 212 296 L206 220 C160 214 100 186 60 130 Z',
)
const FOLDS = [
  'M110 80 C140 60 170 90 200 68 S260 60 300 84',
  'M84 118 C120 104 150 128 190 110 S270 112 330 124',
  'M120 154 C150 140 190 164 224 148 S290 150 316 160',
  'M170 42 C176 70 160 86 176 108',
  'M250 38 C246 66 262 82 252 104',
]

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
    let colors = { ink: '#ddd', muted: '#888', line: '#444', accent: '#8bd', warm: '#e96', surface: '#222' }

    const readColors = () => {
      colors = {
        ink: cssVar(box, '--ink', colors.ink),
        muted: cssVar(box, '--muted', colors.muted),
        line: cssVar(box, '--line-strong', colors.line),
        accent: cssVar(box, '--accent-teal', colors.accent),
        warm: cssVar(box, '--accent-sand', colors.warm),
        surface: cssVar(box, '--surface-2', colors.surface),
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
      const dpr = Math.min(2, devicePixelRatio || 1)
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.restore()
      void dpr

      // silhouette
      ctx.lineWidth = 1.4
      ctx.strokeStyle = colors.line
      ctx.fillStyle = colors.surface
      ctx.globalAlpha = 0.35
      ctx.fill(OUTLINE)
      ctx.globalAlpha = 0.9
      ctx.stroke(OUTLINE)
      ctx.globalAlpha = 0.28
      ctx.lineWidth = 1
      for (const f of FOLDS) ctx.stroke(new Path2D(f))
      ctx.globalAlpha = 1

      const idx = new Map(s.nodes.map((n) => [n.id, n]))
      const selNode = sel ? `n:${sel}` : null
      const focus = neighbours(hover.current ?? selNode)
      const hasFocus = focus.size > 0
      const tagId = tag ? `t:${tag}` : null
      const tagSet = tagId ? neighbours(tagId) : null
      const t = (now - t0) / 1000

      // edges + signal pulses
      let ei = 0
      for (const e of g.edges) {
        const a = idx.get(e.a)
        const b = idx.get(e.b)
        ei++
        if (!a || !b) continue
        const lit = hasFocus && focus.has(e.a) && focus.has(e.b) && (e.a === (hover.current ?? selNode) || e.b === (hover.current ?? selNode))
        const dim = (hasFocus && !lit) || (tagSet && !(tagSet.has(e.a) && tagSet.has(e.b)))
        ctx.globalAlpha = dim ? 0.12 : lit ? 0.95 : 0.45
        ctx.strokeStyle = lit ? colors.accent : colors.muted
        ctx.lineWidth = lit ? 1.6 : e.kind === 'tag' ? 0.6 : 1
        ctx.setLineDash(e.kind === 'tag' ? [2, 3] : [])
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.setLineDash([])
        if (!reduced && !dim && e.kind === 'link') {
          const p = (t * 0.28 + ei * 0.37) % 1
          ctx.globalAlpha = lit ? 1 : 0.7
          ctx.fillStyle = lit ? colors.warm : colors.accent
          ctx.beginPath()
          ctx.arc(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p, lit ? 1.9 : 1.3, 0, 7)
          ctx.fill()
        }
      }

      // nodes
      for (const n of s.nodes) {
        const gn = g.nodes.find((x) => x.id === n.id)
        if (!gn) continue
        const dim = (hasFocus && !focus.has(n.id)) || (tagSet && !tagSet.has(n.id))
        const isSel = n.id === selNode
        const base = gn.kind === 'note' ? colors.ink : gn.kind === 'tag' ? colors.warm : colors.muted
        ctx.globalAlpha = dim ? 0.25 : 1
        if (gn.kind !== 'ghost' && !dim) {
          const pulse = reduced ? 0 : Math.sin(t * 1.6 + n.x * 0.05) * 0.5 + 0.5
          const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * (isSel ? 4 : 2.8))
          glow.addColorStop(0, gn.kind === 'tag' ? colors.warm : colors.accent)
          glow.addColorStop(1, 'transparent')
          ctx.globalAlpha = (isSel ? 0.55 : 0.18 + pulse * 0.1) * (dim ? 0.3 : 1)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r * (isSel ? 4 : 2.8), 0, 7)
          ctx.fill()
          ctx.globalAlpha = 1
        }
        ctx.beginPath()
        if (gn.kind === 'tag') {
          ctx.moveTo(n.x, n.y - n.r)
          ctx.lineTo(n.x + n.r, n.y)
          ctx.lineTo(n.x, n.y + n.r)
          ctx.lineTo(n.x - n.r, n.y)
          ctx.closePath()
        } else ctx.arc(n.x, n.y, n.r, 0, 7)
        if (gn.kind === 'ghost') {
          ctx.strokeStyle = base
          ctx.lineWidth = 1
          ctx.setLineDash([2, 2])
          ctx.stroke()
          ctx.setLineDash([])
        } else {
          ctx.fillStyle = base
          ctx.fill()
          if (isSel) {
            ctx.strokeStyle = colors.accent
            ctx.lineWidth = 1.8
            ctx.beginPath()
            ctx.arc(n.x, n.y, n.r + 3, 0, 7)
            ctx.stroke()
          }
        }
        const showLabel = isSel || hover.current === n.id || (!hasFocus && !dim && gn.kind === 'note' && gn.degree >= 2) || (tagSet && tagSet.has(n.id)) || (hasFocus && focus.has(n.id))
        if (showLabel) {
          ctx.globalAlpha = dim ? 0.3 : 0.95
          ctx.font = `${isSel ? 600 : 500} 8.5px ui-sans-serif, system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.fillStyle = colors.ink
          const label = gn.label.length > 22 ? gn.label.slice(0, 21) + '…' : gn.label
          ctx.fillText(label, n.x, n.y + n.r + 10)
        }
      }
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      raf = 0
      const s = sim.current
      if (s.active) for (let i = 0; i < 2; i++) s.step()
      draw(now)
      if (visible && (!reduced || s.active || drag)) raf = requestAnimationFrame(frame)
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
    <div ref={wrap} className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-bg" data-testid="brain-graph">
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
