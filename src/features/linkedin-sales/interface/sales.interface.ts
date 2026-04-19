import type { ISalesSetting } from '@/features/settings/interface/setting.interface'

export interface ISalesSettingPayload extends Partial<ISalesSetting> {
  suggestedJobTitles?: string[]
  numberOfPostsToScrapePerDay?: number
  keywordsToTarget?: string[]
}

export interface ICreateSalesSettingPayload {
  profileId: string
  data: ISalesSettingPayload
}

export interface IWebsiteExtractionResult {
  productDescription: string
  painPoints: string[]
  valuePropositions: string[]
  suggestedJobTitles: string[]
  keywords?: string[]
  invalidKeywords?: string[]
}
