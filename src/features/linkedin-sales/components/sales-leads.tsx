import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { IconDownload, IconLock } from '@tabler/icons-react'
import { usePostHog } from 'posthog-js/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentAgent } from '@/features/agent-system/hooks/use-current-agent'
import { hasLivePlanTier } from '@/features/agent-system/registry'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { DataTable } from '@/features/history/components/data-table'
import type {
  ILead,
  ILeadFilters,
  LeadIntentFilter,
  LeadStatusFilter,
} from '../interface/lead.interface'
import { useExportLeads, useLeads } from '../query/lead.query'
import { getSalesLeadColumns } from './sales-lead-columns'

const count = (n: number) => n.toLocaleString()

/**
 * A sales agent's Leads tab: everyone it has commented on, one row each, and
 * a CSV export for following them up outside LinkedIn. Part of the Pro plan.
 */
export function SalesLeads() {
  const { agent } = useCurrentAgent()
  const { data: user, isLoading: isLoadingUser } = useGetUserQuery()

  if (!agent || isLoadingUser) return null

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-semibold'>Leads</h2>
        <p className='text-muted-foreground text-sm'>
          Everyone your agent has commented on. Export them as a CSV to import
          into your CRM and follow up by email or phone.
        </p>
      </div>
      {/* The API refuses leads below Pro, so they are only fetched on Pro. */}
      {hasLivePlanTier(user, 'comment', 'pro') ? (
        <LeadsList profileId={agent.profileId} />
      ) : (
        <LockedLeads />
      )}
    </div>
  )
}

function LockedLeads() {
  const navigate = useNavigate()
  const posthog = usePostHog()

  return (
    <Alert className='border-primary/40 bg-primary/5'>
      <IconLock className='size-4' />
      <AlertTitle>Leads are part of the Pro plan</AlertTitle>
      <AlertDescription>
        <p>
          Upgrade to Pro to see everyone your agent has commented on, filter for
          buying signals, and export them as a CSV for your CRM.
        </p>
        <Button
          size='sm'
          className='mt-3'
          onClick={() => {
            posthog?.capture('upgrade_leads_clicked')
            navigate({ to: '/plans' })
          }}
        >
          See plans
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function LeadsList({ profileId }: { profileId: string }) {
  const [filters, setFilters] = useState<ILeadFilters>({
    intent: 'all',
    status: 'all',
  })
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  const { data, isLoading } = useLeads(
    profileId,
    pageIndex + 1,
    pageSize,
    filters
  )
  const { exportLeads, isExporting } = useExportLeads(profileId)
  const columns = useMemo(() => getSalesLeadColumns(), [])

  const leads: ILead[] = data?.docs ?? []
  const selectedKeys = Object.keys(rowSelection)
    .filter((index) => rowSelection[index])
    .map((index) => leads[Number(index)]?.leadKey)
    .filter(Boolean)
  const summary = data?.summary

  const changeFilters = (next: Partial<ILeadFilters>) => {
    setFilters((current) => ({ ...current, ...next }))
    // The table remounts on a filter change and starts again at its defaults.
    setPageIndex(0)
    setPageSize(10)
    setRowSelection({})
  }

  const handleExport = () => {
    exportLeads(selectedKeys.length ? { leadKeys: selectedKeys } : filters, {
      onSuccess: () => setRowSelection({}),
    })
  }

  const hasLeads = Boolean(summary?.total)

  return (
    <>
      {!isLoading && !hasLeads ? (
        <div className='text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm'>
          No leads yet. Once your agent posts its first comments, the people it
          replied to show up here.
        </div>
      ) : (
        <>
          <div className='flex flex-wrap items-center gap-2'>
            <Select
              value={filters.intent}
              onValueChange={(value) =>
                changeFilters({ intent: value as LeadIntentFilter })
              }
            >
              <SelectTrigger className='w-[200px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>
                  All leads{summary ? ` (${count(summary.intent.all)})` : ''}
                </SelectItem>
                <SelectItem value='buying'>
                  Buying signals
                  {summary ? ` (${count(summary.intent.buying)})` : ''}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                changeFilters({ status: value as LeadStatusFilter })
              }
            >
              <SelectTrigger className='w-[200px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Exported or not</SelectItem>
                <SelectItem value='new'>
                  Not exported yet
                  {summary ? ` (${count(summary.status.notExported)})` : ''}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              size='sm'
              className='ml-auto gap-1.5'
              disabled={isExporting || !data?.totalDocs}
              onClick={handleExport}
            >
              <IconDownload className='size-4' />
              {isExporting
                ? 'Exporting…'
                : selectedKeys.length
                  ? `Export selected (${selectedKeys.length})`
                  : `Export ${count(data?.totalDocs ?? 0)} lead${data?.totalDocs === 1 ? '' : 's'}`}
            </Button>
          </div>

          <div className='-mx-4 flex-1 overflow-auto px-4 py-1'>
            <DataTable
              key={`${filters.intent}-${filters.status}`}
              data={leads}
              columns={columns}
              manualPagination
              pageCount={data?.totalPages ?? -1}
              hideToolbar
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onPaginationChange={(pi, ps) => {
                setPageIndex(pi)
                setPageSize(ps)
                setRowSelection({})
              }}
            />
          </div>
        </>
      )}
    </>
  )
}
