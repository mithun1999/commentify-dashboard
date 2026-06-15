export enum AgentRunStatusEnum {
  COMPLETED = 'completed',
  FAILED = 'failed',
  SHORTFALL = 'shortfall',
}

export enum ShortfallReasonEnum {
  NO_KEYWORDS_CONFIGURED = 'no-keywords-configured',
  WINDOW_DRY = 'window-dry',
  FILTER_TOO_STRICT = 'filter-too-strict',
  KEYWORDS_TOO_NARROW = 'keywords-too-narrow',
  PARTIAL = 'partial',
}

export enum ApprovalReasonEnum {
  KEYWORD_BROADENING = 'keyword-broadening',
}
