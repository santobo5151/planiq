'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Plus, Search, Sparkles, Users } from 'lucide-react'
import type { Event as PlanIQEvent, EventStatus } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STATUS_STYLES: Record<EventStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-transparent',
  active: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-transparent',
  completed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent',
}

type StatusFilter = 'all' | EventStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
]

function formatEventDate(date: string | null) {
  if (!date) return 'No date set'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function EventsList({ events }: { events: PlanIQEvent[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')

  const counts: Record<StatusFilter, number> = useMemo(
    () => ({
      all: events.length,
      active: events.filter((e) => e.status === 'active').length,
      draft: events.filter((e) => e.status === 'draft').length,
      completed: events.filter((e) => e.status === 'completed').length,
    }),
    [events]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((event) => {
      if (filter !== 'all' && event.status !== filter) return false
      if (q && !event.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [events, search, filter])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Your events</h2>
        <Link
          href="/events/new"
          className={buttonVariants({
            className: 'bg-indigo-600 text-white hover:bg-indigo-700',
          })}
        >
          <Plus className="h-4 w-4" />
          Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No events yet
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Create your first event to get started.
            </p>
            <Link
              href="/events/new"
              className={buttonVariants({
                className: 'mt-4 bg-indigo-600 text-white hover:bg-indigo-700',
              })}
            >
              <Plus className="h-4 w-4" />
              Create Event
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search events by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search events"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter events by status"
            className="flex flex-wrap gap-1 border-b border-slate-200"
          >
            {FILTERS.map(({ value, label }) => {
              const active = filter === value
              return (
                <button
                  key={value}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label} ({counts[value]})
                </button>
              )
            })}
          </div>

          {filtered.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="p-8 text-center text-sm text-slate-600">
                No events match your search.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => (
                <Card key={event.id} className="border-slate-200">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-semibold text-slate-900">
                        {event.title}
                      </h3>
                      <Badge className={STATUS_STYLES[event.status]}>
                        {event.status}
                      </Badge>
                    </div>
                    {event.event_type && (
                      <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                        {event.event_type}
                      </p>
                    )}
                    <div className="space-y-1 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatEventDate(event.event_date)}
                      </p>
                      {event.guest_count != null && (
                        <p className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          {event.guest_count} guests
                        </p>
                      )}
                      {event.location && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/events/${event.id}`}
                      className={buttonVariants({
                        variant: 'outline',
                        className: 'w-full',
                      })}
                    >
                      View Event
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
