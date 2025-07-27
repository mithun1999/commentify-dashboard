import { useState } from 'react'
import { useProfile } from '@/context/use-profile'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'

export default function Dashboard() {
  const { linkedInStats } = useProfile()
  const [showFollowers, setShowFollowers] = useState(true)

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
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
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
                    Followers Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {linkedInStats?.followersStats.followersGrowth ?? '--'}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    +
                    {linkedInStats?.followersStats.followersGrowthPercent ??
                      '--'}
                    % from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Weekly Followers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {linkedInStats?.followersStats.weeklyFollowersGrowth ??
                      '--'}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    +
                    {linkedInStats?.followersStats
                      .weeklyFollowersGrowthPercent ?? '--'}
                    % this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Profile Viewers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {linkedInStats?.profileViewerStats.profileViewersGrowth ??
                      '--'}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    +
                    {linkedInStats?.profileViewerStats
                      .profileViewersGrowthPercent ?? '--'}
                    % from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Weekly Profile Viewers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {linkedInStats?.profileViewerStats
                      .weeklyProfileViewersGrowth ?? '--'}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    +
                    {linkedInStats?.profileViewerStats
                      .weeklyProfileViewersGrowthPercent ?? '--'}
                    % this week
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader className='flex flex-row items-center justify-between'>
                  <CardTitle>
                    {linkedInStats?.profileViewerStats.isPremium
                      ? showFollowers
                        ? 'Overview : Follower Count'
                        : 'Overview : Profile Views'
                      : 'Overview : Follower Count'}
                  </CardTitle>

                  {linkedInStats?.profileViewerStats.isPremium && (
                    <Switch
                      checked={showFollowers}
                      onCheckedChange={setShowFollowers}
                    />
                  )}
                </CardHeader>

                <CardContent className='pl-2'>
                  <Overview
                    showFollowers={
                      linkedInStats?.profileViewerStats.isPremium
                        ? showFollowers
                        : true
                    }
                  />
                </CardContent>
              </Card>

              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>
                    You made 265 sales this month.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <RecentSales />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
