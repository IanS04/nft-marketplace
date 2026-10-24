import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { ProfileSidebar } from '@/features/account/components/profile-sidebar'

export const Route = createFileRoute('/_auth/profile')({
  component: ProfileLayout,
})

function ProfileLayout() {
  return (
    <Container className="grid gap-6 py-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8 md:py-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <ProfileSidebar />
      <div className="min-w-0">
        <Outlet />
      </div>
    </Container>
  )
}
