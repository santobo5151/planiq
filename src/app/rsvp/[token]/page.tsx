import { getGuestByRsvpToken } from '@/services/guests'
import type { PublicRsvpGuest } from '@/types/database'
import { RsvpForm } from './_components/RsvpForm'

export const dynamic = 'force-dynamic'

export default async function RsvpPage({
  params,
}: {
  params: { token: string }
}) {
  const result = await getGuestByRsvpToken(params.token)

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Link not found</p>
          <p className="mt-2 text-sm text-slate-500">
            This RSVP link is invalid or has been removed.
          </p>
        </div>
      </div>
    )
  }

  const { guest, event } = result

  const publicGuest: PublicRsvpGuest = {
    first_name: guest.first_name,
    last_name: guest.last_name,
    rsvp_status: guest.rsvp_status,
    plus_one: guest.plus_one,
    plus_one_allowed: guest.plus_one_allowed,
    dietary_notes: guest.dietary_notes,
    rsvp_responded_at: guest.rsvp_responded_at,
  }

  const isLocked = Boolean(
    event.rsvp_deadline && new Date() > new Date(event.rsvp_deadline)
  )

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">{event.title}</p>
            <p className="mt-1 text-sm text-slate-500">RSVP is now closed.</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1 text-sm text-slate-700">
            <p>
              <span className="font-medium">Name:</span>{' '}
              {publicGuest.first_name} {publicGuest.last_name}
            </p>
            <p>
              <span className="font-medium">Response:</span>{' '}
              {publicGuest.rsvp_status === 'attending'
                ? 'Attending'
                : publicGuest.rsvp_status === 'declined'
                  ? 'Declined'
                  : 'Not responded'}
            </p>
            {publicGuest.plus_one && publicGuest.rsvp_status === 'attending' && (
              <p>
                <span className="font-medium">Plus one:</span> Yes
              </p>
            )}
            {publicGuest.dietary_notes && (
              <p>
                <span className="font-medium">Dietary notes:</span>{' '}
                {publicGuest.dietary_notes}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <RsvpForm
        token={params.token}
        publicGuest={publicGuest}
        eventTitle={event.title}
        eventDate={event.event_date}
        rsvpDeadline={event.rsvp_deadline}
      />
    </div>
  )
}
