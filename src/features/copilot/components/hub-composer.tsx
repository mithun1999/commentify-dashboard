import { useSidebar } from '@/components/ui/sidebar'
import { useStartChat } from '../hooks/use-start-chat'
import { COPILOT_SUGGESTIONS } from '../suggestions'
import { Composer } from './composer'

/**
 * Room for a couple of lines once someone starts, so the dock reads as a place
 * to write a request rather than a search field. It stays out of the way of the
 * hub until then.
 */
const FOCUSED_HEIGHT = 76

/**
 * The copilot's front door, docked over the Agent Hub.
 *
 * Fixed rather than in flow so it stays reachable however far the hub scrolls.
 * That puts it outside the content column, so the sidebar's width has to be
 * subtracted by hand — the CSS variables cascade down here even though the
 * layout does not.
 */
export function HubComposer() {
  const start = useStartChat()
  const { state, isMobile } = useSidebar()

  const left = isMobile
    ? 0
    : state === 'collapsed'
      ? // The floating sidebar variant keeps a 1rem gutter when collapsed.
        'calc(var(--sidebar-width-icon) + 1rem)'
      : 'var(--sidebar-width)'

  return (
    <div
      style={{ left }}
      // The gradient lets the page fade out under the dock. Without it the
      // suggestions, which only appear on focus, land on top of whatever card
      // happens to be there.
      className='from-background pointer-events-none fixed right-0 bottom-0 z-30 bg-gradient-to-t from-70% to-transparent px-4 pt-14 pb-5'
    >
      <div className='pointer-events-auto mx-auto max-w-2xl'>
        <Composer
          onSubmit={start}
          focusedHeight={FOCUSED_HEIGHT}
          suggestionsOnFocus={COPILOT_SUGGESTIONS}
          placeholder='Ask Copilot to change something...'
          className='bg-background/95 shadow-lg backdrop-blur-sm'
        />
      </div>
    </div>
  )
}
