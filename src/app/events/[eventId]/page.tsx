import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Calendar,
  MapPin,
  MessageSquare,
  Palette,
  Sparkles,
  Store,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getEventById, getEventPlan } from '@/services/events'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { GeneratePlanButton } from '@/components/events/generate-plan-button'
import { getCurrencySymbol } from '@/lib/localisation'
import { SendInviteForm } from './_components/SendInviteForm'
import type { EventStatus } from '@/types/database'

const STATUS_VARIANTS: Record<EventStatus, 'secondary' | 'default' | 'success'> = {
  draft: 'secondary',
  active: 'default',
  completed: 'success',
}

function formatDate(date: string | null) {
  if (!date) return 'Not set'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatBudget(amount: number | null, location: string | null): string {
  if (amount == null) return 'Not set'
  const symbol = getCurrencySymbol(location)
  return `${symbol}${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

export default async function EventOverviewPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const event = await getEventById(params.eventId, user.id)
  if (!event) redirect('/dashboard')

  const plan = await getEventPlan(params.eventId)
  const hasPlan = plan !== null

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {event.title}
            </h1>
            {event.event_type && (
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-indigo-600">
                {event.event_type}
              </p>
            )}
          </div>
          <Badge variant={STATUS_VARIANTS[event.status]}>{event.status}</Badge>
        </div>

        <Card className="mt-6 border-slate-200">
          <CardContent className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2">
            <Detail icon={Calendar} label="Date" value={formatDate(event.event_date)} />
            <Detail
              icon={MapPin}
              label="Location"
              value={event.location ?? 'Not set'}
            />
            <Detail
              icon={Users}
              label="Guests"
              value={event.guest_count != null ? String(event.guest_count) : 'Not set'}
            />
            <Detail
              icon={Wallet}
              label="Budget"
              value={formatBudget(event.budget_ceiling, event.location)}
            />
            <Detail
              icon={Palette}
              label="Theme"
              value={event.theme ?? 'Not set'}
            />
            <Detail
              icon={Utensils}
              label="Food preferences"
              value={event.food_preferences ?? 'Not set'}
            />
          </CardContent>
        </Card>

        <div className="mt-6">
          <SendInviteForm
            eventId={event.id}
            clientAlreadyLinked={Boolean(event.client_id)}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-end">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: 'outline' })}
          >
            Back to Dashboard
          </Link>
          <Link
            href={`/events/${event.id}/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Edit
          </Link>
          <Link
            href={`/events/${event.id}/budget`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Budget
          </Link>
          <Link
            href={`/events/${event.id}/checklist`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Checklist
          </Link>
          <Link
            href={`/events/${event.id}/guests`}
            className={buttonVariants({ variant: 'outline', className: 'gap-2' })}
          >
            <Users className="h-4 w-4" />
            Guests
          </Link>
          <Link
            href={`/events/${event.id}/vendors`}
            className={buttonVariants({ variant: 'outline', className: 'gap-2' })}
          >
            <Store className="h-4 w-4" />
            Vendors
          </Link>
          <Link
            href={`/events/${event.id}/comments`}
            className={buttonVariants({ variant: 'outline', className: 'gap-2' })}
          >
            <MessageSquare className="h-4 w-4" />
            Comments
          </Link>
          {hasPlan && (
            <Link
              href={`/events/${event.id}/plan`}
              className={buttonVariants({
                className: 'gap-2 bg-indigo-600 text-white hover:bg-indigo-700',
              })}
            >
              <Sparkles className="h-4 w-4" />
              View AI Plan
            </Link>
          )}
          <GeneratePlanButton
            eventId={event.id}
            mode={hasPlan ? 'regenerate' : 'generate'}
            hasPlan={hasPlan}
          />
        </div>
      </div>
    </div>
  )
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="break-words text-sm font-medium text-slate-900">
          {value}
        </p>
      </div>
    </div>
  )
}
