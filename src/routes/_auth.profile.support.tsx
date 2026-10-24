import { createFileRoute } from '@tanstack/react-router'
import { SupportPage } from '@/features/account/components/support-page'

export const Route = createFileRoute('/_auth/profile/support')({
  head: () => ({ meta: [{ title: 'Suporte · Kurio' }] }),
  component: SupportPage,
})
