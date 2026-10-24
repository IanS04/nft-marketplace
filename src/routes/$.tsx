import { createFileRoute } from '@tanstack/react-router'
import { NotFoundPage } from '@/components/feedback/not-found-page'

export const Route = createFileRoute('/$')({
  head: () => ({ meta: [{ title: 'Página não encontrada · Kurio' }] }),
  component: NotFoundPage,
})
