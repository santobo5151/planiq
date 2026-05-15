'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { submitRsvpResponseAction } from '../actions'
import type { PublicRsvpGuest } from '@/types/database'

interface RsvpFormProps {
  token: string
  publicGuest: PublicRsvpGuest
  eventTitle: string
  eventDate: string | null
  rsvpDeadline: string | null
}

export function RsvpForm({
  token,
  publicGuest,
  eventTitle,
  eventDate,
  rsvpDeadline,
}: RsvpFormProps) {
  const [status, setStatus] = useState<'attending' | 'declined' | null>(
    publicGuest.rsvp_status === 'pending' ? null : publicGuest.rsvp_status
  )
  const [plusOne, setPlusOne] = useState(publicGuest.plus_one)
  const [dietaryNotes, setDietaryNotes] = useState(publicGuest.dietary_notes ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const formattedDeadline = rsvpDeadline
    ? new Date(rsvpDeadline).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const lastResponded = publicGuest.rsvp_responded_at
    ? new Date(publicGuest.rsvp_responded_at).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null

  async function handleSubmit() {
    if (!status || pending) return
    setPending(true)
    setError(null)

    const result = await submitRsvpResponseAction(token, {
      rsvp_status: status,
      plus_one: plusOne,
      dietary_notes: dietaryNotes.trim() || null,
    })

    setPending(false)

    if (result.success) {
      setSaved(true)
    } else {
      setError(result.error)
    }
  }

  if (saved) {
    return (
      <div className="max-w-md w-full rounded-xl border border-emerald-200 bg-white p-8 shadow-sm text-center space-y-3">
        <div className="text-3xl">✓</div>
        <p className="text-lg font-semibold text-slate-900">Response saved!</p>
        <p className="text-sm text-slate-500">
          {status === 'attending'
            ? 'Great, we look forward to seeing you.'
            : 'Thanks for letting us know.'}
        </p>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-left space-y-1 text-sm text-slate-700">
          <p>
            <span className="font-medium">Response:</span>{' '}
            {status === 'attending' ? 'Attending' : 'Declined'}
          </p>
          {status === 'attending' && publicGuest.plus_one_allowed && (
            <p>
              <span className="font-medium">Plus one:</span> {plusOne ? 'Yes' : 'No'}
            </p>
          )}
          {dietaryNotes.trim() && (
            <p>
              <span className="font-medium">Dietary notes:</span> {dietaryNotes.trim()}
            </p>
          )}
        </div>
        {formattedDeadline && (
          <p className="text-xs text-slate-400">
            You can update your response any time before {formattedDeadline}.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
      {/* Header */}
      <div>
        <p className="text-lg font-semibold text-slate-900">{eventTitle}</p>
        {formattedDate && (
          <p className="mt-0.5 text-sm text-slate-500">{formattedDate}</p>
        )}
        <p className="mt-2 text-sm text-slate-700">
          Hi <strong>{publicGuest.first_name}</strong>, will you be attending?
        </p>
      </div>

      {/* Choice buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => { setStatus('attending'); if (status === 'declined') setPlusOne(false) }}
          disabled={pending}
          className={`rounded-xl border-2 py-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            status === 'attending'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40'
          }`}
        >
          Yes, attending
        </button>
        <button
          type="button"
          onClick={() => { setStatus('declined'); setPlusOne(false) }}
          disabled={pending}
          className={`rounded-xl border-2 py-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            status === 'declined'
              ? 'border-red-400 bg-red-50 text-red-700'
              : 'border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50/40'
          }`}
        >
          No, declining
        </button>
      </div>

      {/* Plus one — only when attending + allowed */}
      {status === 'attending' && publicGuest.plus_one_allowed && (
        <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={plusOne}
            onChange={(e) => setPlusOne(e.target.checked)}
            disabled={pending}
            className="h-4 w-4 accent-indigo-600"
          />
          I'll be bringing a plus one
        </label>
      )}

      {/* Dietary notes — only when attending */}
      {status === 'attending' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Dietary requirements <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={dietaryNotes}
            onChange={(e) => setDietaryNotes(e.target.value)}
            disabled={pending}
            placeholder="e.g. vegetarian, nut allergy…"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>
      )}

      {/* Last updated */}
      {lastResponded && (
        <p className="text-xs text-slate-400">Last responded: {lastResponded}</p>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!status || pending}
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
      >
        {pending ? 'Saving…' : 'Save response'}
      </Button>

      {/* Deadline */}
      {formattedDeadline && (
        <p className="text-center text-xs text-slate-400">
          Respond by {formattedDeadline}
        </p>
      )}
    </div>
  )
}
