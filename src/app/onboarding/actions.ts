'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export async function setRole(role: UserRole) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id)

  if (error) {
    throw new Error(`Could not save your role: ${error.message}`)
  }

  redirect('/dashboard')
}
