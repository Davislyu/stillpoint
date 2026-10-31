import type { Graph } from './notes'

/** Graph space. The canvas scales this to whatever size it has. */
export const W = 400
export const H = 300

/** A side-view brain as three soft regions: cerebrum, cerebellum and stem. */
const BLOBS = [
  { cx: 196, cy: 122, rx: 168, ry: 100 },
  { cx: 276, cy: 230, rx: 62, ry: 38 },
  { cx: 226, cy: 262, rx: 17, ry: 36 },
]

const norm2 = (x: number, y: number, b: (typeof BLOBS)[number], pad: number) =>
  ((x - b.cx) / (b.rx - pad)) ** 2 + ((y - b.cy) / (b.ry - pad)) ** 2

export const insideBrain = (x: number, y: number, pad = 0) => BLOBS.some((b) => norm2(x, y, b, pad) <= 1)

/** Pulls a point back along the ray to the nearest region's centre until it is inside. */
export function clampToBrain(x: number, y: number, pad = 8): [number, number] {
  if (insideBrain(x, y, pad)) return [x, y]
  let best = BLOBS[0]
  let bestD = Infinity
  for (const b of BLOBS) {
    const d = norm2(x, y, b, pad)
    if (d < bestD) (bestD = d), (best = b)
  }
  const k = 0.985 / Math.sqrt(bestD)
  return [best.cx + (x - best.cx) * k, best.cy + (y - best.cy) * k]
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) (h ^= s.charCodeAt(i)), (h = Math.imul(h, 16777619))
  return h >>> 0
}
const rand = (seed: number) => {
  let a = seed || 1
  return () => ((a = Math.imul(a ^ (a >>> 15), a | 1) ^ (a + Math.imul(a ^ (a >>> 7), a | 61))), ((a ^ (a >>> 14)) >>> 0) / 4294967296)
}

export interface SimNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  r: number
  pinned: boolean
}

export class Simulation {
  nodes: SimNode[] = []
  links: [number, number, number][] = [] // index a, index b, rest length
  alpha = 1

  /** Rebuild from a graph, keeping the positions of nodes that already exist. */
  update(graph: Graph) {
    const prev = new Map(this.nodes.map((n) => [n.id, n]))
    this.nodes = graph.nodes.map((g) => {
      const old = prev.get(g.id)
      const r = g.kind === 'note' ? 5 + Math.min(7, g.degree * 1.4) : g.kind === 'tag' ? 4.5 : 3.5
      if (old) return { ...old, r }
      const rnd = rand(hash(g.id))
      let x = 200
      let y = 120
      for (let i = 0; i < 20; i++) {
        x = 60 + rnd() * 280
        y = 40 + rnd() * 160
        if (insideBrain(x, y, 14)) break
      }
      return { id: g.id, x, y, vx: 0, vy: 0, r, pinned: false }
    })
    const at = new Map(this.nodes.map((n, i) => [n.id, i]))
    this.links = graph.edges.map((e) => [at.get(e.a)!, at.get(e.b)!, e.kind === 'tag' ? 38 : 52])
    this.alpha = Math.max(this.alpha, 0.9)
  }

  step() {
    const ns = this.nodes
    const a = this.alpha
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        let dx = ns[j].x - ns[i].x
        let dy = ns[j].y - ns[i].y
        let d2 = dx * dx + dy * dy
        if (d2 < 0.01) (dx = Math.random() - 0.5), (dy = Math.random() - 0.5), (d2 = dx * dx + dy * dy + 0.01)
        if (d2 > 6400) continue
        const f = (650 / d2) * a
        const d = Math.sqrt(d2)
        dx = (dx / d) * f
        dy = (dy / d) * f
        ns[i].vx -= dx
        ns[i].vy -= dy
        ns[j].vx += dx
        ns[j].vy += dy
      }
    }
    for (const [i, j, rest] of this.links) {
      const dx = ns[j].x - ns[i].x
      const dy = ns[j].y - ns[i].y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const f = ((d - rest) / d) * 0.05 * a
      ns[i].vx += dx * f
      ns[i].vy += dy * f
      ns[j].vx -= dx * f
      ns[j].vy -= dy * f
    }
    for (const n of ns) {
      n.vx += (200 - n.x) * 0.0016 * a
      n.vy += (125 - n.y) * 0.0016 * a
      if (n.pinned) {
        n.vx = n.vy = 0
        continue
      }
      n.vx *= 0.8
      n.vy *= 0.8
      ;[n.x, n.y] = clampToBrain(n.x + n.vx, n.y + n.vy, 8 + n.r * 0.4)
    }
    this.alpha *= 0.985
  }

  settle(steps = 260) {
    for (let i = 0; i < steps; i++) this.step()
  }
  get active() {
    return this.alpha > 0.02
  }
  reheat(a = 0.35) {
    this.alpha = Math.max(this.alpha, a)
  }
}
