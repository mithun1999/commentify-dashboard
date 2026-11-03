import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { AiKeysForm } from './components/ai-keys-form'

export default function AiKeys() {
  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2'>
          <h2 className='text-2xl font-bold tracking-tight'>AI keys</h2>
          <p className='text-muted-foreground'>
            Your plan runs on your own AI keys, so AI usage is billed by your
            provider, not by Commentify.
          </p>
        </div>

        <Card className='mt-6 max-w-2xl'>
          <CardHeader>
            <CardTitle>Your keys</CardTitle>
          </CardHeader>
          <CardContent>
            <AiKeysForm />
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
