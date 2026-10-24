import type { Locator, Page } from '@playwright/test'

/**
 * Deixa a tela "parada" antes do screenshot: fontes carregadas, imagens lazy forçadas a carregar
 * (o screenshot de página inteira não rola, então lazy abaixo da dobra sairia em branco),
 * rede ociosa e topo da página.
 */
export async function stabilize(page: Page) {
  await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((img) => { (img as HTMLImageElement).loading = 'eager' }))
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0))
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
}

/** Elementos que não fazem parte do layout avaliado (toasts, aviso de conexão). */
export const volatile = (page: Page): Locator[] => [
  page.locator('[data-sonner-toaster]'),
  page.getByTestId('realtime-offline'),
]

/**
 * Carrinho do Figma: Emerald Ape ×2, Violet Nomad ×6, Ivory Baron ×9 → 26.83 + 0.016 = 26.846 ETH.
 * Montado pela API do carrinho de visitante (mesmo caminho da UI), com o id guardado no navegador.
 */
export async function seedFigmaCart(page: Page) {
  // O id nasce na 1ª renderização do app (depois de os mocks subirem): espera existir.
  await page.waitForFunction(() => !!localStorage.getItem('kurio:guest-cart-id'))
  await page.evaluate(async () => {
    const guestCartId = localStorage.getItem('kurio:guest-cart-id')
    if (!guestCartId) throw new Error('Carrinho de visitante ainda não criado')
    const items = [
      { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042--1of50', quantity: 2 },
      { nftId: 'violet-nomad-314', editionId: 'violet-nomad-314--1of50', quantity: 6 },
      { nftId: 'ivory-baron-088', editionId: 'ivory-baron-088--1of50', quantity: 9 },
    ]
    for (const item of items) {
      await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cart-Id': guestCartId },
        body: JSON.stringify(item),
      })
    }
  })
}
