import 'server-only'
import type { getMarketFromLocation } from '@/lib/localisation'

type Market = ReturnType<typeof getMarketFromLocation>

function marketToTimezone(market: Market): string {
  if (market === 'nigeria') return 'Africa/Lagos'
  // 'uk' and 'international' both default to Europe/London (handles DST)
  return 'Europe/London'
}

// Returns UTC offset in seconds (UTC minus local) at noon UTC on the given date.
// Sampling at noon UTC is safe for UK (UTC+0/+1) and Nigeria (UTC+1) —
// neither timezone crosses midnight at that reference point.
function getOffsetSecondsAtNoon(year: number, month: number, day: number, tz: string): number {
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(noonUtc)

  const p: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  }

  // Some runtimes emit 24 for midnight; normalise to 0.
  const localH = p.hour === 24 ? 0 : p.hour
  const localSecs = localH * 3600 + p.minute * 60 + p.second
  const utcSecs = 12 * 3600

  // Negative for UTC+ timezones (local runs ahead of UTC).
  return utcSecs - localSecs
}

// Converts a YYYY-MM-DD date string to a UTC ISO 8601 timestamp representing
// 23:59:59 local time on that date in the event's market timezone.
//
// Expected outputs:
//   Europe/London summer (BST, UTC+1): '2026-07-16' → '2026-07-16T22:59:59.000Z'
//   Europe/London winter (GMT, UTC+0): '2026-12-16' → '2026-12-16T23:59:59.000Z'
//   Africa/Lagos (WAT, UTC+1, no DST): '2026-07-16' → '2026-07-16T22:59:59.000Z'
export function dateStringToEndOfDayISO(dateString: string, market: Market): string {
  const tz = marketToTimezone(market)
  const [year, month, day] = dateString.split('-').map(Number)
  const offsetSecs = getOffsetSecondsAtNoon(year, month, day, tz)
  // UTC for YYYY-MM-DD 23:59:59 local = same moment in UTC notation shifted by the offset.
  const utcMs = Date.UTC(year, month - 1, day, 23, 59, 59) + offsetSecs * 1000
  return new Date(utcMs).toISOString()
}

// Inverse: converts the stored UTC ISO deadline to the YYYY-MM-DD date string
// in the event's market timezone, for pre-filling the date input.
export function endOfDayISOToDateString(iso: string, market: Market): string {
  const tz = marketToTimezone(market)
  const date = new Date(iso)

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const p: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') p[part.type] = part.value
  }

  return `${p.year}-${p.month}-${p.day}`
}
