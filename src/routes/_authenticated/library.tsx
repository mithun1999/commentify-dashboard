import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import LibraryPage from '@/features/library/library-page'

export const Route = createFileRoute('/_authenticated/library')({
  validateSearch: z.object({ note: z.string().optional() }),
  component: LibraryPage,
})
