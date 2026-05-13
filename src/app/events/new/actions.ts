'use server'

import { requireAuth, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { CreateEventInput } from '@/types/database'

export type CreateEventResult =
  | { success: true; eventId: string }
  | { success: false; error: string }

export async function createEventAction(
  data: CreateEventInput
): Promise<CreateEventResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can create events' }
  }

  const title = data.title?.trim()
  if (!title) {
    return { success: false, error: 'Event title is required' }
  }

  const eventType = data.event_type?.trim()
  if (!eventType) {
    return { success: false, error: 'Event type is required' }
  }

  const supabase = createClient()

  const insertPayload = {
    created_by: user.id,
    planner_id: user.id,
    organization_id: profile.organization_id ?? null,
    title,
    event_type: eventType,
    event_date: data.event_date && data.event_date.trim() !== '' ? data.event_date : null,
    location: data.location?.trim() ? data.location.trim() : null,
    guest_count: data.guest_count ?? null,
    budget_ceiling: data.budget_ceiling ?? null,
    theme: data.theme?.trim() ? data.theme.trim() : null,
    food_preferences: data.food_preferences?.trim()
      ? data.food_preferences.trim()
      : null,
    status: 'draft' as const,
  }

  const { data: newEvent, error } = await supabase
    .from('events')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error || !newEvent) {
    return {
      success: false,
      error: error?.message ?? 'Could not create the event. Please try again.',
    }
  }

  return { success: true, eventId: newEvent.id }
}
