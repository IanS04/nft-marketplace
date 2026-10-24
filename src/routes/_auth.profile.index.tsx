import { createFileRoute } from '@tanstack/react-router'
import { ProfileForm } from '@/features/account/components/profile-form'

export const Route = createFileRoute('/_auth/profile/')({
  head: () => ({ meta: [{ title: 'Meu perfil · Kurio' }] }),
  component: ProfileForm,
})
