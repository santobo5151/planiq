'use server'

import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getEventById } from '@/services/events'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

export type ReplyToCommentResult = { success: true } | { success: false; error: string }
export type ResolveCommentResult = { success: true } | { success: false; error: string }

const replySchema = z.object({
  parentCommentId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
})

const resolveSchema = z.object({
  commentId: z.string().uuid(),
})

export async function replyToCommentAction(input: {
  parentCommentId: string
  content: string
}): Promise<ReplyToCommentResult> {
  const parsed = replySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in.' }

  const profile = await getUserProfile()
  if (!profile || profile.role === null) {
    return { success: false, error: 'Please complete onboarding first.' }
  }
  if (profile.role !== 'planner') {
    return { success: false, error: 'Only planners can manage comments.' }
  }

  const { data: parent, error: fetchError } = await supabase
    .from('plan_comments')
    .select('id, event_id, surface, parent_comment_id, resolved_at')
    .eq('id', parsed.data.parentCommentId)
    .maybeSingle()

  if (fetchError || !parent) return { success: false, error: 'Comment not found.' }

  const typedParent = parent as {
    id: string
    event_id: string
    surface: string
    parent_comment_id: string | null
    resolved_at: string | null
  }

  const event = await getEventById(typedParent.event_id, user.id)
  if (!event) return { success: false, error: 'Event not found or access denied.' }
  if (event.planner_id !== user.id && event.created_by !== user.id) {
    return { success: false, error: 'Event not found or access denied.' }
  }

  if (typedParent.parent_comment_id !== null) {
    return { success: false, error: 'Replies cannot have replies.' }
  }

  if (typedParent.resolved_at !== null) {
    return { success: false, error: 'Cannot reply to a resolved comment.' }
  }

  const { error: insertError } = await supabase.from('plan_comments').insert({
    event_id: typedParent.event_id,
    surface: typedParent.surface,
    content: parsed.data.content,
    author_id: user.id,
    parent_comment_id: parsed.data.parentCommentId,
  })

  if (insertError) return { success: false, error: insertError.message }

  const eventId = typedParent.event_id
  revalidatePath(`/events/${eventId}/comments`)
  revalidatePath(`/client/event/${eventId}/comments`)

  return { success: true }
}

export async function resolveCommentAction(input: {
  commentId: string
}): Promise<ResolveCommentResult> {
  const parsed = resolveSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in.' }

  const profile = await getUserProfile()
  if (!profile || profile.role === null) {
    return { success: false, error: 'Please complete onboarding first.' }
  }
  if (profile.role !== 'planner') {
    return { success: false, error: 'Only planners can manage comments.' }
  }

  const { data: comment, error: fetchError } = await supabase
    .from('plan_comments')
    .select('id, event_id, parent_comment_id, resolved_at')
    .eq('id', parsed.data.commentId)
    .maybeSingle()

  if (fetchError || !comment) return { success: false, error: 'Comment not found.' }

  const typedComment = comment as {
    id: string
    event_id: string
    parent_comment_id: string | null
    resolved_at: string | null
  }

  const event = await getEventById(typedComment.event_id, user.id)
  if (!event) return { success: false, error: 'Event not found or access denied.' }
  if (event.planner_id !== user.id && event.created_by !== user.id) {
    return { success: false, error: 'Event not found or access denied.' }
  }

  if (typedComment.parent_comment_id !== null) {
    return { success: false, error: 'Replies cannot be resolved.' }
  }

  if (typedComment.resolved_at !== null) {
    return { success: false, error: 'Comment is already resolved.' }
  }

  const { error: updateError } = await supabase
    .from('plan_comments')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', parsed.data.commentId)
    .is('resolved_at', null)

  if (updateError) return { success: false, error: updateError.message }

  const eventId = typedComment.event_id
  revalidatePath(`/events/${eventId}/comments`)
  revalidatePath(`/client/event/${eventId}/comments`)

  return { success: true }
}
