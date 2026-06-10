type PlanSettingValue = number | string | boolean

export const planSetting: Record<
  string,
  {
    starter: PlanSettingValue
    pro: PlanSettingValue
    premium: PlanSettingValue
  }
> = {
  numberOfPostsToScrapePerDay: {
    starter: 20,
    pro: 50,
    premium: 100,
  },
  salesMentionsPerDay: {
    starter: 15,
    pro: 30,
    premium: 50,
  },
  tagAuthor: {
    starter: false,
    pro: true,
    premium: true,
  },
  engagementThreshold: {
    starter: false,
    pro: false,
    premium: true,
  },
  scrapeRules: {
    starter: false,
    pro: true,
    premium: true,
  },
  commentRules: {
    starter: false,
    pro: true,
    premium: true,
  },
  geography: {
    starter: false,
    pro: false,
    premium: true,
  },
  authorTitles: {
    starter: false,
    pro: false,
    premium: true,
  },
  monitoredProfiles: {
    starter: 0,
    pro: 10,
    premium: 30,
  },
}

// Posting-agent limits (Starter/Pro only). Values marked CONFIRM are placeholders
// pending product sign-off; keep in sync with backend `postPlanMapper`.
export const postPlanSetting: Record<
  string,
  {
    starter: PlanSettingValue
    pro: PlanSettingValue
  }
> = {
  postsPerWeek: {
    starter: 3, // CONFIRM
    pro: 5, // CONFIRM
  },
  trackedCreators: {
    starter: 3, // CONFIRM
    pro: 15, // CONFIRM
  },
  aiCarousels: {
    starter: false, // CONFIRM
    pro: true, // CONFIRM
  },
  aiImageGeneration: {
    starter: true, // CONFIRM
    pro: true, // CONFIRM
  },
}
