import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { CreateEventForm } from '@/components/events/create-event-form'

export default async function NewEventPage() {
  await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role) redirect('/onboarding')
  if (profile.role === 'client') redirect('/client/dashboard')

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>
        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Create New Event
          </h1>
          <p className="mt-1 text-slate-600">
            Tell us about the event so we can help you plan it.
          </p>
        </div>
        <CreateEventForm />
      </div>
    </div>
  )
}
