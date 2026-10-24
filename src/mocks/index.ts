import { env } from '@/app/env'

export async function enableMocking(): Promise<void> {
  if (!env.VITE_ENABLE_MOCKS) return
  const [{ worker }, { initMockRuntime, exposeControls, startSettlementTicker }] = await Promise.all([
    import('./browser'),
    import('./runtime'),
  ])
  await initMockRuntime() // banco semeado ANTES de o worker responder
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    quiet: import.meta.env.PROD,
  })
  // Só depois do start: window.__kurioMocks presente = mocks interceptando (o Playwright espera por isso).
  exposeControls()
  startSettlementTicker() // a rede simulada liquida pedidos e publica order.updated pelo socket
}
