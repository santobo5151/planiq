'use server'
import { getVendorInviteByToken } from '@/services/vendor-invites'
import { ensureConfirmedAuthUser } from '@/lib/auth/ensure-confirmed-user'

export async function prepareVendorInviteSignIn(
  token: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const cleanToken = token.trim()
    if (!cleanToken) return { success: false, error: 'Invite link is invalid or expired' }

    const context = await getVendorInviteByToken(cleanToken)
    if (!context) return { success: false, error: 'Invite link is invalid or expired' }
    if (context.alreadyAccepted) {
      return { success: false, error: 'This invite has already been accepted' }
    }

    const email = (context.inviteEmail ?? '').trim().toLowerCase()
    if (!email) return { success: false, error: 'Invite is missing an email address' }

    const ensured = await ensureConfirmedAuthUser(email)
    if (!ensured.success) {
      console.error('ensureConfirmedAuthUser failed for vendor invite', ensured.error)
      return { success: false, error: 'Could not prepare sign-in. Please try again.' }
    }

    return { success: true, email }
  } catch (e) {
    console.error('prepareVendorInviteSignIn failed', e)
    return { success: false, error: 'Could not prepare sign-in. Please try again.' }
  }
}
