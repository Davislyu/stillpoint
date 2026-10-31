import { relativeDays, shortDate } from '../../lib/date'
import type { DateKey } from '../../state/types'

/** Shown on daily panels when a past day is selected in the 14-day history. */
export function PastDayNote({ date, today, onBackToToday }: { date: DateKey; today: DateKey; onBackToToday: () => void }) {
  if (date === today) return null
  return (
    <>
      Showing {relativeDays(today, date).toLowerCase()}, {shortDate(date)}.{' '}
      <button className="underline underline-offset-2 hover:text-ink" onClick={onBackToToday}>
        Back to today
      </button>
    </>
  )
}
