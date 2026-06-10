'use server'
import { getInviteByToken } from '@/services/invites'
import { ensureConfirmedAuthUser } from '@/lib/auth/ensure-confirmed-user'

export async function prepareClientInviteSignIn(
  token: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const cleanToken = token.trim()
    if (!cleanToken) return { success: false, error: 'Invite link is invalid or expired' }

    const result = await getInviteByToken(cleanToken)
    if (!result) return { success: false, error: 'Invite link is invalid or expired' }
    if (result.invite.accepted_at !== null) {
      return { success: false, error: 'This invite has already been accepted' }
    }

    const email = (result.invite.email ?? '').trim().toLowerCase()
    if (!email) return { success: false, error: 'Invite is missing an email address' }

    const ensured = await ensureConfirmedAuthUser(email)
    if (!ensured.success) {
      console.error('ensureConfirmedAuthUser failed for client invite', ensured.error)
      return { success: false, error: 'Could not prepare sign-in. Please try again.' }
    }

    return { success: true, email }
  } catch (e) {
    console.error('prepareClientInviteSignIn failed', e)
    return { success: false, error: 'Could not prepare sign-in. Please try again.' }
  }
}
