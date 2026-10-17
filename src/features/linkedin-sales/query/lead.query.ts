import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ApiRequestError } from '@/utils/axios.util'
import { exportLeads, getLeads } from '../api/lead.api'
import type {
  IExportLeadsPayload,
  IExportLeadsResult,
  ILeadFilters,
} from '../interface/lead.interface'

enum LeadQueryEnum {
  GET_LEADS = 'sales-leads',
}

export function useLeads(
  profileId: string | undefined,
  page: number,
  limit: number,
  filters: ILeadFilters
) {
  return useQuery({
    queryKey: [LeadQueryEnum.GET_LEADS, profileId, page, limit, filters],
    enabled: Boolean(profileId),
    queryFn: () => getLeads(profileId as string, page, limit, filters),
    placeholderData: (prev) => prev,
  })
}

function downloadCsv({ csv, filename }: IExportLeadsResult) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Safari drops the download if the URL is revoked in the same tick.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportedMessage({ exported, newlyExported }: IExportLeadsResult) {
  const leads = `${exported.toLocaleString()} lead${exported === 1 ? '' : 's'}`
  if (newlyExported === exported) return `Exported ${leads}.`
  return `Exported ${leads} (${newlyExported.toLocaleString()} new).`
}

export function useExportLeads(profileId: string | undefined) {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation<
    IExportLeadsResult,
    ApiRequestError,
    IExportLeadsPayload
  >({
    mutationFn: (payload) => exportLeads(profileId as string, payload),
    // onError below says it; the global handler would say it a second time.
    meta: { suppressGlobalErrorToast: true },
    onSuccess: (result) => {
      downloadCsv(result)
      toast.success(exportedMessage(result))
      queryClient.invalidateQueries({
        queryKey: [LeadQueryEnum.GET_LEADS, profileId],
      })
    },
    onError: (error) => {
      toast.error(error?.message || "Couldn't export your leads. Try again.")
    },
  })
  return { exportLeads: mutate, isExporting: isPending }
}
