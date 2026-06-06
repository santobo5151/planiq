'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export async function setRole(role: UserRole, businessName?: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const trimmed = businessName?.trim()
  if (trimmed && trimmed.length > 100) {
    throw new Error('Business name must be 100 characters or fewer.')
  }

  const update: { role: UserRole; business_name: string | null } = {
    role,
    business_name: trimmed || null,
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) {
    throw new Error(`Could not save your details: ${error.message}`)
  }

  redirect('/dashboard')
}
