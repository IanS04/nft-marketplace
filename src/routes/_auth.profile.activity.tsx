import { createFileRoute } from '@tanstack/react-router'
import { ActivityPage } from '@/features/account/components/activity-page'

export const Route = createFileRoute('/_auth/profile/activity')({
  head: () => ({ meta: [{ title: 'Atividade · Kurio' }] }),
  component: ActivityPage,
})
