import { createFileRoute } from '@tanstack/react-router'
import AiTools from '@/features/ai-tools/index'

export const Route = createFileRoute('/_authenticated/ai-tools/')({
  component: AiTools,
})
