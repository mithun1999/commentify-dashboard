import { Link } from '@tanstack/react-router'
import { AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { getAgentPlanTier } from '@/features/agent-system/registry'
import { useUpdateScrapeSettingQuery } from '@/features/settings/query/setting.query'
import type { IProfile } from '@/features/users/interface/profile.interface'
import { useGetAgentRunStatus } from '../query/agent-run.query'
import {
  AgentRunStatusEnum,
  ShortfallReasonEnum,
} from '../enum/agent-run.enum'

// Auth failures already surface through AgentReconnectBanner (ACTION_REQUIRED),
// so this card stays quiet for them to avoid double-prompting.
const AUTH_FAILURE_CAUSES = new Set([
  'profile-token-unauthorized',
  'profile-credentials-missing',
])

export function AgentRunStatusCard({
  profileId,
  profile,
}: {
  profileId: string
  profile?: IProfile | null
}) {
  const { data: run, isLoading } = useGetAgentRunStatus(profileId, 'linkedin')
  const { data: user } = useGetUserQuery()
  const userPlan = getAgentPlanTier(user, 'comment')
  const { updateScrapeSetting, isUpdatingScrapeSetting } =
    useUpdateScrapeSettingQuery()

  if (isLoading || !run) return null

  const suggested = run.suggestedKeywords ?? []

  const applySuggestions = () => {
    const ss = profile?.setting?.scrapeSetting
    if (!ss || !suggested.length) return
    const merged = Array.from(
      new Set([...(ss.keywordsToTarget ?? []), ...suggested])
    )
    const payload = {
      profileId,
      userPlan: (userPlan ?? 'starter') as 'starter' | 'pro' | 'premium',
      keywordsToTarget: merged,
      skipHiringPosts: ss.skipHiringPosts,
      skipJobUpdatePosts: ss.skipJobUpdatePosts,
      skipArticlePosts: ss.skipArticlePosts,
      skipCompanyPosts: ss.skipCompanyPosts,
      autoSchedule: ss.autoSchedule,
      blackListedAccounts: ss.blackListedAccounts,
      languageToTarget: ss.languageToTarget,
      numberOfPostsToScrapePerDay: ss.numberOfPostsToScrapePerDay,
      jobTiming: ss.jobTiming,
      engagementThreshold: ss.engagementThreshold,
      regionsToTarget: ss.regionsToTarget,
      authorTitlesToTarget: ss.authorTitlesToTarget,
      rules: ss.rules,
    }
    updateScrapeSetting(payload)
  }

  // Non-auth hard failure: a short, honest status note.
  if (
    run.status === AgentRunStatusEnum.FAILED &&
    !AUTH_FAILURE_CAUSES.has(run.failureCause ?? '')
  ) {
    return (
      <Card className='mb-4 border-destructive/40'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm font-medium'>
            <AlertCircle className='size-4 text-destructive' />
            Last run didn't complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground text-sm'>
            Your most recent run hit an error and will retry automatically. No
            action needed for now.
          </p>
        </CardContent>
      </Card>
    )
  }

  const reason = run.shortfallReason

  if (reason === ShortfallReasonEnum.NO_KEYWORDS_CONFIGURED) {
    return (
      <Card className='mb-4 border-amber-300 dark:border-amber-500/40'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm font-medium'>
            <AlertCircle className='size-4 text-amber-600' />
            No keywords to search
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-muted-foreground text-sm'>
            Your agent has no keywords configured, so it can't find posts to
            comment on. Add a few to get started.
          </p>
          <Button asChild size='sm' variant='outline'>
            <Link to='/settings/post'>Add keywords</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (reason === ShortfallReasonEnum.KEYWORDS_TOO_NARROW) {
    return (
      <Card className='mb-4 border-amber-300 dark:border-amber-500/40'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm font-medium'>
            <Sparkles className='size-4 text-amber-600' />
            Your keywords are too narrow
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-muted-foreground text-sm'>
            Your current keywords barely surface any LinkedIn posts. Broaden
            them so your agent has enough posts to engage with.
          </p>
          {suggested.length > 0 && (
            <>
              <div className='flex flex-wrap gap-1.5'>
                {suggested.map((kw) => (
                  <Badge key={kw} variant='secondary'>
                    {kw}
                  </Badge>
                ))}
              </div>
              <Button
                size='sm'
                onClick={applySuggestions}
                disabled={isUpdatingScrapeSetting}
              >
                {isUpdatingScrapeSetting ? (
                  <>
                    <Loader2 className='mr-1.5 size-3.5 animate-spin' />
                    Applying…
                  </>
                ) : (
                  'Apply suggested keywords'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  if (reason === ShortfallReasonEnum.FILTER_TOO_STRICT) {
    return (
      <Card className='mb-4 border-amber-300 dark:border-amber-500/40'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm font-medium'>
            <AlertCircle className='size-4 text-amber-600' />
            Posts found, but none matched
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground text-sm'>
            Your agent found LinkedIn posts but none passed your sales-fit
            criteria, so nothing was scheduled. Consider loosening your sales
            targeting if this keeps happening.
          </p>
        </CardContent>
      </Card>
    )
  }

  return null
}
