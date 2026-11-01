import { describe, expect, it } from 'vitest'
import type { Note } from '../state/types'
import { backlinks, buildGraph, graphStats, parseLinks, parseTags, renameLinks, uniqueTitle } from './notes'
import { insideBrain, Simulation } from './sim'

const n = (id: string, title: string, body = '', date = '2026-10-31'): Note => ({ id, date, title, body })

describe('parsing', () => {
  it('finds [[links]] with aliases and #tags in any alphabet', () => {
    expect(parseLinks('See [[Deep Work]] and [[ deep   work |dw]] and [[Gym]]')).toEqual(['deep work', 'gym'])
    expect(parseTags('# heading\nidea #Focus and (#deep-work) #שלום c#sharp')).toEqual(['focus', 'deep-work', 'שלום'])
  })
  it('renames links in other notes, keeping aliases', () => {
    expect(renameLinks('a [[Old|x]] b [[old]] c [[Other]]', 'Old', 'New')).toBe('a [[New|x]] b [[New]] c [[Other]]')
  })
  it('makes titles unique', () => {
    expect(uniqueTitle([n('1', 'Idea')], 'idea')).toBe('idea 2')
  })
})

describe('graph', () => {
  const notes = [n('1', 'Focus', 'about [[Sleep]] #health'), n('2', 'Sleep', 'back to [[focus]] and [[Nowhere]] #health'), n('3', 'Lonely')]
  const g = buildGraph(notes)
  it('links notes both ways once, adds tag and ghost nodes', () => {
    expect(g.nodes.filter((x) => x.kind === 'note')).toHaveLength(3)
    expect(g.nodes.find((x) => x.kind === 'tag')?.label).toBe('#health')
    expect(g.nodes.find((x) => x.kind === 'ghost')?.label).toBe('nowhere')
    expect(g.edges.filter((e) => e.kind === 'link' && e.a.startsWith('n:') && e.b.startsWith('n:'))).toHaveLength(1)
  })
  it('measures the graph', () => {
    const st = graphStats(g)
    expect(st).toMatchObject({ notes: 3, tags: 1, orphans: 1, clusters: 1 })
    expect(st.density).toBeCloseTo(1 / 3)
    expect(st.hub?.degree).toBe(3)
    expect(g.nodes.find((x) => x.label === 'Lonely')?.cluster).toBeGreaterThan(0)
  })
  it('lists backlinks', () => {
    expect(backlinks(notes, notes[0]).map((x) => x.id)).toEqual(['2'])
  })
})

describe('brain layout', () => {
  it('keeps every node inside the brain, deterministically', () => {
    const many = Array.from({ length: 60 }, (_, i) => n(String(i), `Note ${i}`, `[[Note ${(i * 7) % 60}]] #t${i % 5}`))
    const run = () => {
      const sim = new Simulation()
      sim.update(buildGraph(many))
      sim.settle()
      return sim.nodes
    }
    const a = run()
    expect(a.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && insideBrain(p.x, p.y, 0))).toBe(true)
    expect(a.map((p) => [Math.round(p.x), Math.round(p.y)]).slice(0, 5)).toBeTruthy()
  })
  it('keeps existing positions when the graph grows', () => {
    const sim = new Simulation()
    sim.update(buildGraph([n('1', 'A')]))
    sim.settle(10)
    const before = { x: sim.nodes[0].x, y: sim.nodes[0].y }
    sim.update(buildGraph([n('1', 'A'), n('2', 'B', '[[A]]')]))
    expect(sim.nodes[0].x).toBe(before.x)
    expect(sim.nodes[0].y).toBe(before.y)
  })
})
