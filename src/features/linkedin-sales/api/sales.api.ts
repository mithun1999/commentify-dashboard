import { axiosInstance } from '@/utils/axios.util'
import type { AgentMode } from '@/features/settings/interface/setting.interface'
import type {
  ICreateSalesSettingPayload,
  IWebsiteExtractionResult,
} from '../interface/sales.interface'

export async function createOrUpdateSalesSetting(
  payload: ICreateSalesSettingPayload
) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/setting/sales/${payload.profileId}`,
    data: payload.data,
  })
  return data
}

export async function extractFromWebsite(
  websiteUrl: string
): Promise<IWebsiteExtractionResult> {
  const { data } = await axiosInstance({
    method: 'POST',
    url: '/setting/extract-from-website',
    data: { websiteUrl },
  })
  return data
}

export async function switchAgentMode(
  profileId: string,
  mode: AgentMode,
  existingSalesData?: ICreateSalesSettingPayload['data']
) {
  if (mode === 'sales') {
    const { data } = await axiosInstance({
      method: 'POST',
      url: `/setting/sales/${profileId}`,
      data: existingSalesData ?? {},
    })
    return data
  }
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/setting/branding/${profileId}`,
    data: {},
  })
  return data
}
