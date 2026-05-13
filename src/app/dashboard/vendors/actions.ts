'use server'

import { requireAuth, getUserProfile } from '@/lib/auth'
import { getVendorById } from '@/services/vendors'
import { createClient } from '@/lib/supabase/server'

function isValidEmail(email: string): boolean {
  return email.includes('@') && email.includes('.')
}

export type AddVendorResult =
  | { success: true; vendorId: string }
  | { success: false; error: string }

export async function addVendorAction(data: {
  name: string
  category: string
  email?: string
  phone?: string
  location?: string
  notes?: string
}): Promise<AddVendorResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role)
    return { success: false, error: 'Please complete onboarding first' }
  if (profile.role !== 'planner')
    return { success: false, error: 'Only planners can manage vendors' }

  if (!data.name.trim())
    return { success: false, error: 'Vendor name is required' }
  if (!data.category.trim())
    return { success: false, error: 'Category is required' }
  if (data.email && data.email.trim() && !isValidEmail(data.email.trim()))
    return { success: false, error: 'Please enter a valid email address' }

  const supabase = createClient()
  const { data: inserted, error } = await supabase
    .from('vendors')
    .insert({
      planner_id: user.id,
      name: data.name.trim(),
      category: data.category.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      location: data.location?.trim() || null,
      notes: data.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !inserted)
    return { success: false, error: error?.message ?? 'Insert failed' }
  return { success: true, vendorId: inserted.id as string }
}

export type UpdateVendorResult = { success: true } | { success: false; error: string }

export async function updateVendorAction(
  vendorId: string,
  data: {
    name?: string
    category?: string
    email?: string
    phone?: string
    location?: string
    notes?: string
  }
): Promise<UpdateVendorResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role)
    return { success: false, error: 'Please complete onboarding first' }
  if (profile.role !== 'planner')
    return { success: false, error: 'Only planners can manage vendors' }

  const vendor = await getVendorById(vendorId, user.id)
  if (!vendor) return { success: false, error: 'Vendor not found' }

  if (data.name !== undefined && !data.name.trim())
    return { success: false, error: 'Vendor name cannot be empty' }
  if (data.category !== undefined && !data.category.trim())
    return { success: false, error: 'Category cannot be empty' }
  if (data.email !== undefined && data.email.trim() && !isValidEmail(data.email.trim()))
    return { success: false, error: 'Please enter a valid email address' }

  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.category !== undefined) payload.category = data.category.trim()
  if (data.email !== undefined) payload.email = data.email.trim() || null
  if (data.phone !== undefined) payload.phone = data.phone.trim() || null
  if (data.location !== undefined) payload.location = data.location.trim() || null
  if (data.notes !== undefined) payload.notes = data.notes.trim() || null

  if (Object.keys(payload).length === 0) return { success: true }

  const supabase = createClient()
  const { error } = await supabase.from('vendors').update(payload).eq('id', vendorId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export type DeleteVendorResult = { success: true } | { success: false; error: string }

export async function deleteVendorAction(
  vendorId: string
): Promise<DeleteVendorResult> {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role)
    return { success: false, error: 'Please complete onboarding first' }
  if (profile.role !== 'planner')
    return { success: false, error: 'Only planners can manage vendors' }

  const vendor = await getVendorById(vendorId, user.id)
  if (!vendor) return { success: false, error: 'Vendor not found' }

  const supabase = createClient()
  const { error } = await supabase.from('vendors').delete().eq('id', vendorId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
