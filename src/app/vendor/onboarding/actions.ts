'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const profileSchema = z.object({
  business_name: z.string().min(1).max(100),
  contact_name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  phone: z.string().max(30),
  location: z.string().max(100),
  bio: z.string().max(500),
})

type ProfileValues = {
  business_name: string
  contact_name: string
  category: string
  phone: string
  location: string
  bio: string
}

function nullIfEmpty(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export async function saveVendorProfileAction(
  values: ProfileValues
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await getUser()
  if (!user) return { success: false, error: 'Not signed in.' }

  try {
    const supabase = createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if ((profile?.role as string | null) !== 'vendor') {
      return { success: false, error: 'Only vendors can save a vendor profile.' }
    }

    const trimmed = {
      business_name: values.business_name.trim(),
      contact_name: values.contact_name.trim(),
      category: values.category.trim(),
      phone: values.phone.trim(),
      location: values.location.trim(),
      bio: values.bio.trim(),
    }

    const parse = profileSchema.safeParse(trimmed)
    if (!parse.success) {
      return { success: false, error: 'Please check your input and try again.' }
    }

    const { error } = await supabase.from('vendor_users').upsert(
      {
        id: user.id,
        business_name: trimmed.business_name,
        contact_name: trimmed.contact_name,
        category: trimmed.category,
        phone: nullIfEmpty(trimmed.phone),
        location: nullIfEmpty(trimmed.location),
        bio: nullIfEmpty(trimmed.bio),
      },
      { onConflict: 'id' }
    )

    if (error) {
      console.error('saveVendorProfileAction upsert error:', error)
      return {
        success: false,
        error: 'Something went wrong saving your profile. Please try again.',
      }
    }

    revalidatePath('/vendor/dashboard')
    revalidatePath('/vendor/onboarding')
    return { success: true }
  } catch {
    console.error('saveVendorProfileAction unexpected error')
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
