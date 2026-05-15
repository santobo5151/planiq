import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInviteByToken, markInviteAccepted } from '@/services/invites'
import { getVendorInviteByToken, markVendorInviteAccepted } from '@/services/vendor-invites'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const inviteToken = url.searchParams.get('invite_token')
  const vendorInviteToken = url.searchParams.get('vendor_invite_token')
  const loginType = url.searchParams.get('login_type')
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

    // ── Vendor invite path ──────────────────────────────────────────────────
    if (vendorInviteToken) {
      const context = await getVendorInviteByToken(vendorInviteToken)
      if (!context) {
        return redirectError('Invite link is invalid or expired')
      }

      // Security: authenticated email must match the planner-directory vendor email
      const inviteEmail = (context.inviteEmail ?? '').trim().toLowerCase()
      const userEmail = (user.email ?? '').trim().toLowerCase()
      if (inviteEmail !== userEmail) {
        return redirectError('This invite was sent to a different email address')
      }

      // Profile handling — SELECT first, never blind upsert
      const { data: profileRow } = await admin
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileRow) {
        const role = profileRow.role as string | null
        if (role === 'planner' || role === 'client') {
          return redirectError(
            'This email is already in use by a planner or client account. Please use a different email or contact your planner.'
          )
        }
        if (role === null) {
          await admin.from('profiles').update({ role: 'vendor' }).eq('id', user.id)
        }
        // role === 'vendor' → leave unchanged
      } else {
        await admin.from('profiles').insert({ id: user.id, role: 'vendor' })
      }

      // vendor_users row — SELECT first, INSERT only if missing
      const { data: vendorUserRow } = await admin
        .from('vendor_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!vendorUserRow) {
        try {
          await admin.from('vendor_users').insert({ id: user.id })
        } catch {
          // Race condition: a concurrent retry of the same magic link may have
          // created the row already. Safe to continue.
        }
      }

      // Link auth user to the event_vendors row
      const accepted = await markVendorInviteAccepted(vendorInviteToken, user.id)
      if (!accepted.success) {
        return redirectError(
          'Could not link your account. Please try again or contact your planner.'
        )
      }

      // Sanity check: confirm the row is now owned by this user
      const { data: evRow } = await admin
        .from('event_vendors')
        .select('event_id, vendor_user_id')
        .eq('invite_token', vendorInviteToken)
        .maybeSingle()

      if (!evRow || (evRow.vendor_user_id as string | null) !== user.id) {
        return redirectError('Invite already claimed by another account')
      }

      // Phase 8.5C builds /vendor/event/[eventId] — a 404 here is expected for 8.5B
      return NextResponse.redirect(
        new URL(`/vendor/event/${evRow.event_id as string}`, request.url)
      )
    }

    // ── Client invite path ──────────────────────────────────────────────────
    if (inviteToken) {
      const result = await getInviteByToken(inviteToken)
      if (!result) {
        return redirectError('Invite link is invalid or expired')
      }

      const { invite, event } = result

      // Security: authenticated email must match invite email
      const inviteEmail = (invite.email ?? '').trim().toLowerCase()
      const userEmail = (user.email ?? '').trim().toLowerCase()
      if (inviteEmail !== userEmail) {
        return redirectError('This invite was sent to a different email address')
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
    }

    // ── Vendor regular-login path ─────────────────────────────────────────────
    // Reached when a vendor uses /vendor/login → magic link (no invite token).
    // Does NOT create or update profiles — if no vendor profile exists, fail clearly.
    if (loginType === 'vendor') {
      const { data: profileRow } = await admin
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle()

      const role = (profileRow?.role ?? null) as string | null

      if (role === 'vendor') {
        return NextResponse.redirect(new URL('/vendor/dashboard', request.url))
      }

      if (role === 'planner' || role === 'client') {
        return redirectError(
          'This account is a planner or client account. Please sign in at the correct login page.'
        )
      }

      return redirectError(
        'No vendor account found for this email. Please accept a vendor invite first.'
      )
    }

    // ── Regular client login ──────────────────────────────────────────────────
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

    const role = existingProfile.role as string | null
    const dest =
      role === 'planner' ? '/dashboard' :
      role === 'vendor' ? '/vendor/dashboard' :
      '/client/dashboard'

    return NextResponse.redirect(new URL(dest, request.url))

  } catch {
    return redirectError('Something went wrong. Please try again.')
  }
}
