import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEventById, getChecklist } from '@/services/events'
import { Card, CardContent } from '@/components/ui/card'
import { ChecklistGenerateButton } from '@/components/events/checklist-generate-button'
import { ChecklistManager } from '@/components/events/checklist-manager'

export default async function ChecklistPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const event = await getEventById(params.eventId, user.id)
  if (!event) redirect('/dashboard')

  const items = await getChecklist(params.eventId)
  const hasChecklist = items.length > 0

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-indigo-600">
          <Link href={`/events/${event.id}`} className="hover:underline">
            ← Back to Event
          </Link>
          <span className="text-slate-300">|</span>
          <Link href={`/events/${event.id}/budget`} className="hover:underline">
            View Budget →
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Checklist
            </h1>
            <p className="mt-1 text-slate-600">{event.title}</p>
          </header>
          <ChecklistGenerateButton
            eventId={event.id}
            hasChecklist={hasChecklist}
          />
        </div>

        {!hasChecklist ? (
          <Card className="mt-8 border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-base font-medium text-slate-900">
                No checklist generated yet
              </p>
              <p className="max-w-md text-sm text-slate-600">
                PlanIQ will generate a comprehensive pre-event task list with
                realistic deadlines based on your event date, type, and plan —
                grouped by category so nothing gets missed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8">
            <ChecklistManager event={event} initialChecklistItems={items} />
          </div>
        )}
      </div>
    </div>
  )
}
