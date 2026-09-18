import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PostEditorPage } from '@/features/post-generator/components/post-editor-page'

// The all-time calendar links here for posts outside the active-week window,
// which the editor cannot resolve on its own. It passes the owning calendar.
const searchSchema = z.object({
  calendarId: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/post/$postId'
)({
  validateSearch: searchSchema,
  component: PostEditorPage,
})
