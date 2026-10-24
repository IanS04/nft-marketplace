import { createFileRoute } from '@tanstack/react-router'
import { WalletsPage } from '@/features/account/components/wallets-page'

export const Route = createFileRoute('/_auth/profile/wallets')({
  head: () => ({ meta: [{ title: 'Carteiras · Kurio' }] }),
  component: WalletsPage,
})
