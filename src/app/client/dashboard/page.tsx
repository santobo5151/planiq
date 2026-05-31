import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Calendar, MapPin, Users } from 'lucide-react'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { getClientEvents } from '@/services/client-events'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientHeader } from '@/app/client/_components/ClientHeader'
import type { EventStatus } from '@/types/database'

const STATUS_VARIANTS: Record<EventStatus, 'secondary' | 'default' | 'success'> = {
  draft: 'secondary',
  active: 'default',
  completed: 'success',
}

function formatDate(date: string | null): string {
  if (!date) return 'Date TBC'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function ClientDashboardPage() {
  await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role) redirect('/onboarding')
  if (profile.role === 'planner') redirect('/dashboard')

  const events = await getClientEvents()

  return (
    <div className="min-h-screen bg-slate-50">
      <ClientHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Your events
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Plans your planner has shared with you.
          </p>
        </div>

        {events.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center">
              <p className="text-sm font-medium text-slate-900">No events yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Your planner will share events with you here once they&apos;re
                ready.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/client/event/${event.id}`}
                className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-slate-900 group-hover:text-indigo-600">
                      {event.title}
                    </h2>
                    {event.event_type && (
                      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-indigo-600">
                        {event.event_type}
                      </p>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANTS[event.status as EventStatus]}>
                    {event.status}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {formatDate(event.event_date)}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  {event.guest_count != null && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {event.guest_count} guests
                    </div>
                  )}
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Planned by{' '}
                  <span className="font-medium text-slate-500">
                    {event.plannerName ?? 'Your planner'}
                  </span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
