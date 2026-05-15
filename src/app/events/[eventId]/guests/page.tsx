import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { getEventById } from '@/services/events'
import { getEventGuests, getGuestSummary } from '@/services/guests'
import { GuestManager } from './_components/GuestManager'

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

  const [guests, summary] = await Promise.all([
    getEventGuests(params.eventId),
    getGuestSummary(params.eventId),
  ])

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
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
            initialGuests={guests}
            initialSummary={summary}
          />
        </div>
      </div>
    </div>
  )
}
