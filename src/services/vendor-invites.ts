import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EventVendor, Vendor, VendorInviteContext } from '@/types/database'

export async function createOrReuseVendorInvite(
  eventId: string,
  vendorId: string
): Promise<
  | null
  | { alreadyAccepted: true }
  | { alreadyAccepted: false; eventVendor: EventVendor; vendor: Vendor }
> {
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('event_vendors')
    .select('*, vendor:vendors(*)')
    .eq('event_id', eventId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (!row) return null

  const eventVendor = { ...(row as EventVendor) }
  const vendor = row.vendor as Vendor

  if (eventVendor.vendor_user_id !== null) return { alreadyAccepted: true }

  if (!eventVendor.invite_token) {
    const token = crypto.randomUUID()
    const { error } = await admin
      .from('event_vendors')
      .update({ invite_token: token })
      .eq('id', eventVendor.id)
    if (!error) {
      eventVendor.invite_token = token
    }
    // If error: invite_token remains null; action's defensive check handles it
  }

  return { alreadyAccepted: false, eventVendor, vendor }
}

/**
 * SECURITY: Only call after the auth callback has verified the
 * authenticated user's email matches the planner-directory vendor
 * email AND the user's profile.role is not 'planner' or 'client'.
 * Does NOT set status or responded_at — those are explicit vendor
 * actions in Phase 8.5C.
 */
export async function markVendorInviteAccepted(
  token: string,
  userId: string
): Promise<{ success: boolean }> {
  try {
    const admin = createAdminClient()

    const { data: row } = await admin
      .from('event_vendors')
      .select('vendor_user_id')
      .eq('invite_token', token)
      .maybeSingle()

    if (!row) return { success: false }

    const existingUserId = (row.vendor_user_id as string | null)

    if (existingUserId === null) {
      const { error } = await admin
        .from('event_vendors')
        .update({ vendor_user_id: userId })
        .eq('invite_token', token)
      return { success: !error }
    }

    if (existingUserId === userId) return { success: true }

    // Claimed by a different account
    return { success: false }
  } catch {
    return { success: false }
  }
}

export async function getVendorInviteByToken(
  token: string
): Promise<VendorInviteContext | null> {
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('event_vendors')
    .select(`
      vendor_user_id,
      notes,
      vendor:vendors(email, category),
      event:events(id, title, event_type, location, event_date, planner_id, created_by)
    `)
    .eq('invite_token', token)
    .maybeSingle()

  if (!row) return null

  const eventData = (row.event as unknown) as {
    id: string
    title: string
    event_type: string | null
    location: string | null
    event_date: string | null
    planner_id: string | null
    created_by: string
  } | null

  const vendorData = (row.vendor as unknown) as {
    email: string | null
    category: string
  } | null

  if (!eventData || !vendorData) return null

  const plannerId = eventData.planner_id ?? eventData.created_by

  const { data: profileRow } = await admin
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', plannerId)
    .maybeSingle()

  return {
    event: {
      id: eventData.id,
      title: eventData.title,
      event_type: eventData.event_type,
      location: eventData.location,
      event_date: eventData.event_date,
    },
    category: vendorData.category,
    plannerNote: (row.notes as string | null) ?? null,
    plannerName: profileRow?.business_name ?? profileRow?.full_name ?? null,
    inviteEmail: vendorData.email ?? '',
    alreadyAccepted: row.vendor_user_id !== null,
  }
}
