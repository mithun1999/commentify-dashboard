import { axiosInstance } from '@/utils/axios.util'
import type {
  IExportLeadsPayload,
  IExportLeadsResult,
  ILeadFilters,
  ILeadsPage,
} from '../interface/lead.interface'

export async function getLeads(
  profileId: string,
  page: number,
  limit: number,
  filters: ILeadFilters
): Promise<ILeadsPage> {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/leads/${profileId}`,
    params: { page, limit, ...filters },
  })
  return data
}

export async function exportLeads(
  profileId: string,
  payload: IExportLeadsPayload
): Promise<IExportLeadsResult> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/leads/${profileId}/export`,
    data: payload,
  })
  return data
}
