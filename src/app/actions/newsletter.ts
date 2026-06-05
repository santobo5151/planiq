'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

export type SubscribeResult = { success: true } | { success: false; error: string }

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address.')
    .max(254)
    .email('Please enter a valid email address.'),
  source: z.enum(['v2_footer']).optional(),
})

export async function subscribeToNewsletterAction(input: {
  email: string
  source?: 'v2_footer'
}): Promise<SubscribeResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const email = parsed.data.email.toLowerCase()
  const source = parsed.data.source ?? 'v2_footer'

  const admin = createAdminClient()
  const { error } = await admin
    .from('newsletter_subscribers')
    .insert({ email, source })

  if (error) {
    if (error.code === '23505') return { success: true }
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}
