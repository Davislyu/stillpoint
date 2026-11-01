import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useThemeCtx } from '../themes/vibe'
import { WANT_LINE } from './care'
import { EggSprite, PetSprite } from './PetSprite'
import { usePetCare } from './usePetCare'

const AdoptPet = lazy(() => import('./AdoptPet').then((m) => ({ default: m.AdoptPet })))

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** The pet lives on the screen: it wanders along the bottom, naps at night and reacts to your day. */
export function Pet() {
  const { prefs } = useThemeCtx()
  const [adopting, setAdopting] = useState(false)
  const pet = prefs.pet
  return (
    <>
      <div className="pet-lane pointer-events-none fixed inset-x-0 z-[25]" aria-live="polite">
        {pet ? <Wanderer /> : <Egg onOpen={() => setAdopting(true)} />}
      </div>
      {adopting && (
        <Suspense fallback={null}>
          <AdoptPet onClose={() => setAdopting(false)} />
        </Suspense>
      )}
    </>
  )
}

function Egg({ onOpen }: { onOpen: () => void }) {
  const [hint, setHint] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setHint(false), 7000)
    return () => clearTimeout(id)
  }, [])
  return (
    <button type="button" onClick={onOpen} className="pet-egg pointer-events-auto absolute bottom-0 left-4 flex items-end gap-2" aria-label="A mysterious egg. Tap to hatch it">
      <EggSprite size={48} className="anim-breathe" />
      {hint && <span className="mb-6 rounded-xl border-2 border-line bg-surface px-2.5 py-1 text-[12px] text-ink shadow-[0_3px_0_#0f0a20]">An egg! Tap to hatch it</span>}
    </button>
  )
}

function Wanderer() {
  const { prefs } = useThemeCtx()
  const { care, stage, accessory, charm } = usePetCare()
  const pet = prefs.pet!
  const lane = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(24)
  const [facing, setFacing] = useState<1 | -1>(1)
  const [walking, setWalking] = useState(false)
  const [say, setSay] = useState<string | null>(null)
  const [hearts, setHearts] = useState(0)
  const size = stage.size
  const sleeping = care.mood === 'sleep'

  const speak = useCallback((t: string, ms = 4200) => {
    setSay(t)
    window.setTimeout(() => setSay((s) => (s === t ? null : s)), ms)
  }, [])

  // Wander now and then.
  useEffect(() => {
    if (sleeping || reduced()) return
    const id = window.setInterval(() => {
      const w = lane.current?.clientWidth ?? 320
      const max = Math.max(0, w - size - 72)
      if (Math.random() < 0.35) return
      setX((cur) => {
        const next = Math.round(Math.random() * max)
        setFacing(next >= cur ? 1 : -1)
        return next
      })
      setWalking(true)
      window.setTimeout(() => setWalking(false), 3200)
    }, 7000)
    return () => clearInterval(id)
  }, [sleeping, size])

  // A little remark every few minutes about what it needs.
  useEffect(() => {
    if (sleeping) return
    const id = window.setInterval(() => {
      if (care.want && Math.random() < 0.6) speak(pick(WANT_LINE[care.want]))
    }, 90_000)
    const first = window.setTimeout(() => care.want && speak(pick(WANT_LINE[care.want])), 6000)
    return () => {
      clearInterval(id)
      clearTimeout(first)
    }
  }, [care.want, sleeping, speak])

  const tap = () => {
    setHearts((h) => h + 1)
    window.setTimeout(() => setHearts((h) => Math.max(0, h - 1)), 1100)
    speak(
      sleeping
        ? 'Zzz...'
        : pick([`${pet.name} purrs.`, `${pet.name} is happy you are here.`, 'Tehe!', care.mood === 'happy' ? 'You are doing great today.' : 'Thanks for the pets.']),
      2400,
    )
  }

  return (
    <div ref={lane} className="relative h-24 pr-16">
      <div
        className="pointer-events-none absolute bottom-0 left-0"
        style={{ transform: `translateX(${x}px)`, transition: reduced() ? 'none' : 'transform 3.2s linear', width: size }}
      >
        {say && (
          <div className={`pointer-events-none absolute bottom-full mb-1 w-max max-w-[11rem] rounded-xl ${x > (lane.current?.clientWidth ?? 600) / 2 ? 'right-0' : 'left-0'} border-2 border-line bg-surface px-2.5 py-1.5 text-left text-[12px] leading-snug text-ink shadow-[0_3px_0_#0f0a20]`}>
            {say}
          </div>
        )}
        <button type="button" onClick={tap} className="pointer-events-auto relative block" aria-label={`${pet.name}, your ${stage.name.toLowerCase()}. ${care.label}. Tap to pet`}>
          <span className={walking ? 'pet-walk block' : sleeping ? 'block' : 'pet-idle block'} style={{ transform: `scaleX(${facing})` }}>
            <PetSprite species={pet.species} mood={care.mood} accessory={accessory} charm={charm} size={size} />
          </span>
          {sleeping && <span className="pet-zzz absolute -top-2 right-0 text-[13px] text-accent-dusk">z z z</span>}
          {Array.from({ length: hearts }).map((_, i) => (
            <span key={i} className="pet-heart absolute -top-1 left-1/2 text-accent-clay" style={{ marginLeft: (i % 3) * 10 - 10 }}>♥</span>
          ))}
        </button>
      </div>
    </div>
  )
}
