import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useGetLinkedInStats } from '@/features/users/query/profile.query'
import { Overview } from './components/overview'
import { ProfileOverview } from './components/profile-overview'

export default function Dashboard() {
  const { data: linkedInStats } = useGetLinkedInStats()

  // Formatting helpers
  const formatNumber = new Intl.NumberFormat('en-US')
  const formatPercent = (n?: number | string | null) => {
    if (n === undefined || n === null) return '--'
    if (typeof n === 'string') {
      const s = n.trim()
      if (s === '') return '--'
      return s
    }
    const num = Number(n)
    if (!Number.isFinite(num)) return '--'
    return `${num > 0 ? '+' : ''}${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(num)}%`
  }

  // Followers (main)
  const fs = linkedInStats?.followersStats
  const followersHas3m = typeof fs?.followersGrowthSinceThreeMonths === 'number'
  const followersHasSinceApp =
    typeof fs?.followersGrowthSinceStartedUsingThisApp === 'number'
  const followersValue = followersHas3m
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
    ? 'in the last 3 months'
    : followersHasSinceApp
      ? 'since Commentify'
      : 'in the last 3 months'

  // Followers (weekly)
  const weeklyFollowersValue = fs?.weeklyFollowersGrowth
  const weeklyFollowersPercent = fs?.weeklyFollowersGrowthPercent

  // Profile Views (main)
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

  // Profile Views (weekly)
  const weeklyProfileViewsValue = ps?.weeklyProfileViewersGrowth
  const weeklyProfileViewsPercent = ps?.weeklyProfileViewersGrowthPercent

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Profile Stats</h1>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Followers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {followersValue !== undefined && followersValue !== null
                      ? formatNumber.format(followersValue)
                      : '--'}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {formatPercent(followersPercent)} {followersSuffix}
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
                    {weeklyFollowersValue !== undefined &&
                    weeklyFollowersValue !== null
                      ? formatNumber.format(weeklyFollowersValue)
                      : '--'}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {formatPercent(weeklyFollowersPercent)} vs last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Profile Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {profileViewsValue !== undefined &&
                    profileViewsValue !== null
                      ? formatNumber.format(profileViewsValue)
                      : '--'}
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
                    {weeklyProfileViewsValue !== undefined &&
                    weeklyProfileViewsValue !== null
                      ? formatNumber.format(weeklyProfileViewsValue)
                      : '--'}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {formatPercent(weeklyProfileViewsPercent)} vs last week
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className='grid gap-4 lg:grid-cols-3'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Comments Scheduled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {linkedInStats?.postCommentStats?.scheduled}
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
                    {linkedInStats?.postCommentStats?.pending}
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
                    {linkedInStats?.postCommentStats?.completed}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className='w-full'>
              <CardHeader className='flex flex-row items-center justify-between'>
                <CardTitle>Followers Growth</CardTitle>
              </CardHeader>

              <CardContent className='pl-2'>
                <Overview />
              </CardContent>
            </Card>

            <Card className='w-full'>
              <CardHeader className='flex flex-row items-center justify-between'>
                <CardTitle>Profile Viewers Growth</CardTitle>
              </CardHeader>

              <CardContent className='pl-2'>
                <ProfileOverview />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
