'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PlanCommentReply, PlanCommentTopLevel, CommentSurface } from '@/types/database'
import { postCommentAction, deleteOwnCommentAction } from '../actions'
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
  eventId: string
  clientUserId: string
}

const SURFACES: CommentSurface[] = ['plan', 'budget', 'checklist']

const SURFACE_LABELS: Record<CommentSurface, string> = {
  plan: 'Plan',
  budget: 'Budget',
  checklist: 'Checklist',
}

export function ClientCommentsPageClient({ comments, eventId, clientUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeSurface, setActiveSurface] = useState<CommentSurface>('plan')
  const [composerOpen, setComposerOpen] = useState(false)
  const [anchor, setAnchor] = useState('')
  const [content, setContent] = useState('')
  const [postError, setPostError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const activeComments = comments[activeSurface]

  function handleOpenComposer() {
    setComposerOpen(true)
    setPostError(null)
  }

  function handleCancelComposer() {
    setComposerOpen(false)
    setAnchor('')
    setContent('')
    setPostError(null)
  }

  function handlePost() {
    if (!content.trim()) {
      setPostError('Comment cannot be empty.')
      return
    }
    startTransition(async () => {
      const result = await postCommentAction({
        eventId,
        surface: activeSurface,
        anchor: anchor.trim() || null,
        content,
      })
      if (result.success) {
        setComposerOpen(false)
        setAnchor('')
        setContent('')
        setPostError(null)
        router.refresh()
      } else {
        setPostError(result.error)
      }
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    const commentId = deleteTarget
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteOwnCommentAction({ commentId })
      if (result.success) {
        setDeleteTarget(null)
        router.refresh()
      } else {
        setDeleteError(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Surface tabs */}
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
                    isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Composer panel */}
      {!composerOpen ? (
        <div>
          <Button
            onClick={handleOpenComposer}
            disabled={isPending}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Post comment
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700">
            Commenting on:{' '}
            <span className="text-indigo-600">{SURFACE_LABELS[activeSurface]}</span>
          </p>

          <div className="space-y-1">
            <label htmlFor="comment-anchor" className="block text-sm font-medium text-slate-700">
              Anchor <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="comment-anchor"
              type="text"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              placeholder="e.g. 'Day-of timeline'"
              maxLength={100}
              disabled={isPending}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
            <p className="text-xs text-slate-400">Reference a specific section of the plan.</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="comment-content" className="block text-sm font-medium text-slate-700">
              Comment
            </label>
            <textarea
              id="comment-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your comment…"
              maxLength={2000}
              rows={4}
              disabled={isPending}
              className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
            <p className="text-right text-xs text-slate-400">{content.length} / 2000</p>
          </div>

          {postError && (
            <Alert variant="destructive">
              <AlertDescription>{postError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handlePost}
              disabled={isPending || !content.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isPending ? 'Posting…' : 'Post'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelComposer}
              disabled={isPending}
              className="border-slate-300 text-slate-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Comment list */}
      {activeComments.length === 0 ? (
        <p className="text-sm text-slate-500">
          No comments yet. Use the form above to post one.
        </p>
      ) : (
        <div className="space-y-4">
          {activeComments.map((comment) => {
            const isOwn = comment.author_id === clientUserId
            const isUnresolved = comment.resolved_at === null
            const hasNoReplies = comment.replies.length === 0
            const canDelete = isOwn && isUnresolved && hasNoReplies

            return (
              <div
                key={comment.id}
                className={[
                  'rounded-lg border p-4',
                  isUnresolved
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-200 bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {comment.author_name ?? 'Unknown'}
                      </span>
                      {comment.anchor && (
                        <span className="max-w-[160px] truncate text-xs text-slate-500">
                          on {comment.anchor}
                        </span>
                      )}
                      {!isUnresolved && (
                        <Badge className="border-transparent bg-emerald-100 text-xs text-emerald-700 hover:bg-emerald-100">
                          {comment.resolved_at_display
                            ? `Resolved on ${comment.resolved_at_display}`
                            : 'Resolved'}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{comment.created_at_display}</p>
                  </div>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDeleteError(null)
                        setDeleteTarget(comment.id)
                      }}
                      disabled={isPending}
                      className="shrink-0 border-red-200 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  )}
                </div>

                <p
                  className={[
                    'mt-3 whitespace-pre-wrap text-sm leading-relaxed',
                    isUnresolved ? 'text-slate-700' : 'text-slate-400',
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
                            {reply.author_name ?? 'Planner'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {reply.created_at_display}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete AlertDialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
