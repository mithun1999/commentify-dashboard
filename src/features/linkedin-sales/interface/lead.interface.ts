export type LeadIntent =
  | 'asking_for_tool'
  | 'asking_recommendation'
  | 'tool_comparison'
  | 'pain_expression'
  | 'general_discussion'
  | 'no_signal'

export type LeadIntentFilter = 'all' | 'buying'
export type LeadStatusFilter = 'all' | 'new'

export interface ILeadFilters {
  intent: LeadIntentFilter
  status: LeadStatusFilter
}

/** Someone the sales agent has commented on, one row per person. */
export interface ILead {
  leadKey: string
  name: string
  headline: string
  profileUrl: string
  intentSignal: LeadIntent | null
  intentReasoning: string
  interactions: number
  firstEngagedAt: string | null
  lastEngagedAt: string | null
  lastPost: {
    activityUrn: string
    excerpt: string
    comment: string
  }
  exportedAt: string | null
}

export interface ILeadsPage {
  docs: ILead[]
  page: number
  limit: number
  totalDocs: number
  totalPages: number
  summary: {
    /** Every lead, whatever the filters. */
    total: number
    /** Counts for the intent options, under the current status filter. */
    intent: { all: number; buying: number }
    /** Counts for the status options, under the current intent filter. */
    status: { notExported: number }
  }
}

export interface IExportLeadsPayload extends Partial<ILeadFilters> {
  leadKeys?: string[]
}

export interface IExportLeadsResult {
  filename: string
  csv: string
  exported: number
  /** Of those, leads that had never been exported before. */
  newlyExported: number
}
