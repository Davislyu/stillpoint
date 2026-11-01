import { lazy, Suspense, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { useThemeCtx } from '../themes/vibe'
import { ACCESSORIES, STAGES } from './care'
import { EggSprite, PetSprite } from './PetSprite'
import { SPECIES_INFO } from './sprites'
import { usePetCare } from './usePetCare'

const AdoptPet = lazy(() => import('./AdoptPet').then((m) => ({ default: m.AdoptPet })))

const NEEDS = [
  { key: 'joy', label: 'Joy', hint: 'Habits today', color: 'var(--accent-sage)' },
  { key: 'belly', label: 'Belly', hint: 'Meals today', color: 'var(--accent-sand)' },
  { key: 'energy', label: 'Energy', hint: 'Workouts this week', color: 'var(--accent-clay)' },
  { key: 'wit', label: 'Wit', hint: 'Notes today', color: 'var(--accent-dusk)' },
] as const

export function PetPanel() {
  const { prefs } = useThemeCtx()
  const { care, level, stage, accessory, charm } = usePetCare()
  const [open, setOpen] = useState(false)
  const pet = prefs.pet
  const next = STAGES.find((s) => s.from > level)
  const nextAcc = ACCESSORIES.find((a) => a.from > level)

  return (
    <Panel id="pet" title={pet ? pet.name : 'Your companion'} hint={pet ? `${SPECIES_INFO[pet.species].label} · ${stage.name} · ${care.label}` : 'An egg is waiting for you.'}
      actions={<Button variant="ghost" size="sm" onClick={() => setOpen(true)}>{pet ? 'Change' : 'Hatch'}</Button>}>
      <div className="flex items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center rounded-2xl border-2 border-line bg-bg">
          {pet ? <PetSprite species={pet.species} mood={care.mood} accessory={accessory} charm={charm} size={80} className="pet-idle-inline" /> : <EggSprite size={64} />}
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {NEEDS.map((n) => (
            <li key={n.key} title={n.hint}>
              <div className="flex justify-between text-[12px] text-ink-2">
                <span>{n.label}</span>
                <span className="text-muted">{n.hint}</span>
              </div>
              <div className="mt-0.5 flex gap-[3px]" aria-label={`${n.label} ${Math.round(care[n.key] * 5)} of 5`}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="h-2 flex-1 rounded-[3px]" style={{ background: care[n.key] * 5 > i + 0.2 ? n.color : 'var(--surface-2)' }} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {pet && (
        <p className="mt-3 text-[12.5px] leading-snug text-muted">
          {next ? `Grows into a ${next.name.toLowerCase()} at level ${next.from}. ` : 'Fully grown. '}
          {nextAcc ? `Next keepsake: ${nextAcc.label.toLowerCase()} at level ${nextAcc.from}.` : ''}
        </p>
      )}
      {open && (
        <Suspense fallback={null}>
          <AdoptPet onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </Panel>
  )
}
