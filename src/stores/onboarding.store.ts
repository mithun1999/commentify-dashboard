import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OnboardingData {
  isExtensionInstalled: boolean
  isLinkedInConnected: boolean
  selectedAgentType: string | null
  linkedProfileId: string | null
  userProfile: {
    name: string
    title: string
    avatar?: string
  } | null
  scrapeSetting: {
    keywordsToTarget: string[]
    commentsPerDay: number
    authorTitles: string[]
    geography: string
    autoApprove: boolean
  }
  commentSetting: {
    aboutProfile: string
    additionalRules: string
    useEmojis: boolean
    useExclamations: boolean
    commentLength: string
  }
}

const defaultOnboardingData: OnboardingData = {
  isExtensionInstalled: false,
  isLinkedInConnected: false,
  selectedAgentType: null,
  linkedProfileId: null,
  userProfile: null,
  scrapeSetting: {
    keywordsToTarget: [],
    commentsPerDay: 10,
    authorTitles: [],
    geography: 'global',
    autoApprove: false,
  },
  commentSetting: {
    aboutProfile: '',
    additionalRules: '',
    useEmojis: true,
    useExclamations: true,
    commentLength: 'medium',
  },
}

interface OnboardingStoreState {
  data: OnboardingData
  completedSteps: string[]
  updateData: (newData: Partial<OnboardingData>) => void
  resetData: () => void
  markStepCompleted: (step: string) => void
  isStepCompleted: (step: string) => boolean
}

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set, get) => ({
      data: defaultOnboardingData,
      completedSteps: [],
      updateData: (newData) =>
        set((state) => ({
          data: {
            ...state.data,
            ...newData,
          },
        })),
      resetData: () => set({ data: defaultOnboardingData, completedSteps: [] }),
      markStepCompleted: (step: string) => {
        const { completedSteps } = get()
        if (!completedSteps.includes(step)) {
          set({ completedSteps: [...completedSteps, step] })
        }
      },
      isStepCompleted: (step: string) => get().completedSteps.includes(step),
    }),
    {
      name: 'commentify-onboarding',
      version: 1,
    }
  )
)

export function useOnboarding() {
  const data = useOnboardingStore((s) => s.data)
  const updateData = useOnboardingStore((s) => s.updateData)
  const resetData = useOnboardingStore((s) => s.resetData)
  const completedSteps = useOnboardingStore((s) => s.completedSteps)
  const markStepCompleted = useOnboardingStore((s) => s.markStepCompleted)
  const isStepCompleted = useOnboardingStore((s) => s.isStepCompleted)

  return {
    data,
    updateData,
    resetData,
    completedSteps,
    markStepCompleted,
    isStepCompleted,
  }
}
