'use server'

import { requireAuth, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getEventById } from '@/services/events'
import { generateEventPlan } from '@/services/ai'
import { ANTHROPIC_MODEL } from '@/lib/ai/anthropic'
import type { CreateEventInput } from '@/types/database'

const ALLOWED_STATUSES = ['draft', 'active', 'completed'] as const
type AllowedStatus = (typeof ALLOWED_STATUSES)[number]

export type UpdateEventResult =
  | { success: true }
  | { success: false; error: string }

export async function updateEventAction(
  eventId: string,
  data: Partial<CreateEventInput> & { status?: string }
): Promise<UpdateEventResult> {
  const user = await requireAuth()

  const event = await getEventById(eventId, user.id)
  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  const isOwner =
    event.created_by === user.id || event.planner_id === user.id
  if (!isOwner) {
    return { success: false, error: 'Unauthorised' }
  }

  const updatePayload: Record<string, unknown> = {}

  if (data.title !== undefined) {
    const title = data.title.trim()
    if (!title) {
      return { success: false, error: 'Event title is required' }
    }
    updatePayload.title = title
  }

  if (data.event_type !== undefined) {
    const t = data.event_type.trim()
    if (!t) {
      return { success: false, error: 'Event type is required' }
    }
    updatePayload.event_type = t
  }

  if (data.event_date !== undefined) {
    updatePayload.event_date =
      data.event_date && data.event_date.trim() !== ''
        ? data.event_date
        : null
  }

  if (data.location !== undefined) {
    updatePayload.location = data.location?.trim() ? data.location.trim() : null
  }

  if (data.guest_count !== undefined) {
    updatePayload.guest_count = data.guest_count
  }

  if (data.budget_ceiling !== undefined) {
    updatePayload.budget_ceiling = data.budget_ceiling
  }

  if (data.theme !== undefined) {
    updatePayload.theme = data.theme?.trim() ? data.theme.trim() : null
  }

  if (data.food_preferences !== undefined) {
    updatePayload.food_preferences = data.food_preferences?.trim()
      ? data.food_preferences.trim()
      : null
  }

  if (data.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(data.status as AllowedStatus)) {
      return { success: false, error: 'Invalid status value' }
    }
    updatePayload.status = data.status
  }

  if (Object.keys(updatePayload).length === 0) {
    return { success: true }
  }

  const supabase = createClient()
  const { error: updateError } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', eventId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}

export type GeneratePlanResult =
  | { success: true; eventId: string; planId: string }
  | { success: false; error: string }

export async function generatePlanAction(
  eventId: string
): Promise<GeneratePlanResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can generate event plans' }
  }

  const event = await getEventById(eventId, user.id)
  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  try {
    const plan = await generateEventPlan(event)

    const supabase = createClient()

    const { data: savedPlan, error: upsertError } = await supabase
      .from('event_plans')
      .upsert(
        {
          event_id: eventId,
          concept_summary: plan.concept_summary,
          timeline: plan.timeline,
          vendor_categories: plan.vendor_categories,
          recommendations: plan.recommendations,
          model_used: ANTHROPIC_MODEL,
          prompt_version: '1.0',
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id' }
      )
      .select('id')
      .single()

    if (upsertError || !savedPlan) {
      return {
        success: false,
        error: upsertError?.message ?? 'Could not save the generated plan.',
      }
    }

    const { error: statusError } = await supabase
      .from('events')
      .update({ status: 'active' })
      .eq('id', eventId)

    if (statusError) {
      console.error(
        'Plan saved but could not mark event active:',
        statusError.message
      )
    }

    return { success: true, eventId, planId: savedPlan.id }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Plan generation failed unexpectedly.'
    return { success: false, error: message }
  }
}
