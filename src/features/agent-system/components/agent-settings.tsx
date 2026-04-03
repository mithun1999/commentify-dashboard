import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCurrentAgent } from '../hooks/use-current-agent'
import { SalesSettingsForm } from '@/features/linkedin-sales/components/sales-settings-form'
import { useSwitchAgentMode } from '@/features/linkedin-sales/query/sales.query'
import type { AgentMode } from '../types/agent.types'

function ModeSelector({
  mode,
  onModeChange,
  disabled,
}: {
  mode: AgentMode
  onModeChange: (mode: AgentMode) => void
  disabled?: boolean
}) {
  return (
    <div className='mb-6'>
      <label className='text-muted-foreground mb-2 block text-xs font-medium uppercase tracking-wide'>
        Agent Mode
      </label>
      <div className='bg-muted inline-flex rounded-lg p-1'>
        {(['branding', 'sales'] as const).map((m) => (
          <button
            key={m}
            type='button'
            disabled={disabled}
            onClick={() => onModeChange(m)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all disabled:opacity-50 ${
              mode === m
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'branding' ? 'Personal Branding' : 'Sales'}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AgentSettings() {
  const { agent, agentTypeDef, profile } = useCurrentAgent()
  const currentMode: AgentMode = agent?.agentMode ?? 'branding'
  const [mode, setMode] = useState<AgentMode>(currentMode)
  const [tab, setTab] = useState(
    currentMode === 'sales' ? 'sales' : 'scrape'
  )
  const [pendingMode, setPendingMode] = useState<AgentMode | null>(null)

  const { switchModeAsync, isSwitchingMode } = useSwitchAgentMode()

  if (!agent || !agentTypeDef) return null

  const isLinkedin = agent.platform === 'linkedin'
  const isSalesMode = isLinkedin && mode === 'sales'

  const ScrapeComponent = agentTypeDef.scrapeSettingsComponent
  const CommentComponent = agentTypeDef.commentSettingsComponent

  const handleModeChange = (newMode: AgentMode) => {
    if (newMode === mode) return
    setPendingMode(newMode)
  }

  const confirmModeSwitch = async () => {
    if (!pendingMode) return
    try {
      const salesData = profile?.setting?.salesSetting
        ? {
            websiteUrl: profile.setting.salesSetting.websiteUrl,
            productDescription: profile.setting.salesSetting.productDescription,
            painPoints: profile.setting.salesSetting.painPoints,
            valuePropositions: profile.setting.salesSetting.valuePropositions,
            pitchIntensity: profile.setting.salesSetting.pitchIntensity,
            matchMode: profile.setting.salesSetting.matchMode,
            competitorNames: profile.setting.salesSetting.competitorNames,
          }
        : undefined

      await switchModeAsync({
        profileId: agent.profileId,
        mode: pendingMode,
        existingSalesData: pendingMode === 'sales' ? salesData : undefined,
      })
      setMode(pendingMode)
      setTab(pendingMode === 'sales' ? 'sales' : 'scrape')
    } finally {
      setPendingMode(null)
    }
  }

  const pendingLabel =
    pendingMode === 'sales' ? 'Sales' : 'Personal Branding'

  return (
    <div>
      <h2 className='mb-4 text-lg font-semibold'>Settings</h2>

      {isLinkedin && (
        <ModeSelector
          mode={mode}
          onModeChange={handleModeChange}
          disabled={isSwitchingMode}
        />
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {isSalesMode ? (
            <TabsTrigger value='sales'>Sales Settings</TabsTrigger>
          ) : (
            <TabsTrigger value='scrape'>Scrape Settings</TabsTrigger>
          )}
          <TabsTrigger value='comment'>Comment Settings</TabsTrigger>
        </TabsList>

        {isSalesMode && (
          <TabsContent value='sales' className='mt-4'>
            <SalesSettingsForm profileId={agent.profileId} />
          </TabsContent>
        )}

        {!isSalesMode && (
          <TabsContent value='scrape' className='mt-4'>
            <ScrapeComponent profileId={agent.profileId} />
          </TabsContent>
        )}

        <TabsContent value='comment' className='mt-4'>
          <CommentComponent profileId={agent.profileId} />
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!pendingMode}
        onOpenChange={(open) => !open && setPendingMode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch to {pendingLabel} mode?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will change how your agent finds and evaluates new
              posts, and which prompt is used to generate future
              comments. Posts already in your queue keep their existing
              comments and won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSwitchingMode}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmModeSwitch}
              disabled={isSwitchingMode}
            >
              {isSwitchingMode ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Switching...
                </>
              ) : (
                `Switch to ${pendingLabel}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
