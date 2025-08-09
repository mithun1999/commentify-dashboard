import { ConfirmDialog } from '@/components/confirm-dialog'
import { Task } from '../data/schema'
import { useDeletePostComments } from '../query/post.query'
import { useHistoryStore } from '../store/history.store'
import { PostCommentDrawer } from './post-comment-drawer'
import { TasksImportDialog } from './tasks-import-dialog'
import { TasksMutateDrawer } from './tasks-mutate-drawer'

export function TasksDialogs() {
  const open = useHistoryStore((s) => s.open)
  const setOpen = useHistoryStore((s) => s.setOpen)
  const currentRow = useHistoryStore((s) => s.currentRow) as Task | null
  const setCurrentRow = useHistoryStore((s) => s.setCurrentRow)
  const { deletePostComments, isDeletingPostComments } = useDeletePostComments(
    () => setOpen(null)
  )
  return (
    <>
      <TasksMutateDrawer
        key='task-create'
        open={open === 'create'}
        onOpenChange={(v) => setOpen(v ? 'create' : null)}
      />

      <TasksImportDialog
        key='tasks-import'
        open={open === 'import'}
        onOpenChange={(v) => setOpen(v ? 'import' : null)}
      />

      {currentRow && (
        <>
          <PostCommentDrawer
            open={open === 'update'}
            onOpenChange={(v) => setOpen(v ? 'update' : null)}
            // @ts-expect-error migrate types from Task to IPost later
            post={currentRow}
          />

          <ConfirmDialog
            key='task-delete'
            destructive
            open={open === 'delete'}
            onOpenChange={(v) => setOpen(v ? 'delete' : null)}
            isLoading={isDeletingPostComments}
            handleConfirm={() => {
              const id = (currentRow as unknown as { id?: string })?.id
              if (id) {
                deletePostComments({ ids: [id] })
                setTimeout(() => setCurrentRow(null), 500)
              }
            }}
            className='max-w-md'
            title={`Delete Comment`}
            desc={
              <>
                You are about to permanently delete this comment from the
                approval list. This action cannot be undone.
              </>
            }
            confirmText='Delete'
          />
        </>
      )}
    </>
  )
}
