export enum ProfileStatusEnum {
  ACTION_REQUIRED = 'action-required',
  OK = 'ok',
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
