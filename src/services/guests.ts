import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Guest } from '@/types/database'

export interface GuestSummary {
  total: number
  attending: number
  declined: number
  pending: number
  attendingIncludingPlusOnes: number
  withDietaryNotes: number
  responded: number
}

export async function getEventGuests(eventId: string): Promise<Guest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as Guest[]
}

export async function getGuestSummary(eventId: string): Promise<GuestSummary | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('guests')
    .select('rsvp_status, plus_one, dietary_notes, rsvp_responded_at')
    .eq('event_id', eventId)

  if (error || !data || data.length === 0) return null

  const rows = data as Array<{
    rsvp_status: string
    plus_one: boolean
    dietary_notes: string | null
    rsvp_responded_at: string | null
  }>

  let attending = 0
  let declined = 0
  let pending = 0
  let attendingWithPlusOne = 0
  let withDietaryNotes = 0
  let responded = 0

  for (const row of rows) {
    if (row.rsvp_status === 'attending') {
      attending++
      if (row.plus_one) attendingWithPlusOne++
    } else if (row.rsvp_status === 'declined') {
      declined++
    } else {
      pending++
    }
    if (row.dietary_notes && row.dietary_notes.trim()) withDietaryNotes++
    if (row.rsvp_responded_at) responded++
  }

  return {
    total: rows.length,
    attending,
    declined,
    pending,
    attendingIncludingPlusOnes: attending + attendingWithPlusOne,
    withDietaryNotes,
    responded,
  }
}

export async function getGuestByRsvpToken(token: string): Promise<{
  guest: Guest
  event: {
    id: string
    title: string
    event_date: string | null
    rsvp_deadline: string | null
    location: string | null
  }
} | null> {
  const admin = createAdminClient()

  const { data: guestRow } = await admin
    .from('guests')
    .select('*')
    .eq('rsvp_token', token)
    .maybeSingle()

  if (!guestRow) return null

  const guest = guestRow as Guest

  const { data: eventRow } = await admin
    .from('events')
    .select('id, title, event_date, rsvp_deadline, location')
    .eq('id', guest.event_id)
    .maybeSingle()

  if (!eventRow) return null

  return {
    guest,
    event: {
      id: eventRow.id as string,
      title: eventRow.title as string,
      event_date: eventRow.event_date as string | null,
      rsvp_deadline: eventRow.rsvp_deadline as string | null,
      location: eventRow.location as string | null,
    },
  }
}
