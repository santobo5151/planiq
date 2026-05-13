import { createClient } from '@/lib/supabase/server'
import type {
  Event as PlanIQEvent,
  EventPlan,
  Budget,
  Checklist,
} from '@/types/database'

export async function getPlannerEvents(userId: string): Promise<PlanIQEvent[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .or(`created_by.eq.${userId},planner_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getPlannerEvents failed:', error.message)
    return []
  }
  return (data ?? []) as PlanIQEvent[]
}

export async function getEventById(
  eventId: string,
  userId: string
): Promise<PlanIQEvent | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  if (error) {
    console.error('getEventById failed:', error.message)
    return null
  }
  if (!data) return null

  const event = data as PlanIQEvent
  const hasAccess =
    event.created_by === userId ||
    event.planner_id === userId ||
    event.client_id === userId

  return hasAccess ? event : null
}

export async function getEventPlan(eventId: string): Promise<EventPlan | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('event_plans')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    console.error('getEventPlan failed:', error.message)
    return null
  }
  return (data as EventPlan) ?? null
}

export async function getBudget(eventId: string): Promise<Budget[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('event_id', eventId)
    .order('category', { ascending: true })

  if (error) {
    console.error('getBudget failed:', error.message)
    return []
  }
  return (data ?? []) as Budget[]
}

export async function getChecklist(eventId: string): Promise<Checklist[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('checklists')
    .select('*')
    .eq('event_id', eventId)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('getChecklist failed:', error.message)
    return []
  }
  return (data ?? []) as Checklist[]
}
