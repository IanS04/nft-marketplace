import { createFileRoute } from '@tanstack/react-router'
import { CreatorsPage } from '@/features/creators/components/creators-page'

export const Route = createFileRoute('/creators/')({
  head: () => ({ meta: [{ title: 'Criadores · Kurio' }] }),
  component: CreatorsPage,
})
