import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { VendorAssignmentListItem, VendorAssignmentDetail } from '@/types/database'

type RawAssignmentRow = {
  id: string
  status: 'invited' | 'confirmed' | 'declined'
  notes: string | null
  responded_at: string | null
  created_at: string
  vendor:
    | { category: string | null }
    | Array<{ category: string | null }>
    | null
  event:
    | {
        id: string
        title: string
        event_type: string | null
        location: string | null
        event_date: string | null
        planner_id?: string | null
      }
    | Array<{
        id: string
        title: string
        event_type: string | null
        location: string | null
        event_date: string | null
        planner_id?: string | null
      }>
    | null
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function getVendorAssignments(userId: string): Promise<VendorAssignmentListItem[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('event_vendors')
      .select('id, status, notes, responded_at, created_at, vendor:vendors(category), event:events(id, title, event_type, location, event_date)')
      .eq('vendor_user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getVendorAssignments error:', error)
      return []
    }
    if (!data) return []

    const rows = data as unknown as RawAssignmentRow[]

    const results: VendorAssignmentListItem[] = []
    for (const row of rows) {
      const event = pickOne(row.event)
      if (!event) continue
      const vendor = pickOne(row.vendor)
      results.push({
        event_vendor_id: row.id,
        status: row.status,
        notes: row.notes,
        responded_at: row.responded_at,
        created_at: row.created_at,
        vendor_directory_category: vendor?.category ?? null,
        event: {
          id: event.id,
          title: event.title,
          event_type: event.event_type,
          location: event.location,
          event_date: event.event_date,
        },
      } satisfies VendorAssignmentListItem)
    }
    return results
  } catch {
    console.error('getVendorAssignments unexpected error')
    return []
  }
}

export async function getVendorAssignmentDetail(
  userId: string,
  eventId: string
): Promise<VendorAssignmentDetail | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('event_vendors')
      .select('id, status, notes, responded_at, created_at, vendor:vendors(category), event:events(id, title, event_type, location, event_date, planner_id)')
      .eq('event_id', eventId)
      .eq('vendor_user_id', userId)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('getVendorAssignmentDetail error:', error)
      return null
    }
    if (!data) return null

    const row = data as unknown as RawAssignmentRow

    const event = pickOne(row.event)
    if (!event) return null
    const vendor = pickOne(row.vendor)

    let planner_name: string | null = null
    const plannerId = event.planner_id ?? null
    if (plannerId) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', plannerId)
          .maybeSingle()
        planner_name = (profileData?.full_name as string | null) ?? null
      } catch {
        console.error('getVendorAssignmentDetail planner name fetch failed')
        planner_name = null
      }
    }

    return {
      event_vendor_id: row.id,
      status: row.status,
      planner_note: row.notes,
      planner_name,
      responded_at: row.responded_at,
      created_at: row.created_at,
      vendor_directory_category: vendor?.category ?? null,
      event: {
        id: event.id,
        title: event.title,
        event_type: event.event_type,
        location: event.location,
        event_date: event.event_date,
      },
    } satisfies VendorAssignmentDetail
  } catch {
    console.error('getVendorAssignmentDetail unexpected error')
    return null
  }
}
