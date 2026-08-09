export enum ProfileStatusEnum {
  ACTION_REQUIRED = 'action-required',
  OK = 'ok',
  /**
   * Billing stopped it - trial expired or subscription gone. Needs a plan, not
   * a button. An owner-initiated pause is per agent (`pausedAgentTypes`) and
   * never touches status.
   */
  DEACTIVATED = 'deactivated',
  NEEDS_ATTENTION = 'needs-attention',
}

export enum ProfileBlockedReasonEnum {
  NO_KEYWORDS = 'no-keywords',
  SETTINGS_INVALID = 'settings-invalid',
  KEYWORDS_TOO_NARROW = 'keywords-too-narrow',
  FILTER_TOO_STRICT = 'filter-too-strict',
  NO_SEARCH_TERMS = 'no-search-terms',
}
