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
    .select('full_name')
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
    plannerName: (profileRow?.full_name as string | null) ?? null,
    inviteEmail: vendorData.email ?? '',
    alreadyAccepted: row.vendor_user_id !== null,
  }
}
