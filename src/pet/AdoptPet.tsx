import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { useThemeCtx } from '../themes/vibe'
import { Button } from '../components/ui/Button'
import { PetSprite } from './PetSprite'
import { SPECIES_INFO } from './sprites'
import { SPECIES, type Species } from './types'

/** Pick a companion and name it. Also used to swap companions later (progress stays: it is all derived). */
export function AdoptPet({ onClose }: { onClose: () => void }) {
  const { today } = useStore()
  const { prefs, setPet } = useThemeCtx()
  const [species, setSpecies] = useState<Species>(prefs.pet?.species ?? 'fox')
  const [name, setName] = useState(prefs.pet?.name ?? '')
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    addEventListener('keydown', k)
    return () => {
      removeEventListener('keydown', k)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adopt-title"
        onClick={(e) => e.stopPropagation()}
        className="sheet anim-rise flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-2 border-line bg-bg shadow-2xl sm:rounded-3xl"
      >
        <div className="overflow-y-auto px-5 pt-5 pb-5 sm:px-7">
          <h2 id="adopt-title" className="font-display text-2xl text-ink">{prefs.pet ? 'Change companion' : 'An egg hatches!'}</h2>
          <p className="mt-1 text-sm text-muted">Who will keep you company? Your pet lives at the bottom of the screen and cheers on everything you do.</p>
          <ul className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Companion">
            {SPECIES.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={species === s}
                  onClick={() => setSpecies(s)}
                  className={`flex w-full flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 text-center transition-colors ${species === s ? 'border-accent-sand bg-surface-2' : 'border-line hover:border-line-strong'}`}
                >
                  <PetSprite species={s} size={88} mood={species === s ? 'happy' : 'ok'} />
                  <span className="text-sm font-medium text-ink">{SPECIES_INFO[s].label}</span>
                  <span className="text-[12px] leading-snug text-muted">{SPECIES_INFO[s].blurb}</span>
                  <span className="text-[11px] text-accent-sand">{SPECIES_INFO[s].trait}</span>
                </button>
              </li>
            ))}
          </ul>
          <label className="mt-4 block text-[13px] text-ink-2" htmlFor="pet-name">
            Name
          </label>
          <input
            id="pet-name"
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pip"
            className="field mt-1 h-11 w-full rounded-xl px-3 text-ink placeholder:text-muted"
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Later
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setPet({ species, name: name.trim() || 'Pip', since: prefs.pet?.since || today })
                onClose()
              }}
            >
              {prefs.pet ? 'Save' : 'Adopt'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
