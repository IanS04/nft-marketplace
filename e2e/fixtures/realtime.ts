import { expect, type Page } from '@playwright/test'

/**
 * Disparo de eventos pelo "servidor" Socket.IO simulado (window.__kurioMocks.realtime).
 * Os eventos atravessam o socket.io-client de verdade: nada é injetado direto na UI.
 */
export const realtime = (page: Page) => ({
  /** Espera o socket do app estar conectado ao servidor simulado. */
  ready: () => expect.poll(() => page.evaluate(() => window.__kurioMocks!.realtime.peerCount())).toBeGreaterThan(0),
  changePrice: (nftId: string, price: string) =>
    page.evaluate(([id, p]) => window.__kurioMocks!.realtime.changePrice(id, p), [nftId, price] as const),
  changeStock: (editionId: string, available: number) =>
    page.evaluate(([id, n]) => window.__kurioMocks!.realtime.changeStock(id, n), [editionId, available] as const),
  replayLast: () => page.evaluate(() => window.__kurioMocks!.realtime.replayLast()),
  emitStale: (nftId: string, price: string) =>
    page.evaluate(([id, p]) => window.__kurioMocks!.realtime.emitStale(id, p), [nftId, price] as const),
  emitForeignOrder: (userId: string) => page.evaluate((u) => window.__kurioMocks!.realtime.emitForeignOrder(u), userId),
  setOnline: (online: boolean) => page.evaluate((v) => window.__kurioMocks!.realtime.setOnline(v), online),
  setSettleDelay: (ms: number) => page.evaluate((v) => window.__kurioMocks!.setSettleDelay(v), ms),
})

export const toasts = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text })
