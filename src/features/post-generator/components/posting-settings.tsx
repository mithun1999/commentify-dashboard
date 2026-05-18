import { useParams } from '@tanstack/react-router'
import { IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useStartOnboarding } from '../query/post-generator.query'

export function PostingSettings() {
  const { profileId } = useParams({ strict: false }) as { profileId: string }
  const startOnboarding = useStartOnboarding()

  return (
    <div className='mx-auto max-w-2xl'>
      <h2 className='mb-4 text-lg font-semibold'>Posting Settings</h2>

      <div className='space-y-6'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 text-sm font-medium'>Voice & Brand Setup</h3>
          <p className='text-muted-foreground mb-3 text-sm'>
            Analyze your LinkedIn profile to extract your writing voice, content
            pillars, and posting cadence. This powers all AI-generated content.
          </p>
          <Button
            variant='outline'
            size='sm'
            onClick={() => startOnboarding.mutate(profileId)}
            disabled={startOnboarding.isPending}
          >
            {startOnboarding.isPending ? (
              <>
                <IconLoader2 className='mr-2 size-4 animate-spin' />
                Analyzing...
              </>
            ) : (
              'Run Voice Analysis'
            )}
          </Button>
          {startOnboarding.data && (
            <p className='text-muted-foreground mt-2 text-xs'>
              Analyzed {startOnboarding.data.postsAnalyzed} posts
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
