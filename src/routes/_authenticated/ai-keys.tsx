import { createFileRoute } from '@tanstack/react-router'
import AiKeys from '@/features/ai-keys/index'

export const Route = createFileRoute('/_authenticated/ai-keys')({
  component: AiKeys,
})
