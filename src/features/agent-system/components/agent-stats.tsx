import { IconFidgetSpinner } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentAgent } from '../hooks/use-current-agent'
import {
  useGetLinkedInStats,
  useGetPostStats,
} from '@/features/users/query/profile.query'
import { Overview } from '@/features/dashboard/components/overview'
import { ProfileOverview } from '@/features/dashboard/components/profile-overview'
import type { ILinkedInStats } from '@/features/users/interface/profile.interface'

const formatNumber = (n?: number | string | null) => {
  if (n === undefined || n === null) return '--'
  if (typeof n === 'string') {
    const s = n.trim()
    if (s === '') return '--'
    const num = Number(s)
    if (!Number.isFinite(num)) return '--'
    n = num
  }
  const num = Number(n)
  if (!Number.isFinite(num)) return '--'
  const rounded = Math.round(num)
  return Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
    .format(rounded)
    .toLowerCase()
}

const formatPercent = (n?: number | string | null) => {
  if (n === undefined || n === null) return '--'
  if (typeof n === 'string') {
    const s = n.trim()
    if (s === '') return '--'
    const parsed = Number(s)
    if (!Number.isFinite(parsed)) return s
    n = parsed
  }
  const num = Number(n)
  if (!Number.isFinite(num)) return '--'
  const rounded = Math.round(num)
  if (rounded === 0) return '0%'
  const compact = Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
    .format(Math.abs(rounded))
    .toLowerCase()
  return `${rounded > 0 ? '+' : '-'}${compact}%`
}

function CommentStatsCards({
  stats,
}: {
  stats: { scheduled: number; pending: number; completed: number }
}) {
  return (
    <div className='grid gap-4 lg:grid-cols-3'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            Comments Scheduled
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {formatNumber(stats.scheduled)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            Comments Pending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {formatNumber(stats.pending)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            Comments Posted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {formatNumber(stats.completed)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LinkedInStatsView({
  linkedInStats,
  isLoading,
}: {
  linkedInStats: ILinkedInStats | null | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className='mt-10 flex w-full items-center justify-center'>
        <Card>
          <CardContent>
            <div className='flex flex-col items-center justify-center text-center'>
              <IconFidgetSpinner className='animate-spin' />
              <p className='mt-2 text-sm'>
                <span className='font-bold'>
                  Pulling your LinkedIn numbers{' '}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (
    !linkedInStats?.followersStats &&
    !linkedInStats?.profileViewerStats &&
    !linkedInStats?.postCommentStats
  ) {
    return (
      <Card className='mt-4 w-full'>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-6 text-center'>
            <p className='text-muted-foreground text-sm'>
              No stats available yet. Stats will appear once your agent starts
              running.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const fs = linkedInStats?.followersStats
  const followersHas3m =
    typeof fs?.followersGrowthSinceThreeMonths === 'number'
  const followersHasSinceApp =
    typeof fs?.followersGrowthSinceStartedUsingThisApp === 'number'
  const followersValue = fs?.totalFollowers
  const followersGrowthValue = followersHas3m
    ? fs?.followersGrowthSinceThreeMonths
    : followersHasSinceApp
      ? fs?.followersGrowthSinceStartedUsingThisApp
      : fs?.followersGrowth
  const followersPercent = followersHas3m
    ? fs?.followersGrowthSinceThreeMonthsPercent
    : followersHasSinceApp
      ? fs?.followersGrowthSinceStartedUsingThisAppPercent
      : fs?.followersGrowthPercent
  const followersSuffix = followersHas3m
    ? 'since 3 months'
    : followersHasSinceApp
      ? 'since Commentify'
      : 'since 3 months'

  const weeklyFollowersValue = fs?.weeklyFollowersGrowth
  const weeklyFollowersPercent = fs?.weeklyFollowersGrowthPercent

  const ps = linkedInStats?.profileViewerStats
  const profileHasSinceApp =
    typeof ps?.profileViewersGrowthSinceStartedUsingThisApp === 'number'
  const profileViewsValue = profileHasSinceApp
    ? ps?.profileViewersGrowthSinceStartedUsingThisApp
    : ps?.profileViewersGrowth
  const profileViewsPercent = profileHasSinceApp
    ? ps?.profileViewersGrowthSinceStartedUsingThisAppPercent
    : ps?.profileViewersGrowthPercent
  const profileViewsSuffix = profileHasSinceApp
    ? 'since Commentify'
    : 'in the last 3 months'

  const weeklyProfileViewsValue = ps?.weeklyProfileViewersGrowth
  const weeklyProfileViewsPercent = ps?.weeklyProfileViewersGrowthPercent

  const hasProfileViewStats = Boolean(linkedInStats?.profileViewerStats)

  return (
    <div className='space-y-4'>
      {(linkedInStats?.followersStats || linkedInStats?.profileViewerStats) && (
        <div
          className={`grid gap-4 sm:grid-cols-2 ${hasProfileViewStats ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}
        >
          {linkedInStats?.followersStats && (
            <>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Followers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatNumber(followersValue)}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {formatNumber(followersGrowthValue)} Followers{' '}
                    {followersSuffix} ({formatPercent(followersPercent)})
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    New Followers (This Week)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatNumber(weeklyFollowersValue)}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {formatPercent(weeklyFollowersPercent)} vs last week
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {linkedInStats?.profileViewerStats && (
            <>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Profile Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatNumber(profileViewsValue)}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {formatPercent(profileViewsPercent)} {profileViewsSuffix}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Profile Views (This Week)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatNumber(weeklyProfileViewsValue)}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {formatPercent(weeklyProfileViewsPercent)} vs last week
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {linkedInStats?.postCommentStats && (
        <CommentStatsCards stats={linkedInStats.postCommentStats} />
      )}

      {!linkedInStats?.followersStats &&
        !linkedInStats?.profileViewerStats &&
        linkedInStats?.postCommentStats && (
          <Card className='w-full'>
            <CardContent>
              <div className='text-muted-foreground flex items-center justify-center py-3 text-center text-sm'>
                Follower and profile view stats are temporarily unavailable.
              </div>
            </CardContent>
          </Card>
        )}

      {linkedInStats?.followersStats && (
        <Card className='w-full'>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle>Followers Growth</CardTitle>
          </CardHeader>
          <CardContent className='pl-2'>
            <Overview
              growth={linkedInStats.followersStats.growth ?? []}
            />
          </CardContent>
        </Card>
      )}

      {linkedInStats?.profileViewerStats && (
        <Card className='w-full'>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle>Profile Viewers Growth</CardTitle>
          </CardHeader>
          <CardContent className='pl-2'>
            <ProfileOverview
              growth={
                (linkedInStats.profileViewerStats.growth ?? []) as {
                  period: string
                  profileViewersGrowth?: number
                  profileViewersCount?: number
                  profileViewersGrowthPercent?: number
                }[]
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TwitterStatsView({ profileId }: { profileId: string }) {
  const { data, isLoading } = useGetPostStats(profileId)

  if (isLoading) {
    return (
      <div className='mt-10 flex w-full items-center justify-center'>
        <Card>
          <CardContent>
            <div className='flex flex-col items-center justify-center text-center'>
              <IconFidgetSpinner className='animate-spin' />
              <p className='mt-2 text-sm font-bold'>Loading stats...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <Card className='mt-4 w-full'>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-6 text-center'>
            <p className='text-muted-foreground text-sm'>
              No stats available yet. Stats will appear once your agent starts
              running.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return <CommentStatsCards stats={data} />
}

export function AgentStats() {
  const { agent } = useCurrentAgent()

  if (!agent) return null

  const isLinkedIn = agent.platform === 'linkedin'

  return (
    <div>
      <h2 className='mb-4 text-lg font-semibold'>Stats</h2>
      {isLinkedIn ? (
        <LinkedInAgentStats profileId={agent.profileId} />
      ) : (
        <TwitterStatsView profileId={agent.profileId} />
      )}
    </div>
  )
}

function LinkedInAgentStats({ profileId }: { profileId: string }) {
  const { data: linkedInStats, isLoading } = useGetLinkedInStats(profileId)

  return (
    <LinkedInStatsView linkedInStats={linkedInStats} isLoading={isLoading} />
  )
}
