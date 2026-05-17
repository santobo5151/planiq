'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PlanCommentReply, PlanCommentTopLevel, CommentSurface } from '@/types/database'
import { replyToCommentAction, resolveCommentAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type EnrichedReply = PlanCommentReply & { created_at_display: string }

type EnrichedTopLevel = Omit<PlanCommentTopLevel, 'replies'> & {
  created_at_display: string
  resolved_at_display: string | null
  replies: EnrichedReply[]
}

type EnrichedGroupedComments = {
  plan: EnrichedTopLevel[]
  budget: EnrichedTopLevel[]
  checklist: EnrichedTopLevel[]
}

type Props = {
  comments: EnrichedGroupedComments
  plannerId: string
}

const SURFACES: CommentSurface[] = ['plan', 'budget', 'checklist']

const SURFACE_LABELS: Record<CommentSurface, string> = {
  plan: 'Plan',
  budget: 'Budget',
  checklist: 'Checklist',
}

export function CommentsPageClient({ comments, plannerId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeSurface, setActiveSurface] = useState<CommentSurface>('plan')
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [replyErrors, setReplyErrors] = useState<Record<string, string | null>>({})
  const [resolveTarget, setResolveTarget] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const activeComments = comments[activeSurface]

  function handleReplyChange(commentId: string, value: string) {
    setReplyTexts((prev) => ({ ...prev, [commentId]: value }))
    setReplyErrors((prev) => ({ ...prev, [commentId]: null }))
  }

  function handleReply(parentComment: EnrichedTopLevel) {
    const content = (replyTexts[parentComment.id] ?? '').trim()
    if (!content) {
      setReplyErrors((prev) => ({ ...prev, [parentComment.id]: 'Reply cannot be empty.' }))
      return
    }
    startTransition(async () => {
      const result = await replyToCommentAction({
        parentCommentId: parentComment.id,
        content,
      })
      if (result.success) {
        setReplyTexts((prev) => ({ ...prev, [parentComment.id]: '' }))
        router.refresh()
      } else {
        setReplyErrors((prev) => ({ ...prev, [parentComment.id]: result.error }))
      }
    })
  }

  function handleResolveConfirm() {
    if (!resolveTarget) return
    const commentId = resolveTarget
    setResolveError(null)
    startTransition(async () => {
      const result = await resolveCommentAction({ commentId })
      if (result.success) {
        setResolveTarget(null)
        router.refresh()
      } else {
        setResolveError(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {SURFACES.map((surface) => {
          const count = comments[surface].length
          const isActive = surface === activeSurface
          return (
            <button
              key={surface}
              onClick={() => setActiveSurface(surface)}
              className={[
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {SURFACE_LABELS[surface]}
              {count > 0 && (
                <span
                  className={[
                    'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold',
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {activeComments.length === 0 ? (
        <p className="text-sm text-slate-500">No client comments yet on this section.</p>
      ) : (
        <div className="space-y-4">
          {activeComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              plannerId={plannerId}
              replyText={replyTexts[comment.id] ?? ''}
              replyError={replyErrors[comment.id] ?? null}
              isPending={isPending}
              onReplyChange={(value) => handleReplyChange(comment.id, value)}
              onReply={() => handleReply(comment)}
              onResolve={() => {
                setResolveError(null)
                setResolveTarget(comment.id)
              }}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={resolveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResolveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark comment as resolved?</AlertDialogTitle>
            <AlertDialogDescription>
              Once resolved, no further replies can be added to this thread.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {resolveError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{resolveError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolveConfirm}
              disabled={isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isPending ? 'Resolving…' : 'Mark resolved'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type CommentCardProps = {
  comment: EnrichedTopLevel
  plannerId: string
  replyText: string
  replyError: string | null
  isPending: boolean
  onReplyChange: (value: string) => void
  onReply: () => void
  onResolve: () => void
}

function CommentCard({
  comment,
  plannerId,
  replyText,
  replyError,
  isPending,
  onReplyChange,
  onReply,
  onResolve,
}: CommentCardProps) {
  const isResolved = comment.resolved_at !== null
  const hasReply = comment.replies.length > 0
  const canReply = !isResolved && !hasReply
  const canResolve = !isResolved

  return (
    <div
      className={[
        'rounded-lg border p-4',
        isResolved ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {comment.author_name ?? 'Client'}
            </span>
            {comment.anchor && (
              <span className="max-w-[160px] truncate text-xs text-slate-500">
                on {comment.anchor}
              </span>
            )}
            {isResolved && (
              <Badge className="border-transparent bg-emerald-100 text-xs text-emerald-700 hover:bg-emerald-100">
                {comment.resolved_at_display
                  ? `Resolved on ${comment.resolved_at_display}`
                  : 'Resolved'}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{comment.created_at_display}</p>
        </div>
        {canResolve && (
          <Button
            size="sm"
            variant="outline"
            onClick={onResolve}
            disabled={isPending}
            className="shrink-0 border-slate-300 text-xs"
          >
            Resolve
          </Button>
        )}
      </div>

      <p
        className={[
          'mt-3 text-sm leading-relaxed',
          isResolved ? 'text-slate-400' : 'text-slate-700',
        ].join(' ')}
      >
        {comment.content}
      </p>

      {comment.replies.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {reply.author_id === plannerId ? 'You' : (reply.author_name ?? 'Planner')}
                </span>
                <span className="text-xs text-slate-400">{reply.created_at_display}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {canReply && (
        <div className="mt-4 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => onReplyChange(e.target.value)}
            placeholder="Write a reply…"
            maxLength={2000}
            rows={3}
            disabled={isPending}
            aria-invalid={replyError !== null}
            className={[
              'w-full resize-none rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60',
              replyError ? 'border-red-400' : 'border-slate-200',
            ].join(' ')}
          />
          {replyError && (
            <p className="text-xs text-red-600" role="alert">
              {replyError}
            </p>
          )}
          <Button
            size="sm"
            onClick={onReply}
            disabled={isPending || !replyText.trim()}
            className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? 'Sending…' : 'Send reply'}
          </Button>
        </div>
      )}
    </div>
  )
}
