import { ANA, login } from '../fixtures/auth'
import { cartTotal } from '../fixtures/cart'
import { expect, resetScenario, test } from '../fixtures/test'
import { seedFigmaCart, stabilize, volatile } from '../fixtures/visual'

// Etapa 9 — regressão visual de início, detalhe, carrinho e pagamento (desktop 1440 e mobile 390).
// Dados estáveis: cenário "default" (fixtures determinísticas, latência fixa) e estado resetado.
// Atualizar baselines após mudança INTENCIONAL de layout: pnpm test:e2e:update visual

test.skip(({ page }) => page.viewportSize()?.width === 768, 'baselines só para desktop e mobile (pedido do desafio)')

test.beforeEach(async ({ page }) => resetScenario(page))

test('início', async ({ page }) => {
  await expect(page.getByTestId('nft-grid')).toBeVisible()
  await stabilize(page)
  await expect(page).toHaveScreenshot('inicio.png', { fullPage: true, mask: volatile(page) })
})

test('detalhe do NFT', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await stabilize(page)
  await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true, mask: volatile(page) })
})

test('carrinho (o mesmo do Figma: 26.846 ETH)', async ({ page }) => {
  await seedFigmaCart(page)
  await page.goto('/cart')
  await expect(cartTotal(page)).toHaveText('26.846 ETH')
  await stabilize(page)
  await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true, mask: volatile(page) })
})

test('pagamento', async ({ page }) => {
  await seedFigmaCart(page)
  await login(page, ANA) // o carrinho do visitante passa para a conta
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-total')).toHaveText('26.846 ETH')
  await stabilize(page)
  await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true, mask: volatile(page) })
})
