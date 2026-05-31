import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Calendar,
  MapPin,
  Users,
  Palette,
  Utensils,
  CheckCircle2,
  Circle,
  type LucideIcon,
} from 'lucide-react'
import { requireAuth, getUserProfile } from '@/lib/auth'
import {
  getClientEvent,
  getClientEventPlan,
  getClientBudgetSummary,
  getClientChecklist,
  getClientConfirmedVendors,
} from '@/services/client-events'
import { getClientGuestSummary } from '@/services/client-guests'
import { getCurrencySymbol } from '@/lib/localisation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientHeader } from '@/app/client/_components/ClientHeader'
import type { EventStatus } from '@/types/database'

// ── Status badge styles ──────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<EventStatus, 'secondary' | 'default' | 'success'> = {
  draft: 'secondary',
  active: 'default',
  completed: 'success',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: string | null): string {
  if (!date) return 'Not set'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatAmount(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

// ── Detail component (icon + label + value) ──────────────────────────────────

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
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="break-words text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}

// ── Plan types ────────────────────────────────────────────────────────────────

type TlItem = { time: string; activity: string; notes?: string }
type VItem = {
  name: string
  description: string
  priority: string
  estimated_cost: string
}
type RItem = { category: string; suggestion: string; reason: string }

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClientEventPage({
  params,
}: {
  params: { eventId: string }
}) {
  await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role) redirect('/onboarding')
  // DO NOT redirect planners — they may have been routed here by the callback.

  const event = await getClientEvent(params.eventId)
  if (!event) {
    redirect(profile.role === 'planner' ? '/dashboard' : '/client/dashboard')
  }

  const currencySymbol = getCurrencySymbol(event.location)

  let plan = null
  let budgetSummary = null
  let checklist: Awaited<ReturnType<typeof getClientChecklist>> = []
  let vendors: Awaited<ReturnType<typeof getClientConfirmedVendors>> = []
  let guestSummary: Awaited<ReturnType<typeof getClientGuestSummary>> = null

  try { plan = await getClientEventPlan(params.eventId) } catch { }
  try { budgetSummary = await getClientBudgetSummary(params.eventId) } catch { }
  try { checklist = await getClientChecklist(params.eventId) } catch { }
  try { vendors = await getClientConfirmedVendors(params.eventId) } catch { }
  try { guestSummary = await getClientGuestSummary(params.eventId) } catch { }

  // Plan data
  const timeline = Array.isArray(plan?.timeline) ? (plan.timeline as TlItem[]) : []
  const vendorCategories = Array.isArray(plan?.vendor_categories)
    ? (plan.vendor_categories as VItem[])
    : []
  const recommendations = Array.isArray(plan?.recommendations)
    ? (plan.recommendations as RItem[])
    : []

  // Checklist grouping + progress
  const grouped = checklist.reduce<Record<string, typeof checklist>>((acc, item) => {
    const key = item.category ?? 'General'
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})
  const totalTasks = checklist.length
  const doneTasks = checklist.filter((t) => t.status === 'done').length
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <ClientHeader eventTitle={event.title} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <Link
            href="/client/dashboard"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Back to events
          </Link>
          <Link
            href={`/client/event/${params.eventId}/comments`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Comments
          </Link>
        </div>

        {/* ── A) Event summary ──────────────────────────────────────────────── */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
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
              <Badge variant={STATUS_VARIANTS[event.status as EventStatus]}>
                {event.status}
              </Badge>
            </div>

            <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail icon={Calendar} label="Date" value={formatDate(event.event_date)} />
              <Detail icon={MapPin} label="Location" value={event.location ?? 'Not set'} />
              <Detail
                icon={Users}
                label="Guests"
                value={event.guest_count != null ? String(event.guest_count) : 'Not set'}
              />
              <Detail icon={Palette} label="Theme" value={event.theme ?? 'Not set'} />
              <Detail
                icon={Utensils}
                label="Food preferences"
                value={event.food_preferences ?? 'Not set'}
              />
            </div>

            <p className="mt-6 text-sm text-slate-500">
              Planned by{' '}
              <span className="font-medium text-slate-700">
                {event.plannerName ?? 'Your planner'}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* ── B) AI Plan ────────────────────────────────────────────────────── */}
        <Card className="mt-6 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Event Plan</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {!plan ? (
              <p className="text-sm text-slate-500">
                Your planner hasn&apos;t shared a plan yet.
              </p>
            ) : (
              <div className="space-y-8">
                {/* Concept summary */}
                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
                    Event Concept
                  </h3>
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                    <p className="text-sm leading-relaxed text-slate-800">
                      {plan.concept_summary ?? 'No concept summary yet.'}
                    </p>
                  </div>
                </section>

                {/* Timeline */}
                {timeline.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
                      Timeline
                    </h3>
                    <Card className="border-slate-200">
                      <CardContent className="divide-y divide-slate-100 p-0">
                        {timeline.map((item, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[80px_1fr] gap-4 px-5 py-4 sm:grid-cols-[110px_1fr]"
                          >
                            <p className="font-mono text-sm font-semibold text-indigo-600">
                              {item.time}
                            </p>
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-slate-900">
                                {item.activity}
                              </p>
                              {item.notes && (
                                <p className="text-sm text-slate-500">{item.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </section>
                )}

                {/* Vendor categories */}
                {vendorCategories.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
                      Vendor Categories
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {vendorCategories.map((v, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-slate-200 bg-white p-4 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">{v.name}</p>
                            <Badge className="border-transparent bg-slate-100 text-slate-600 hover:bg-slate-100 shrink-0">
                              {v.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{v.description}</p>
                          <p className="text-sm font-medium text-slate-800">
                            Est. cost: {v.estimated_cost}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
                      Recommendations
                    </h3>
                    <div className="space-y-3">
                      {recommendations.map((r, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                            {r.category}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {r.suggestion}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">Why: {r.reason}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── C) Budget summary ────────────────────────────────────────────── */}
        <Card className="mt-6 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Budget</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {!budgetSummary ? (
              <p className="text-sm text-slate-500">Budget hasn&apos;t been shared yet.</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Total estimated
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {formatAmount(budgetSummary.totalEstimated, currencySymbol)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Total spent so far
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {formatAmount(budgetSummary.totalActual, currencySymbol)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {budgetSummary.byCategory.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {cat.category}
                      </span>
                      <span className="shrink-0 text-sm text-slate-500">
                        {formatAmount(cat.estimated, currencySymbol)} estimated
                        {' · '}
                        {formatAmount(cat.actual, currencySymbol)} spent
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── D) Checklist ─────────────────────────────────────────────────── */}
        <Card className="mt-6 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {checklist.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks shared yet.</p>
            ) : (
              <div className="space-y-6">
                {/* Overall progress */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    {doneTasks} of {totalTasks} tasks complete
                  </p>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Category groups */}
                {Object.entries(grouped).map(([category, tasks]) => {
                  const catDone = tasks.filter((t) => t.status === 'done').length
                  return (
                    <section key={category}>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                          {category}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {catDone} / {tasks.length} done
                        </span>
                      </div>
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                          >
                            <div className="flex items-start gap-3">
                              {task.status === 'done' ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-medium ${
                                    task.status === 'done'
                                      ? 'text-slate-400 line-through'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {task.title}
                                </p>
                                {task.due_date && (
                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Due{' '}
                                    {new Date(task.due_date).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                )}
                                {task.notes && (
                                  <p className="mt-0.5 text-xs text-slate-500">{task.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── E) Confirmed vendors ──────────────────────────────────────────── */}
        <Card className="mt-6 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Confirmed Vendors</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {vendors.length === 0 ? (
              <p className="text-sm text-slate-500">No vendors confirmed yet.</p>
            ) : (
              <div className="space-y-3">
                {vendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{vendor.name}</p>
                      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-indigo-600">
                        {vendor.category}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {vendor.email && (
                        <p className="text-sm text-slate-600">{vendor.email}</p>
                      )}
                      {vendor.phone && (
                        <p className="text-sm text-slate-600">{vendor.phone}</p>
                      )}
                      {vendor.notes && (
                        <p className="mt-1 text-sm text-slate-500 italic">{vendor.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* ── F) Guest summary ─────────────────────────────────────────────── */}
        <Card className="mt-6 mb-12 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Guests</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {!guestSummary ? (
              <p className="text-sm text-slate-500">No guest information yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total invited
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {guestSummary.total}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Attending
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {guestSummary.attending}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Pending
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {guestSummary.pending}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Declined
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-500">
                    {guestSummary.declined}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
