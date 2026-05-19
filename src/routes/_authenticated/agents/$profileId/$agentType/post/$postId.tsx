import { createFileRoute } from '@tanstack/react-router'
import { PostEditorPage } from '@/features/post-generator/components/post-editor-page'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/post/$postId'
)({
  component: PostEditorPage,
})
