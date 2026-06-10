import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Ensure an auth user exists for `email` and is email-confirmed, so a
 * subsequent browser signInWithOtp({ shouldCreateUser:false }) sends a
 * MAGIC LINK rather than a signup-confirmation email.
 * SECURITY: callers MUST validate a real, unaccepted invite for this email
 * before calling — this function does not check authorisation itself.
 */
export async function ensureConfirmedAuthUser(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const normalised = email.trim().toLowerCase()
  if (!normalised) return { success: false, error: 'Missing email' }

  const admin = createAdminClient()

  const { error: createError } = await admin.auth.admin.createUser({
    email: normalised,
    email_confirm: true,
    user_metadata: { created_via: 'invite_acceptance' },
  })
  if (!createError) return { success: true }

  // Already exists → ensure confirmed (covers residue/unconfirmed users).
  // Supabase error shape varies; use a minimal structural cast (no `any`).
  const createErr = createError as { code?: string; status?: number; message?: string }
  const alreadyExists =
    createErr.code === 'email_exists' ||
    createErr.status === 422 ||
    /already.*(regist|exist)/i.test(createErr.message ?? '')
  if (!alreadyExists) return { success: false, error: createErr.message }

  // listUsers has no email filter; paginate.
  // MVP cap (5 × 200 = 1,000 users); revisit with an auth/email lookup strategy at scale.
  const perPage = 200
  for (let page = 1; page <= 5; page++) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage })
    if (listError) return { success: false, error: listError.message }
    const match = data.users.find((u) => (u.email ?? '').toLowerCase() === normalised)
    if (match) {
      if (match.email_confirmed_at) return { success: true }
      const { error: updError } = await admin.auth.admin.updateUserById(match.id, { email_confirm: true })
      return updError ? { success: false, error: updError.message } : { success: true }
    }
    if (data.users.length < perPage) break
  }
  return { success: false, error: 'Could not locate the invited account' }
}
