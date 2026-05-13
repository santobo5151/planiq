import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEventById } from '@/services/events'
import { EditEventForm } from '@/components/events/edit-event-form'

export default async function EditEventPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const event = await getEventById(params.eventId, user.id)
  if (!event) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/events/${event.id}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to Event
        </Link>
        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Edit Event
          </h1>
          <p className="mt-1 text-slate-600">
            Update the details for &ldquo;{event.title}&rdquo;.
          </p>
        </div>
        <EditEventForm event={event} />
      </div>
    </div>
  )
}
