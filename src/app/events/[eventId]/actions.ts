'use server'

import { requireAuth, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getEventById, getEventPlan } from '@/services/events'
import {
  generateEventPlan,
  generateEventBudget,
  generateEventChecklist,
} from '@/services/ai'
import { ANTHROPIC_MODEL } from '@/lib/ai/anthropic'
import type { CreateEventInput, BudgetStatus, ChecklistStatus } from '@/types/database'

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

// ── Budget generation action ────────────────────────────────────────────────

export type GenerateBudgetResult =
  | { success: true; eventId: string }
  | { success: false; error: string }

export async function generateBudgetAction(
  eventId: string
): Promise<GenerateBudgetResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can generate event budgets' }
  }

  const event = await getEventById(eventId, user.id)
  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  const plan = await getEventPlan(eventId)
  if (!plan) {
    return {
      success: false,
      error: 'Please generate an event plan first before generating a budget',
    }
  }

  try {
    const items = await generateEventBudget(event, plan)

    const supabase = createClient()

    const { error: deleteError } = await supabase
      .from('budgets')
      .delete()
      .eq('event_id', eventId)
      .eq('ai_generated', true)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    const { error: insertError } = await supabase.from('budgets').insert(
      items.map((item) => ({
        event_id: eventId,
        category: item.category,
        description: item.description,
        estimated_amount: item.estimated_amount,
        notes: item.notes,
        ai_generated: true,
        status: 'pending' as BudgetStatus,
      }))
    )

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    return { success: true, eventId }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Budget generation failed unexpectedly.'
    return { success: false, error: message }
  }
}

// ── Checklist generation action ─────────────────────────────────────────────

export type GenerateChecklistResult =
  | { success: true; eventId: string }
  | { success: false; error: string }

function offsetDueDate(
  eventDate: string | null,
  offsetDays: number
): string | null {
  if (!eventDate) return null
  const [year, month, day] = eventDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() - offsetDays)
  return date.toISOString().split('T')[0]
}

export async function generateChecklistAction(
  eventId: string
): Promise<GenerateChecklistResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return {
      success: false,
      error: 'Only planners can generate event checklists',
    }
  }

  const event = await getEventById(eventId, user.id)
  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  const plan = await getEventPlan(eventId)

  try {
    const items = await generateEventChecklist(event, plan)

    const supabase = createClient()

    const { error: deleteError } = await supabase
      .from('checklists')
      .delete()
      .eq('event_id', eventId)
      .eq('ai_generated', true)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    const { error: insertError } = await supabase.from('checklists').insert(
      items.map((item) => ({
        event_id: eventId,
        title: item.title,
        due_date: offsetDueDate(event.event_date, item.due_date_offset_days),
        category: item.category,
        notes: item.notes,
        ai_generated: true,
        status: 'todo' as ChecklistStatus,
      }))
    )

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    return { success: true, eventId }
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : 'Checklist generation failed unexpectedly.'
    return { success: false, error: message }
  }
}
