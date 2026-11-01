/**
 * Swipe a bottom sheet down from its top edge to close it, like a native iOS sheet.
 * One global listener: any `.sheet` dialog works, no per-dialog wiring.
 */
export function installSheetDrag() {
  let sheet: HTMLElement | null = null
  let startY = 0
  let dy = 0
  let startT = 0

  const phone = () => matchMedia('(max-width: 639px)').matches

  addEventListener(
    'touchstart',
    (e) => {
      const t = e.target as HTMLElement | null
      const el = t?.closest<HTMLElement>('.sheet')
      if (!el || !phone() || e.touches.length !== 1) return
      const y = e.touches[0].clientY
      // Only from the grabber and header area, so scrolling the content still scrolls.
      if (y - el.getBoundingClientRect().top > 72) return
      sheet = el
      startY = y
      dy = 0
      startT = e.timeStamp
      el.classList.remove('settling')
      el.classList.add('dragging')
    },
    { passive: true },
  )

  addEventListener(
    'touchmove',
    (e) => {
      if (!sheet) return
      dy = Math.max(0, e.touches[0].clientY - startY)
      sheet.style.transform = `translateY(${dy}px)`
    },
    { passive: true },
  )

  const end = (e: TouchEvent) => {
    if (!sheet) return
    const el = sheet
    sheet = null
    el.classList.remove('dragging')
    const fast = dy / Math.max(1, e.timeStamp - startT) > 0.6
    if (dy > 110 || (fast && dy > 30)) {
      // The backdrop's own click handler closes the dialog.
      el.parentElement?.click()
    } else {
      el.classList.add('settling')
      el.style.transform = ''
    }
  }
  addEventListener('touchend', end, { passive: true })
  addEventListener('touchcancel', end, { passive: true })
}
