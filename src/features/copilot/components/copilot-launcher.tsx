import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function CopilotLauncher() {
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'i' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        void navigate({ to: '/copilot' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => navigate({ to: '/copilot' })}
          tooltip='Copilot'
        >
          <Sparkles />
          <span>Copilot</span>
          <kbd className='text-muted-foreground ml-auto text-[10px] group-data-[collapsible=icon]:hidden'>
            ⌘I
          </kbd>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
