import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Invite } from '@/types/database'

export async function createOrReuseInvite(
  eventId: string,
  email: string
): Promise<
  | { alreadyAccepted: true }
  | { alreadyAccepted: false; invite: Invite }
> {
  const normalised = email.toLowerCase().trim()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('invites')
    .select('*')
    .eq('event_id', eventId)
    .eq('email', normalised)
    .maybeSingle()

  if (existing) {
    const row = existing as Invite
    if (row.accepted_at !== null) return { alreadyAccepted: true }
    return { alreadyAccepted: false, invite: row }
  }

  const { data: inserted, error } = await admin
    .from('invites')
    .insert({
      event_id: eventId,
      email: normalised,
      token: crypto.randomUUID(),
    })
    .select('*')
    .single()

  if (error || !inserted) throw new Error(error?.message ?? 'Failed to create invite')
  return { alreadyAccepted: false, invite: inserted as Invite }
}

export async function getInviteByToken(token: string): Promise<{
  invite: Invite
  event: { id: string; title: string; event_date: string | null }
  plannerName: string | null
} | null> {
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('invites')
    .select('*, event:events(id, title, event_date, planner_id, created_by)')
    .eq('token', token)
    .maybeSingle()

  if (!row) return null

  const eventData = row.event as {
    id: string
    title: string
    event_date: string | null
    planner_id: string | null
    created_by: string
  } | null

  if (!eventData) return null

  const invite: Invite = {
    id: row.id,
    event_id: row.event_id,
    email: row.email,
    token: row.token,
    accepted_at: row.accepted_at,
    client_user_id: row.client_user_id ?? null,
    created_at: row.created_at,
  }

  const plannerId = eventData.planner_id ?? eventData.created_by

  const { data: profileRow } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', plannerId)
    .maybeSingle()

  return {
    invite,
    event: {
      id: eventData.id,
      title: eventData.title,
      event_date: eventData.event_date,
    },
    plannerName: (profileRow?.full_name as string | null) ?? null,
  }
}

/**
 * SECURITY: Only call after the auth callback has verified the
 * authenticated user's email matches the invite email. Not called in
 * Phase 8A — exported for Phase 8B.
 */
export async function markInviteAccepted(
  token: string,
  userId: string
): Promise<{ success: boolean }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('invites')
    .update({
      accepted_at: new Date().toISOString(),
      client_user_id: userId,
    })
    .eq('token', token)
    .is('accepted_at', null)

  return { success: !error }
}
