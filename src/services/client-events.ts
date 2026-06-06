import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { EventPlan } from '@/types/database'

// ── Shared types ─────────────────────────────────────────────────────────────

export interface ClientEventSummary {
  id: string
  title: string
  event_type: string | null
  location: string | null
  event_date: string | null
  guest_count: number | null
  status: string
  plannerName: string | null
}

export interface ClientEventDetail extends ClientEventSummary {
  theme: string | null
  food_preferences: string | null
}

export interface BudgetSummary {
  totalEstimated: number
  totalActual: number
  byCategory: Array<{ category: string; estimated: number; actual: number }>
}

export interface ClientChecklist {
  id: string
  title: string
  due_date: string | null
  status: string
  category: string | null
  notes: string | null
}

export interface ConfirmedVendor {
  id: string
  name: string
  category: string
  email: string | null
  phone: string | null
  notes: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function lookupPlannerName(
  plannerId: string | null,
  createdBy: string
): Promise<string | null> {
  const supabase = createClient()
  const id = plannerId ?? createdBy
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', id)
      .maybeSingle()
    return data?.business_name ?? data?.full_name ?? null
  } catch {
    return null
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getClientEvents(): Promise<ClientEventSummary[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('events')
      .select(
        'id, title, event_type, location, event_date, guest_count, status, planner_id, created_by, created_at'
      )

    if (error || !data) return []

    const rows = data as Array<{
      id: string
      title: string
      event_type: string | null
      location: string | null
      event_date: string | null
      guest_count: number | null
      status: string
      planner_id: string | null
      created_by: string
      created_at: string
    }>

    // Dated events first ascending, then undated descending by created_at
    rows.sort((a, b) => {
      if (a.event_date && b.event_date) {
        return a.event_date < b.event_date ? -1 : a.event_date > b.event_date ? 1 : 0
      }
      if (a.event_date && !b.event_date) return -1
      if (!a.event_date && b.event_date) return 1
      return b.created_at < a.created_at ? -1 : b.created_at > a.created_at ? 1 : 0
    })

    const results = await Promise.all(
      rows.map(async (row) => {
        const plannerName = await lookupPlannerName(row.planner_id, row.created_by)
        return {
          id: row.id,
          title: row.title,
          event_type: row.event_type,
          location: row.location,
          event_date: row.event_date,
          guest_count: row.guest_count,
          status: row.status,
          plannerName,
        }
      })
    )
    return results
  } catch {
    return []
  }
}

export async function getClientEvent(eventId: string): Promise<ClientEventDetail | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('events')
      .select(
        'id, title, event_type, location, event_date, guest_count, theme, food_preferences, status, planner_id, created_by'
      )
      .eq('id', eventId)
      .maybeSingle()

    if (error || !data) return null

    const row = data as {
      id: string
      title: string
      event_type: string | null
      location: string | null
      event_date: string | null
      guest_count: number | null
      theme: string | null
      food_preferences: string | null
      status: string
      planner_id: string | null
      created_by: string
    }

    const plannerName = await lookupPlannerName(row.planner_id, row.created_by)

    return {
      id: row.id,
      title: row.title,
      event_type: row.event_type,
      location: row.location,
      event_date: row.event_date,
      guest_count: row.guest_count,
      theme: row.theme,
      food_preferences: row.food_preferences,
      status: row.status,
      plannerName,
    }
  } catch {
    return null
  }
}

export async function getClientEventPlan(eventId: string): Promise<EventPlan | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('event_plans')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle()

    if (error || !data) return null
    return data as EventPlan
  } catch {
    return null
  }
}

export async function getClientBudgetSummary(eventId: string): Promise<BudgetSummary | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('category, estimated_amount, actual_amount')
      .eq('event_id', eventId)

    if (error || !data) return null
    if (data.length === 0) return null

    const rows = data as Array<{
      category: string
      estimated_amount: number | null
      actual_amount: number | null
    }>

    let totalEstimated = 0
    let totalActual = 0
    const catMap = new Map<string, { estimated: number; actual: number }>()

    for (const row of rows) {
      const est = row.estimated_amount ?? 0
      const act = row.actual_amount ?? 0
      totalEstimated += est
      totalActual += act

      const existing = catMap.get(row.category) ?? { estimated: 0, actual: 0 }
      catMap.set(row.category, {
        estimated: existing.estimated + est,
        actual: existing.actual + act,
      })
    }

    const byCategory = Array.from(catMap.entries())
      .map(([category, { estimated, actual }]) => ({ category, estimated, actual }))
      .sort((a, b) => a.category.localeCompare(b.category))

    return { totalEstimated, totalActual, byCategory }
  } catch {
    return null
  }
}

export async function getClientChecklist(eventId: string): Promise<ClientChecklist[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('checklists')
      .select('id, title, due_date, status, category, notes')
      .eq('event_id', eventId)
      .order('category', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error || !data) return []

    const rows = data as ClientChecklist[]

    // In-memory fallback: category ASC nulls last, then due_date ASC nulls last
    rows.sort((a, b) => {
      const catA = a.category ?? '￿'
      const catB = b.category ?? '￿'
      if (catA !== catB) return catA.localeCompare(catB)
      if (a.due_date && b.due_date) {
        return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0
      }
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1
      return 0
    })

    return rows
  } catch {
    return []
  }
}

export async function getClientConfirmedVendors(eventId: string): Promise<ConfirmedVendor[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('event_vendors')
      .select('id, notes, status, vendor:vendors(name, category, email, phone)')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if (error || !data) return []

    type VendorRow = {
      id: string
      notes: string | null
      status: string
      vendor: { name: string; category: string; email: string | null; phone: string | null } | null
    }
    const results: ConfirmedVendor[] = []
    for (const row of (data as unknown) as VendorRow[]) {
      if (!row.vendor || typeof row.vendor !== 'object' || Array.isArray(row.vendor)) continue
      results.push({
        id: row.id,
        name: row.vendor.name,
        category: row.vendor.category,
        email: row.vendor.email,
        phone: row.vendor.phone,
        notes: row.notes,
      })
    }
    return results
  } catch {
    return []
  }
}
