import { useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import ProfileConnectionGuard from '@/components/profile-connection-guard'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getPostColumns } from './components/columns'
import { DataTable } from './components/data-table'
import { TasksDialogs } from './components/tasks-dialogs'
import {
  useGetCompletedPostsQuery,
  useGetPendingPostsQuery,
} from './query/post.query'
import { useHistoryStore } from './store/history.store'

export default function History() {
  const currentStatus = useHistoryStore((s) => s.status)
  const pageIndex = useHistoryStore((s) => s.pageIndex)
  const setPageIndex = useHistoryStore((s) => s.setPageIndex)
  const pageSize = useHistoryStore((s) => s.pageSize)
  const setPageSize = useHistoryStore((s) => s.setPageSize)
  const page = pageIndex + 1
  const limit = pageSize

  const { data: pendingData } = useGetPendingPostsQuery(page, limit)
  const { data: completedData } = useGetCompletedPostsQuery(page, limit)

  const tableData = useMemo(() => {
    if (currentStatus === 'pending') {
      return pendingData?.docs ?? []
    }
    return completedData?.docs ?? []
  }, [completedData, pendingData, currentStatus])
  const pageCount = useMemo(() => {
    const totalPages =
      currentStatus === 'pending'
        ? pendingData?.totalPages
        : (completedData as unknown as { totalPages?: number } | null)
            ?.totalPages
    return typeof totalPages === 'number' ? totalPages : -1
  }, [currentStatus, pendingData, completedData])
  const columns = useMemo(() => getPostColumns(currentStatus), [currentStatus])

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>History</h2>
            <p className='text-muted-foreground'>
              Here&apos;s a list of comments that have been posted or yet to be
              posted!
            </p>
          </div>
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <DataTable
            key={currentStatus}
            data={tableData}
            columns={columns}
            manualPagination
            pageCount={pageCount}
            onPaginationChange={(pi, ps) => {
              setPageIndex(pi)
              setPageSize(ps)
            }}
          />
        </div>
        <ProfileConnectionGuard />
      </Main>

      <TasksDialogs />
    </>
  )
}
