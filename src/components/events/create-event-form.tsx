'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createEventAction } from '@/app/(app)/events/new/actions'
import type { CreateEventInput } from '@/types/database'
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

export function CreateEventForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [budgetCeiling, setBudgetCeiling] = useState('')
  const [theme, setTheme] = useState('')
  const [foodPreferences, setFoodPreferences] = useState('')

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

    const data: CreateEventInput = {
      title: title.trim(),
      event_type: eventType,
      event_date: eventDate.trim() === '' ? undefined : eventDate,
      location: resolvedLocation === '' ? undefined : resolvedLocation,
      guest_count: parseOptionalInt(guestCount),
      budget_ceiling: parseOptionalFloat(budgetCeiling),
      theme: theme.trim() === '' ? undefined : theme.trim(),
      food_preferences:
        foodPreferences.trim() === '' ? undefined : foodPreferences.trim(),
    }

    startTransition(async () => {
      const result = await createEventAction(data)
      if (result.success) {
        router.push(`/events/${result.eventId}`)
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
              placeholder="Acme Summer Gala"
            />
            {titleError && (
              <p className="text-sm text-red-600">{titleError}</p>
            )}
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
                placeholder="e.g. 120"
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
                placeholder="e.g. 25000"
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
              placeholder="e.g. Black tie, Garden party, Rustic"
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
              placeholder="Vegetarian-friendly, no shellfish, halal options…"
            />
          </div>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: 'outline' })}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={pending}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {pending ? 'Creating…' : 'Create Event'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
