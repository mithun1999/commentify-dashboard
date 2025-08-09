import { useState } from 'react'
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { useHistoryStore } from '../store/history.store'
import { useApprovePosts, useDeletePostComments } from '../query/post.query'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const selectedStatus = useHistoryStore((s) => s.status)
  const anySelected = table.getSelectedRowModel().rows.length > 0
  const { deletePostComments, isDeletingPostComments } = useDeletePostComments()
  const { approvePosts, isApprovingPosts } = useApprovePosts(() => {
    table.resetRowSelection()
  })

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  return (
    <div className='ml-auto hidden h-8 items-center gap-2 lg:flex'>
      {selectedStatus === 'pending' && (
        <>
          <Button
            size='sm'
            className='ml-auto hidden h-8 lg:flex'
            disabled={!anySelected || isApprovingPosts}
            onClick={() => {
              const posts = table
                .getSelectedRowModel()
                .rows.map((r) => r.original as { activityUrn: string; profileId: string })
                .map(({ activityUrn, profileId }) => ({ activityUrn, profileId }))
              if (posts.length > 0) approvePosts({ posts })
            }}
            aria-busy={isApprovingPosts}
          >
            {isApprovingPosts ? 'Approving…' : 'Approve'}
          </Button>
          <Button
            size='sm'
            variant='outline'
            className='ml-auto hidden h-8 lg:flex'
            disabled={!anySelected || isDeletingPostComments}
            onClick={() => setIsConfirmOpen(true)}
            aria-busy={isDeletingPostComments}
          >
            {isDeletingPostComments ? 'Deleting…' : 'Delete'}
          </Button>
          <ConfirmDialog
            open={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            destructive
            title='Delete selected comments'
            desc='You are about to permanently delete the selected comments from the approval list. This action cannot be undone.'
            isLoading={isDeletingPostComments}
            handleConfirm={() => {
              const ids = table
                .getSelectedRowModel()
                .rows.map((r) => (r.original as { _id: string })._id)
              if (ids.length > 0) {
                deletePostComments({ ids })
              }
              setIsConfirmOpen(false)
            }}
            confirmText='Delete'
          />
        </>
      )}
    </div>
  )
}
