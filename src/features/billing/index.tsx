'use client'

import { Loader2, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { useGetCustomerPortalUrlQuery } from '@/features/subscription/query/subscription.query'

export default function Billing() {
  const { data: user } = useGetUserQuery()
  const { data: portal, isLoading } = useGetCustomerPortalUrlQuery({
    // @ts-expect-error shared hook expects a user, placeholder handled inside
    user,
  })

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between'>
          <h2 className='text-2xl font-bold tracking-tight'>Billing</h2>
        </div>

        <div className='mt-10 grid gap-6 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Manage Subscription</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-muted-foreground text-sm'>
                    Current plan
                  </div>
                  <div className='text-base font-medium'>
                    {user?.subscribedProduct?.name || '—'}
                  </div>
                </div>
                <div className='flex items-center gap-1 text-sm'>
                  {user?.status === 'active' ? (
                    <>
                      <CheckCircle2 className='h-4 w-4 text-green-500' />
                      <span className='text-green-600 dark:text-green-400'>
                        Active
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className='h-4 w-4 text-amber-500' />
                      <span className='text-amber-600 capitalize dark:text-amber-400'>
                        {user?.status || 'inactive'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <div className='flex flex-wrap gap-3'>
                  <Button
                    disabled={!portal?.customerPortal}
                    onClick={() =>
                      portal?.customerPortal &&
                      window.open(portal.customerPortal, '_blank')
                    }
                  >
                    Open Customer Portal
                    <ExternalLink className='ml-2 h-4 w-4' />
                  </Button>

                  <Button
                    variant='outline'
                    onClick={() => {
                      window.location.href = '/pricing'
                    }}
                  >
                    Change Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className='flex items-center gap-3'>
              {isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Button
                  variant='outline'
                  disabled={!portal?.updatePaymentMethod}
                  onClick={() =>
                    portal?.updatePaymentMethod &&
                    window.open(portal.updatePaymentMethod, '_blank')
                  }
                >
                  Update Card
                  <ExternalLink className='ml-2 h-4 w-4' />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
