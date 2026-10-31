import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastItem {
  id: number
  message: string
}

const ToastContext = createContext<(message: string) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const next = useRef(0)

  const show = useCallback((message: string) => {
    const id = ++next.current
    setItems((xs) => [...xs.slice(-2), { id, message }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3600)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="toast anim-rise rounded-full border border-line bg-ink px-4 py-2 text-sm text-bg shadow-[0_6px_24px_-12px_rgba(0,0,0,0.35)]"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
