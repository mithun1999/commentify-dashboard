import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconCircleCheck, IconClock } from '@tabler/icons-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/features/history/components/data-table'
import { TasksDialogs } from '@/features/history/components/tasks-dialogs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  useAgentPendingPosts,
  useAgentCompletedPosts,
  useAgentApprovePosts,
  useAgentDeletePosts,
} from '../hooks/use-agent-posts'
import { useCurrentAgent } from '../hooks/use-current-agent'
import { useHistoryStore } from '@/features/history/store/history.store'
import { Button } from '@/components/ui/button'
import type { IPost } from '@/features/history/interface/post.interface'

export function AgentQueue() {
  const { agent, agentTypeDef } = useCurrentAgent()
  const [status, setStatus] = useState<'pending' | 'completed'>('pending')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const setHistoryStatus = useHistoryStore((s) => s.setStatus)
  const page = pageIndex + 1

  useEffect(() => {
    setHistoryStatus(status)
  }, [status, setHistoryStatus])

  const { data: pendingData } = useAgentPendingPosts(
    agent?.profileId,
    page,
    pageSize
  )
  const { data: completedData } = useAgentCompletedPosts(
    agent?.profileId,
    page,
    pageSize
  )

  const { approvePosts, isApprovingPosts } = useAgentApprovePosts(
    agent?.profileId,
    page,
    pageSize,
    () => setRowSelection({})
  )
  const { deletePostComments, isDeletingPostComments } = useAgentDeletePosts(
    agent?.profileId,
    page,
    pageSize,
    () => {
      setRowSelection({})
      setIsDeleteConfirmOpen(false)
    }
  )

  const tableData = useMemo(() => {
    if (status === 'pending') return pendingData?.docs ?? []
    return completedData?.docs ?? []
  }, [completedData, pendingData, status])

  const pageCount = useMemo(() => {
    const totalPages =
      status === 'pending'
        ? pendingData?.totalPages
        : (completedData as unknown as { totalPages?: number } | null)
            ?.totalPages
    return typeof totalPages === 'number' ? totalPages : -1
  }, [status, pendingData, completedData])

  const columns = useMemo(() => {
    if (agent?.agentMode === 'sales') {
      const { getSalesPostColumns } = require('@/features/linkedin-sales/components/sales-queue-columns')
      return getSalesPostColumns(status)
    }
    if (agentTypeDef?.queueColumns?.length) {
      return agentTypeDef.queueColumns
    }
    const { getPostColumns } = require('@/features/history/components/columns')
    return getPostColumns(status)
  }, [agent?.agentMode, agentTypeDef, status])

  const getSelectedRows = useCallback((): IPost[] => {
    const selectedIndices = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    )
    return selectedIndices.map(
      (index) => tableData[parseInt(index)] as IPost
    ).filter(Boolean)
  }, [rowSelection, tableData])

  const getTargetRows = useCallback((): IPost[] => {
    const selected = getSelectedRows()
    return selected.length > 0 ? selected : (tableData as IPost[])
  }, [getSelectedRows, tableData])

  const selectedCount = Object.values(rowSelection).filter(Boolean).length
  const hasSelection = selectedCount > 0

  const handleApprove = useCallback(() => {
    const rows = getTargetRows()
    const posts = rows.map(({ activityUrn, profileId }) => ({
      activityUrn,
      profileId,
    }))
    if (posts.length > 0) {
      approvePosts({ posts })
    }
  }, [getTargetRows, approvePosts])

  const handleDelete = useCallback(() => {
    const rows = getTargetRows()
    const ids = rows.map((row) => row._id)
    if (ids.length > 0) {
      deletePostComments({ ids })
    }
    setIsDeleteConfirmOpen(false)
  }, [getTargetRows, deletePostComments])

  if (!agent) return null

  return (
    <div>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>Queue</h2>
        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v as 'pending' | 'completed')
            setPageIndex(0)
            setRowSelection({})
          }}
        >
          <TabsList>
            <TabsTrigger value='pending' className='gap-1.5'>
              <IconClock className='size-4' />
              Pending
            </TabsTrigger>
            <TabsTrigger value='completed' className='gap-1.5'>
              <IconCircleCheck className='size-4' />
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {status === 'pending' && tableData.length > 0 && (
        <div className='mb-4 flex items-center gap-2'>
          <Button
            size='sm'
            disabled={isApprovingPosts}
            onClick={handleApprove}
          >
            {isApprovingPosts
              ? 'Approving…'
              : hasSelection
                ? `Approve Selected (${selectedCount})`
                : 'Approve All'}
          </Button>
          <Button
            size='sm'
            variant='destructive'
            disabled={isDeletingPostComments}
            onClick={() => setIsDeleteConfirmOpen(true)}
          >
            {isDeletingPostComments
              ? 'Deleting…'
              : hasSelection
                ? `Delete Selected (${selectedCount})`
                : 'Delete All'}
          </Button>
          {hasSelection && (
            <span className='text-muted-foreground text-sm'>
              {selectedCount} of {tableData.length} selected
            </span>
          )}
          <ConfirmDialog
            open={isDeleteConfirmOpen}
            onOpenChange={setIsDeleteConfirmOpen}
            destructive
            title={hasSelection ? 'Delete selected posts' : 'Delete all posts'}
            desc={
              hasSelection
                ? `You are about to permanently delete ${selectedCount} selected post(s) from the approval list. This action cannot be undone.`
                : `You are about to permanently delete all ${tableData.length} post(s) from the approval list. This action cannot be undone.`
            }
            isLoading={isDeletingPostComments}
            handleConfirm={handleDelete}
            confirmText='Delete'
          />
        </div>
      )}
      <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
        <DataTable
          key={status}
          data={tableData}
          columns={columns}
          manualPagination
          pageCount={pageCount}
          hideToolbar
          statusOverride={status}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onPaginationChange={(pi, ps) => {
            setPageIndex(pi)
            setPageSize(ps)
            setRowSelection({})
          }}
        />
      </div>
      <TasksDialogs />
    </div>
  )
}
