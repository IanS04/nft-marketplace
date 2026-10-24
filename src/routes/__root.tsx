import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext, HeadContent, Outlet, useRouterState, type ErrorComponentProps,
} from '@tanstack/react-router'
import { ErrorState } from '@/components/feedback/error-state'
import { LiveRegion } from '@/components/feedback/live-region'
import { NotFoundPage } from '@/components/feedback/not-found-page'
import { Container } from '@/components/layout/container'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SkipLink } from '@/components/layout/skip-link'
import { Toaster } from '@/components/ui/toaster'
import { AuthDialog } from '@/features/auth/components/auth-dialog'
import { SessionExpiredDialog } from '@/features/auth/components/session-expired-dialog'
import { SessionValidation } from '@/features/auth/components/session-validation'
import { CartSessionBridge } from '@/features/cart/components/cart-session-bridge'
import { cn } from '@/lib/cn'
import { RealtimeProvider } from '@/realtime/socket-provider'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({ meta: [{ title: 'Kurio · Marketplace de NFTs' }] }),
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RootError,
})

// No mobile (Figma), login, cadastro, detalhe, carrinho e pagamento são telas focadas: sem tab bar e sem rodapé
// (detalhe e carrinho têm a própria barra de ação embaixo).
const isFocusedOnMobile = (path: string) =>
  path === '/login' || path === '/register' || path === '/cart' || path === '/checkout' || path.startsWith('/nfts/')

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const fullscreenOnMobile = isFocusedOnMobile(pathname)

  return (
    <>
      <HeadContent />
      <SkipLink />
      <Header />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <Footer className={cn(fullscreenOnMobile && 'max-md:hidden')} />
      {!fullscreenOnMobile && <MobileTabBar />}
      <AuthDialog />
      <SessionExpiredDialog />
      <SessionValidation />
      <CartSessionBridge />
      <RealtimeProvider />
      <Toaster />
      <LiveRegion />
    </>
  )
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <Container className="py-16">
      <ErrorState title="Não foi possível exibir esta página" error={error} onRetry={reset} />
    </Container>
  )
}
