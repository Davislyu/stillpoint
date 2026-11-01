import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { defaultSpan, GRID_COLS, MAX_HEIGHT, MIN_SPAN, PANELS, type PanelId, type PanelSize } from '../../dashboard/layout'

type Sizes = Partial<Record<PanelId, PanelSize>>
const label = (id: PanelId) => PANELS.find((p) => p.id === id)?.label ?? id
const GAP = 24

interface Props {
  /** Visible panels, in order. */
  ids: PanelId[]
  sizes: Sizes
  editing: boolean
  render: (id: PanelId) => ReactNode
  /** Extra classes per panel (phone tab visibility). */
  itemClass: (id: PanelId) => string
  onChange: (next: { ids: PanelId[]; sizes: Sizes }) => void
}

const styleFor = (id: PanelId, sizes: Sizes): CSSProperties =>
  ({ '--span': sizes[id]?.w ?? defaultSpan(id), ...(sizes[id]?.h ? { '--min-h': `${sizes[id]!.h}px` } : {}) }) as CSSProperties

function Item({ id, sizes, editing, children, className, grid, onResize, onResizeEnd }: { id: PanelId; sizes: Sizes; editing: boolean; children: ReactNode; className: string; grid: React.RefObject<HTMLDivElement | null>; onResize: (id: PanelId, s: PanelSize) => void; onResizeEnd: (id: PanelId, s: PanelSize) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editing })
  const el = useRef<HTMLDivElement | null>(null)
  const size = sizes[id] ?? { w: defaultSpan(id) }

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const node = el.current
    const g = grid.current
    if (!node || !g) return
    const colW = (g.getBoundingClientRect().width - GAP * (GRID_COLS - 1)) / GRID_COLS
    const startW = size.w
    const startH = node.getBoundingClientRect().height
    const x0 = e.clientX
    const y0 = e.clientY
    let last: PanelSize = size
    const move = (ev: PointerEvent) => {
      const w = Math.min(GRID_COLS, Math.max(MIN_SPAN, Math.round(startW + (ev.clientX - x0) / (colW + GAP))))
      const h = Math.min(MAX_HEIGHT, Math.max(0, Math.round((startH + ev.clientY - y0) / 20) * 20))
      last = { w, h: h > 0 ? h : undefined }
      onResize(id, last)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      onResizeEnd(id, last)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  const key = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? [1, 0] : e.key === 'ArrowLeft' ? [-1, 0] : e.key === 'ArrowDown' ? [0, 40] : e.key === 'ArrowUp' ? [0, -40] : null
    if (!step) return
    e.preventDefault()
    const node = el.current
    const h = Math.max(0, (size.h ?? Math.round(node?.getBoundingClientRect().height ?? 0)) + step[1])
    onResizeEnd(id, { w: Math.min(GRID_COLS, Math.max(MIN_SPAN, size.w + step[0])), h: h > 0 ? Math.min(MAX_HEIGHT, h) : undefined })
  }

  return (
    <div
      ref={(n) => {
        setNodeRef(n)
        el.current = n
      }}
      style={{ ...styleFor(id, sizes), transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 30 : undefined }}
      className={`dash-item relative ${className} ${editing ? `pt-11 rounded-2xl outline-2 outline-offset-2 outline-dashed ${isDragging ? 'opacity-80 outline-ink' : 'outline-line-strong'}` : ''}`}
      data-panel={id}
    >
      {editing ? (
        <div inert className="pointer-events-none opacity-90 select-none">
          {children}
        </div>
      ) : (
        children
      )}
      {editing && (
        <>
          <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Move ${label(id)}. Press space, then arrow keys.`}
              className="inline-flex h-8 cursor-grab touch-none items-center gap-1.5 rounded-full bg-ink px-3 text-[12px] font-medium text-bg shadow-lg active:cursor-grabbing"
            >
              <span aria-hidden="true">⠿</span> {label(id)}
            </button>
            <span className="rounded-full bg-float px-2 py-1 font-mono text-[11px] text-ink-2 shadow">
              {size.w}/12{size.h ? ` · ${size.h}px` : ''}
            </span>
          </div>
          <button
            type="button"
            onPointerDown={startResize}
            onKeyDown={key}
            aria-label={`Resize ${label(id)}: arrow keys change width and height`}
            className="absolute right-1 bottom-1 z-10 grid size-8 cursor-nwse-resize touch-none place-items-center rounded-full bg-ink text-bg shadow-lg"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M6 14L14 6M10 14l4-4" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

/** The dashboard grid. In edit mode panels can be dragged to new places and pulled to new sizes. */
export function ArrangeGrid({ ids, sizes, editing, render, itemClass, onChange }: Props) {
  const grid = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState<Sizes | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const shown = live ?? sizes

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(active.id as PanelId)
    const to = ids.indexOf(over.id as PanelId)
    if (from < 0 || to < 0) return
    onChange({ ids: arrayMove(ids, from, to), sizes })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div ref={grid} className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6" aria-label="Dashboard panels">
          {ids.map((id) => (
            <Item
              key={id}
              id={id}
              sizes={shown}
              editing={editing}
              grid={grid}
              className={itemClass(id)}
              onResize={(pid, s) => setLive({ ...sizes, [pid]: s })}
              onResizeEnd={(pid, s) => {
                setLive(null)
                onChange({ ids, sizes: { ...sizes, [pid]: s } })
              }}
            >
              {render(id)}
            </Item>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
