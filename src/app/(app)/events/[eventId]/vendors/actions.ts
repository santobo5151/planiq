'use server'

import { requireAuth, getUserProfile } from '@/lib/auth'
import { getEventById } from '@/services/events'
import { getVendorById } from '@/services/vendors'
import { createClient } from '@/lib/supabase/server'
import type { VendorStatus } from '@/types/database'

const VALID_VENDOR_STATUSES: VendorStatus[] = ['invited', 'confirmed', 'declined']

export type AssignVendorResult =
  | { success: true; eventVendorId: string }
  | { success: false; error: string }

export async function assignVendorAction(
  eventId: string,
  vendorId: string
): Promise<AssignVendorResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role)
    return { success: false, error: 'Please complete onboarding first' }
  if (profile.role !== 'planner')
    return { success: false, error: 'Only planners can manage event vendors' }

  const event = await getEventById(eventId, user.id)
  if (!event) return { success: false, error: 'Event not found' }

  const vendor = await getVendorById(vendorId, user.id)
  if (!vendor) return { success: false, error: 'Vendor not found or not owned by you' }

  const supabase = createClient()

  const { data: existing } = await supabase
    .from('event_vendors')
    .select('id')
    .eq('event_id', eventId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (existing)
    return { success: false, error: 'Vendor already assigned to this event' }

  const { data: inserted, error } = await supabase
    .from('event_vendors')
    .insert({
      event_id: eventId,
      vendor_id: vendorId,
      status: 'invited' as VendorStatus,
      notes: null,
    })
    .select('id')
    .single()

  if (error || !inserted)
    return { success: false, error: error?.message ?? 'Insert failed' }
  return { success: true, eventVendorId: inserted.id as string }
}

export type UpdateEventVendorResult =
  | { success: true }
  | { success: false; error: string }

export async function updateEventVendorAction(
  eventVendorId: string,
  data: { status?: VendorStatus; notes?: string }
): Promise<UpdateEventVendorResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role)
    return { success: false, error: 'Please complete onboarding first' }
  if (profile.role !== 'planner')
    return { success: false, error: 'Only planners can manage event vendors' }

  const supabase = createClient()

  const { data: row, error: fetchError } = await supabase
    .from('event_vendors')
    .select('event_id, vendor_id')
    .eq('id', eventVendorId)
    .maybeSingle()

  if (fetchError || !row)
    return { success: false, error: 'Event vendor assignment not found' }

  const event = await getEventById(row.event_id as string, user.id)
  if (!event) return { success: false, error: 'Event not found or access denied' }

  const vendor = await getVendorById(row.vendor_id as string, user.id)
  if (!vendor) return { success: false, error: 'Vendor not found or access denied' }

  if (data.status !== undefined && !VALID_VENDOR_STATUSES.includes(data.status))
    return { success: false, error: 'Invalid status value' }

  const payload: Record<string, unknown> = {}
  if (data.status !== undefined) payload.status = data.status
  if (data.notes !== undefined) payload.notes = data.notes.trim() || null

  if (Object.keys(payload).length === 0) return { success: true }

  const { error: updateError } = await supabase
    .from('event_vendors')
    .update(payload)
    .eq('id', eventVendorId)

  if (updateError) return { success: false, error: updateError.message }
  return { success: true }
}

export type RemoveEventVendorResult =
  | { success: true }
  | { success: false; error: string }

export async function removeEventVendorAction(
  eventVendorId: string
): Promise<RemoveEventVendorResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role)
    return { success: false, error: 'Please complete onboarding first' }
  if (profile.role !== 'planner')
    return { success: false, error: 'Only planners can manage event vendors' }

  const supabase = createClient()

  const { data: row, error: fetchError } = await supabase
    .from('event_vendors')
    .select('event_id, vendor_id')
    .eq('id', eventVendorId)
    .maybeSingle()

  if (fetchError || !row)
    return { success: false, error: 'Event vendor assignment not found' }

  const event = await getEventById(row.event_id as string, user.id)
  if (!event) return { success: false, error: 'Event not found or access denied' }

  const vendor = await getVendorById(row.vendor_id as string, user.id)
  if (!vendor) return { success: false, error: 'Vendor not found or access denied' }

  const { error: deleteError } = await supabase
    .from('event_vendors')
    .delete()
    .eq('id', eventVendorId)

  if (deleteError) return { success: false, error: deleteError.message }
  return { success: true }
}
