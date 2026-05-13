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

// ── Budget item mutations ────────────────────────────────────────────────────

const VALID_BUDGET_STATUSES = ['pending', 'confirmed', 'paid'] as const

export type UpdateBudgetItemResult =
  | { success: true }
  | { success: false; error: string }

export async function updateBudgetItemAction(
  budgetItemId: string,
  data: {
    category?: string
    description?: string
    estimated_amount?: number
    actual_amount?: number
    notes?: string
    status?: BudgetStatus
  }
): Promise<UpdateBudgetItemResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can edit budget items' }
  }

  const supabase = createClient()

  const { data: row, error: fetchError } = await supabase
    .from('budgets')
    .select('event_id')
    .eq('id', budgetItemId)
    .maybeSingle()

  if (fetchError || !row) {
    return { success: false, error: 'Budget item not found' }
  }

  const event = await getEventById(row.event_id as string, user.id)
  if (!event) {
    return { success: false, error: 'Event not found or access denied' }
  }

  if (data.category !== undefined && data.category.trim() === '') {
    return { success: false, error: 'Category cannot be empty' }
  }
  if (
    data.estimated_amount !== undefined &&
    (!Number.isFinite(data.estimated_amount) || data.estimated_amount < 0)
  ) {
    return { success: false, error: 'Estimated amount must be 0 or greater' }
  }
  if (
    data.actual_amount !== undefined &&
    (!Number.isFinite(data.actual_amount) || data.actual_amount < 0)
  ) {
    return { success: false, error: 'Actual amount must be 0 or greater' }
  }
  if (
    data.status !== undefined &&
    !VALID_BUDGET_STATUSES.includes(data.status)
  ) {
    return { success: false, error: 'Invalid status value' }
  }

  const payload: Record<string, unknown> = {}
  if (data.category !== undefined) payload.category = data.category.trim()
  if (data.description !== undefined) payload.description = data.description
  if (data.estimated_amount !== undefined) payload.estimated_amount = data.estimated_amount
  if (data.actual_amount !== undefined) payload.actual_amount = data.actual_amount
  if (data.notes !== undefined) payload.notes = data.notes
  if (data.status !== undefined) payload.status = data.status

  if (Object.keys(payload).length === 0) return { success: true }

  const { error: updateError } = await supabase
    .from('budgets')
    .update(payload)
    .eq('id', budgetItemId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}

export type AddBudgetItemResult =
  | { success: true; budgetItemId: string }
  | { success: false; error: string }

export async function addBudgetItemAction(
  eventId: string,
  data: {
    category: string
    description: string
    estimated_amount: number
    notes?: string
  }
): Promise<AddBudgetItemResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can add budget items' }
  }

  const event = await getEventById(eventId, user.id)
  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  if (!data.category.trim()) {
    return { success: false, error: 'Category cannot be empty' }
  }
  if (!data.description.trim()) {
    return { success: false, error: 'Description cannot be empty' }
  }
  if (!Number.isFinite(data.estimated_amount) || data.estimated_amount < 0) {
    return { success: false, error: 'Estimated amount must be 0 or greater' }
  }

  const supabase = createClient()

  const { data: newItem, error: insertError } = await supabase
    .from('budgets')
    .insert({
      event_id: eventId,
      category: data.category.trim(),
      description: data.description.trim(),
      estimated_amount: data.estimated_amount,
      actual_amount: 0,
      notes: data.notes ?? null,
      ai_generated: false,
      status: 'pending' as BudgetStatus,
    })
    .select('id')
    .single()

  if (insertError || !newItem) {
    return { success: false, error: insertError?.message ?? 'Insert failed' }
  }

  return { success: true, budgetItemId: newItem.id as string }
}

export type DeleteBudgetItemResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteBudgetItemAction(
  budgetItemId: string
): Promise<DeleteBudgetItemResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can delete budget items' }
  }

  const supabase = createClient()

  const { data: row, error: fetchError } = await supabase
    .from('budgets')
    .select('event_id')
    .eq('id', budgetItemId)
    .maybeSingle()

  if (fetchError || !row) {
    return { success: false, error: 'Budget item not found' }
  }

  const event = await getEventById(row.event_id as string, user.id)
  if (!event) {
    return { success: false, error: 'Event not found or access denied' }
  }

  const { error: deleteError } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetItemId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  return { success: true }
}
