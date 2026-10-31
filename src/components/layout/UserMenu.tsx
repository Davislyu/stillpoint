import { useEffect, useRef, useState } from 'react'
import { legacyImportOps } from '../../data/legacyImport'
import { SyncEngine } from '../../data/syncEngine'
import { exportState, legacyImportedKey, parseLegacy, readLegacy, type LegacyState } from '../../state/storage'
import { useStore } from '../../state/store'
import { useToast } from '../ui/Toast'
import { useAuthActions } from '../../auth/authActions'

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  const [broken, setBroken] = useState(false)
  const initials = (name ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return image && !broken ? (
    <img
      src={image}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="size-8 rounded-full object-cover"
    />
  ) : (
    <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2">
      {initials}
    </span>
  )
}

/** Account, sync status and data controls. */
export function UserMenu() {
  const { state, user, sync, engine } = useStore()
  const { signOut } = useAuthActions()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [legacy, setLegacy] = useState(() => readLegacy(user.id))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setConfirmSignOut(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const fileRef = useRef<HTMLInputElement>(null)

  const importLegacy = (data: LegacyState | null) => {
    setOpen(false)
    if (!data) return toast('That file isn\u2019t a Stillpoint v1 backup.')
    const ops = legacyImportOps(data, engine.getState().tables, user.id)
    engine.commit(ops)
    localStorage.setItem(legacyImportedKey(user.id), new Date().toISOString())
    setLegacy(null)
    toast(ops.length ? 'Habit history added to your account.' : 'Nothing new to bring over.')
  }

  const importFile = async (file: File) => {
    try {
      importLegacy(parseLegacy(JSON.parse(await file.text())))
    } catch {
      importLegacy(null)
    }
  }

  const doSignOut = async () => {
    if (sync.pending > 0 && !confirmSignOut) return setConfirmSignOut(true)
    engine.stop()
    SyncEngine.clearDevice(user.id)
    await signOut()
  }

  const item = 'block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-2 hover:bg-surface-2 hover:text-ink'

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Account and data"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full ring-offset-2 ring-offset-bg transition-shadow hover:ring-2 hover:ring-line-strong"
      >
        <Avatar name={user.name} image={user.image} />
      </button>
      {open && (
        <div
          role="menu"
          className="anim-rise absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.45)]"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="truncate text-sm font-medium text-ink">{user.name ?? 'Signed in'}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
          </div>
          <div className="border-t border-line pt-1.5">
            <button role="menuitem" className={item} onClick={() => (exportState(state), setOpen(false))}>
              Download my data
            </button>
            {legacy && (
              <button role="menuitem" className={item} onClick={() => importLegacy(legacy)}>
                Add habit history saved in this browser
              </button>
            )}
            <button role="menuitem" className={item} onClick={() => fileRef.current?.click()}>
              Import a v1 backup file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
            />
            <button role="menuitem" className={`${item} ${confirmSignOut ? 'font-medium text-ink!' : ''}`} onClick={doSignOut}>
              {confirmSignOut
                ? `${sync.pending} unsynced ${sync.pending === 1 ? 'change' : 'changes'} will be lost. Sign out anyway`
                : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
