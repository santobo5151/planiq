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
import { createOrReuseInvite } from '@/services/invites'
import { sendEmail } from '@/lib/email/resend'
import { z } from 'zod'
import type { CreateEventInput, BudgetStatus, ChecklistStatus, GeneratedPlan } from '@/types/database'

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

// ── Checklist item mutations ─────────────────────────────────────────────────

const VALID_CHECKLIST_STATUSES = ['todo', 'in_progress', 'done'] as const
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidISODate(s: string): boolean {
  return ISO_DATE_RE.test(s) && !isNaN(Date.parse(s))
}

export type UpdateChecklistItemResult =
  | { success: true }
  | { success: false; error: string }

export async function updateChecklistItemAction(
  checklistItemId: string,
  data: {
    status?: ChecklistStatus
    title?: string
    category?: string
    due_date?: string | null
    notes?: string
  }
): Promise<UpdateChecklistItemResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can edit checklist items' }
  }

  const supabase = createClient()

  const { data: row, error: fetchError } = await supabase
    .from('checklists')
    .select('event_id')
    .eq('id', checklistItemId)
    .maybeSingle()

  if (fetchError || !row) {
    return { success: false, error: 'Checklist item not found' }
  }

  const event = await getEventById(row.event_id as string, user.id)
  if (!event) {
    return { success: false, error: 'Event not found or access denied' }
  }

  if (data.status !== undefined && !VALID_CHECKLIST_STATUSES.includes(data.status)) {
    return { success: false, error: 'Invalid status value' }
  }
  if (data.title !== undefined && !data.title.trim()) {
    return { success: false, error: 'Title cannot be empty' }
  }
  if (data.category !== undefined && !data.category.trim()) {
    return { success: false, error: 'Category cannot be empty' }
  }
  if (data.due_date !== undefined && data.due_date !== null && !isValidISODate(data.due_date)) {
    return { success: false, error: 'Due date must be in YYYY-MM-DD format' }
  }

  const payload: Record<string, unknown> = {}
  if (data.status !== undefined) payload.status = data.status
  if (data.title !== undefined) payload.title = data.title.trim()
  if (data.category !== undefined) payload.category = data.category.trim()
  if (data.due_date !== undefined) payload.due_date = data.due_date
  if (data.notes !== undefined) payload.notes = data.notes

  if (Object.keys(payload).length === 0) return { success: true }

  const { error: updateError } = await supabase
    .from('checklists')
    .update(payload)
    .eq('id', checklistItemId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}

export type AddChecklistItemResult =
  | { success: true; checklistItemId: string }
  | { success: false; error: string }

export async function addChecklistItemAction(
  eventId: string,
  data: {
    title: string
    category: string
    due_date?: string | null
    notes?: string
  }
): Promise<AddChecklistItemResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can add checklist items' }
  }

  const event = await getEventById(eventId, user.id)
  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  if (!data.title.trim()) {
    return { success: false, error: 'Title cannot be empty' }
  }
  if (!data.category.trim()) {
    return { success: false, error: 'Category cannot be empty' }
  }
  if (data.due_date && !isValidISODate(data.due_date)) {
    return { success: false, error: 'Due date must be in YYYY-MM-DD format' }
  }

  const supabase = createClient()

  const { data: newItem, error: insertError } = await supabase
    .from('checklists')
    .insert({
      event_id: eventId,
      title: data.title.trim(),
      category: data.category.trim(),
      due_date: data.due_date ?? null,
      notes: data.notes ?? null,
      ai_generated: false,
      status: 'todo' as ChecklistStatus,
    })
    .select('id')
    .single()

  if (insertError || !newItem) {
    return { success: false, error: insertError?.message ?? 'Insert failed' }
  }

  return { success: true, checklistItemId: newItem.id as string }
}

export type DeleteChecklistItemResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteChecklistItemAction(
  checklistItemId: string
): Promise<DeleteChecklistItemResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can delete checklist items' }
  }

  const supabase = createClient()

  const { data: row, error: fetchError } = await supabase
    .from('checklists')
    .select('event_id')
    .eq('id', checklistItemId)
    .maybeSingle()

  if (fetchError || !row) {
    return { success: false, error: 'Checklist item not found' }
  }

  const event = await getEventById(row.event_id as string, user.id)
  if (!event) {
    return { success: false, error: 'Event not found or access denied' }
  }

  const { error: deleteError } = await supabase
    .from('checklists')
    .delete()
    .eq('id', checklistItemId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  return { success: true }
}

// ── Plan mutations ───────────────────────────────────────────────────────────

type UpdatePlanInput = {
  concept_summary?: string
  timeline?: GeneratedPlan['timeline']
  vendor_categories?: GeneratedPlan['vendor_categories']
  recommendations?: GeneratedPlan['recommendations']
}

export type UpdatePlanResult = { success: true } | { success: false; error: string }

export async function updatePlanAction(
  eventId: string,
  data: UpdatePlanInput
): Promise<UpdatePlanResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'planner') {
    return { success: false, error: 'Only planners can edit event plans' }
  }

  const event = await getEventById(eventId, user.id)
  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  const existingPlan = await getEventPlan(eventId)
  if (!existingPlan) {
    return {
      success: false,
      error: 'Plan not found. Please generate a plan first.',
    }
  }

  if (data.concept_summary !== undefined && !data.concept_summary.trim()) {
    return { success: false, error: 'Concept summary cannot be empty' }
  }

  if (data.timeline !== undefined) {
    for (const item of data.timeline) {
      if (!item.time?.trim() || !item.activity?.trim()) {
        return {
          success: false,
          error: 'Each timeline item must have a time and activity',
        }
      }
    }
  }

  if (data.vendor_categories !== undefined) {
    const validPriorities = ['essential', 'recommended', 'optional']
    for (const v of data.vendor_categories) {
      if (!v.name?.trim() || !v.description?.trim()) {
        return {
          success: false,
          error: 'Each vendor category must have a name and description',
        }
      }
      if (!validPriorities.includes(v.priority)) {
        return { success: false, error: 'Invalid priority value' }
      }
    }
  }

  if (data.recommendations !== undefined) {
    for (const r of data.recommendations) {
      if (!r.category?.trim() || !r.suggestion?.trim() || !r.reason?.trim()) {
        return {
          success: false,
          error: 'Each recommendation must have a category, suggestion, and reason',
        }
      }
    }
  }

  const payload: Record<string, unknown> = {}
  if (data.concept_summary !== undefined)
    payload.concept_summary = data.concept_summary.trim()
  if (data.timeline !== undefined) payload.timeline = data.timeline
  if (data.vendor_categories !== undefined)
    payload.vendor_categories = data.vendor_categories
  if (data.recommendations !== undefined)
    payload.recommendations = data.recommendations

  if (Object.keys(payload).length === 0) return { success: true }

  const supabase = createClient()
  const { error: updateError } = await supabase
    .from('event_plans')
    .update(payload)
    .eq('event_id', eventId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}

// ── Client invite ─────────────────────────────────────────────────────────────

export type SendClientInviteResult =
  | { success: true }
  | { success: false; error: string }

export async function sendClientInviteAction(
  eventId: string,
  email: string
): Promise<SendClientInviteResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role)
    return { success: false, error: 'Please complete onboarding first' }
  if (profile.role !== 'planner')
    return { success: false, error: 'Only planners can send invites' }

  const event = await getEventById(eventId, user.id)
  if (
    !event ||
    (event.created_by !== user.id && event.planner_id !== user.id)
  ) {
    return { success: false, error: 'Event not found' }
  }

  const emailParse = z.string().email().safeParse(email.trim())
  if (!emailParse.success)
    return { success: false, error: 'Please enter a valid email address' }

  let inviteResult: Awaited<ReturnType<typeof createOrReuseInvite>>
  try {
    inviteResult = await createOrReuseInvite(eventId, emailParse.data)
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to create invite',
    }
  }

  if (inviteResult.alreadyAccepted)
    return {
      success: false,
      error: 'This client has already accepted the invite.',
    }

  const { invite } = inviteResult
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const inviteUrl = `${appUrl}/invite/${invite.token}`

  const plannerName = profile.full_name ?? 'Your planner'
  const eventTitle = event.title

  let datePart = ''
  if (event.event_date) {
    const formatted = new Date(event.event_date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    datePart = ` on ${formatted}`
  }

  const subject = `You're invited to collaborate on "${eventTitle}" via PlanIQ`
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="margin:0 0 24px;font-size:22px;color:#4f46e5;">PlanIQ</h1>
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hi there,</p>
    <p style="margin:0 0 28px;color:#1e293b;font-size:15px;">
      <strong>${plannerName}</strong> has invited you to collaborate on
      <strong>${eventTitle}</strong>${datePart} using PlanIQ.
    </p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${inviteUrl}"
         style="background-color:#4f46e5;color:#fff;padding:14px 32px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
        View your invitation
      </a>
    </div>
    <p style="font-size:13px;color:#64748b;margin:0;line-height:1.6;">
      This invite link does not expire, but the secure sign-in email you
      receive after clicking it will expire in 1 hour. If it expires, just
      open the invite link again to request a new one.
    </p>
  </div>
</body>
</html>`

  const emailResult = await sendEmail({ to: emailParse.data, subject, html })
  if (!emailResult.success)
    return {
      success: false,
      error: 'Could not send invite email. Please try again.',
    }

  return { success: true }
}
