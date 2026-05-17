'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type BookingActionResult = { success: true } | { success: false; error: string }

async function resolveVendorUser(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if ((profile?.role as string | null) !== 'vendor') {
    return { ok: false, error: 'Only vendors can respond to bookings.' }
  }

  return { ok: true, userId: user.id }
}

export async function confirmBookingAction(
  eventVendorId: string
): Promise<BookingActionResult> {
  if (!eventVendorId || typeof eventVendorId !== 'string') {
    return { success: false, error: 'Invalid booking reference.' }
  }

  try {
    const check = await resolveVendorUser()
    if (!check.ok) return { success: false, error: check.error }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('event_vendors')
      .update({
        status: 'confirmed',
        responded_at: new Date().toISOString(),
      })
      .eq('id', eventVendorId)
      .eq('vendor_user_id', check.userId)
      .eq('status', 'invited')
      .select('event_id')
      .maybeSingle()

    if (error) {
      console.error('confirmBookingAction DB error:', error)
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    if (!data) {
      return { success: false, error: 'This booking can no longer be changed.' }
    }

    const eventId = (data as { event_id: string }).event_id
    revalidatePath('/vendor/dashboard')
    revalidatePath(`/vendor/event/${eventId}`)
    return { success: true }
  } catch {
    console.error('confirmBookingAction unexpected error')
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function declineBookingAction(
  eventVendorId: string
): Promise<BookingActionResult> {
  if (!eventVendorId || typeof eventVendorId !== 'string') {
    return { success: false, error: 'Invalid booking reference.' }
  }

  try {
    const check = await resolveVendorUser()
    if (!check.ok) return { success: false, error: check.error }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('event_vendors')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', eventVendorId)
      .eq('vendor_user_id', check.userId)
      .eq('status', 'invited')
      .select('event_id')
      .maybeSingle()

    if (error) {
      console.error('declineBookingAction DB error:', error)
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    if (!data) {
      return { success: false, error: 'This booking can no longer be changed.' }
    }

    const eventId = (data as { event_id: string }).event_id
    revalidatePath('/vendor/dashboard')
    revalidatePath(`/vendor/event/${eventId}`)
    return { success: true }
  } catch {
    console.error('declineBookingAction unexpected error')
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
