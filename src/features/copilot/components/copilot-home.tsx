import { Sparkles } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStartChat } from '../hooks/use-start-chat'
import { COPILOT_SUGGESTIONS } from '../suggestions'
import { Composer } from './composer'
import { CopilotPage } from './copilot-page'
import { RecentChats } from './recent-chats'

export function CopilotHome() {
  const start = useStartChat()

  return (
    <CopilotPage>
      <ScrollArea className='min-h-0 flex-1'>
        <div className='mx-auto w-full max-w-2xl px-4 py-12'>
          <div className='mb-6 flex flex-col items-center text-center'>
            <div className='bg-primary/10 text-primary mb-3 rounded-full p-2.5'>
              <Sparkles className='size-5' />
            </div>
            <h1 className='text-xl font-semibold tracking-tight'>
              What should your agents do?
            </h1>
            <p className='text-muted-foreground mt-1 text-sm'>
              Ask for a change instead of hunting for the setting.
            </p>
          </div>

          <Composer
            autoFocus
            onSubmit={start}
            placeholder='Ask Copilot to change something...'
          />

          <div className='mt-3 flex flex-wrap justify-center gap-2'>
            {COPILOT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => start(suggestion)}
                className='hover:bg-muted text-muted-foreground hover:text-foreground rounded-full border px-3 py-1.5 text-xs transition-colors'
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className='mt-10'>
            <RecentChats />
          </div>
        </div>
      </ScrollArea>
    </CopilotPage>
  )
}
