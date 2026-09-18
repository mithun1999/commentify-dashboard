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
import { ApprovalReasonEnum } from '../enum/agent-run.enum'
import { useHistoryStore } from '@/features/history/store/history.store'
import { Button } from '@/components/ui/button'
import type { IPost } from '@/features/history/interface/post.interface'
import { getSalesPostColumns } from '@/features/linkedin-sales/components/sales-queue-columns'
import { getPostColumns } from '@/features/history/components/columns'

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
      return getSalesPostColumns(status)
    }
    if (agentTypeDef?.queueColumns?.length) {
      return agentTypeDef.queueColumns
    }
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

  // Onboarding-preview drafts are excluded from the blanket approve. The
  // preview searches all of LinkedIn rather than the current day to find a
  // good example, so these can sit on posts that are weeks or months old, and
  // publishing one of those unread reads worse than not commenting at all.
  // Selecting a row is an explicit choice and is still honoured - this only
  // removes them from the sweep nobody chose row by row.
  const approvableRows = useMemo(() => {
    if (hasSelection) return getSelectedRows()
    return (tableData as IPost[]).filter(
      (row) =>
        row.comment?.approvalReason !== ApprovalReasonEnum.ONBOARDING_PREVIEW
    )
  }, [hasSelection, getSelectedRows, tableData])

  const heldBackCount = hasSelection
    ? 0
    : (tableData as IPost[]).length - approvableRows.length

  const handleApprove = useCallback(() => {
    const posts = approvableRows.map(({ activityUrn, profileId }) => ({
      activityUrn,
      profileId,
    }))
    if (posts.length > 0) {
      approvePosts({ posts })
    }
  }, [approvableRows, approvePosts])

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
          {/* Straight after onboarding the queue is nothing but held-back
              drafts, so a bulk approve has nothing to act on. Offering a
              disabled one reads as a broken page at the worst moment - the
              row checkboxes are the action here. */}
          {approvableRows.length > 0 && (
            <Button size='sm' disabled={isApprovingPosts} onClick={handleApprove}>
              {isApprovingPosts
                ? 'Approving…'
                : hasSelection
                  ? `Approve Selected (${selectedCount})`
                  : heldBackCount > 0
                    ? `Approve All (${approvableRows.length})`
                    : 'Approve All'}
            </Button>
          )}
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
          {hasSelection ? (
            <span className='text-muted-foreground text-sm'>
              {selectedCount} of {tableData.length} selected
            </span>
          ) : heldBackCount > 0 ? (
            <span className='text-muted-foreground text-sm'>
              {approvableRows.length > 0
                ? `${heldBackCount} from your setup ${heldBackCount === 1 ? 'is' : 'are'} excluded - tick ${heldBackCount === 1 ? 'it' : 'them'} to publish`
                : `Tick the ${heldBackCount === 1 ? 'one' : 'ones'} you want to publish`}
            </span>
          ) : null}
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
