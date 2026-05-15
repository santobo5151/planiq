import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Guest } from '@/types/database'

export interface GuestSummary {
  total: number
  attending: number
  declined: number
  pending: number
  attendingIncludingPlusOnes: number
  withDietaryNotes: number
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
    .select('rsvp_status, plus_one, dietary_notes')
    .eq('event_id', eventId)

  if (error || !data || data.length === 0) return null

  const rows = data as Array<{
    rsvp_status: string
    plus_one: boolean
    dietary_notes: string | null
  }>

  let attending = 0
  let declined = 0
  let pending = 0
  let attendingWithPlusOne = 0
  let withDietaryNotes = 0

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
  }

  return {
    total: rows.length,
    attending,
    declined,
    pending,
    attendingIncludingPlusOnes: attending + attendingWithPlusOne,
    withDietaryNotes,
  }
}
