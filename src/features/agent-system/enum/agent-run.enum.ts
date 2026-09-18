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
  /**
   * Written during signup, before there was a card on file. The preview
   * searches all of LinkedIn rather than the current day to find the best
   * example, so these can sit on posts that are weeks or months old - they
   * are safe to show, but not to publish in bulk unread.
   */
  ONBOARDING_PREVIEW = 'onboarding-preview',
}
