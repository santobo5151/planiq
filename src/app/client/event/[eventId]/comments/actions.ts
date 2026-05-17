'use server'

import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getClientEvent } from '@/services/client-events'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

export type PostCommentResult = { success: true } | { success: false; error: string }
export type DeleteCommentResult = { success: true } | { success: false; error: string }

const SURFACES = ['plan', 'budget', 'checklist'] as const

const postCommentSchema = z.object({
  eventId: z.string().uuid(),
  surface: z.enum(SURFACES),
  anchor: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be 2000 characters or fewer'),
})

const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
})

export async function postCommentAction(input: {
  eventId: string
  surface: 'plan' | 'budget' | 'checklist'
  anchor: string | null
  content: string
}): Promise<PostCommentResult> {
  const parsed = postCommentSchema.safeParse(input)
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
  if (profile.role !== 'client') {
    return { success: false, error: 'Only clients can post comments.' }
  }

  const event = await getClientEvent(parsed.data.eventId)
  if (!event) return { success: false, error: 'Event not found.' }

  const { error: insertError } = await supabase.from('plan_comments').insert({
    event_id: parsed.data.eventId,
    surface: parsed.data.surface,
    anchor: parsed.data.anchor,
    content: parsed.data.content,
    author_id: user.id,
    parent_comment_id: null,
  })

  if (insertError) return { success: false, error: 'Failed to post comment.' }

  const eventId = parsed.data.eventId
  revalidatePath(`/client/event/${eventId}/comments`)
  revalidatePath(`/events/${eventId}/comments`)

  return { success: true }
}

export async function deleteOwnCommentAction(input: {
  commentId: string
}): Promise<DeleteCommentResult> {
  const parsed = deleteCommentSchema.safeParse(input)
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
  if (profile.role !== 'client') {
    return { success: false, error: 'Only clients can delete their own comments.' }
  }

  const { data: comment, error: fetchError } = await supabase
    .from('plan_comments')
    .select('id, event_id, author_id, parent_comment_id, resolved_at')
    .eq('id', parsed.data.commentId)
    .maybeSingle()

  if (fetchError || !comment) return { success: false, error: 'Comment not found.' }

  const typedComment = comment as {
    id: string
    event_id: string
    author_id: string
    parent_comment_id: string | null
    resolved_at: string | null
  }

  if (typedComment.author_id !== user.id) {
    return { success: false, error: 'You can only delete your own comments.' }
  }

  if (typedComment.parent_comment_id !== null) {
    return { success: false, error: 'Replies cannot be deleted directly.' }
  }

  if (typedComment.resolved_at !== null) {
    return {
      success: false,
      error: 'Resolved comments cannot be deleted. They are kept as part of the planning history.',
    }
  }

  const { count, error: countError } = await supabase
    .from('plan_comments')
    .select('id', { count: 'exact', head: true })
    .eq('parent_comment_id', parsed.data.commentId)

  if (countError) return { success: false, error: 'Failed to verify comment status.' }
  if ((count ?? 0) > 0) {
    return {
      success: false,
      error:
        'This comment has a reply from your planner and cannot be deleted. It is kept as part of the planning history.',
    }
  }

  const { data: deleted, error: deleteError } = await supabase
    .from('plan_comments')
    .delete()
    .eq('id', parsed.data.commentId)
    .eq('author_id', user.id)
    .select('id')
    .maybeSingle()

  if (deleteError) return { success: false, error: 'Failed to delete comment.' }
  if (!deleted) return { success: false, error: 'Comment not found or already deleted.' }

  const eventId = typedComment.event_id
  revalidatePath(`/client/event/${eventId}/comments`)
  revalidatePath(`/events/${eventId}/comments`)

  return { success: true }
}
