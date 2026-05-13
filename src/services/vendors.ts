import { createClient } from '@/lib/supabase/server'
import type { Vendor, EventVendor } from '@/types/database'

export async function getVendors(plannerId: string): Promise<Vendor[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('planner_id', plannerId)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Vendor[]
}

export async function getVendorById(
  vendorId: string,
  plannerId: string
): Promise<Vendor | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .maybeSingle()
  if (error || !data) return null
  const vendor = data as Vendor
  if (vendor.planner_id !== plannerId) return null
  return vendor
}

export async function getEventVendors(eventId: string): Promise<EventVendor[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('event_vendors')
    .select('*, vendor:vendors(*)')
    .eq('event_id', eventId)
  if (error) throw error
  const rows = (data ?? []) as EventVendor[]
  return rows.sort((a, b) => {
    const catA = (a.vendor?.category ?? '').toLowerCase()
    const catB = (b.vendor?.category ?? '').toLowerCase()
    if (catA !== catB) return catA.localeCompare(catB)
    return (a.vendor?.name ?? '')
      .toLowerCase()
      .localeCompare((b.vendor?.name ?? '').toLowerCase())
  })
}

export async function getVendorCategories(plannerId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vendors')
    .select('category')
    .eq('planner_id', plannerId)
  if (error) throw error
  const unique = Array.from(
    new Set((data ?? []).map((r: { category: string }) => r.category))
  )
  return unique.sort((a, b) => a.localeCompare(b))
}
