'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { GuestRsvpStatus } from '@/types/database'

export type SubmitRsvpResponseResult = { success: true } | { success: false; error: string }

export async function submitRsvpResponseAction(
  token: string,
  input: {
    rsvp_status: 'attending' | 'declined'
    plus_one?: boolean
    dietary_notes?: string | null
  }
): Promise<SubmitRsvpResponseResult> {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Invalid request' }
  }

  if (input.rsvp_status !== 'attending' && input.rsvp_status !== 'declined') {
    return { success: false, error: 'Invalid RSVP status' }
  }

  const admin = createAdminClient()

  const { data: guestRow, error: guestError } = await admin
    .from('guests')
    .select('id, event_id, plus_one_allowed, rsvp_responded_at')
    .eq('rsvp_token', token)
    .maybeSingle()

  if (guestError || !guestRow) {
    return { success: false, error: 'RSVP link not found' }
  }

  const { data: eventRow, error: eventError } = await admin
    .from('events')
    .select('id, rsvp_deadline')
    .eq('id', (guestRow as { event_id: string }).event_id)
    .maybeSingle()

  if (eventError || !eventRow) {
    return { success: false, error: 'Event not found' }
  }

  const deadline = (eventRow as { rsvp_deadline: string | null }).rsvp_deadline
  if (deadline && new Date() > new Date(deadline)) {
    return { success: false, error: 'The RSVP deadline has passed.' }
  }

  const guestId = (guestRow as { id: string }).id
  const eventId = (guestRow as { event_id: string }).event_id
  const plusOneAllowed = (guestRow as { plus_one_allowed: boolean }).plus_one_allowed
  const alreadyResponded = (guestRow as { rsvp_responded_at: string | null }).rsvp_responded_at

  const isAttending = input.rsvp_status === 'attending'
  const plusOne = isAttending && plusOneAllowed ? (input.plus_one ?? false) : false

  const dietaryRaw = (input.dietary_notes ?? '').trim()
  const dietary_notes = dietaryRaw || null

  const updatePayload: Record<string, unknown> = {
    rsvp_status: input.rsvp_status as GuestRsvpStatus,
    plus_one: plusOne,
    dietary_notes,
  }

  if (!alreadyResponded) {
    updatePayload.rsvp_responded_at = new Date().toISOString()
  }

  const { error: updateError } = await admin
    .from('guests')
    .update(updatePayload)
    .eq('id', guestId)

  if (updateError) {
    return { success: false, error: 'Could not save your response. Please try again.' }
  }

  revalidatePath(`/events/${eventId}/guests`)
  revalidatePath(`/rsvp/${token}`)

  return { success: true }
}
