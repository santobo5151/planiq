'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateEventAction } from '@/app/(app)/events/[eventId]/actions'
import type {
  CreateEventInput,
  Event as PlanIQEvent,
  EventStatus,
} from '@/types/database'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

const EVENT_TYPES = [
  'Wedding',
  'Birthday',
  'Corporate',
  'Gala',
  'Conference',
  'Private Party',
  'Other',
] as const

const UK_CITIES = [
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Glasgow',
  'Sheffield',
  'Liverpool',
  'Edinburgh',
  'Bristol',
  'Cardiff',
  'Newcastle',
  'Nottingham',
  'Leicester',
  'Southampton',
  'Portsmouth',
  'Oxford',
  'Cambridge',
  'Brighton',
  'Bath',
  'York',
] as const

const NIGERIA_CITIES = [
  'Lagos',
  'Abuja',
  'Port Harcourt',
  'Kano',
  'Ibadan',
  'Benin City',
  'Kaduna',
  'Enugu',
  'Warri',
  'Calabar',
  'Jos',
  'Ilorin',
  'Owerri',
  'Uyo',
  'Abeokuta',
  'Lekki',
  'Victoria Island',
  'Ikeja',
] as const

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const KNOWN_CITIES = new Set<string>([...UK_CITIES, ...NIGERIA_CITIES])

export function EditEventForm({ event }: { event: PlanIQEvent }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const initialLocation = event.location ?? ''
  const initialIsKnown =
    initialLocation === '' || KNOWN_CITIES.has(initialLocation)

  const [title, setTitle] = useState(event.title)
  const [eventType, setEventType] = useState(event.event_type ?? '')
  const [eventDate, setEventDate] = useState(event.event_date ?? '')
  const [location, setLocation] = useState<string>(
    initialIsKnown ? initialLocation : 'Other'
  )
  const [customCity, setCustomCity] = useState<string>(
    initialIsKnown ? '' : initialLocation
  )
  const [guestCount, setGuestCount] = useState(
    event.guest_count != null ? String(event.guest_count) : ''
  )
  const [budgetCeiling, setBudgetCeiling] = useState(
    event.budget_ceiling != null ? String(event.budget_ceiling) : ''
  )
  const [theme, setTheme] = useState(event.theme ?? '')
  const [foodPreferences, setFoodPreferences] = useState(
    event.food_preferences ?? ''
  )
  const [status, setStatus] = useState<EventStatus>(event.status)

  const [titleError, setTitleError] = useState<string | null>(null)
  const [typeError, setTypeError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  function parseOptionalInt(value: string): number | null {
    if (value.trim() === '') return null
    const n = parseInt(value, 10)
    return Number.isNaN(n) ? null : n
  }

  function parseOptionalFloat(value: string): number | null {
    if (value.trim() === '') return null
    const n = parseFloat(value)
    return Number.isNaN(n) ? null : n
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTitleError(null)
    setTypeError(null)
    setFormError(null)

    let hasError = false
    if (!title.trim()) {
      setTitleError('Event title is required.')
      hasError = true
    }
    if (!eventType) {
      setTypeError('Event type is required.')
      hasError = true
    }
    if (hasError) return

    const resolvedLocation =
      location === 'Other' ? customCity.trim() : location.trim()

    const data: Partial<CreateEventInput> & { status?: string } = {
      title: title.trim(),
      event_type: eventType,
      event_date: eventDate,
      location: resolvedLocation,
      guest_count: parseOptionalInt(guestCount),
      budget_ceiling: parseOptionalFloat(budgetCeiling),
      theme,
      food_preferences: foodPreferences,
      status,
    }

    startTransition(async () => {
      const result = await updateEventAction(event.id, data)
      if (result.success) {
        router.push(`/events/${event.id}`)
        router.refresh()
      } else {
        setFormError(result.error)
      }
    })
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">
              Event title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
              aria-invalid={titleError ? true : undefined}
            />
            {titleError && <p className="text-sm text-red-600">{titleError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventType">
              Event type <span className="text-red-500">*</span>
            </Label>
            <select
              id="eventType"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              disabled={pending}
              aria-invalid={typeError ? true : undefined}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>
                Select an event type
              </option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {typeError && <p className="text-sm text-red-600">{typeError}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eventDate">Event date</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <select
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={pending}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  Select a city
                </option>
                <optgroup label="United Kingdom">
                  {UK_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Nigeria">
                  {NIGERIA_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
                <option value="Other">Other</option>
              </select>
              {location === 'Other' && (
                <Input
                  id="customCity"
                  type="text"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  disabled={pending}
                  placeholder="Enter city name"
                  aria-label="Custom city name"
                />
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guestCount">Number of guests</Label>
              <Input
                id="guestCount"
                type="number"
                min={0}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetCeiling">Estimated budget</Label>
              <Input
                id="budgetCeiling"
                type="number"
                min={0}
                step="any"
                value={budgetCeiling}
                onChange={(e) => setBudgetCeiling(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Event theme or style</Label>
            <Input
              id="theme"
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="foodPreferences">
              Food preferences or dietary notes
            </Label>
            <Textarea
              id="foodPreferences"
              rows={3}
              value={foodPreferences}
              onChange={(e) => setFoodPreferences(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              disabled={pending}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/events/${event.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={pending}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {pending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
