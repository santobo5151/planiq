import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInviteByToken, markInviteAccepted } from '@/services/invites'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const inviteToken = url.searchParams.get('invite_token')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  function redirectError(message: string) {
    return NextResponse.redirect(
      new URL(
        `/auth/callback-error?message=${encodeURIComponent(message)}`,
        request.url
      )
    )
  }

  if (error) {
    return redirectError(errorDescription ?? 'Authentication failed')
  }

  if (!code) {
    return redirectError('Missing authentication code')
  }

  try {
    const supabase = createClient()

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      return redirectError(exchangeError.message)
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return redirectError('Authentication failed')
    }

    const admin = createAdminClient()

    // Regular client login — no invite token
    if (!inviteToken) {
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle()

      if (!existingProfile) {
        await admin.from('profiles').insert({ id: user.id, role: 'client' })
        return NextResponse.redirect(new URL('/client/dashboard', request.url))
      }

      if (existingProfile.role === null) {
        await admin
          .from('profiles')
          .update({ role: 'client' })
          .eq('id', user.id)
      }

      return NextResponse.redirect(
        new URL(
          existingProfile.role === 'planner' ? '/dashboard' : '/client/dashboard',
          request.url
        )
      )
    }

    // Invite-token path
    const result = await getInviteByToken(inviteToken)
    if (!result) {
      return redirectError('Invite link is invalid or expired')
    }

    const { invite, event } = result

    // Security: authenticated email must match invite email
    const inviteEmail = (invite.email ?? '').trim().toLowerCase()
    const userEmail = (user.email ?? '').trim().toLowerCase()
    if (inviteEmail !== userEmail) {
      return redirectError(
        'This invite was sent to a different email address'
      )
    }

    // a) Mark accepted — idempotent (only updates when accepted_at IS NULL)
    await markInviteAccepted(inviteToken, user.id)

    // b) Sanity check: confirm no other account claimed it
    const { data: refetchedInvite } = await admin
      .from('invites')
      .select('client_user_id')
      .eq('token', inviteToken)
      .maybeSingle()

    if (
      refetchedInvite?.client_user_id &&
      refetchedInvite.client_user_id !== user.id
    ) {
      return redirectError('Invite already claimed by another account')
    }

    // c) Link client_id on the event (only if not already set)
    const { data: eventRow } = await admin
      .from('events')
      .select('id, client_id')
      .eq('id', invite.event_id)
      .maybeSingle()

    if (eventRow && eventRow.client_id === null) {
      await admin
        .from('events')
        .update({ client_id: user.id })
        .eq('id', invite.event_id)
    }

    // d) Profile handling — SELECT first, never blind upsert
    const { data: profileRow } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profileRow) {
      await admin.from('profiles').insert({ id: user.id, role: 'client' })
    } else if (profileRow.role === null) {
      await admin
        .from('profiles')
        .update({ role: 'client' })
        .eq('id', user.id)
    }
    // role = 'planner' or 'client' → leave unchanged

    return NextResponse.redirect(
      new URL(`/client/event/${event.id}`, request.url)
    )
  } catch {
    return redirectError('Something went wrong. Please try again.')
  }
}
