import { createFileRoute } from '@tanstack/react-router'
import { DownloadsPage } from '@/features/account/components/downloads-page'

export const Route = createFileRoute('/_auth/profile/downloads')({
  head: () => ({ meta: [{ title: 'Arquivos baixados · Kurio' }] }),
  component: DownloadsPage,
})
