import { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { IconExternalLink, IconLock } from '@tabler/icons-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  EXAMPLE_PROMPTS,
  claudeCodeCommand,
  claudeInstallUrl,
  codexCommand,
  cursorInstallUrl,
  geminiCommand,
  genericConfig,
  vscodeInstallUrl,
} from './clients'
import { ClientCard } from './components/client-card'
import { ConnectedApps } from './components/connected-apps'
import { CopyField } from './components/copy-field'
import { copyText } from './copy'
import { useMcpStatusQuery } from './query/mcp.query'

/** A one-click button that opens another app; inert while the plan does not allow it. */
function OpenButton({
  href,
  children,
  disabled,
  newTab,
}: {
  href: string
  children: ReactNode
  disabled?: boolean
  newTab?: boolean
}) {
  if (disabled) {
    return (
      <Button className='w-full' disabled>
        {children}
      </Button>
    )
  }
  return (
    <Button className='w-full' asChild>
      <a
        href={href}
        {...(newTab ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {children}
        {newTab && <IconExternalLink className='ml-1 size-4' />}
      </a>
    </Button>
  )
}

export default function AiTools() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useMcpStatusQuery()
  const url = data?.serverUrl ?? ''
  const locked = !data?.eligible

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 max-w-3xl'>
          <h2 className='text-2xl font-bold tracking-tight'>AI tools</h2>
          <p className='text-muted-foreground mt-1'>
            Use Commentify from Claude, ChatGPT, Cursor and other AI apps. Ask
            what is scheduled, approve comments or draft a post, in your own
            words.
          </p>
        </div>

        {isLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-24 w-full' />
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className='h-48' />
              ))}
            </div>
          </div>
        ) : isError || !data ? (
          <Alert variant='destructive'>
            <AlertTitle>Could not load your AI tools</AlertTitle>
            <AlertDescription>
              <Button
                variant='outline'
                size='sm'
                className='mt-2'
                onClick={() => refetch()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className='space-y-8'>
            {locked && (
              <Alert className='border-primary/40 bg-primary/5'>
                <IconLock className='size-4' />
                <AlertTitle>
                  Connecting AI tools is part of the Pro plan
                </AlertTitle>
                <AlertDescription>
                  <p>
                    Upgrade to Pro to use Commentify from Claude, ChatGPT and
                    the other apps below.
                  </p>
                  <Button
                    size='sm'
                    className='mt-3'
                    onClick={() => navigate({ to: '/plans' })}
                  >
                    See plans
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Your server URL</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <CopyField value={url} disabled={locked} />
                <p className='text-muted-foreground text-sm'>
                  Every app below connects to this one address. You sign in with
                  your Commentify account once per app; there are no keys to
                  copy.
                </p>
              </CardContent>
            </Card>

            <section className='space-y-3'>
              <h3 className='text-lg font-semibold'>Connect an app</h3>
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                <ClientCard
                  name='Claude'
                  tagline='Web, desktop and mobile'
                  action={
                    <OpenButton
                      href={claudeInstallUrl(url)}
                      disabled={locked}
                      newTab
                    >
                      Add to Claude
                    </OpenButton>
                  }
                  steps={[
                    'Click Add to Claude, then Add.',
                    'Click Connect next to Commentify.',
                    'Click Allow on the Commentify screen.',
                  ]}
                  note='On Claude Team and Enterprise, an owner adds it first; then each person connects.'
                />
                <ClientCard
                  name='ChatGPT'
                  tagline='On the web'
                  action={
                    <Button
                      className='w-full'
                      disabled={locked}
                      onClick={() => copyText(url, 'Server URL copied')}
                    >
                      Copy server URL
                    </Button>
                  }
                  steps={[
                    'In ChatGPT settings, open Apps and turn on Developer mode (under Advanced).',
                    'Create an app: name it Commentify, paste the server URL, and choose OAuth.',
                    'Sign in and click Allow on the Commentify screen.',
                  ]}
                  note='Developer mode needs a paid ChatGPT plan.'
                />
                <ClientCard
                  name='Cursor'
                  tagline='Agent chat'
                  action={
                    <OpenButton href={cursorInstallUrl(url)} disabled={locked}>
                      Add to Cursor
                    </OpenButton>
                  }
                  steps={[
                    'Click Add to Cursor, then Install.',
                    'Cursor opens Commentify to sign you in.',
                    'Click Allow.',
                  ]}
                />
                <ClientCard
                  name='VS Code'
                  tagline='GitHub Copilot agent mode'
                  action={
                    <OpenButton href={vscodeInstallUrl(url)} disabled={locked}>
                      Install in VS Code
                    </OpenButton>
                  }
                  steps={[
                    'Click Install in VS Code, then Install.',
                    'Start the server when VS Code asks, and sign in.',
                    'Click Allow.',
                  ]}
                  note='On Copilot Business and Enterprise, an admin may need to allow MCP servers.'
                />
                <ClientCard
                  name='Claude Code'
                  tagline='Terminal'
                  action={
                    <CopyField
                      value={claudeCodeCommand(url)}
                      disabled={locked}
                    />
                  }
                  steps={[
                    'Run the command above.',
                    'In Claude Code, type /mcp and pick Commentify to sign in.',
                    'Click Allow.',
                  ]}
                />
                <ClientCard
                  name='Other apps'
                  tagline='Codex, Gemini CLI and anything that speaks MCP'
                  action={
                    <div className='space-y-2'>
                      <CopyField value={codexCommand(url)} disabled={locked} />
                      <CopyField value={geminiCommand(url)} disabled={locked} />
                    </div>
                  }
                  steps={[
                    'Run the command for your app, or add the server URL in its MCP settings.',
                    'Sign in when it opens Commentify, and click Allow.',
                  ]}
                  note={
                    <>
                      Config file format:{' '}
                      <button
                        type='button'
                        className='underline underline-offset-2'
                        disabled={locked}
                        onClick={() =>
                          copyText(genericConfig(url), 'Config copied')
                        }
                      >
                        copy JSON
                      </button>
                    </>
                  }
                />
              </div>
            </section>

            <ConnectedApps connections={data.connections ?? []} />

            <section className='space-y-3'>
              <h3 className='text-lg font-semibold'>Try asking</h3>
              <div className='flex flex-wrap gap-2'>
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type='button'
                    onClick={() => copyText(prompt, 'Prompt copied')}
                    className='bg-muted hover:bg-muted/70 rounded-full border px-3 py-1.5 text-left text-sm transition-colors'
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <p className='text-muted-foreground text-sm'>
                Approved comments and posts go out at their scheduled time. A
                post only goes out straight away when you ask the AI to publish
                it now, and your app asks you to confirm first.
              </p>
            </section>
          </div>
        )}
      </Main>
    </>
  )
}
