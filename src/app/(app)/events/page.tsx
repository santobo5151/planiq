import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { getPlannerEvents } from '@/services/events'
import { EventsList } from '@/components/dashboard/events-list'

export default async function EventsPage() {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role) redirect('/onboarding')
  if (profile.role === 'client') redirect('/client/dashboard')

  const events = await getPlannerEvents(user.id)

  return (
    <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>
        <div className="mb-8 mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Events
          </h1>
          <p className="mt-1 text-slate-600">All your events in one place.</p>
        </div>
        <EventsList events={events} />
    </div>
  )
}
