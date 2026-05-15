import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { getEventById } from '@/services/events'
import { getEventGuests } from '@/services/guests'
import { getMarketFromLocation } from '@/lib/localisation'
import { endOfDayISOToDateString } from '@/lib/rsvp-deadline'
import { GuestManager } from './_components/GuestManager'
import type { Guest } from '@/types/database'

type EnrichedGuest = Guest & {
  rsvp_sent_at_display: string | null
  rsvp_responded_at_display: string | null
}

export default async function GuestsPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role) redirect('/onboarding')
  if (profile.role !== 'planner') redirect('/dashboard')

  const event = await getEventById(params.eventId, user.id)
  if (!event) redirect('/dashboard')

  const guests = await getEventGuests(params.eventId)

  const market = getMarketFromLocation(event.location)
  const tz = market === 'nigeria' ? 'Africa/Lagos' : 'Europe/London'

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const enrichedGuests: EnrichedGuest[] = guests.map((g) => ({
    ...g,
    rsvp_sent_at_display: g.rsvp_sent_at ? fmt.format(new Date(g.rsvp_sent_at)) : null,
    rsvp_responded_at_display: g.rsvp_responded_at ? fmt.format(new Date(g.rsvp_responded_at)) : null,
  }))

  let initialRsvpDeadlineInputValue: string | null = null
  let initialRsvpDeadlineDisplay: string | null = null

  if (event.rsvp_deadline) {
    initialRsvpDeadlineInputValue = endOfDayISOToDateString(event.rsvp_deadline, market)
    initialRsvpDeadlineDisplay = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(event.rsvp_deadline))
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/events/${event.id}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to Event
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Guests
          </h1>
          <p className="mt-1 text-slate-600">{event.title}</p>
        </div>

        <div className="mt-8">
          <GuestManager
            eventId={event.id}
            initialGuestsWithDisplays={enrichedGuests}
            initialRsvpDeadlineInputValue={initialRsvpDeadlineInputValue}
            initialRsvpDeadlineDisplay={initialRsvpDeadlineDisplay}
          />
        </div>
      </div>
    </div>
  )
}
