import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type {
  CommentSurface,
  PlanCommentReply,
  PlanCommentTopLevel,
  GroupedComments,
} from '@/types/database'

type RawCommentRow = {
  id: string
  event_id: string
  surface: string
  anchor: string | null
  content: string
  author_id: string
  parent_comment_id: string | null
  resolved_at: string | null
  created_at: string
}

function emptyGroupedComments(): GroupedComments {
  return { plan: [], budget: [], checklist: [] }
}

function isValidSurface(s: unknown): s is CommentSurface {
  return s === 'plan' || s === 'budget' || s === 'checklist'
}

function safeTime(iso: string): number {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

function mapRowsToGroupedComments(
  rows: RawCommentRow[],
  authorMap: Map<string, string | null>
): GroupedComments {
  const topLevel = rows.filter((r) => r.parent_comment_id === null && isValidSurface(r.surface))
  const replyRows = rows.filter((r) => r.parent_comment_id !== null)

  const topLevelIds = new Set(topLevel.map((r) => r.id))

  const replyMap = new Map<string, PlanCommentReply[]>()
  for (const r of replyRows) {
    if (!r.parent_comment_id) continue
    if (!topLevelIds.has(r.parent_comment_id)) continue

    const reply: PlanCommentReply = {
      id: r.id,
      content: r.content,
      author_id: r.author_id,
      author_name: authorMap.get(r.author_id) ?? null,
      created_at: r.created_at,
    }
    const bucket = replyMap.get(r.parent_comment_id) ?? []
    bucket.push(reply)
    replyMap.set(r.parent_comment_id, bucket)
  }

  replyMap.forEach((replies, key) => {
    replyMap.set(
      key,
      replies.slice().sort((a, b) => safeTime(a.created_at) - safeTime(b.created_at))
    )
  })

  const comments: PlanCommentTopLevel[] = topLevel.map((r) => ({
    id: r.id,
    event_id: r.event_id,
    surface: r.surface as CommentSurface,
    anchor: r.anchor,
    content: r.content,
    author_id: r.author_id,
    author_name: authorMap.get(r.author_id) ?? null,
    resolved_at: r.resolved_at,
    created_at: r.created_at,
    replies: replyMap.get(r.id) ?? [],
  }))

  comments.sort((a, b) => {
    const aResolved = a.resolved_at !== null
    const bResolved = b.resolved_at !== null
    if (aResolved !== bResolved) return aResolved ? 1 : -1
    return safeTime(b.created_at) - safeTime(a.created_at)
  })

  const result = emptyGroupedComments()
  for (const comment of comments) {
    result[comment.surface].push(comment)
  }
  return result
}

export async function getCommentsForEvent(eventId: string): Promise<GroupedComments> {
  const supabase = createClient()

  const { data: rows, error } = await supabase
    .from('plan_comments')
    .select('id, event_id, surface, anchor, content, author_id, parent_comment_id, resolved_at, created_at')
    .eq('event_id', eventId)

  if (error || !rows) {
    if (error) console.error('getCommentsForEvent fetch error:', error)
    return emptyGroupedComments()
  }

  const typedRows = rows as RawCommentRow[]
  const authorIds = new Set(typedRows.map((r) => r.author_id))
  const authorMap = new Map<string, string | null>()

  if (authorIds.size > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(authorIds))

    if (profileError) {
      console.error('getCommentsForEvent profiles fetch error:', profileError)
    } else if (profiles) {
      for (const p of profiles as Array<{ id: string; full_name: string | null }>) {
        authorMap.set(p.id, p.full_name)
      }
    }
  }

  return mapRowsToGroupedComments(typedRows, authorMap)
}
